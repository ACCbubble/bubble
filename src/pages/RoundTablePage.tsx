import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost } from '../api'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

interface Me { userId: number; name: string }
interface Group { id: number; name: string }
interface EmojiType { id: number; name: string; emoji: string }
interface RtEmoji { emojiId: number; score: number; topQuotes: string[] }
interface RtMember { userId: number; name: string; emojis: RtEmoji[] }
interface Roundtable { members: RtMember[] }
interface Message { id: number; content: string; createdAt: string; sender: { id: number; name: string } }

const COLORS = ['#f472b6', '#34d399', '#fb923c', '#a78bfa', '#f87171', '#60a5fa', '#fbbf24', '#4ade80']
function memberColor(userId: number) { return COLORS[userId % COLORS.length] }

const RING_SIZE = 380
const ORBIT_RADIUS = 215
const CONTAINER = 500

export function RoundTablePage() {
  const [me, setMe] = useState<Me | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [emojiMap, setEmojiMap] = useState<Record<number, EmojiType>>({})
  const [roundtable, setRoundtable] = useState<Roundtable | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [hoveredMember, setHoveredMember] = useState<number | null>(null)
  const [hoveredEmoji, setHoveredEmoji] = useState<{ memberId: number; emojiIdx: number } | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [error, setError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  // Load user, groups, emoji types
  useEffect(() => {
    apiGet<Me>('/auth/me').then(setMe).catch(() => setError('Not logged in'))
    apiGet<Group[]>('/groups').then(gs => {
      setGroups(gs)
      if (gs.length === 1) setSelectedGroup(gs[0])
    }).catch(() => {})
    fetch(`${API_BASE}/emoji-types`)
      .then(r => r.json())
      .then((types: EmojiType[]) => {
        const map: Record<number, EmojiType> = {}
        for (const t of types) map[t.id] = t
        setEmojiMap(map)
      }).catch(() => {})
  }, [])

  // Load roundtable + messages when group changes, set up WebSocket + polling
  useEffect(() => {
    if (!selectedGroup) return

    const loadRoundtable = () =>
      apiGet<Roundtable>(`/roundtable?groupId=${selectedGroup.id}`).then(setRoundtable).catch(() => {})
    const loadMessages = () =>
      apiGet<Message[]>(`/groups/${selectedGroup.id}/messages`).then(setMessages).catch(() => {})

    loadRoundtable()
    loadMessages()

    // WebSocket for real-time context updates and new messages
    const wsUrl = API_BASE.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsUrl}?groupId=${selectedGroup.id}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'context_updated') loadRoundtable()
      if (data.type === 'new_message') setMessages(prev => [...prev, data.message])
    }

    return () => {
      ws.close()
    }
  }, [selectedGroup])

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      const g = await apiPost<Group>('/groups', { name: newGroupName.trim() })
      setGroups(prev => [...prev, g])
      setSelectedGroup(g)
      setNewGroupName('')
    } catch { setError('Failed to create group') }
  }

  const sendMessage = async () => {
    if (!text.trim() || !selectedGroup || !me) return
    try {
      await apiPost('/messages', { groupId: selectedGroup.id, senderId: me.userId, content: text.trim() })
      setText('')
    } catch { /* silent */ }
  }

  const members = roundtable?.members ?? []
  const cx = CONTAINER / 2
  const cy = CONTAINER / 2
  const positions = members.map((_, i) => {
    const angle = (-90 + (360 / Math.max(members.length, 1)) * i) * (Math.PI / 180)
    return { x: cx + ORBIT_RADIUS * Math.cos(angle), y: cy + ORBIT_RADIUS * Math.sin(angle) }
  })

  const activeMember = hoveredMember !== null ? members.find(m => m.userId === hoveredMember) : null
  const activeEmoji = hoveredEmoji
    ? members.find(m => m.userId === hoveredEmoji.memberId)?.emojis[hoveredEmoji.emojiIdx]
    : null
  const activeEmojiType = activeEmoji ? emojiMap[activeEmoji.emojiId] : null

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* Round table side */}
      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>

        {/* Group selector + create */}
        <div style={{ marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={selectedGroup?.id ?? ''}
            onChange={e => { const g = groups.find(g => g.id === Number(e.target.value)); if (g) setSelectedGroup(g) }}
          >
            <option value="">Select group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createGroup()}
            placeholder="new group name"
            style={{ padding: '4px 8px', fontSize: 13 }}
          />
          <button onClick={createGroup}>Create</button>
        </div>

        {error && <p style={{ color: 'red', fontSize: 12 }}>{error}</p>}

        {!selectedGroup ? (
          <p style={{ color: '#94a3b8' }}>Select a group</p>
        ) : (
          <div style={{ position: 'relative', width: CONTAINER, height: CONTAINER }}>

            {/* Gradient ring */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: RING_SIZE, height: RING_SIZE, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 45%, #93c5fd 100%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 52%, white 53%)',
              maskImage: 'radial-gradient(circle, transparent 52%, white 53%)',
              boxShadow: '0 0 40px rgba(37, 99, 235, 0.35)',
            }} />

            {/* Center content */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: RING_SIZE * 0.52 * 2 - 24,
              textAlign: 'center', pointerEvents: 'none',
            }}>
              {activeEmoji && activeEmojiType ? (
                <div>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{activeEmojiType.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeEmojiType.name}</div>
                  {activeEmoji.topQuotes.map((q, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#334155', marginBottom: 6, lineHeight: 1.4 }}>"{q}"</div>
                  ))}
                </div>
              ) : activeMember ? (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: memberColor(activeMember.userId), marginBottom: 10 }}>{activeMember.name}</div>
                  {activeMember.emojis.map(e => {
                    const et = emojiMap[e.emojiId]
                    return (
                      <div key={e.emojiId} style={{ fontSize: 12, color: '#334155', marginBottom: 5 }}>
                        {et?.emoji} <span style={{ color: '#64748b' }}>"{e.topQuotes[0]}"</span>
                      </div>
                    )
                  })}
                </div>
              ) : members.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 12 }}>no members yet</div>
              ) : (
                <div style={{ color: '#94a3b8', fontSize: 12 }}>hover a member</div>
              )}
            </div>

            {/* Members */}
            {members.map((member, i) => {
              const pos = positions[i]
              const color = memberColor(member.userId)
              const isHovered = hoveredMember === member.userId
              return (
                <div
                  key={member.userId}
                  style={{
                    position: 'absolute', left: pos.x, top: pos.y,
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', cursor: 'default', zIndex: 10, width: 72,
                  }}
                  onMouseEnter={() => setHoveredMember(member.userId)}
                  onMouseLeave={() => { setHoveredMember(null); setHoveredEmoji(null) }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', background: color,
                    margin: '0 auto 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 15,
                    border: isHovered ? '2px solid white' : '2px solid transparent',
                    boxShadow: isHovered ? `0 0 14px ${color}99` : 'none',
                    transition: 'box-shadow 0.15s, border 0.15s',
                  }}>
                    {member.name[0]}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', marginBottom: 3 }}>{member.name}</div>
                  <div style={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {member.emojis.slice(0, 4).map((e, ei) => (
                      <span
                        key={e.emojiId}
                        style={{ fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
                        onMouseEnter={ev => { ev.stopPropagation(); setHoveredEmoji({ memberId: member.userId, emojiIdx: ei }) }}
                        onMouseLeave={() => setHoveredEmoji(null)}
                      >
                        {emojiMap[e.emojiId]?.emoji ?? '?'}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Chat side */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0', minWidth: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 15 }}>
          {selectedGroup ? `# ${selectedGroup.name}` : 'Select a group'}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => {
            const color = memberColor(msg.sender.id)
            const prevSame = i > 0 && messages[i - 1].sender.id === msg.sender.id
            const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={msg.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: prevSame ? -6 : 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: prevSame ? 'transparent' : color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: 13,
                }}>
                  {!prevSame && msg.sender.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!prevSame && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color }}>{msg.sender.name}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{time}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.5 }}>{msg.content}</div>
                </div>
              </div>
            )
          })}
        </div>
        {selectedGroup && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
            <input
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 14 }}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Send a message..."
            />
            <button onClick={sendMessage} style={{ padding: '8px 16px' }}>Send</button>
          </div>
        )}
      </div>
    </div>
  )
}
