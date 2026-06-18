function resolveBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const message = typeof body.message === 'string' ? body.message : 'Niepowodzenie zadania'
    throw new Error(message)
  }

  return body as T
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`)
  return parseResponse<T>(response)
}

export async function apiPost<T>(path: string, payload: object): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseResponse<T>(response)
}

export async function apiPatch<T>(path: string, payload: object): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseResponse<T>(response)
}
