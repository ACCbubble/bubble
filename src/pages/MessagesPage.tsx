import { useState } from 'react'
import { getUsername } from '../lib/username'

type Message = {
  id: number
  username: string
  text: string
  createdAt: string
}

const demoMessages: Message[] = [
  {
    id: 1,
    username: 'Sarah',
    text: 'Hey, are we still meeting later?',
    createdAt: '2026-04-01T09:00:00Z',
  },
  {
    id: 2,
    username: 'Marcus',
    text: 'Yes, I can join in about 15 minutes.',
    createdAt: '2026-04-01T09:05:00Z',
  },
  {
    id: 3,
    username: 'Ava',
    text: 'Perfect. I will send the notes in this thread after.',
    createdAt: '2026-04-01T09:07:00Z',
  },
]

export function MessagesPage() {
  const [inputValue, setInputValue] = useState('')
  const username = getUsername() ?? 'Guest User'

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    alert(`Pretend sending message as ${username}: ${inputValue}`)
    setInputValue('')
  }

  return (
    <section className="messages-page">
      <header className="messages-header">
        <div>
          <p className="messages-eyebrow">Thread 1</p>
          <h1>Messages</h1>
          <p className="messages-subtitle">
            Demo messaging interface for the Bubble project.
          </p>
        </div>

        <div className="messages-user-card">
          <span className="messages-user-label">Posting as</span>
          <strong>{username}</strong>
        </div>
      </header>

      <div className="messages-shell">
        <div className="messages-thread-header">
          <div>
            <h2>General Discussion</h2>
            <p>Hardcoded demo view for one thread.</p>
          </div>
          <button type="button" className="secondary-button">
            Refresh
          </button>
        </div>

        <div className="messages-list">
          {demoMessages.map((message) => (
            <article className="message-card" key={message.id}>
              <div className="message-card-header">
                <strong>{message.username}</strong>
                <span>{new Date(message.createdAt).toLocaleString()}</span>
              </div>
              <p>{message.text}</p>
            </article>
          ))}
        </div>

        <form className="message-composer" onSubmit={onSubmit}>
          <label className="composer-label" htmlFor="message-input">
            New message
          </label>
          <div className="composer-row">
            <input
              id="message-input"
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Type a message for thread 1..."
            />
            <button type="submit" className="primary-button">
              Send
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
