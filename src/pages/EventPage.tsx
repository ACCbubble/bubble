import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { apiGet, apiPatch, apiPost } from '../api'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

// ─── Types ────────────────────────────────────────────────────────────────────

interface Me { userId: number; name: string }
interface Group {
  id: number; name: string | null
  location: string | null; eventTime: string | null; description: string | null
}
interface EmojiType { id: number; name: string; emoji: string }
interface RtEmoji { emojiId: number; score: number; topQuotes: string[] }
interface RtMember { userId: number; name: string; emojis: RtEmoji[] }
interface Roundtable { members: RtMember[] }
interface Message { id: number; content: string; createdAt: string; sender: { id: number; name: string } }
interface FeedMessage extends Message { relevanceScore: number }
interface UserAttribute { key: string; score: number }

type Status = 'coming' | 'not-responded' | 'not-coming'

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_EMOJI_MAP: Record<number, EmojiType> = {
  1: { id: 1, name: 'coming', emoji: '✅' },
  2: { id: 2, name: 'needs_ride', emoji: '🚗' },
  3: { id: 3, name: 'bringing_food', emoji: '🍕' },
}

const MOCK_ROUNDTABLE: Roundtable = {
  members: [
    { userId: 1, name: 'Andy', emojis: [
      { emojiId: 1, score: 0.9, topQuotes: ["I'm in! What time should we meet?", "Count me in for sure", "See you all there!", "Can't wait"] },
      { emojiId: 2, score: 0.7, topQuotes: ["I can give people rides if needed", "I have space for 3", "Happy to drive"] },
    ]},
    { userId: 2, name: 'Sidney', emojis: [] },
    { userId: 3, name: 'Bartholomew', emojis: [] },
    { userId: 4, name: 'Colin', emojis: [
      { emojiId: 1, score: 0.85, topQuotes: ["Perfect! See you all there", "Definitely coming", "I'll be there at 6", "Excited!"] },
      { emojiId: 3, score: 0.8, topQuotes: ["I'll bring snacks!", "Bringing chips and dip", "Happy to bring food"] },
    ]},
    { userId: 5, name: 'Christopher', emojis: [] },
    { userId: 6, name: 'Manasa', emojis: [] },
  ]
}

const MOCK_MESSAGES: Message[] = [
  { id: 1, content: "Perfect! See you all there", createdAt: new Date(Date.now() - 23 * 60000).toISOString(), sender: { id: 4, name: 'Colin' } },
  { id: 2, content: "I might not make it, got a work thing", createdAt: new Date(Date.now() - 20 * 60000).toISOString(), sender: { id: 5, name: 'Rohan' } },
  { id: 3, content: "I'm in! What time should we meet?", createdAt: new Date(Date.now() - 26 * 60000).toISOString(), sender: { id: 1, name: 'Andy' } },
  { id: 4, content: "I can give people rides if needed", createdAt: new Date(Date.now() - 18 * 60000).toISOString(), sender: { id: 1, name: 'Andy' } },
  { id: 5, content: "I'll bring some games!", createdAt: new Date(Date.now() - 15 * 60000).toISOString(), sender: { id: 4, name: 'Colin' } },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const GRAD = 'linear-gradient(135deg, #5fa8ff 0%, #6a63ff 100%)'

const MEMBER_COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#8b5cf6',
  '#ef4444', '#0ea5e9', '#f59e0b', '#22c55e',
]

function memberColor(userId: number) { return MEMBER_COLORS[userId % MEMBER_COLORS.length] }

// ─── SVG Donut Ring ───────────────────────────────────────────────────────────

const SVG_SIZE = 560
const CX = SVG_SIZE / 2, CY = SVG_SIZE / 2
const OUTER = 192, INNER = 137, AVATAR_R = 234

