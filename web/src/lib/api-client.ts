function resolveBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}

async function parseResponse<T>(response: Response): Promise<T> {
  let body: any = {}
  const text = await response.text()
  
  if (text) {
    try {
      body = JSON.parse(text)
    } catch (e) {
      body = { message: text }
    }
  }

  if (!response.ok) {
    let message = 'Niepowodzenie zadania'
    if (typeof body.message === 'string') {
      message = body.message
    } else if (Array.isArray(body.message)) {
      message = body.message.join(', ')
    } else if (typeof body.error === 'string') {
      message = body.error
    }
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

export async function apiPut<T>(path: string, payload: object): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseResponse<T>(response)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return parseResponse<T>(response)
}
