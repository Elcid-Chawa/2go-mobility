const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
const RENTALS_API_URL =
  process.env.NEXT_PUBLIC_RENTALS_API_URL ||
  "http://localhost:5103/api/v1/car-rentals";
const MOVERS_API_URL =
  process.env.NEXT_PUBLIC_MOVERS_API_URL ||
  "http://localhost:5101/api/v1/movers";
const ACCESS_TOKEN_KEY = "2go.ops.accessToken";
const REFRESH_TOKEN_KEY = "2go.ops.refreshToken";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

async function decodeResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as Partial<
    ApiEnvelope<T>
  > & { message?: string };
  if (!response.ok || body.success === false) {
    throw new Error(body.message || "The request could not be completed");
  }
  return body.data as T;
}

function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null };
  }
  return {
    accessToken: sessionStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: sessionStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

function storeTokens(accessToken: string, refreshToken: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getAccessToken(): string | null {
  return getStoredTokens().accessToken;
}

export async function registerRequest(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "RENTAL_PARTNER" | "MOVER_PARTNER";
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await decodeResponse<{
    tokens: { accessToken: string; refreshToken: string };
  }>(response);
  storeTokens(result.tokens.accessToken, result.tokens.refreshToken);
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<{
  user: { id: string; name: string; email: string; role: string; status: string };
  tokens: { accessToken: string; refreshToken: string };
}> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const result = await decodeResponse<{
    user: { id: string; name: string; email: string; role: string; status: string };
    tokens: { accessToken: string; refreshToken: string };
  }>(response);
  storeTokens(result.tokens.accessToken, result.tokens.refreshToken);
  return result;
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) throw new Error("Your session has expired. Sign in again.");

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const tokens = await decodeResponse<{ accessToken: string; refreshToken: string }>(
    response,
  );
  storeTokens(tokens.accessToken, tokens.refreshToken);
  return tokens.accessToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error("Sign in to continue.");

  const send = (token: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: "Bearer " + token,
      },
    });

  let response = await send(accessToken);
  if (response.status === 401) {
    try {
      response = await send(await refreshAccessToken());
    } catch (error) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      throw error;
    }
  }
  return decodeResponse<T>(response);
}

export async function rentalRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error("Sign in to continue.");
  const send = (token: string) =>
    fetch(`${RENTALS_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: "Bearer " + token,
      },
    });

  let response = await send(accessToken);
  if (response.status === 401) {
    try {
      response = await send(await refreshAccessToken());
    } catch (error) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      throw error;
    }
  }
  return decodeResponse<T>(response);
}

export async function moverRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error("Sign in to continue.");
  const send = (token: string) =>
    fetch(`${MOVERS_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: "Bearer " + token,
      },
    });
  let response = await send(accessToken);
  if (response.status === 401) {
    try {
      response = await send(await refreshAccessToken());
    } catch (error) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      throw error;
    }
  }
  return decodeResponse<T>(response);
}

export async function rentalFile(path: string): Promise<string> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error("Sign in to continue.");
  const send = (token: string) =>
    fetch(`${RENTALS_API_URL}${path}`, {
      headers: { Authorization: "Bearer " + token },
    });
  let response = await send(accessToken);
  if (response.status === 401) {
    try {
      response = await send(await refreshAccessToken());
    } catch (error) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      throw error;
    }
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || "Unable to retrieve the rental document.");
  }
  return URL.createObjectURL(await response.blob());
}

export async function rentalUpload<T>(path: string, file: File): Promise<T> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error("Sign in to continue.");
  const formData = new FormData();
  formData.append("file", file);
  const send = (token: string) =>
    fetch(`${RENTALS_API_URL}${path}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    });
  let response = await send(accessToken);
  if (response.status === 401) {
    try {
      response = await send(await refreshAccessToken());
    } catch (error) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      throw error;
    }
  }
  return decodeResponse<T>(response);
}

export async function apiFile(path: string): Promise<string> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error("Sign in to continue.");

  const send = (token: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: "Bearer " + token },
    });
  let response = await send(accessToken);
  if (response.status === 401) {
    try {
      response = await send(await refreshAccessToken());
    } catch (error) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      throw error;
    }
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || "Unable to retrieve the requested file.");
  }
  return URL.createObjectURL(await response.blob());
}

export async function clearSession(): Promise<void> {
  try {
    if (getAccessToken()) await apiRequest<null>("/auth/logout", { method: "POST" });
  } finally {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
