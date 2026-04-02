import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '../api'

interface User { userId: number; name: string }
interface Group { id: number; name: string }
interface Message { id: number; content: string; createdAt: string; sender: { id: number; name: string } }

export function MessagesPage() {
  const [me, setMe] = useState<User | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<User>('/auth/me').then(setMe).catch(() => setError('Not logged in'))
    apiGet<Group[]>('/groups').then(setGroups).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedGroup) return
    const load = () => apiGet<Message[]>(`/groups/${selectedGroup.id}/messages`).then(setMessages).catch(() => {})
    load()
    const id = setInterval(load, 2000)
    return () => clearInterval(id)
  }, [selectedGroup])

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      const g = await apiPost<Group>('/groups', { name: newGroupName.trim() })
      setGroups(prev => [...prev, g])
      setNewGroupName('')
      setSelectedGroup(g)
    } catch { setError('Failed to create group') }
  }

  const sendMessage = async () => {
    if (!text.trim() || !selectedGroup || !me) return
    try {
      await apiPost('/messages', { groupId: selectedGroup.id, senderId: me.userId, content: text.trim() })
      setText('')
      const msgs = await apiGet<Message[]>(`/groups/${selectedGroup.id}/messages`)
      setMessages(msgs)
    } catch { setError('Failed to send') }
  }

  return (
    <div>
      <p>Logged in as: {me ? me.name : '...'}</p>
      {error && <p>Error: {error}</p>}

      <hr />
      <b>Groups</b>
      <div>
        {groups.map(g => (
          <div key={g.id}>
            <button onClick={() => setSelectedGroup(g)}>{g.name}{selectedGroup?.id === g.id ? ' (selected)' : ''}</button>
          </div>
        ))}
      </div>
      <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="new group name" />
      <button onClick={createGroup}>Create group</button>

      <hr />
      {selectedGroup ? (
        <div>
          <b>#{selectedGroup.name}</b>
          <div style={{ height: 300, overflowY: 'scroll', border: '1px solid black' }}>
            {messages.map(m => (
              <div key={m.id}><b>{m.sender.name}</b>: {m.content}</div>
            ))}
          </div>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="type a message"
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      ) : (
        <p>Select a group</p>
      )}
    </div>
  )
}
