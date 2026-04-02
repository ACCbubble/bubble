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

export function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function loadMessages() {
    setLoading(true)

    try {
      const response = await apiGet<MessageResponse[]>(GET_MESSAGES_ENDPOINT)
      setMessages(response.map(normalizeMessage))
      setError('')
    } catch (error) {
      console.error('Failed to load messages:', error)
      setError('Could not load messages. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMessages()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedMessage = messageInput.trim()
    if (!trimmedMessage) return

    setSending(true)

    try {
      await apiPost(POST_MESSAGE_ENDPOINT, {
        groupId: GROUP_ID,
        senderId: SENDER_ID,
        content: trimmedMessage,
      })

      setMessageInput('')
      setError('')
      await loadMessages()
    } catch (error) {
      console.error('Failed to send message:', error)
      setError('Could not send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <p>Loading messages...</p>
  }

  return (
    <section className="messages-page">
      <header className="messages-header">
        <h1>{GROUP_CHAT_NAME}</h1>
        <p>Group {GROUP_ID}</p>
      </header>

      {error && <p className="messages-error">{error}</p>}

      <div className="messages-list" aria-live="polite">
        {messages.length === 0 ? (
          <p>No messages yet. Start the conversation.</p>
        ) : (
          messages.map((message) => (
            <article key={message.id} className="message-card">
              <p className="message-content">{message.content}</p>
              <footer className="message-meta">
                <strong>{message.username}</strong>
                <span>{formatDateTime(message.createdAt)}</span>
              </footer>
            </article>
          ))
        )}
      </div>

      <form className="messages-form" onSubmit={handleSubmit}>
        <label htmlFor="new-message">Type a message</label>
        <textarea
          id="new-message"
          value={messageInput}
          onChange={(event) => setMessageInput(event.target.value)}
          placeholder="Write to the group chat..."
          rows={3}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !messageInput.trim()}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </section>
  )
}