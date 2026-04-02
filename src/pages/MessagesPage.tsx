import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { apiGet, apiPost } from '../api'

type MessageResponse = {
  id: number
  content: string
  createdAt: string
  senderId: number
  groupId: number
  sender?: {
    id: number
    name?: string
  }
}

type Message = {
  id: number
  content: string
  username: string
  createdAt: string
}

const GROUP_ID = 1
const SENDER_ID = 1
const GET_MESSAGES_ENDPOINT = `/groups/${GROUP_ID}/messages`
const POST_MESSAGE_ENDPOINT = '/messages'
const GROUP_CHAT_NAME = 'Group Chat'

function normalizeMessage(raw: MessageResponse): Message {
  return {
    id: raw.id,
    content: raw.content ?? '',
    username: raw.sender?.name ?? 'Unknown user',
    createdAt: raw.createdAt ?? new Date().toISOString(),
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
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