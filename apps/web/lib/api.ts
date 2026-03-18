const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const headers = new Headers(options.headers ?? {});
  const requestInit: RequestInit = {
    ...options,
    headers,
    credentials: "include"
  };

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, requestInit);
  const responseIsJson = response.headers
    .get("content-type")
    ?.includes("application/json");

  const responseBody = responseIsJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage =
      responseBody &&
      typeof responseBody === "object" &&
      "message" in responseBody &&
      typeof responseBody.message === "string"
        ? responseBody.message
        : "Request failed.";

    throw new ApiError(response.status, errorMessage);
  }

  return responseBody as TResponse;
}
