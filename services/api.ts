import AsyncStorage from '@react-native-async-storage/async-storage';

//const BASE_URL = 'http://192.168.1.9:8000/api';
const BASE_URL = 'https://route-share-app.onrender.com/api';

const TOKEN_KEY = '@routeshare_token';
const USER_KEY = '@routeshare_user';

class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function handleUnauthorized() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  if (onUnauthorized) {
    onUnauthorized();
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      await handleUnauthorized();
    }
    const message = data.message || 'Something went wrong. Please try again.';
    throw new ApiError(message, response.status, data.errors);
  }

  return data;
}

export function get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  return request<T>(url);
}

export function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      await handleUnauthorized();
    }
    const message = data.message || 'Something went wrong.';
    throw new ApiError(message, response.status, data.errors);
  }
  return data;
}

export function put<T>(endpoint: string, body: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, {
    method: 'DELETE',
  });
}

export function patch<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function putFormData<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers,
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      await handleUnauthorized();
    }
    const message = data.message || 'Something went wrong.';
    throw new ApiError(message, response.status, data.errors);
  }
  return data;
}

export { ApiError, BASE_URL, getToken, TOKEN_KEY, USER_KEY };
