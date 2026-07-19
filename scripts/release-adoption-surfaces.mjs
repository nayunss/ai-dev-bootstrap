import { runReleaseAdoption } from "./release-adoption.mjs";

export function runCliAdoption(mode, manifest, source, target, options = {}) {
  return runReleaseAdoption(mode, manifest, source, target, { ...options, surface: "cli" });
}

export function runGuiAdoption(mode, manifest, source, target, options = {}) {
  return runReleaseAdoption(mode, manifest, source, target, { ...options, surface: "gui" });
}

export function runWebAdoption(mode, manifest, source, target, options = {}) {
  return runReleaseAdoption(mode, manifest, source, target, { ...options, surface: "web" });
}
