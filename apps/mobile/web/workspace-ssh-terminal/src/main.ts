import { linkBridge } from "@webview-bridge/web";
import { FitAddon, Ghostty, Terminal } from "ghostty-web";
import ghosttyWasmUrl from "ghostty-web/ghostty-vt.wasm?url";

import type {
  WorkspaceSshTerminalBridge,
  WorkspaceSshTerminalPostMessageSchema,
  WorkspaceSshTerminalState,
  WorkspaceSshTerminalSessionStatus,
} from "../../../src/components/chat/workspace-preview/workspace-ssh-terminal-bridge";

import "./style.css";

declare global {
  interface Window {
    __workspaceSshTerminalId?: string;
  }
}

const terminalId = window.__workspaceSshTerminalId ?? "";
const defaultFontSize = 13;
const defaultTerminalState: WorkspaceSshTerminalState = {
  fontSize: defaultFontSize,
  terminalId,
};
const bridge = linkBridge<WorkspaceSshTerminalBridge, WorkspaceSshTerminalPostMessageSchema>({
  debug: false,
  initialBridge: {
    ...defaultTerminalState,
    closeSession: async () => undefined,
    readSession: async (request) => ({ chunks: [], nextSeq: request.since }),
    reportError: async () => undefined,
    reportReady: async () => undefined,
    reportSessionStatus: async () => undefined,
    resizeSession: async () => undefined,
    startSession: async () => ({ sessionId: "", workspacePath: "" }),
    writeSession: async () => undefined,
  },
});

let terminal: Terminal | undefined;
let fitAddon: FitAddon | undefined;
let sessionId = "";
let nextSeq = 0;
let currentState = defaultTerminalState;
let pollTimer = 0;
let reconnectTimer = 0;
let isPolling = false;
let isStartingSession = false;
let isClosed = false;
let lastResize = { cols: 80, rows: 24 };
let lastReconnectRequestId = currentState.reconnectRequestId;
let reconnectAttempt = 0;
let scrollTouchLastY: number | undefined;

bridge.addEventListener("terminalState", (state) => {
  if (state.terminalId === terminalId) {
    currentState = state;
    applyTerminalState(state);
    if (
      typeof state.reconnectRequestId === "number" &&
      state.reconnectRequestId !== lastReconnectRequestId
    ) {
      lastReconnectRequestId = state.reconnectRequestId;
      void reconnectSession("manual");
    }
  }
});

void initializeTerminal();

async function initializeTerminal() {
  try {
    const ghostty = await Ghostty.load(ghosttyWasmUrl);
    terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: currentState.fontSize ?? defaultFontSize,
      ghostty,
      scrollback: 10000,
      theme: {
        background: "#1F1F1F",
        cursor: "#F2F2F2",
        foreground: "#F2F2F2",
        selectionBackground: "#383838",
      },
    });
    fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerElement());
    setupTouchScroll();
    fitAddon.fit();
    fitAddon.observeResize();
    terminal.onResize((size) => {
      lastResize = normalizeTerminalSize(size);
      if (sessionId) {
        void bridge
          .resizeSession({
            cols: lastResize.cols,
            rows: lastResize.rows,
            sessionId,
            terminalId,
          })
          .catch(() => {});
      }
    });

    await bridge.reportReady({ terminalId });
    await startSession("connecting");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    terminal?.writeln(`\r\nTerminal failed: ${message}`);
    await bridge.reportError({ message, terminalId });
  }
}

function setupTouchScroll() {
  const container = containerElement();
  container.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) {
        scrollTouchLastY = undefined;
        return;
      }
      scrollTouchLastY = event.touches[0]?.clientY;
    },
    { passive: true },
  );
  container.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 1 || scrollTouchLastY === undefined) {
        return;
      }
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      const nextY = touch.clientY;
      const deltaY = nextY - scrollTouchLastY;
      scrollTouchLastY = nextY;
      if (Math.abs(deltaY) < 2) {
        return;
      }
      event.preventDefault();
      container.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: touch.clientX,
          clientY: touch.clientY,
          deltaMode: WheelEvent.DOM_DELTA_PIXEL,
          deltaY: -deltaY,
        }),
      );
    },
    { passive: false },
  );
  container.addEventListener(
    "touchend",
    () => {
      scrollTouchLastY = undefined;
    },
    { passive: true },
  );
  container.addEventListener(
    "touchcancel",
    () => {
      scrollTouchLastY = undefined;
    },
    { passive: true },
  );
}

