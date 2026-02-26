const USERNAME_STORAGE_KEY = 'bubble_username'

export function getUsername(): string | null {
  const raw = localStorage.getItem(USERNAME_STORAGE_KEY)

  if (raw === null) {
    return null
  }

  const trimmed = raw.trim()
  return trimmed ? trimmed : null
}

export function setUsername(name: string): void {
  const trimmed = name.trim()

  if (!trimmed) {
    localStorage.removeItem(USERNAME_STORAGE_KEY)
    return
  }

  localStorage.setItem(USERNAME_STORAGE_KEY, trimmed)
}
