import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { log } from "./logger";

const execFileAsync = promisify(execFile);

const globalForMigrate = globalThis as unknown as {
  autoMigrateStarted?: boolean;
};

export function shouldRetryMigration(message: string) {
  return message.includes("Can't reach database server");
}

export function isAutoMigrateEnabled() {
  if (process.env.NODE_ENV === "test") {
    return false;
  }
  return process.env.AUTO_MIGRATE !== "0";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? "unknown error");
}

export function startMigrationWatcher() {
  if (!isAutoMigrateEnabled()) {
    return;
  }
  if (globalForMigrate.autoMigrateStarted) {
    return;
  }
  globalForMigrate.autoMigrateStarted = true;

  void (async () => {
    let delayMs = 2000;
    while (true) {
      try {
        await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
          env: { ...process.env },
        });
        log("info", "migrations applied");
        return;
      } catch (error) {
        const message = extractErrorMessage(error);
        if (!shouldRetryMigration(message)) {
          log("error", "migration failed", { error: message });
          return;
        }
        log("warn", "migration retry", { error: message, delayMs });
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, 60_000);
      }
    }
  })();
}
