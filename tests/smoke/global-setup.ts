import { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  // Auth state is stored per-project in the worker storage directories.
  // Workers will load saved state in each test file.
}

export default globalSetup;