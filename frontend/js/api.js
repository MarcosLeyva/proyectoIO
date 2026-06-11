const BASE = "http://localhost:8000";

export async function post(endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.detail?.[0]?.msg || data.detail || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}
