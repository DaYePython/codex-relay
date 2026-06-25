import { describe, expect, it } from "vitest";

import {
  isRelayHealthy,
  relayHealthUrl,
  relayServiceCommand,
} from "../../../scripts/relay-watchdog-command.mjs";

describe("relay watchdog service command", () => {
  it("keeps the relay server in watch mode for local library development", () => {
    const command = relayServiceCommand(["--dangerously-auto-approve"]);

    expect(command.args).toEqual([
      "--filter",
      "codex-relay",
      "exec",
      "tsx",
      "watch",
      "src/cli.ts",
      "--dangerously-auto-approve",
    ]);
  });

  it("checks the local relay version endpoint on the configured port", () => {
    expect(relayHealthUrl({ CODEX_RELAY_PORT: "9999", PORT: "8787" })).toBe(
      "http://127.0.0.1:9999/version",
    );
    expect(relayHealthUrl({ PORT: "8788" })).toBe("http://127.0.0.1:8788/version");
  });

  it("treats failed health requests as unhealthy", async () => {
    await expect(
      isRelayHealthy(async () => ({ ok: true }), "http://127.0.0.1:8787/version"),
    ).resolves.toBe(true);
    await expect(
      isRelayHealthy(async () => {
        throw new Error("connection refused");
      }, "http://127.0.0.1:8787/version"),
    ).resolves.toBe(false);
  });
});
