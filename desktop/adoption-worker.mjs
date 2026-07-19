import { parentPort, workerData } from "node:worker_threads";
import { runReleaseAdoption } from "../scripts/release-adoption.mjs";

try {
  const result = runReleaseAdoption(
    workerData.mode,
    workerData.manifest,
    workerData.source,
    workerData.target,
    workerData.options,
  );
  parentPort.postMessage({ result });
} catch (error) {
  parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) });
}
