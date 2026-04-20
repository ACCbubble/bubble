import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPatch, apiPost } from '../api'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

interface Me { userId: number; name: string }
interface Group {
  id: number
  name: string | null
  location: string | null
  eventTime: string | null
  description: string | null
}
interface EmojiType { id: number; name: string; emoji: string }
interface RtEmoji { emojiId: number; score: number; topQuotes: string[] }
interface RtMember { userId: number; name: string; emojis: RtEmoji[] }
interface Roundtable { members: RtMember[] }
interface Message { id: number; content: string; createdAt: string; sender: { id: number; name: string } }
interface FeedMessage extends Message { relevanceScore: number }
interface UserAttribute { key: string; score: number }

type Status = 'coming' | 'not-responded' | 'not-coming'
type View = 'suggest' | 'current' | 'all'

const GRADIENT = 'linear-gradient(135deg, #63b7ff 0%, #6159ff 100%)'
const PANEL_BG = '#ffffff'
const SHELL_BG = '#f7f8fc'

const MOCK_EMOJI_MAP: Record<number, EmojiType> = {
  1: { id: 1, name: 'coming', emoji: '👍' },
  2: { id: 2, name: 'needs_ride', emoji: '❓' },
  3: { id: 3, name: 'bringing_food', emoji: '🎮' },
}

const MOCK_ROUNDTABLE: Roundtable = {
  members: [
    { userId: 1, name: 'Andy', emojis: [{ emojiId: 1, score: 0.9, topQuotes: ['I\'m in! What time should we meet?'] }] },
    { userId: 2, name: 'Sidney', emojis: [{ emojiId: 2, score: 0.8, topQuotes: ['Not sure yet'] }] },
    { userId: 3, name: 'Anikar', emojis: [{ emojiId: 2, score: 0.3, topQuotes: ['Depends on work'] }] },
    { userId: 4, name: 'Colin', emojis: [{ emojiId: 3, score: 0.8, topQuotes: ['I\'ll bring some games!'] }] },
    { userId: 5, name: 'Rohan', emojis: [{ emojiId: 3, score: 0.8, topQuotes: ['I can give people rides if needed'] }] },
    { userId: 6, name: 'Manasa', emojis: [{ emojiId: 2, score: 0.7, topQuotes: ['Thinking...'] }] },
  ],
}

const MOCK_MESSAGES: Message[] = [
  { id: 1, content: 'Perfect! See you all there', createdAt: new Date(Date.now() - 23 * 60000).toISOString(), sender: { id: 4, name: 'Colin' } },
  { id: 2, content: 'I might not make it, got a work thing', createdAt: new Date(Date.now() - 20 * 60000).toISOString(), sender: { id: 5, name: 'Rohan' } },
  { id: 3, content: 'I\'m in! What time should we meet?', createdAt: new Date(Date.now() - 26 * 60000).toISOString(), sender: { id: 1, name: 'Andy' } },
  { id: 4, content: 'I can give people rides if needed', createdAt: new Date(Date.now() - 18 * 60000).toISOString(), sender: { id: 1, name: 'Andy' } },
  { id: 5, content: 'I\'ll bring some games!', createdAt: new Date(Date.now() - 15 * 60000).toISOString(), sender: { id: 4, name: 'Colin' } },
]

const AVATAR_COLORS = ['#4f79ff', '#5ac8fa', '#50c878', '#8a7dff', '#ff7f7f', '#ffaa66']
const SEGMENT_COLORS = ['#5fb6ff', '#74d6d5', '#f3cf6e', '#f3a672', '#f08ab2', '#a788e8']

function memberColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

function initials(name: string) {
  return (name.trim()[0] ?? '?').toUpperCase()
}

function angleToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcSlicePath(cx: number, cy: number, outerR: number, innerR: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0
  const p1 = angleToXY(cx, cy, outerR, start)
  const p2 = angleToXY(cx, cy, outerR, end)
  const p3 = angleToXY(cx, cy, innerR, end)
  const p4 = angleToXY(cx, cy, innerR, start)
  return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y} Z`
}

function ForYouToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 62,
        height: 38,
        borderRadius: 20,
        border: 'none',
        background: on ? GRADIENT : '#d9deea',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 4,
          left: on ? 28 : 4,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
          transition: 'left 0.2s',
        }}
      />
    </button>
  )
}

function SegmentDonut({ members }: { members: RtMember[] }) {
  const size = 620
  const center = size / 2
  const outer = 170
  const inner = 110
  const count = Math.max(members.length, 6)
  const each = 360 / count

  const labels = members.slice(0, 6)

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size}>
        {new Array(6).fill(0).map((_, i) => {
          const start = i * each
          const end = start + each
          return (
            <path
              key={i}
              d={arcSlicePath(center, center, outer, inner, start + 0.8, end - 0.8)}
              fill={SEGMENT_COLORS[i]}
              opacity={0.92}
              stroke="#fff"
              strokeWidth={3}
            />
          )
        })}

        <circle cx={center} cy={center} r={inner - 2} fill="#fff" />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#9aa5c7',
          pointerEvents: 'none',
          textAlign: 'center',
          fontSize: 16,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 12 }}>☝️</div>
        <div>Hover over segments</div>
        <div>to see details</div>
      </div>

      {labels.map((m, i) => {
        const a = i * 60 + 30
        const p = angleToXY(center, center, 237, a)
        return (
          <div
            key={m.userId}
            style={{
              position: 'absolute',
              left: p.x - 58,
              top: p.y - 20,
              width: 116,
              height: 40,
              borderRadius: 22,
              border: '1px solid #ebeff7',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 8px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: memberColor(m.userId),
                color: '#fff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}
            >
              {initials(m.name)}
            </div>
            <span style={{ fontSize: 18, color: '#4a587f' }}>{m.name}</span>
          </div>
        )
      })}
    </div>
  )
}

function MessageRow({ msg }: { msg: Message }) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const color = memberColor(msg.sender.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: color,
            color: '#fff',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
          }}
        >
          {initials(msg.sender.name)}
        </div>
        <span style={{ color: '#2f3f72', fontSize: 16, lineHeight: '12px' }}>{msg.sender.name}</span>
        <span style={{ color: '#acb6d1', fontSize: 12, lineHeight: '12px' }}>{time}</span>
      </div>

      <div
        style={{
          marginLeft: 38,
          display: 'inline-block',
          background: '#f3f6fb',
          color: '#4c5f8f',
          borderRadius: 18,
          padding: '10px 16px',
          fontSize: 15,
          lineHeight: 1.3,
          maxWidth: '86%',
        }}
      >
        {msg.content}
      </div>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
  placeholder,
  onSave,
  isTime,
}: {
  icon: string
  label: string
  value: string | null
  placeholder: string
  onSave: (value: string) => void
  isTime?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const display = isTime && value
    ? new Date(value).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : value

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderBottom: '1px solid #edf1f8' }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ color: '#b4bed7', minWidth: 90 }}>{label}</span>
      {editing ? (
        isTime ? (
          <input
            autoFocus
            type="datetime-local"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onSave(draft); setEditing(false) }}
            style={{ flex: 1, border: 'none', borderBottom: '1px solid #99b8ff', outline: 'none', background: 'transparent' }}
          />
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => { onSave(draft); setEditing(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { onSave(draft); setEditing(false) } }}
            style={{ flex: 1, border: 'none', borderBottom: '1px solid #99b8ff', outline: 'none', background: 'transparent' }}
          />
        )
      ) : (
        <span
          style={{ color: display ? '#4a587f' : '#c2cade', cursor: 'pointer' }}
          onClick={() => { setDraft(isTime && value ? value.slice(0, 16) : (value ?? '')); setEditing(true) }}
        >
          {display || placeholder}
        </span>
      )}
    </div>
  )
}

function getMemberStatus(member: RtMember, comingEmojiId: number | null): Status {
  if (!comingEmojiId) return 'not-responded'
  const incoming = member.emojis.find(e => e.emojiId === comingEmojiId)
  if (!incoming) return 'not-responded'
  return incoming.score >= 0.4 ? 'coming' : 'not-coming'
}

function relevance(m: RtMember, emojiMap: Record<number, EmojiType>, attrs: Record<string, number>) {
  let score = 0
  for (const e of m.emojis) {
    const name = emojiMap[e.emojiId]?.name
    if (!name) continue
    const rel = name === 'needs_ride' ? (attrs.has_car ?? 0)
      : name === 'bringing_food' ? (attrs.has_dietary_restriction ?? 0)
      : 1
    score += rel * e.score
  }
  return score
}

export function EventPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [emojiMap, setEmojiMap] = useState<Record<number, EmojiType>>(MOCK_EMOJI_MAP)
  const [roundtable, setRoundtable] = useState<Roundtable>(MOCK_ROUNDTABLE)
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES)
  const [feedMessages, setFeedMessages] = useState<FeedMessage[]>([])
  const [userAttrs, setUserAttrs] = useState<Record<string, number>>({})

  const [view, setView] = useState<View>('current')
  const [forYou, setForYou] = useState(true)
  const [text, setText] = useState('')
  const [suggestName, setSuggestName] = useState('')
  const [suggestMsg, setSuggestMsg] = useState('')
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiGet<Me>('/auth/me')
      .then(currentMe => {
        setMe(currentMe)
        return apiGet<{ attributes: UserAttribute[] }>(`/attributes?userId=${currentMe.userId}`)
      })
      .then(r => {
        const attrs: Record<string, number> = {}
        r.attributes.forEach(a => { attrs[a.key] = a.score })
        setUserAttrs(attrs)
      })
      .catch(() => undefined)

    apiGet<Group[]>('/groups')
      .then(gs => {
        setGroups(gs)
        if (gs.length) setSelectedGroup(gs[0])
      })
      .catch(() => undefined)

    fetch(`${API_BASE}/emoji-types`)
      .then(r => r.json())
      .then((types: EmojiType[]) => {
        const map: Record<number, EmojiType> = {}
        types.forEach(t => { map[t.id] = t })
        setEmojiMap(map)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!selectedGroup) return

    const loadRoundtable = () => apiGet<Roundtable>(`/roundtable?groupId=${selectedGroup.id}`).then(setRoundtable).catch(() => undefined)
    const loadMessages = () => apiGet<Message[]>(`/groups/${selectedGroup.id}/messages`).then(setMessages).catch(() => undefined)
    const loadFeed = () => {
      if (!me) return
      apiGet<FeedMessage[]>(`/groups/${selectedGroup.id}/feed?userId=${me.userId}`).then(setFeedMessages).catch(() => undefined)
    }

    loadRoundtable()
    loadMessages()
    loadFeed()

    const ws = new WebSocket(`${API_BASE.replace(/^http/, 'ws')}?groupId=${selectedGroup.id}`)
    wsRef.current = ws
    ws.onmessage = event => {
      const data = JSON.parse(event.data)
      if (data.type === 'context_updated') {
        loadRoundtable()
        loadFeed()
      }
      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.message as Message])
        loadFeed()
      }
    }

    return () => ws.close()
  }, [selectedGroup, me])

  useEffect(() => {
    if (!forYou) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, forYou])

  const members = useMemo(() => {
    const hasAttrs = Object.keys(userAttrs).length > 0
    if (!hasAttrs || !me) return roundtable.members
    return roundtable.members
      .filter(m => m.userId === me.userId || relevance(m, emojiMap, userAttrs) >= 0.05 || m.emojis.length === 0)
      .sort((a, b) => relevance(b, emojiMap, userAttrs) - relevance(a, emojiMap, userAttrs))
  }, [roundtable.members, me, emojiMap, userAttrs])

  const comingEmojiId = Object.values(emojiMap).find(e => e.name === 'coming')?.id ?? null
  const comingMembers = members.filter(m => getMemberStatus(m, comingEmojiId) === 'coming')
  const notRespondedMembers = members.filter(m => getMemberStatus(m, comingEmojiId) === 'not-responded')
  const notComingMembers = members.filter(m => getMemberStatus(m, comingEmojiId) === 'not-coming')

  const allEvents = groups.length > 0
    ? groups
    : [{ id: 0, name: selectedGroup?.name ?? 'Park Hangout', location: selectedGroup?.location ?? 'No location', eventTime: null, description: null }]

  const displayMessages = forYou
    ? (feedMessages.length ? feedMessages : [...messages].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))).filter(m => m.sender.id !== me?.userId)
    : [...messages].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))

  const sendMessage = async () => {
    if (!text.trim() || !selectedGroup || !me) return
    await apiPost('/messages', { groupId: selectedGroup.id, senderId: me.userId, content: text.trim() })
    setText('')
  }

  const updateField = async (field: keyof Group, value: string) => {
    if (!selectedGroup) return
    const updated = await apiPatch<Group>(`/groups/${selectedGroup.id}`, { [field]: value })
    setSelectedGroup(updated)
    setGroups(prev => prev.map(g => (g.id === updated.id ? updated : g)))
  }

  const suggestEvent = async () => {
    if (!suggestName.trim() || !suggestMsg.trim() || !me) {
      setSuggestError('Please fill in both fields.')
      return
    }
    setSuggestLoading(true)
    setSuggestError('')
    try {
      const group = await apiPost<Group>('/groups', { name: suggestName.trim() })
      await apiPost('/messages', { groupId: group.id, senderId: me.userId, content: suggestMsg.trim() })
      setGroups(prev => [...prev, group])
      setSelectedGroup(group)
      setView('current')
      setSuggestName('')
      setSuggestMsg('')
    } catch (error: unknown) {
      setSuggestError((error as Error)?.message ?? 'Could not create event.')
    }
    setSuggestLoading(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 52,
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 1540,
        background: SHELL_BG,
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, height: '100%' }}>
        <div
          style={{
            background: PANEL_BG,
            borderRadius: 24,
            border: '1px solid #ebeff6',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedGroup?.id ?? ''}
                onChange={e => {
                  const group = groups.find(g => g.id === Number(e.target.value))
                  if (group) setSelectedGroup(group)
                }}
                style={{
                  height: 50,
                  borderRadius: 26,
                  padding: '0 46px 0 20px',
                  background: GRADIENT,
                  color: '#fff',
                  border: 'none',
                  fontSize: 16,
                  appearance: 'none',
                  outline: 'none',
                }}
              >
                <option value="">Groups</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name ?? `Group ${g.id}`}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: '#fff' }}>▾</span>
            </div>

            <button style={{ height: 50, borderRadius: 26, border: 'none', padding: '0 22px', background: '#edf0ff', color: '#625ffb', fontSize: 16 }}>
              Invite
            </button>

            <button style={{ marginLeft: 'auto', height: 50, borderRadius: 26, border: '1px solid #e8ecf5', padding: '0 22px', background: '#fff', color: '#51608b', fontSize: 16 }}>
              Polls
            </button>

            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#eaf1ff', border: '1px solid #e5ebf8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5f6f97' }}>
              {initials(me?.name ?? 'U')}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SegmentDonut members={members} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 6 }}>
            <div style={{ borderRadius: 12, border: '1px solid #9edbb3', background: '#ecf9f0', padding: '10px 12px', color: '#17a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 30, lineHeight: '16px', fontWeight: 700 }}>{comingMembers.length}</span>
              <span>Coming</span>
            </div>
            <div style={{ borderRadius: 12, border: '1px solid #e4e8f2', background: '#f8f9fd', padding: '10px 12px', color: '#7182ad', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 30, lineHeight: '16px', fontWeight: 700 }}>{notRespondedMembers.length}</span>
              <span>Not Responded</span>
            </div>
            <div style={{ borderRadius: 12, border: '1px solid #f0c6aa', background: '#fff6f1', padding: '10px 12px', color: '#ef6f2f', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 30, lineHeight: '16px', fontWeight: 700 }}>{notComingMembers.length}</span>
              <span>Not Coming</span>
            </div>
          </div>

          <div style={{ marginTop: 12, border: '1px solid #edf1f8', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
            <DetailRow icon="📍" label="Location" value={selectedGroup?.location ?? null} placeholder="Add location..." onSave={v => updateField('location', v)} />
            <DetailRow icon="🕐" label="Time" value={selectedGroup?.eventTime ?? null} placeholder="Add date & time..." onSave={v => updateField('eventTime', v)} isTime />
            <div style={{ borderBottom: 'none' }}>
              <DetailRow icon="📄" label="Description" value={selectedGroup?.description ?? null} placeholder="Add description..." onSave={v => updateField('description', v)} />
            </div>
          </div>
        </div>

        <div
          style={{
            background: PANEL_BG,
            borderRadius: 24,
            border: '1px solid #ebeff6',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <div style={{ padding: 12 }}>
            <div style={{ background: '#f4f6fc', borderRadius: 16, padding: 4, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              <button onClick={() => setView('suggest')} style={{ border: 'none', borderRadius: 12, padding: '10px 8px', background: view === 'suggest' ? GRADIENT : 'transparent', color: view === 'suggest' ? '#fff' : '#51608b' }}>Suggest Event</button>
              <button onClick={() => setView('current')} style={{ border: 'none', borderRadius: 12, padding: '10px 8px', background: view === 'current' ? GRADIENT : 'transparent', color: view === 'current' ? '#fff' : '#51608b' }}>Current Event</button>
              <button onClick={() => setView('all')} style={{ border: 'none', borderRadius: 12, padding: '10px 8px', background: view === 'all' ? GRADIENT : 'transparent', color: view === 'all' ? '#fff' : '#51608b' }}>All Events</button>
            </div>
          </div>

          {view === 'suggest' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ margin: 0, color: '#2f3f72' }}>Suggest a New Event</h3>
              <input value={suggestName} onChange={e => setSuggestName(e.target.value)} placeholder="Event name" style={{ height: 44, borderRadius: 10, border: '1px solid #dde4f3', padding: '0 12px' }} />
              <textarea value={suggestMsg} onChange={e => setSuggestMsg(e.target.value)} placeholder="Initial message" rows={4} style={{ borderRadius: 10, border: '1px solid #dde4f3', padding: 12, resize: 'none' }} />
              {suggestError && <span style={{ color: '#dc2626' }}>{suggestError}</span>}
              <button onClick={suggestEvent} disabled={suggestLoading} style={{ height: 44, border: 'none', borderRadius: 10, background: GRADIENT, color: '#fff' }}>{suggestLoading ? 'Creating…' : 'Create Event'}</button>
            </div>
          )}

          {view === 'all' && (
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              <h3 style={{ margin: 0, color: '#2f3f72' }}>All Events</h3>
              {allEvents.map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    const found = groups.find(x => x.id === g.id)
                    if (found) setSelectedGroup(found)
                    setView('current')
                  }}
                  style={{
                    border: '1px solid #e2e8f4',
                    background: selectedGroup?.id === g.id ? '#eff4ff' : '#fff',
                    borderRadius: 12,
                    textAlign: 'left',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ color: '#2f3f72', fontWeight: 600 }}>{g.name ?? `Event ${g.id}`}</div>
                  <div style={{ color: '#9aa8cb', fontSize: 13 }}>{g.location ?? 'No location yet'}</div>
                </button>
              ))}
            </div>
          )}

          {view === 'current' && (
            <>
              <div style={{ padding: '4px 20px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, color: '#2f3f72', fontSize: 44 }}>{selectedGroup?.name ?? 'Park Hangout'}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4f5f8b', fontSize: 16 }}>
                    <span>For-You</span>
                    <ForYouToggle on={forYou} onToggle={() => setForYou(v => !v)} />
                  </div>
                </div>
                <div style={{ color: '#9babcf', marginTop: 4, fontSize: 16 }}>Group Chat</div>
              </div>

              <div style={{ height: 1, background: '#edf1f8' }} />
              <div style={{ padding: '12px 20px', color: '#8ea0cc', fontSize: 16 }}>✦ AI-sorted by relevancy</div>

              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {displayMessages.map(msg => <MessageRow key={msg.id} msg={msg} />)}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '12px 14px 16px', borderTop: '1px solid #edf1f8', display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                  placeholder="Type a message..."
                  style={{ flex: 1, height: 52, borderRadius: 26, border: '1px solid #e3e8f4', padding: '0 16px', fontSize: 16, outline: 'none' }}
                />
                <button onClick={sendMessage} style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: GRADIENT, color: '#fff', fontSize: 20 }}>➤</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
