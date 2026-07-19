import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { Worker } from "node:worker_threads";
import {
  inspectReleaseAdoption,
  validateReleaseAdoptionManifest,
} from "../scripts/release-adoption.mjs";
import {
  cancelledAdoptionResult,
  summarizeAdoptionResult,
  validateDesktopRequest,
  validateSelectedRoot,
} from "./ipc-contract.mjs";

const workerUrl = new URL("./adoption-worker.mjs", import.meta.url);
const CANCELLABLE = new Set(["preview", "validate"]);

export class DesktopAdoptionSession {
  #target = null;
  #manifest = null;
  #source = null;
  #previewPlanSha256 = null;
  #active = null;
  #workerUrl;

  constructor(options = {}) {
    this.#workerUrl = options.workerUrl ?? workerUrl;
  }

  selectProject(path) {
    if (this.#active) throw new Error("진행 중인 작업을 완료하거나 취소한 뒤 프로젝트를 변경하세요.");
    const target = validateSelectedRoot(path);
    const installed = inspectReleaseAdoption(target);
    if (installed.status === "INVALID") {
      throw new Error("기존 적용 상태가 변경되었거나 손상되었습니다. 파일을 자동으로 수정하지 않았습니다.");
    }
    this.#target = target;
    this.#previewPlanSha256 = null;
    return {
      name: basename(this.#target),
      path: this.#target,
      installedRelease: installed.release?.version ?? null,
      action: this.#selectedAction(),
    };
  }

  selectManifest(pathValue) {
    if (this.#active) throw new Error("진행 중인 작업을 완료하거나 취소한 뒤 release를 변경하세요.");
    const manifestPath = resolve(pathValue);
    if (basename(manifestPath) !== "release-manifest.json") {
      throw new Error("검토된 bundle의 release-manifest.json 파일을 선택하세요.");
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const source = dirname(manifestPath);
    const validation = validateReleaseAdoptionManifest(manifest, source);
    if (!validation.valid) throw new Error(`Release manifest를 사용할 수 없습니다: ${validation.errors.join(", ")}`);
    this.#manifest = manifest;
    this.#source = source;
    this.#previewPlanSha256 = null;
    return {
      release: manifest.release.version,
      commit: manifest.release.commit,
      manifestSha256: manifest.release.manifestSha256,
      artifactStatus: manifest.desktop.artifactStatus,
      signing: manifest.desktop.signing,
      notarization: manifest.desktop.notarization,
      file: basename(manifestPath),
      action: this.#selectedAction(),
    };
  }

  #installedState() {
    if (!this.#target) return { status: "EMPTY", release: null };
    return inspectReleaseAdoption(this.#target);
  }

  #selectedAction() {
    const installed = this.#installedState();
    if (installed.status !== "INSTALLED") return "install";
    if (installed.release.manifestSha256 === this.#manifest?.release?.manifestSha256) return "current";
    return "upgrade";
  }

  #requireSelection() {
    if (!this.#target) throw new Error("먼저 프로젝트 폴더를 선택하세요.");
    if (!this.#manifest || !this.#source) throw new Error("먼저 검토된 release manifest를 선택하세요.");
  }

  async run(rawRequest) {
    this.#requireSelection();
    const request = validateDesktopRequest(rawRequest);
    if (this.#active) {
      return summarizeAdoptionResult({
        status: "BLOCKED",
        errors: ["다른 작업이 진행 중입니다. 완료 또는 취소 후 다시 시도하세요."],
      });
    }
    if (request.mode === "apply" && request.expectedPlanSha256 !== this.#previewPlanSha256) {
      return summarizeAdoptionResult({
        status: "BLOCKED",
        errors: ["화면에서 확인한 변경 계획과 승인 요청이 일치하지 않습니다."],
      });
    }
    const action = this.#selectedAction();
    if (request.mode === "preview" && action === "current") {
      return summarizeAdoptionResult({
        status: "BLOCKED",
        errors: ["selected release is already installed; validate the current state instead"],
      });
    }
    const workerMode = request.mode === "preview"
      ? (action === "upgrade" ? "upgrade" : "preview")
      : request.mode === "apply"
        ? (action === "upgrade" ? "upgrade" : "apply")
        : request.mode;

    return new Promise((resolveResult) => {
      const worker = new Worker(this.#workerUrl, {
        workerData: {
          mode: workerMode,
          manifest: this.#manifest,
          source: this.#source,
          target: this.#target,
          options: {
            surface: "gui",
            approved: request.mode === "apply" || request.mode === "rollback",
            expectedPlanSha256: request.expectedPlanSha256,
          },
        },
      });
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        this.#active = null;
        if (request.mode === "preview" && workerMode === "upgrade" && result.status === "APPROVAL_REQUIRED") {
          result = { ...result, status: "PREVIEW" };
        }
        if (request.mode === "preview" && result.status === "PREVIEW") {
          this.#previewPlanSha256 = result.planSha256;
        } else {
          this.#previewPlanSha256 = null;
        }
        if (result.status === "PASS" && ["apply", "rollback"].includes(request.mode)) {
          const installed = this.#installedState();
          if (installed.status === "INVALID") {
            result = {
              status: "FAIL",
              errors: ["transaction completed but installed state validation failed"],
            };
          }
        }
        resolveResult(summarizeAdoptionResult(result));
      };
      this.#active = {
        operationId: request.operationId,
        mode: request.mode,
        worker,
        cancel: async () => {
          if (!CANCELLABLE.has(request.mode)) return false;
          finish(cancelledAdoptionResult(request.mode));
          await worker.terminate();
          return true;
        },
      };
      worker.once("message", ({ result, error }) => {
        if (error) finish({ status: "FAIL", errors: [error] });
        else finish(result);
      });
      worker.once("error", (error) => finish({ status: "FAIL", errors: [error.message] }));
      worker.once("exit", (code) => {
        if (!settled && code !== 0) finish({ status: "FAIL", errors: [`Desktop worker가 예기치 않게 종료되었습니다 (${code}).`] });
      });
    });
  }

  async cancel(operationId) {
    if (!this.#active || this.#active.operationId !== operationId) {
      return { accepted: false, message: "취소할 작업을 찾을 수 없습니다." };
    }
    if (!CANCELLABLE.has(this.#active.mode)) {
      return { accepted: false, message: "파일을 쓰는 작업은 안전한 transaction 완료 후 결과를 확인해야 합니다." };
    }
    const accepted = await this.#active.cancel();
    return { accepted, message: accepted ? "작업을 취소했습니다. 파일은 변경하지 않았습니다." : "작업을 취소하지 못했습니다." };
  }
}
