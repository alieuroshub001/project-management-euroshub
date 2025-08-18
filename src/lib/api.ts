// lib/api.ts
import { IApiResponse } from '@/types';

interface FetchOptions extends RequestInit {
  body?: any;
}

export async function fetchApi<T = any>(
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
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const json = await response.json();
    return json as IApiResponse<T>;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    } as IApiResponse<T>;
  }
}