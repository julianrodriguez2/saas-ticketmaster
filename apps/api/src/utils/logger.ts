type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = {
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
};

function emitLog(payload: LogPayload): void {
  const logLine = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...payload
  });

  if (payload.level === "error") {
    console.error(logLine);
    return;
  }

  if (payload.level === "warn") {
    console.warn(logLine);
    return;
  }

  console.info(logLine);
}

export function logInfo(message: string, metadata: Record<string, unknown> = {}): void {
  emitLog({
    level: "info",
    message,
    ...metadata
  });
}

export function logWarn(message: string, metadata: Record<string, unknown> = {}): void {
  emitLog({
    level: "warn",
    message,
    ...metadata
  });
}

export function logError(message: string, metadata: Record<string, unknown> = {}): void {
  emitLog({
    level: "error",
    message,
    ...metadata
  });
}

