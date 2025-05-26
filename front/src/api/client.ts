import axios, { type AxiosInstance } from 'axios'
import type { ExecutionResponse, ApiClient } from '../api/types.ts'

const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export const executeCode = async (code: string): Promise<ExecutionResponse> => {
  try {
    const response = await apiClient.post<ExecutionResponse>('/execute', { code })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        error: error.response?.data?.error || 'Unknown API error'
      }
    }
    return {
      error: 'Network error occurred'
    }
  }
}

export const api: ApiClient = {
  executeCode
}
