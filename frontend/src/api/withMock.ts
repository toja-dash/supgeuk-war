import { apiClient } from './client';

export async function getOrMock<T>(url: string, mock: T): Promise<T> {
  try {
    const data = await apiClient.get<T>(url);
    if (data === null || data === undefined) return mock;
    return data;
  } catch {
    return mock;
  }
}