function applyTerminalState(state: WorkspaceSshTerminalState) {
  if (!terminal || typeof state.fontSize !== "number") {
    return;
  }
  const options = terminal.options;
  if (options.fontSize === state.fontSize) {
    return;
  }
  options.fontSize = state.fontSize;
  fitAddon?.fit();
}

async function startSession(status: WorkspaceSshTerminalSessionStatus) {
  if (!terminal) {
    return;
  }
  if (isStartingSession) {
    return;
  }
  isStartingSession = true;
  isClosed = false;
  await reportSessionStatus(status);
  fitAddon?.fit();
  lastResize = normalizeTerminalSize({
    cols: terminal.cols || 80,
    rows: terminal.rows || 24,
  });
  try {
    const previousSessionId = sessionId;
    const response = await bridge.startSession({
      cols: lastResize.cols,
      rows: lastResize.rows,
      terminalId,
    });
    sessionId = response.sessionId;
    reconnectAttempt = 0;
    await reportSessionStatus("connected");
    if (previousSessionId && previousSessionId !== sessionId) {
      nextSeq = 0;
      terminal.writeln("\r\n[previous terminal session was unavailable; started a new one]\r\n");
    }
    schedulePoll(0);
  } catch (error) {
    scheduleReconnect(error);
  } finally {
    isStartingSession = false;
  }
}

function normalizeTerminalSize(size: { cols: number; rows: number }) {
  const cols = Number.isFinite(size.cols) ? Math.floor(size.cols) : 80;
  const rows = Number.isFinite(size.rows) ? Math.floor(size.rows) : 24;
  return {
    cols: Math.min(300, Math.max(cols, 2)),
    rows: Math.min(120, Math.max(rows, 2)),
  };
}

function pollOutput() {
  if (isClosed || !sessionId || isPolling) {
    return;
  }
  if (pollTimer) {
    window.clearTimeout(pollTimer);
    pollTimer = 0;
  }
  isPolling = true;
  bridge
    .readSession({ sessionId, since: nextSeq, terminalId })
    .then((response) => {
      const chunks = Array.isArray(response?.chunks) ? response.chunks : [];
      for (const chunk of chunks) {
        terminal?.write(chunk.data);
      }
      nextSeq = typeof response?.nextSeq === "number" ? response.nextSeq : nextSeq;
      reconnectAttempt = 0;
      void reportSessionStatus("connected");
      if (response?.exitedAt) {
        isClosed = true;
        void reportSessionStatus(
          "closed",
          typeof response.exitCode === "number" ? `Exited with ${response.exitCode}` : undefined,
        );
        terminal?.writeln(
          `\r\n[session closed${typeof response.exitCode === "number" ? `: ${response.exitCode}` : ""}]\r\n`,
        );
        return;
      }
      schedulePoll(120);
    })
    .catch((error) => {
      scheduleReconnect(error);
    })
    .finally(() => {
      isPolling = false;
    });
}

function schedulePoll(delay: number) {
  if (isClosed) {
    return;
  }
  if (pollTimer) {
    window.clearTimeout(pollTimer);
  }
  pollTimer = window.setTimeout(pollOutput, delay);
}

function scheduleReconnect(error: unknown) {
  if (isClosed) {
    return;
  }
  reconnectAttempt += 1;
  const delay = Math.min(1000 * 2 ** Math.min(reconnectAttempt - 1, 4), 15000);
  const message = `Retrying in ${Math.round(delay / 1000)}s: ${errorMessage(error)}`;
  void reportSessionStatus("reconnecting", message);
  if (reconnectAttempt === 1) {
    terminal?.writeln(
      `\r\n[connection interrupted; reconnecting to the same terminal session]\r\n`,
    );
  }
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
  }
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = 0;
    void reconnectSession("auto");
  }, delay);
}

async function reconnectSession(source: "auto" | "manual") {
  if (!terminal) {
    return;
  }
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = 0;
  }
  if (source === "manual") {
    terminal.writeln("\r\n[reconnecting to the existing terminal session]\r\n");
  }
  await startSession("reconnecting");
}

async function reportSessionStatus(status: WorkspaceSshTerminalSessionStatus, message?: string) {
  await bridge
    .reportSessionStatus({
      message,
      sessionId: sessionId || undefined,
      status,
      terminalId,
    })
    .catch(() => {});
}

window.addEventListener("resize", () => {
  fitAddon?.fit();
});

window.addEventListener("beforeunload", () => {
  isClosed = true;
  if (pollTimer) {
    window.clearTimeout(pollTimer);
  }
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
  }
});

function containerElement() {
  const container = document.getElementById("terminal-container");
  if (!container) {
    throw new Error("Terminal container is missing.");
  }
  return container;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
