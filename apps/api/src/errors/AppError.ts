export type AppErrorDetails = Record<string, unknown> | Array<Record<string, unknown>>;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: AppErrorDetails;
  public readonly expose: boolean;

  constructor(input: {
    statusCode: number;
    message: string;
    code?: string;
    details?: AppErrorDetails;
    expose?: boolean;
  }) {
    super(input.message);
    this.statusCode = input.statusCode;
    this.code = input.code ?? "APP_ERROR";
    this.details = input.details;
    this.expose = input.expose ?? input.statusCode < 500;
  }
}

export function isStatusError(
  error: unknown
): error is {
  statusCode: number;
  message: string;
  code?: string;
  details?: AppErrorDetails;
} {
  return (
    Boolean(error) &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  );
}

