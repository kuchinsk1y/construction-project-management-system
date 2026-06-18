export async function apiPost<T>(path: string, payload: object): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const text = await response.text()
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const message = typeof body.message === 'string' ? body.message : 'Request failed'
    throw new Error(message)
  }

  return body as T
}
