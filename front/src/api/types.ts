export interface ExecutionRequest {
  code: string
}

export interface ExecutionResponse {
  output?: string
  error?: string
}

export interface ApiClient {
  executeCode: (code: string) => Promise<ExecutionResponse>
}
