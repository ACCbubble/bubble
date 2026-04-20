import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  DonutRing, EventStats, EventDetails, MessageItem, getMemberStatus,
  GRAD, th,
  type Event, type EmojiType, type RtMember, type Roundtable,
  type Poll, type Message, type Status, type HoveredEmoji,
} from './EventPage'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

interface DemoInfo { groupId: number; eventId: number; eventName: string }

export function DemoPage() {
  const darkMode = false
  const c = th(darkMode)

  const [info, setInfo] = useState<DemoInfo | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [roundtable, setRoundtable] = useState<Roundtable>({ members: [] })
  const [emojiMap, setEmojiMap] = useState<Record<number, EmojiType>>({})
  const [error, setError] = useState('')
  const [hoveredMember, setHoveredMember] = useState<number | null>(null)
  const [hoveredEmoji, setHoveredEmoji] = useState<HoveredEmoji | null>(null)
  const [hoveredStat, setHoveredStat] = useState<Status | null>(null)

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevEventIdRef = useRef<number | null>(null)

  const scrollToBottom = () => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  // Only scroll to bottom on initial load / event change
  useLayoutEffect(() => {
    if (event?.id !== prevEventIdRef.current) {
      prevEventIdRef.current = event?.id ?? null
      scrollToBottom()
    }
  }, [messages, event])

  // Load emoji types
  useEffect(() => {
    fetch(`${API_BASE}/emoji-types`)
      .then(r => r.json())
      .then((types: EmojiType[]) => {
        const m: Record<number, EmojiType> = {}
        types.forEach(t => { m[t.id] = t })
        setEmojiMap(m)
      })
      .catch(() => {})
  }, [])

  // Load demo info, then event + messages + roundtable
  useEffect(() => {
    fetch(`${API_BASE}/demo`)
      .then(r => r.json())
      .then((data: DemoInfo) => {
        setInfo(data)
        return Promise.all([
          fetch(`${API_BASE}/events/${data.eventId}/messages`).then(r => r.json()),
          fetch(`${API_BASE}/roundtable?eventId=${data.eventId}`).then(r => r.json()),
          fetch(`${API_BASE}/events/${data.eventId}`).then(r => r.json()),
        ])
      })
      .then(([msgs, rt, ev]) => {
        setMessages(msgs)
        setRoundtable(rt)
        setEvent(ev)
      })
      .catch(() => setError('Demo not available. Run: npx tsx prisma/demo-seed.ts'))
  }, [])

  // WebSocket for live updates
  useEffect(() => {
    if (!info) return
    const wsUrl = API_BASE.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsUrl}?eventId=${info.eventId}`)

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)

      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.message])
      }

      if (data.type === 'poll_updated') {
        const pollId = data.pollId as number
        fetch(`${API_BASE}/polls/${pollId}/results`)
          .then(r => r.json())
          .then((updatedPoll: Poll) => {
            setMessages(prev => prev.map(m => m.poll?.id === pollId ? { ...m, poll: updatedPoll } : m))
          })
          .catch(() => {})
        fetch(`${API_BASE}/events/${info.eventId}`)
          .then(r => r.json())
          .then(setEvent)
          .catch(() => {})
      }

      if (data.type === 'context_updated') {
        fetch(`${API_BASE}/roundtable?eventId=${info.eventId}`)
          .then(r => r.json())
          .then(setRoundtable)
          .catch(() => {})
      }
    }

    return () => ws.close()
  }, [info])

  const comingEmojiId    = Object.values(emojiMap).find(e => e.name === 'coming')?.id    ?? null
  const notComingEmojiId = Object.values(emojiMap).find(e => e.name === 'not_coming')?.id ?? null
  const maybeEmojiId     = Object.values(emojiMap).find(e => e.name === 'maybe')?.id      ?? null
  const members = roundtable.members
  const comingMembers        = members.filter(m => getMemberStatus(m, comingEmojiId, notComingEmojiId, maybeEmojiId) === 'coming')
  const notComingMembers     = members.filter(m => getMemberStatus(m, comingEmojiId, notComingEmojiId, maybeEmojiId) === 'not-coming')
  const notRespondedMembers  = members.filter(m => getMemberStatus(m, comingEmojiId, notComingEmojiId, maybeEmojiId) === 'not-responded')

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#ef4444', fontSize: 16 }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, bottom: 0,
      left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 1380,
      overflow: 'hidden', background: c.pageBg, zIndex: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12,
      padding: 16, boxSizing: 'border-box',
    }}>

      {/* Top header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>
          {event?.name ?? '…'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: 13, color: c.textSub, fontWeight: 500 }}>Live Demo</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, minHeight: 0, flex: 1 }}>

        {/* ── Left — Round Table ── */}
        <div style={{
          flex: '0 0 clamp(380px, 46%, 660px)', background: c.panelBg,
          borderRadius: 24, padding: '14px 16px 12px',
          boxShadow: darkMode ? '0 1px 8px rgba(0,0,0,0.3)' : '0 1px 8px rgba(0,0,0,0.07)',
          display: 'flex', flexDirection: 'column',
          boxSizing: 'border-box', overflow: 'hidden', minHeight: 0,
        }}>
          {/* Group / Event labels */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 6, paddingBottom: 6, fontSize: 13, color: 'white', borderRadius: 20, background: GRAD } as React.CSSProperties}>
              Demo
            </div>
            <div style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 6, paddingBottom: 6, fontSize: 13, color: c.text, borderRadius: 20, background: c.muted, border: `1px solid ${c.border}` }}>
              {event?.name ?? '…'}
            </div>
          </div>

          {/* Donut Ring */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', marginTop: -10 }}>
            <DonutRing
              members={members}
              emojiMap={emojiMap}
              hoveredMember={hoveredEmoji ? null : hoveredMember}
              hoveredEmoji={hoveredEmoji}
              onHover={setHoveredMember}
              onEmojiHover={setHoveredEmoji}
              darkMode={darkMode}
            />
          </div>

          {/* Stats */}
          <EventStats
            coming={comingMembers.length}
            notResponded={notRespondedMembers.length}
            notComing={notComingMembers.length}
            comingMembers={comingMembers}
            notRespondedMembers={notRespondedMembers}
            notComingMembers={notComingMembers}
            hoveredStat={hoveredStat}
            onStatHover={setHoveredStat}
            darkMode={darkMode}
          />

          {/* Event Details */}
          <div style={{ marginTop: 4, padding: '0 4px' }}>
            <EventDetails event={event} onEdit={() => {}} darkMode={darkMode} />
          </div>
        </div>

        {/* ── Right — Chat ── */}
        <div style={{
          flex: 1, minWidth: 280, background: c.panelBg,
          borderRadius: 24, boxShadow: darkMode ? '0 1px 8px rgba(0,0,0,0.3)' : '0 1px 8px rgba(0,0,0,0.07)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxSizing: 'border-box',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px 12px', flexShrink: 0 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
              {event?.name ?? '…'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: c.textFaint }}>Demo</p>
          </div>

          <div style={{ height: 1, background: c.border, flexShrink: 0 }} />

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}
          >
            {messages.length === 0
              ? <p style={{ fontSize: 12, color: c.textFaint, textAlign: 'center', marginTop: 32 }}>No messages yet</p>
              : messages.map(msg => <MessageItem key={msg.id} msg={msg} meId={null} darkMode={darkMode} />)
            }
          </div>

          {/* Disabled input */}
          <div style={{ flexShrink: 0, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', borderTop: `1px solid ${c.border}` }}>
            <input
              style={{ flex: 1, borderRadius: 20, padding: '8px 16px', fontSize: 14, outline: 'none', background: c.inputBg, border: 'none', color: c.textFaint, cursor: 'not-allowed' }}
              placeholder="Demo Mode — Cannot Send Messages"
              disabled
            />
            <button
              disabled
              style={{ flexShrink: 0, width: 38, height: 38, borderRadius: '50%', background: GRAD, border: 'none', cursor: 'not-allowed', color: 'white', fontWeight: 700, fontSize: 16, opacity: 0.4 }}
            >
              ↑
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
