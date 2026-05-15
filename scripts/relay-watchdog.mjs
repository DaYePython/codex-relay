import { spawn } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve(import.meta.dirname, "..");
const logPath = resolve(root, ".codex-relay/relay-watchdog.log");
const restartDelayMs = Number(process.env.RELAY_RESTART_DELAY_MS ?? 1000);
const cliArgs = process.argv.slice(2);

let stopping = false;
let child;

await mkdir(dirname(logPath), { recursive: true });
await log(`watchdog starting args=${cliArgs.join(" ")}`);

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await runService();
await log("watchdog stopped");

async function runService() {
  while (!stopping) {
    const startedAt = Date.now();
    child = spawn(
      "pnpm",
      ["--filter", "codex-relay", "exec", "tsx", "watch", "src/cli.ts", ...cliArgs],
      {
        cwd: root,
        env: {
          ...process.env,
          NODE_ENV: "development",
          PORT: process.env.CODEX_RELAY_PORT ?? process.env.PORT ?? "8787",
        },
        stdio: "inherit",
      },
    );

    await log(`server spawned pid=${child.pid}`);

    const exit = await waitForExit(child);
    child = undefined;

    if (stopping) {
      break;
    }

    const uptimeMs = Date.now() - startedAt;
    await log(
      `server exited code=${exit.code ?? "null"} signal=${
        exit.signal ?? "null"
      } uptimeMs=${uptimeMs}; restarting in ${restartDelayMs}ms`,
    );
    await delay(restartDelayMs);
  }
}

function waitForExit(runningChild) {
  return new Promise((resolve) => {
    runningChild.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

function stop() {
  stopping = true;
  if (child && !child.killed) {
    child.kill("SIGTERM");
  }
}

async function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  await appendFile(logPath, line);
}
