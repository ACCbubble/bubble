import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../api'
import { setActiveGroupId } from '../../../bubble-backend/src/lib/groupSelection'

type Group = {
  id: number
  name: string
}

export function GroupsPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<Group[]>('/groups')
      .then((result) => setGroups(result))
      .catch(() => setError('Could not load groups. Please sign in and try again.'))
      .finally(() => setLoading(false))
  }, [])

  function openGroup(groupId: number): void {
    setActiveGroupId(groupId)
    navigate(`/messages?groupId=${groupId}`)
  }

  if (loading) return <p>Loading groups...</p>
  if (error) return <p>{error}</p>
  if (!groups.length) return <p>No groups yet.</p>

  return (
    <section>
      <h1>Your groups</h1>
      <p>Choose a group to open that group&apos;s messages and polls.</p>

      <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 420 }}>
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => openGroup(group.id)}
            style={{ padding: '0.75rem', textAlign: 'left' }}
          >
            {group.name}
          </button>
        ))}
      </div>
    </section>
  )
}