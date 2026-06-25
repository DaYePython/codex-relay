export function relayServiceCommand(cliArgs) {
  return {
    command: "pnpm",
    args: ["--filter", "codex-relay", "exec", "tsx", "watch", "src/cli.ts", ...cliArgs],
  };
}

export function relayHealthUrl(env = process.env) {
  const port = env.CODEX_RELAY_PORT ?? env.PORT ?? "8787";
  return `http://127.0.0.1:${port}/version`;
}

export async function isRelayHealthy(fetchImpl, url) {
  try {
    const response = await fetchImpl(url, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}
