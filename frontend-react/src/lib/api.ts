const BASE = ''

export async function apiPost<T = unknown>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) {
    const msg = (data.detail?.[0]?.msg ?? data.detail ?? JSON.stringify(data)) as string
    throw new Error(msg)
  }
  return data as T
}
