import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "@/config/api";
import { MESSAGES } from "@/constants/messages";

export const TOKEN_KEY = "jwt";

export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

export type ApiFieldError = { msg: string; path?: string };

type Envelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: ApiFieldError[];
};

export class ApiError extends Error {
  statusCode: number;
  errors?: ApiFieldError[];

  constructor(statusCode: number, message: string, errors?: ApiFieldError[]) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
export async function apiFetch<T = any>(
  path: string,
  { method = "GET", body, auth = true }: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, MESSAGES.NETWORK_ERROR);
  }

  let envelope: Envelope<T> | null = null;
  try {
    envelope = await response.json();
  } catch {
    // Non-JSON or empty body
  }

  if (!response.ok || envelope?.success === false) {

    const message =
      (response.status === 422 && envelope?.errors?.[0]?.msg) ||
      envelope?.message ||
      MESSAGES.REQUEST_FAILED(response.status);
    throw new ApiError(response.status, message, envelope?.errors);
  }

  return envelope?.data as T;
}
