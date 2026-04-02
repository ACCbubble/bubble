const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

async function fetchWithRefresh(
  url: string,
  options: RequestInit,
  retry = true
): Promise<Response> {
  const res = await fetch(url, options)

  if (res.status === 401 && retry) {
    // Access token expired — attempt silent refresh using the refresh_token cookie
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (refreshRes.ok) {
      // New access_token cookie is set; retry the original request once
      return fetchWithRefresh(url, options, false)
    }

    // Refresh also failed — session is dead, send to sign-in
    window.location.href = '/sign-in'
  }

  return res
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetchWithRefresh(`${API_BASE_URL}${path}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Request failed')
  }

  return (await res.json()) as T
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithRefresh(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error('Request failed')
  }

  return (await res.json()) as T
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetchWithRefresh(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Request failed')
  }

  return (await res.json()) as T
}
