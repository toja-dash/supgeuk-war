import axios, { type AxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosClient.get(url, config);
    if (response.data && response.data.status === 'ok') {
      return response.data.data as T;
    }
    return response.data as T;
  },
};
