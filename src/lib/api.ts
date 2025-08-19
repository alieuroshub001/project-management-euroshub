// lib/api.ts
import { IApiResponse } from '@/types';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  // Allows plain object, string, or FormData for flexibility
  body?: unknown;
}

export async function fetchApi<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<IApiResponse<T>> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      body:
        options.body instanceof FormData
          ? options.body
          : options.body && typeof options.body === 'object'
          ? JSON.stringify(options.body)
          : (options.body as BodyInit | null | undefined),
    });

    const json = (await response.json()) as IApiResponse<T>;
    return json;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    } as IApiResponse<T>;
  }
}