function polar(r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function slicePath(startDeg: number, endDeg: number) {
  const large = endDeg - startDeg > 180 ? 1 : 0
  const o1 = polar(OUTER, startDeg), o2 = polar(OUTER, endDeg)
  const i1 = polar(INNER, startDeg), i2 = polar(INNER, endDeg)
  return `M ${o1.x} ${o1.y} A ${OUTER} ${OUTER} 0 ${large} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${INNER} ${INNER} 0 ${large} 0 ${i1.x} ${i1.y} Z`
}

interface HoveredEmoji { memberId: number; emojiId: number }

interface DonutRingProps {
  members: RtMember[]
  emojiMap: Record<number, EmojiType>
  hoveredMember: number | null
  hoveredEmoji: HoveredEmoji | null
  onHover: (id: number | null) => void
  onEmojiHover: (val: HoveredEmoji | null) => void
}

function DonutRing({ members, emojiMap, hoveredMember, hoveredEmoji, onHover, onEmojiHover }: DonutRingProps) {
  const n = members.length
  const GAP = n > 1 ? 1.0 : 0
  const degPer = 360 / Math.max(n, 1)
  const EMOJI_R = (INNER + OUTER) / 2  // mid of the ring band

  // Center content: emoji hover shows quotes, member hover shows name+quotes
  let centerContent: React.ReactNode = (
    <div className="text-xs text-slate-300 text-center" style={{ fontSize: 11 }}>
      {members.length === 0 ? 'No members yet' : 'hover a member'}
    </div>
  )

  if (hoveredMember !== null) {
    const hov = members.find(m => m.userId === hoveredMember) ?? null
    if (hov) {
      centerContent = (
        <>
          <div className="font-bold text-sm mb-1.5" style={{ color: memberColor(hov.userId) }}>
            {hov.name}
          </div>
          {hov.emojis.flatMap(e =>
            e.topQuotes.slice(0, 1).map((q, qi) => (
              <div key={`${e.emojiId}-${qi}`} className="text-xs text-slate-500 leading-snug mb-1" style={{ fontSize: 10.5 }}>
                "{q}"
              </div>
            ))
          ).slice(0, 2)}
        </>
      )
    }
  }

  if (hoveredEmoji) {
    const m = members.find(m => m.userId === hoveredEmoji.memberId)
    const e = m?.emojis.find(e => e.emojiId === hoveredEmoji.emojiId)
    const et = emojiMap[hoveredEmoji.emojiId]
    if (m && e && et) {
      centerContent = (
        <>
          <div className="font-bold text-sm mb-1" style={{ color: memberColor(m.userId) }}>
            {et.emoji} {m.name}
          </div>
          {e.topQuotes.slice(0, 4).map((q, qi) => (
            <div key={qi} className="text-xs text-slate-500 leading-snug mb-1" style={{ fontSize: 10 }}>
              "{q}"
            </div>
          ))}
        </>
      )
    }
  }

  return (
    <div className="relative flex-shrink-0" style={{ width: SVG_SIZE, height: SVG_SIZE }}>
      <svg width={SVG_SIZE} height={SVG_SIZE}>
        <defs>
          {/* The same gradient used on the Groups selector, applied to the whole ring */}
          <linearGradient id="ringGrad" x1={CX - OUTER} y1={CY - OUTER} x2={CX + OUTER} y2={CY + OUTER} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f8faff" />
            <stop offset="70%" stopColor="#eef2ff" />
            <stop offset="100%" stopColor="#f3f0ff" />
          </radialGradient>
          <filter id="sliceShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Center fill */}
        <circle cx={CX} cy={CY} r={INNER - 1} fill="url(#centerGrad)" />

        {/* Slices — all use the unified ring gradient */}
        {members.map((m, i) => {
          const start = i * degPer + GAP
          const end = (i + 1) * degPer - GAP
          const isHov = m.userId === hoveredMember
          const midDeg = (start + end) / 2
          const nudge = isHov ? 7 : 0
          const nudgeX = nudge * Math.cos((midDeg - 90) * Math.PI / 180)
          const nudgeY = nudge * Math.sin((midDeg - 90) * Math.PI / 180)
          return (
            <path
              key={m.userId}
              d={slicePath(start, end)}
              fill="url(#ringGrad)"
              opacity={hoveredMember !== null && !isHov ? 0.45 : 1}
              stroke="white"
              strokeWidth={1.5}
              filter="url(#sliceShadow)"
              style={{
                cursor: 'pointer',
                transform: `translate(${nudgeX}px, ${nudgeY}px)`,
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              onMouseEnter={() => onHover(m.userId)}
              onMouseLeave={() => onHover(null)}
            />
          )
        })}

        {/* Emojis floating inside the ring band */}
        {members.map((m, i) => {
          const start = i * degPer + GAP
          const end = (i + 1) * degPer - GAP
          const midDeg = (start + end) / 2
          const isHov = m.userId === hoveredMember
          const nudge = isHov ? 7 : 0
          const nudgeX = nudge * Math.cos((midDeg - 90) * Math.PI / 180)
          const nudgeY = nudge * Math.sin((midDeg - 90) * Math.PI / 180)
          const visibleEmojis = m.emojis.filter(e => emojiMap[e.emojiId]).slice(0, 3)
          const count = visibleEmojis.length
          if (count === 0) return null
          return (
            <g
              key={`emojis-${m.userId}`}
              style={{ transform: `translate(${nudgeX}px, ${nudgeY}px)`, transition: 'transform 0.2s' }}
            >
              {visibleEmojis.map((e, ei) => {
                const spreadDeg = count > 1 ? (ei - (count - 1) / 2) * 10 : 0
                const pos = polar(EMOJI_R, midDeg + spreadDeg)
                const et = emojiMap[e.emojiId]
                const isHovEmo = hoveredEmoji?.memberId === m.userId && hoveredEmoji?.emojiId === e.emojiId
                return (
                  <text
                    key={e.emojiId}
                    x={pos.x} y={pos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={isHovEmo ? 24 : 16}
                    style={{
                      cursor: 'pointer',
                      transition: 'font-size 0.15s',
                      userSelect: 'none',
                      filter: isHovEmo ? 'drop-shadow(0 0 5px rgba(0,0,0,0.3))' : undefined,
                    }}
                    onMouseEnter={ev => { ev.stopPropagation(); onEmojiHover({ memberId: m.userId, emojiId: e.emojiId }) }}
                    onMouseLeave={ev => { ev.stopPropagation(); onEmojiHover(null) }}
                  >
                    {et.emoji}
                  </text>
                )
              })}
            </g>
          )
        })}

        {/* Avatars — outside the ring */}
        {members.map((m, i) => {
          const midDeg = (i + 0.5) * degPer
          const pos = polar(AVATAR_R, midDeg)
          const color = memberColor(m.userId)
          const isHov = m.userId === hoveredMember
          // Name badge: positioned radially outward from the avatar center so it
          // always points away from the ring — never back toward or into the chart.
          // 7px per char is generous enough for typical fonts at fontSize=9
          const nameW = Math.max(m.name.length * 7 + 18, 36)
          const nameH = 16
          // Always place the badge directly below the avatar and keep it centered.
          const nameY = pos.y + 22   // top of badge (avatar bottom + 2px gap)
          const nameX = pos.x - nameW / 2

          return (
            <g
              key={m.userId}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => onHover(m.userId)}
              onMouseLeave={() => onHover(null)}
            >
              {isHov && (
                <circle cx={pos.x} cy={pos.y} r={26} fill={color} opacity={0.18} />
              )}
              <circle
                cx={pos.x} cy={pos.y} r={20}
                fill={color}
                stroke="white"
                strokeWidth={isHov ? 3 : 2}
                style={{ transition: 'stroke-width 0.15s' }}
              />
              <text
                x={pos.x} y={pos.y}
                textAnchor="middle" dominantBaseline="central"
                fill="white" fontSize={12} fontWeight={700}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {m.name[0].toUpperCase()}
              </text>
              {/* Name badge — centered directly under avatar */}
              <rect
                x={nameX}
                y={nameY}
                width={nameW}
                height={nameH}
                rx={8}
                fill="rgba(200,210,225,0.65)"
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={nameX + nameW / 2}
                y={nameY + nameH / 2}
                textAnchor="middle" dominantBaseline="central"
                fill="#4b5563" fontSize={9} fontWeight={600}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {m.name}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Center info overlay */}
      <div
        className="absolute pointer-events-none flex flex-col items-center justify-center text-center"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: (INNER - 6) * 2,
          height: (INNER - 6) * 2,
          borderRadius: '50%',
          padding: 14,
          overflow: 'hidden',
        }}
      >
        {centerContent}
      </div>
    </div>
  )
}

// ─── Event Stats ──────────────────────────────────────────────────────────────

// Small avatar circle that shows the member's name in a tooltip on hover
function AvatarBadge({ member, dotColor }: { member: RtMember; dotColor: string }) {
  const [hov, setHov] = useState(false)
  const color = memberColor(member.userId)
  return (
    <div
      style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: color,
        border: `2px solid ${dotColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 12, fontWeight: 700,
        cursor: 'default', transition: 'transform 0.15s',
        transform: hov ? 'scale(1.15)' : 'scale(1)',
      }}>
        {member.name[0].toUpperCase()}
      </div>
      {hov && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 5px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e293b', color: 'white',
          fontSize: 11, fontWeight: 600,
          padding: '3px 8px', borderRadius: 6,
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 30,
        }}>
          {member.name}
        </div>
      )}
    </div>
  )
}

interface StatItem {
  status: Status
  count: number
  label: string
  dotColor: string
  members: RtMember[]
  tooltipAlign: 'left' | 'center' | 'right'
}

interface EventStatsProps {
  coming: number
  notResponded: number
  notComing: number
  comingMembers: RtMember[]
  notRespondedMembers: RtMember[]
  notComingMembers: RtMember[]
  hoveredStat: Status | null
  onStatHover: (s: Status | null) => void
}

function EventStats({
  coming, notResponded, notComing,
  comingMembers, notRespondedMembers, notComingMembers,
  hoveredStat, onStatHover,
}: EventStatsProps) {
  const items: StatItem[] = [
    { status: 'coming',        count: coming,       label: 'Coming',        dotColor: '#4ade80', members: comingMembers,       tooltipAlign: 'left' },
    { status: 'not-responded', count: notResponded, label: 'Not Responded', dotColor: '#fb923c', members: notRespondedMembers, tooltipAlign: 'center' },
    { status: 'not-coming',    count: notComing,    label: 'Not Coming',    dotColor: '#f87171', members: notComingMembers,     tooltipAlign: 'right' },
  ]

  const hovItem = items.find(i => i.status === hoveredStat)

  return (
    <div style={{ position: 'relative' }}>
      {/* Tooltip — avatar circles with name shown on hover of each circle */}
      {hovItem && hovItem.members.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          ...(hovItem.tooltipAlign === 'left'   ? { left: 0 } :
              hovItem.tooltipAlign === 'right'  ? { right: 0 } :
              { left: '50%', transform: 'translateX(-50%)' }),
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          padding: '10px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {hovItem.members.map(m => (
            <AvatarBadge key={m.userId} member={m} dotColor={hovItem.dotColor} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 py-2">
        {items.map(item => (
          <div
            key={item.status}
            className="flex items-center justify-center gap-2 rounded-xl border py-2.5"
            style={{
              cursor: 'default',
              opacity: hoveredStat && hoveredStat !== item.status ? 0.4 : 1,
              transition: 'opacity 0.15s',
              borderColor: `${item.dotColor}80`,
              background: `${item.dotColor}12`,
            }}
            onMouseEnter={() => onStatHover(item.status)}
            onMouseLeave={() => onStatHover(null)}
          >
            <span className="text-[22px] font-semibold leading-none" style={{ color: item.dotColor }}>{item.count}</span>
            <span className="text-base text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Event Details ────────────────────────────────────────────────────────────

function EventDetails({ group, onEdit }: { group: Group | null; onEdit: (field: string, value: string) => void }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  function startEdit(field: string, current: string) { setEditing(field); setDraft(current) }
  function save(field: string) { onEdit(field, draft); setEditing(null) }

  const formatted = group?.eventTime
    ? new Date(group.eventTime).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null

  return (
    <div className="flex flex-col gap-0 text-sm rounded-2xl border border-slate-100 bg-white overflow-hidden">
      <div className="flex gap-3 items-start px-4 py-3 border-b border-slate-100">
        <span className="flex-shrink-0 text-slate-400 mt-0.5">📍</span>
        <span className="w-16 text-slate-300">Location</span>
        {editing === 'location' ? (
          <input autoFocus className="flex-1 border-b border-blue-400 outline-none text-sm bg-transparent"
            value={draft} onChange={e => setDraft(e.target.value)}
            onBlur={() => save('location')} onKeyDown={e => e.key === 'Enter' && save('location')} />
        ) : (
          <span className="text-slate-600 cursor-pointer hover:text-blue-500 transition-colors"
            onClick={() => startEdit('location', group?.location ?? '')}>
            {group?.location ?? <span className="text-slate-300 italic text-xs">Add location…</span>}
          </span>
        )}
      </div>
      <div className="flex gap-3 items-start px-4 py-3 border-b border-slate-100">
        <span className="flex-shrink-0 text-slate-400 mt-0.5">🕐</span>
        <span className="w-16 text-slate-300">Time</span>
        {editing === 'eventTime' ? (
          <input autoFocus type="datetime-local" className="flex-1 border-b border-blue-400 outline-none text-sm bg-transparent"
            value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => save('eventTime')} />
        ) : (
          <span className="text-slate-600 cursor-pointer hover:text-blue-500 transition-colors"
            onClick={() => startEdit('eventTime', group?.eventTime ? group.eventTime.slice(0, 16) : '')}>
            {formatted ?? <span className="text-slate-300 italic text-xs">Add date & time…</span>}
          </span>
        )}
      </div>
      <div className="flex gap-3 items-start px-4 py-3">
        <span className="flex-shrink-0 text-slate-400 mt-0.5">📄</span>
        <span className="w-16 text-slate-300">Description</span>
        {editing === 'description' ? (
          <textarea autoFocus rows={2} className="flex-1 border-b border-blue-400 outline-none text-sm bg-transparent resize-none"
            value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => save('description')} />
        ) : (
          <span className="text-slate-600 cursor-pointer hover:text-blue-500 transition-colors leading-snug"
            onClick={() => startEdit('description', group?.description ?? '')}>
            {group?.description ?? <span className="text-slate-300 italic text-xs">Add description…</span>}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      position: 'relative', width: 60, height: 36, borderRadius: 18,
      background: on ? GRAD : '#cbd5e1',
      border: 'none', cursor: 'pointer', flexShrink: 0,
      transition: 'background 0.2s',
    }}>
      <span style={{
        position: 'absolute', width: 28, height: 28, borderRadius: '50%', background: 'white',
        top: 4, left: on ? 28 : 4,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ─── Message Item (iOS-style bubbles) ─────────────────────────────────────────

interface MessageItemProps {
  msg: Message
  meId: number | null
  compact?: boolean
}

function MessageItem({ msg, meId, compact = false }: MessageItemProps) {
  const isMe = msg.sender.id === meId
  const color = memberColor(msg.sender.id)
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const fontSize = compact ? 12 : 15

  if (isMe) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <div style={{
          background: GRAD, color: 'white',
          borderRadius: compact ? '14px 14px 3px 14px' : '18px 18px 4px 18px',
          padding: compact ? '5px 11px' : '9px 15px',
          maxWidth: '78%',
          fontSize, lineHeight: 1.4, wordBreak: 'break-word',
          boxShadow: '0 1px 3px rgba(96,165,250,0.20)',
        }}>
          {msg.content}
        </div>
        <span style={{ fontSize: 10, color: '#9ca3af', marginRight: 4 }}>{time}</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      {!compact && (
        <div style={{ marginLeft: 40, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, lineHeight: '10px', color }}>{'●'}</span>
          <span style={{ fontSize: 14, lineHeight: '10px', color: '#0f172a', fontWeight: 600 }}>{msg.sender.name}</span>
          <span style={{ fontSize: 11, color: '#a3aed0' }}>{time}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        {!compact && (
          <div style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
            background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 11, fontWeight: 700,
          }}>
            {msg.sender.name[0].toUpperCase()}
          </div>
        )}
        <div style={{
          background: '#f4f6fb', color: '#334155',
          borderRadius: compact ? '14px 14px 14px 3px' : '4px 18px 18px 18px',
          padding: compact ? '5px 11px' : '9px 15px',
          maxWidth: '78%',
          fontSize, lineHeight: 1.4, wordBreak: 'break-word',
        }}>
          {compact && <span style={{ fontWeight: 600, color, fontSize: 11, display: 'block', marginBottom: 2 }}>{msg.sender.name}</span>}
          {msg.content}
        </div>
      </div>
      {compact && <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: compact ? 0 : 40 }}>{time}</span>}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberStatus(member: RtMember, comingEmojiId: number | null): Status {
  if (!comingEmojiId) return 'not-responded'
  const e = member.emojis.find(e => e.emojiId === comingEmojiId)
  if (!e) return 'not-responded'
  return e.score >= 0.4 ? 'coming' : 'not-coming'
}

function memberRelevance(m: RtMember, emojiMap: Record<number, EmojiType>, attrs: Record<string, number>): number {
  let score = 0
  for (const e of m.emojis) {
    const name = emojiMap[e.emojiId]?.name
    if (!name) continue
    const rel = name === 'needs_ride' ? (attrs['has_car'] ?? 0)
              : name === 'bringing_food' ? (attrs['has_dietary_restriction'] ?? 0)
              : name === 'coming' ? 1.0 : 0.5
    score += rel * e.score
  }
  return score
}

const RELEVANCE_THRESHOLD = 0.05

// ─── Main Page ────────────────────────────────────────────────────────────────

export function EventPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [emojiMap, setEmojiMap] = useState<Record<number, EmojiType>>(MOCK_EMOJI_MAP)
  const [roundtable, setRoundtable] = useState<Roundtable>(MOCK_ROUNDTABLE)
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES)
  const [feedMessages, setFeedMessages] = useState<FeedMessage[]>([])
  const [userAttrs, setUserAttrs] = useState<Record<string, number>>({})
  const [text, setText] = useState('')
  const [hoveredMember, setHoveredMember] = useState<number | null>(null)
  const [hoveredEmoji, setHoveredEmoji] = useState<HoveredEmoji | null>(null)
  const [hoveredStat, setHoveredStat] = useState<Status | null>(null)
  const [currentView, setCurrentView] = useState<'suggest' | 'current' | 'all'>('current')
  const [darkMode, setDarkMode] = useState(false)
  const [aiSorted, setAiSorted] = useState(true)
  const [suggestName, setSuggestName] = useState('')
  const [suggestMsg, setSuggestMsg] = useState('')
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const page = document.querySelector('.page') as HTMLElement | null
    if (!page) return
    const prev = page.style.padding
    page.style.padding = '0'
    return () => { page.style.padding = prev }
  }, [])

  useEffect(() => {
    apiGet<Me>('/auth/me').then(me => {
      setMe(me)
      apiGet<{ attributes: UserAttribute[] }>(`/attributes?userId=${me.userId}`)
        .then(r => { const m: Record<string, number> = {}; r.attributes.forEach(a => m[a.key] = a.score); setUserAttrs(m) })
        .catch(() => {})
    }).catch(() => {})
    apiGet<Group[]>('/groups').then(gs => {
      setGroups(gs)
      if (gs.length > 0) setSelectedGroup(gs[0])
    }).catch(() => {})
    fetch(`${API_BASE}/emoji-types`)
      .then(r => r.json())
      .then((types: EmojiType[]) => { const m: Record<number, EmojiType> = {}; types.forEach(t => m[t.id] = t); setEmojiMap(m) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedGroup) return
    const loadRT = () => apiGet<Roundtable>(`/roundtable?groupId=${selectedGroup.id}`).then(setRoundtable).catch(() => {})
    const loadMsgs = () => apiGet<Message[]>(`/groups/${selectedGroup.id}/messages`).then(setMessages).catch(() => {})
    const loadFeed = (uid: number) => apiGet<FeedMessage[]>(`/groups/${selectedGroup.id}/feed?userId=${uid}`).then(setFeedMessages).catch(() => {})

    loadRT(); loadMsgs()
    if (me) loadFeed(me.userId)

    const wsUrl = API_BASE.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsUrl}?groupId=${selectedGroup.id}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'context_updated') { loadRT(); if (me) loadFeed(me.userId) }
      if (data.type === 'new_message') { setMessages(prev => [...prev, data.message]); if (me) loadFeed(me.userId) }
    }
    return () => { ws.close() }
  }, [selectedGroup])

  useEffect(() => {
    if (!aiSorted) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, aiSorted])

  const sendMessage = async () => {
    if (!text.trim() || !selectedGroup || !me) return
    try { await apiPost('/messages', { groupId: selectedGroup.id, senderId: me.userId, content: text.trim() }); setText('') }
    catch { /* silent */ }
  }

  const updateGroupField = async (field: string, value: string) => {
    if (!selectedGroup) return
    try {
      const updated = await apiPatch<Group>(`/groups/${selectedGroup.id}`, { [field]: value })
      setSelectedGroup(updated)
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
    } catch { /* silent */ }
  }

  const handleSuggestEvent = async () => {
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
      setCurrentView('current')
      setSuggestName('')
      setSuggestMsg('')
    } catch (err: unknown) {
      setSuggestError((err as Error)?.message ?? 'Failed to create event.')
    }
    setSuggestLoading(false)
  }

  // ── Derived ──
  const allMembers = roundtable.members
  const comingEmojiId = Object.values(emojiMap).find(e => e.name === 'coming')?.id ?? null
  const hasAttrs = Object.keys(userAttrs).length > 0

  const members = hasAttrs
    ? allMembers
        .filter(m => m.userId === me?.userId || memberRelevance(m, emojiMap, userAttrs) >= RELEVANCE_THRESHOLD || m.emojis.length === 0)
        .sort((a, b) => memberRelevance(b, emojiMap, userAttrs) - memberRelevance(a, emojiMap, userAttrs))
    : allMembers

  const comingMembers       = allMembers.filter(m => getMemberStatus(m, comingEmojiId) === 'coming')
  const notRespondedMembers = allMembers.filter(m => getMemberStatus(m, comingEmojiId) === 'not-responded')
  const notComingMembers    = allMembers.filter(m => getMemberStatus(m, comingEmojiId) === 'not-coming')

  const displayMessages = aiSorted
    ? (feedMessages.length > 0 ? feedMessages : [...messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
        .filter(m => m.sender.id !== me?.userId)
    : [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const myRecentMessages = messages
    .filter(m => m.sender.id === me?.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  const allEventItems = groups.length > 0
    ? groups.map(g => ({
        id: g.id,
        name: g.name ?? `Event ${g.id}`,
        subtitle: g.location || 'No location yet',
      }))
    : [{
        id: 0,
        name: selectedGroup?.name ?? 'Park Hangout',
        subtitle: selectedGroup?.location || 'Demo event',
      }]

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', top: 52, bottom: 0,
      left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 1380,
      overflow: 'hidden',
      background: darkMode ? '#0f172a' : '#f8f8fb',
      filter: darkMode ? 'brightness(0.7)' : 'none',
      transition: 'background 0.2s, filter 0.2s',
      zIndex: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12,
      padding: 14, boxSizing: 'border-box',
    }}>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, minHeight: 0, flex: 1 }}>
      {/* ── Left — Round Table ── */}
      <div style={{
        width: 920, flexShrink: 0, background: 'white',
        borderRadius: 24, padding: '20px 20px 16px',
        border: '1px solid #eef2f7',
        display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', overflow: 'hidden',
      }}>

        {/* Groups selector */}
        <div className="mb-2 flex items-center gap-3">
          <div className="relative">
            <select
              className="appearance-none pl-6 pr-10 py-3 text-sm text-white rounded-full cursor-pointer"
              style={{ background: GRAD, border: 'none', outline: 'none' }}
              value={selectedGroup?.id ?? ''}
              onChange={e => { const g = groups.find(g => g.id === Number(e.target.value)); if (g) setSelectedGroup(g) }}
            >
              <option value="">Select Group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id} style={{ background: '#1e293b' }}>{g.name ?? `Group ${g.id}`}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-xs pointer-events-none">▾</span>
          </div>
          <button
            type="button"
            className="px-6 py-3 rounded-full text-sm border border-indigo-100 text-indigo-500 bg-indigo-50"
          >
            + Invite
          </button>
          <button
            type="button"
            className="ml-auto px-6 py-3 rounded-full text-sm border border-slate-200 text-slate-500 bg-white"
          >
            Polls
          </button>
          <button
            type="button"
            className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-lg"
            onClick={() => setDarkMode(v => !v)}
            title="Dark mode"
            aria-label="Dark mode"
          >
            ◐
          </button>
        </div>

        {/* Donut Ring */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden', maxHeight: 600, marginTop: -10 }}>
          <DonutRing
            members={members}
            emojiMap={emojiMap}
            hoveredMember={hoveredEmoji ? null : hoveredMember}
            hoveredEmoji={hoveredEmoji}
            onHover={setHoveredMember}
            onEmojiHover={setHoveredEmoji}
          />
        </div>

        {/* Stats with tooltip */}
        <EventStats
          coming={comingMembers.length}
          notResponded={notRespondedMembers.length}
          notComing={notComingMembers.length}
          comingMembers={comingMembers}
          notRespondedMembers={notRespondedMembers}
          notComingMembers={notComingMembers}
          hoveredStat={hoveredStat}
          onStatHover={setHoveredStat}
        />

        {/* Event Details */}
        <div className="mt-1 px-1">
          <EventDetails group={selectedGroup} onEdit={updateGroupField} />
        </div>
      </div>

      {/* ── Right — Messaging ── */}
      <div style={{
        flex: 1, minWidth: 360, background: 'white',
        borderRadius: 24, border: '1px solid #eef2f7',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box',
      }}>

        {/* Tabs */}
        <div style={{ flexShrink: 0, padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', background: '#f8fafc', borderRadius: 16, padding: 4 }}>
          <button
            onClick={() => setCurrentView('suggest')}
            style={{
              flex: 1, padding: '9px 10px', fontSize: 14, fontWeight: 500,
              background: currentView === 'suggest' ? GRAD : 'transparent',
              color: currentView === 'suggest' ? 'white' : '#64748b',
              border: 'none', cursor: 'pointer', borderRadius: 12,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            Suggest Event
          </button>
          <button
            onClick={() => setCurrentView('current')}
            style={{
              flex: 1, padding: '9px 10px', fontSize: 14, fontWeight: 500,
              background: currentView === 'current' ? GRAD : 'transparent',
              color: currentView === 'current' ? 'white' : '#64748b',
              border: 'none', cursor: 'pointer', borderRadius: 12,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            Current Event
          </button>
          <button
            onClick={() => setCurrentView('all')}
            style={{
              flex: 1, padding: '9px 10px', fontSize: 14, fontWeight: 500,
              background: currentView === 'all' ? GRAD : 'transparent',
              color: currentView === 'all' ? 'white' : '#64748b',
              border: 'none', cursor: 'pointer',
              borderRadius: 12,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            All Events
          </button>
          </div>
        </div>

        {/* ── Suggest Event form ── */}
        {currentView === 'suggest' && (
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '28px 32px', gap: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>Suggest a New Event</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Create a group and kick off the conversation.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Event name</label>
              <input
                value={suggestName}
                onChange={e => setSuggestName(e.target.value)}
                placeholder="e.g. Park Hangout Saturday"
                style={{ borderRadius: 10, border: '1.5px solid #e5e7eb', padding: '9px 14px', fontSize: 14, color: '#111827', outline: 'none', background: '#fafafa' }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#93c5fd' }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#e5e7eb' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Initial message</label>
              <textarea
                value={suggestMsg}
                onChange={e => setSuggestMsg(e.target.value)}
                placeholder="e.g. Hey everyone! Who's down for a park hangout this Saturday at 3pm?"
                rows={4}
                style={{ borderRadius: 10, border: '1.5px solid #e5e7eb', padding: '9px 14px', fontSize: 14, color: '#111827', outline: 'none', background: '#fafafa', resize: 'none', fontFamily: 'inherit' }}
                onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#93c5fd' }}
                onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#e5e7eb' }}
              />
            </div>
            {suggestError && <p style={{ margin: 0, fontSize: 13, color: '#ef4444' }}>{suggestError}</p>}
            <button
              onClick={handleSuggestEvent}
              disabled={suggestLoading}
              style={{
                background: GRAD, color: 'white', border: 'none', borderRadius: 12,
                padding: '11px 24px', fontSize: 14, fontWeight: 600,
                cursor: suggestLoading ? 'not-allowed' : 'pointer',
                opacity: suggestLoading ? 0.7 : 1, alignSelf: 'flex-start',
                boxShadow: '0 2px 8px rgba(96,165,250,0.25)', transition: 'opacity 0.15s',
              }}
            >
              {suggestLoading ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        )}

        {/* ── Current Events ── */}
        {currentView === 'current' && (
          <>
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold text-[22px] text-slate-800 leading-tight">
                  {selectedGroup?.name ?? 'Park Hangout'}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">For-You</span>
                  <Toggle on={aiSorted} onToggle={() => setAiSorted(v => !v)} />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Group Chat</p>
            </div>

            <div style={{ height: 1, background: '#f3f4f6', flexShrink: 0 }} />
            <div className="px-5 py-3 text-slate-400 text-sm">✦ AI-sorted by relevancy</div>

            <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3 min-h-0">
              {displayMessages.length === 0
                ? <p className="text-xs text-slate-300 text-center mt-8">No messages yet</p>
                : displayMessages.map(msg => (
                    <MessageItem key={msg.id} msg={msg} meId={me?.userId ?? null} />
                  ))
              }
              <div ref={messagesEndRef} />
            </div>

            {aiSorted && myRecentMessages.length > 0 && (
              <div className="flex-shrink-0 px-5 py-2.5" style={{ borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                <p className="text-xs font-semibold text-slate-400 mb-2">Your Recent Messages</p>
                <div className="flex flex-col gap-1.5">
                  {myRecentMessages.map(msg => <MessageItem key={msg.id} msg={msg} meId={me?.userId ?? null} compact />)}
                </div>
              </div>
            )}

            <div className="flex-shrink-0 px-4 py-3 flex gap-2.5 items-center" style={{ borderTop: '1px solid #f3f4f6' }}>
              <input
                className="flex-1 rounded-full px-4 py-2 text-sm outline-none text-slate-700"
                style={{ background: '#f3f4f6', border: 'none' }}
                placeholder="Type a message..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold text-base"
                style={{ width: 38, height: 38, background: GRAD, border: 'none', cursor: 'pointer' }}
              >
                ↑
              </button>
            </div>
          </>
        )}

        {currentView === 'all' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
            <h3 className="m-0 text-base font-semibold text-slate-800">All Events</h3>
            <p className="mt-1 mb-4 text-xs text-slate-400">Select an event in this group.</p>
            <div className="flex flex-col gap-2">
              {allEventItems.map(event => (
                <button
                  key={event.id}
                  onClick={() => {
                    const group = groups.find(g => g.id === event.id)
                    if (group) setSelectedGroup(group)
                    setCurrentView('current')
                  }}
                  className="w-full text-left rounded-xl border px-3 py-2.5 transition-colors"
                  style={{
                    borderColor: selectedGroup?.id === event.id ? '#93c5fd' : '#e5e7eb',
                    background: selectedGroup?.id === event.id ? '#eff6ff' : 'white',
                  }}
                >
                  <div className="text-sm font-medium text-slate-800">{event.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{event.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
