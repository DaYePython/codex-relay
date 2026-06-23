import { describe, expect, it } from "vitest";
import {
  clearCodexRelayServerUrlState,
  fallbackCodexRelayServerUrl,
  getCodexRelayServerUrl,
  getCodexRelayServerUrlCandidates,
  saveCodexRelayServerUrlCandidates,
  setCodexRelayServerUrl,
} from "../../../apps/mobile/src/lib/codex-relay-server-url-storage.js";

describe("mobile Codex Relay API session storage", () => {
  it("clears the selected server URL and stored candidates", () => {
    setCodexRelayServerUrl("http://100.103.76.81:8787");
    saveCodexRelayServerUrlCandidates([
      "http://100.103.76.81:8787",
      "http://gronxb-macmini.taild999d7.ts.net:8787",
    ]);

    clearCodexRelayServerUrlState();

    expect(getCodexRelayServerUrl()).toBe(fallbackCodexRelayServerUrl);
    expect(getCodexRelayServerUrlCandidates()).toEqual([
      {
        label: "Localhost",
        url: fallbackCodexRelayServerUrl,
      },
    ]);
  });
});
