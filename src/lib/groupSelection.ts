export const ACTIVE_GROUP_KEY = 'bubble_active_group_id'

export function getActiveGroupId(): number | null {
  const rawValue = localStorage.getItem(ACTIVE_GROUP_KEY)
  if (!rawValue) return null

  const parsed = Number(rawValue)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function setActiveGroupId(groupId: number): void {
  localStorage.setItem(ACTIVE_GROUP_KEY, String(groupId))
}

export function getGroupIdFromSearch(searchValue: string): number | null {
  const searchParams = new URLSearchParams(searchValue)
  const rawValue = searchParams.get('groupId')
  if (!rawValue) return null

  const parsed = Number(rawValue)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}