import { useState } from 'react'
import { api } from '@/api/client'
import type { ExecutionResponse, ApiClient } from '@/api/types'

export const useCodeExecutor = (): [
  (code: string) => Promise<void>,
  ExecutionResponse | null,
  boolean,
  string | null
] => {
  const [response, setResponse] = useState<ExecutionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (code: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.executeCode(code)
      setResponse(result)
      if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      setError('Failed to execute code')
      setResponse(null)
    } finally {
      setIsLoading(false)
    }
  }

  return [execute, response, isLoading, error]
}
