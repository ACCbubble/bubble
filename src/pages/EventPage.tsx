import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { apiGet, apiPatch, apiPost } from '../api'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

// ─── Types ────────────────────────────────────────────────────────────────────

interface Me { userId: number; name: string }
interface Group { id: number; name: string }
export interface Event {
  id: number; groupId: number; name: string
  location: string | null; eventTime: string | null; description: string | null
}
export interface EmojiType { id: number; name: string; emoji: string }
export interface RtEmoji { emojiId: number; score: number; topQuotes: string[] }
export interface RtMember { userId: number; name: string; emojis: RtEmoji[] }
export interface Roundtable { members: RtMember[] }
export interface PollOption { id: number; optionText: string | null; voteCount: number; percentage: number; selectedByViewer: boolean }
export interface Poll { id: number; question: string | null; options: PollOption[]; isActive: boolean; allowsMultiple: boolean; allowsSuggestions: boolean; totalVoters: number; viewerVoteOptionIds: number[] }
export interface Message { id: number; content: string; createdAt: string; sender: { id: number; name: string }; isAutoPoll?: boolean; poll?: Poll }
interface FeedMessage extends Message { relevanceScore: number }
interface UserAttribute { key: string; score: number }

export type Status = 'coming' | 'not-responded' | 'not-coming'

// ─── Constants ────────────────────────────────────────────────────────────────

export const GRAD = 'linear-gradient(135deg, #86efac 0%, #60a5fa 50%, #c084fc 100%)'

// ─── Theme helper ─────────────────────────────────────────────────────────────
export function th(dark: boolean) {
  return {
    pageBg:      dark ? '#0f172a' : '#f3f4f6',
    panelBg:     dark ? '#1e293b' : '#ffffff',
    panelBg2:    dark ? '#162032' : '#fafafa',
    muted:       dark ? '#334155' : '#f3f4f6',
    border:      dark ? '#334155' : '#e5e7eb',
    text:        dark ? '#f1f5f9' : '#111827',
    textSub:     dark ? '#94a3b8' : '#6b7280',
    textFaint:   dark ? '#64748b' : '#9ca3af',
    msgOtherBg:  dark ? '#334155' : '#f0f0f0',
    msgOtherTxt: dark ? '#f1f5f9' : '#111827',
    inputBg:     dark ? '#0f172a' : '#f3f4f6',
    centerFill1: dark ? '#1e2d45' : '#f8faff',
    centerFill2: dark ? '#162032' : '#eef2ff',
    nameBadge:   dark ? 'rgba(15,23,42,0.75)' : 'rgba(200,210,225,0.65)',
    nameBadgeTxt:dark ? '#94a3b8' : '#4b5563',
    tooltipBg:   dark ? '#0f172a' : '#ffffff',
    tabActiveBg: dark ? '#334155' : '#ffffff',
    tabInactBg:  dark ? 'transparent' : 'transparent',
  }
}

export const MEMBER_COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#8b5cf6',
  '#ef4444', '#0ea5e9', '#f59e0b', '#22c55e',
]

export function memberColor(userId: number) { return MEMBER_COLORS[userId % MEMBER_COLORS.length] }

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

export interface HoveredEmoji { memberId: number; emojiId: number }

interface DonutRingProps {
  members: RtMember[]
  emojiMap: Record<number, EmojiType>
  hoveredMember: number | null
  hoveredEmoji: HoveredEmoji | null
  onHover: (id: number | null) => void
  onEmojiHover: (val: HoveredEmoji | null) => void
  darkMode: boolean
}

export function DonutRing({ members, emojiMap, hoveredMember, hoveredEmoji, onHover, onEmojiHover, darkMode }: DonutRingProps) {
  const c = th(darkMode)
  const n = members.length
  const GAP = n > 1 ? 1.0 : 0
  const degPer = 360 / Math.max(n, 1)
  const EMOJI_R = (INNER + OUTER) / 2

  let centerContent: React.ReactNode = (
    <div style={{ fontSize: 11, color: c.textFaint, textAlign: 'center' }}>
      {members.length === 0 ? 'No members yet' : 'hover a member'}
    </div>
  )

  if (hoveredMember !== null) {
    const hov = members.find(m => m.userId === hoveredMember) ?? null
    if (hov) {
      centerContent = (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, color: memberColor(hov.userId), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', marginBottom: 6 }}>
            {hov.name}
          </div>
          {hov.emojis.flatMap(e =>
            e.topQuotes.slice(0, 1).map((q, qi) => (
              <div key={`${e.emojiId}-${qi}`} style={{ fontSize: 10.5, color: c.textSub, lineHeight: 1.4, marginBottom: 4 }}>
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
          <div style={{ fontWeight: 700, fontSize: 13, color: memberColor(m.userId), marginBottom: 4 }}>
            {et.emoji} {m.name}
          </div>
          {e.topQuotes.slice(0, 4).map((q, qi) => (
            <div key={qi} style={{ fontSize: 10, color: c.textSub, lineHeight: 1.4, marginBottom: 3 }}>
              "{q}"
            </div>
          ))}
        </>
      )
    }
  }

  return (
    <div className="relative" style={{ width: '100%', maxWidth: SVG_SIZE, maxHeight: '100%', aspectRatio: '1 / 1' }}>
      <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="ringGrad" x1={CX - OUTER} y1={CY - OUTER} x2={CX + OUTER} y2={CY + OUTER} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={c.centerFill1} />
            <stop offset="70%" stopColor={c.centerFill2} />
            <stop offset="100%" stopColor={c.centerFill2} />
          </radialGradient>
          <filter id="sliceShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        <circle cx={CX} cy={CY} r={INNER - 1} fill="url(#centerGrad)" />

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

        {members.map((m, i) => {
          const midDeg = (i + 0.5) * degPer
          const pos = polar(AVATAR_R, midDeg)
          const color = memberColor(m.userId)
          const isHov = m.userId === hoveredMember
          const MAX_LABEL = 10
          const displayName = m.name.length > MAX_LABEL
            ? m.name.slice(0, MAX_LABEL - 1) + '…'
            : m.name
          const nameW = Math.max(displayName.length * 7 + 18, 36)
          const nameH = 16
          const rawNameX = pos.x - nameW / 2
          const nameX = Math.max(4, Math.min(SVG_SIZE - nameW - 4, rawNameX))
          const nameY = pos.y + 22

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
              <rect
                x={nameX} y={nameY}
                width={nameW} height={nameH}
                rx={8}
                fill={c.nameBadge}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={nameX + nameW / 2} y={nameY + nameH / 2}
                textAnchor="middle" dominantBaseline="central"
                fill={c.nameBadgeTxt} fontSize={9} fontWeight={600}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {displayName}
              </text>
            </g>
          )
        })}
      </svg>

      <div
        className="absolute pointer-events-none flex flex-col items-center justify-center text-center"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${((INNER - 6) * 2 / SVG_SIZE) * 100}%`,
          height: `${((INNER - 6) * 2 / SVG_SIZE) * 100}%`,
          borderRadius: '50%',
          padding: '2.5%',
          overflow: 'hidden',
        }}
      >
        {centerContent}
      </div>
    </div>
  )
}

// ─── Event Stats ──────────────────────────────────────────────────────────────

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
          {member.name.length > 16 ? member.name.slice(0, 15) + '…' : member.name}
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

export interface EventStatsProps {
  coming: number
  notResponded: number
  notComing: number
  comingMembers: RtMember[]
  notRespondedMembers: RtMember[]
  notComingMembers: RtMember[]
  hoveredStat: Status | null
  onStatHover: (s: Status | null) => void
  darkMode: boolean
}

export function EventStats({
  coming, notResponded, notComing,
  comingMembers, notRespondedMembers, notComingMembers,
  hoveredStat, onStatHover, darkMode,
}: EventStatsProps) {
  const c = th(darkMode)
  const items: StatItem[] = [
    { status: 'coming',        count: coming,       label: 'Coming',        dotColor: '#4ade80', members: comingMembers,       tooltipAlign: 'left' },
    { status: 'not-responded', count: notResponded, label: 'Not Responded', dotColor: '#fb923c', members: notRespondedMembers, tooltipAlign: 'center' },
    { status: 'not-coming',    count: notComing,    label: 'Not Coming',    dotColor: '#f87171', members: notComingMembers,     tooltipAlign: 'right' },
  ]

  const hovItem = items.find(i => i.status === hoveredStat)

  return (
    <div style={{ position: 'relative' }}>
      {hovItem && hovItem.members.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          ...(hovItem.tooltipAlign === 'left'   ? { left: 0 } :
              hovItem.tooltipAlign === 'right'  ? { right: 0 } :
              { left: '50%', transform: 'translateX(-50%)' }),
          background: c.tooltipBg,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          padding: '10px 12px',
          boxShadow: darkMode ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.10)',
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

      <div className="flex items-center justify-center gap-5 py-2">
        {items.map((item, i) => (
          <>
            {i > 0 && <div key={`sep-${i}`} style={{ width: 1, height: 14, background: '#e5e7eb' }} />}
            <div
              key={item.status}
              className="flex items-center gap-1.5"
              style={{
                cursor: 'default',
                opacity: hoveredStat && hoveredStat !== item.status ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={() => onStatHover(item.status)}
              onMouseLeave={() => onStatHover(null)}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: item.dotColor }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{item.count}</span>
              <span style={{ fontSize: 14, color: c.textSub }}>{item.label}</span>
            </div>
          </>
        ))}
      </div>
    </div>
  )
}

// ─── Event Details ────────────────────────────────────────────────────────────

export function EventDetails({ event, onEdit, darkMode }: { event: Event | null; onEdit: (field: string, value: string) => void; darkMode: boolean }) {
  const c = th(darkMode)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  function startEdit(field: string, current: string) { setEditing(field); setDraft(current) }
  function save(field: string) { onEdit(field, draft); setEditing(null) }

  const formatted = event?.eventTime
    ? new Date(event.eventTime).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null

  const fieldText: React.CSSProperties = { color: c.text, fontSize: 13, cursor: 'pointer', transition: 'color 0.15s' }
  const placeholder: React.CSSProperties = { color: c.textFaint, fontStyle: 'italic', fontSize: 12 }
  const editInput: React.CSSProperties = { flex: 1, borderBottom: `1.5px solid #60a5fa`, outline: 'none', fontSize: 13, background: 'transparent', color: c.text }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, color: c.textSub, marginTop: 1 }}>📍</span>
        <span style={{ ...fieldText, cursor: 'default' }}>
          {event?.location ?? <span style={placeholder}>Location decided by poll</span>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, color: c.textSub, marginTop: 1 }}>🕐</span>
        <span style={{ ...fieldText, cursor: 'default' }}>
          {formatted ?? <span style={placeholder}>Date & time decided by poll</span>}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ flexShrink: 0, color: c.textSub, marginTop: 1 }}>📄</span>
        <span style={{ ...fieldText, lineHeight: 1.5, cursor: 'default' }}>
          {event?.description ?? <span style={placeholder}>Description decided by poll</span>}
        </span>
      </div>
    </div>
  )
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      position: 'relative', width: 36, height: 20, borderRadius: 10,
      background: on ? GRAD : '#cbd5e1',
      border: 'none', cursor: 'pointer', flexShrink: 0,
      transition: 'background 0.2s',
    }}>
      <span style={{
        position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: 'white',
        top: 3, left: on ? 19 : 3,
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

// ─── Poll Card ────────────────────────────────────────────────────────────────

export function PollCard({ poll: initialPoll, meId, darkMode }: { poll: Poll; meId: number | null; darkMode: boolean }) {
  const c = th(darkMode)
  const [poll, setPoll] = useState(initialPoll)
  const [voting, setVoting] = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [suggesting, setSuggesting] = useState(false)

  // Sync when parent patches poll via WebSocket update
  useEffect(() => { setPoll(initialPoll) }, [initialPoll])

  const hasVoted = meId !== null && poll.viewerVoteOptionIds.length > 0

  const handleVote = async (optionId: number) => {
    if (!meId || !poll.isActive || voting) return
    setVoting(true)
    try {
      const result = await apiPost<{ poll: Poll }>(`/polls/${poll.id}/votes`, { userId: meId, optionId })
      if (result.poll) setPoll(result.poll)
    } catch { /* ignore */ }
    setVoting(false)
  }

  const handleSuggest = async () => {
    if (!meId || !suggestion.trim() || suggesting) return
    setSuggesting(true)
    try {
      const result = await apiPost<{ poll: Poll }>(`/polls/${poll.id}/suggestions`, {
        userId: meId,
        optionText: suggestion.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      if (result.poll) setPoll(result.poll)
      setSuggestion('')
    } catch { /* ignore */ }
    setSuggesting(false)
  }

  return (
    <div style={{
      background: darkMode ? '#1e293b' : '#ffffff',
      border: `1px solid ${c.border}`,
      borderRadius: 14,
      padding: '12px 14px',
      minWidth: 220,
      maxWidth: 320,
    }}>
      <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: c.text, lineHeight: 1.4 }}>
        {poll.question}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {poll.options.map(opt => {
          const selected = poll.viewerVoteOptionIds.includes(opt.id)
          return (
            <div
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              style={{
                position: 'relative',
                cursor: poll.isActive && meId ? 'pointer' : 'default',
                borderRadius: 8,
                overflow: 'hidden',
                border: selected ? '1.5px solid #60a5fa' : `1px solid ${c.border}`,
                background: darkMode ? '#0f172a' : '#f8faff',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: `${opt.percentage}%`,
                background: selected ? 'rgba(96,165,250,0.25)' : 'rgba(134,239,172,0.15)',
                transition: 'width 0.4s ease',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px', fontSize: 13,
              }}>
                <span style={{ fontWeight: selected ? 600 : 400, color: c.text }}>{opt.optionText}</span>
                <span style={{ fontSize: 11, color: c.textSub, whiteSpace: 'nowrap' }}>
                  {hasVoted ? `${opt.percentage}%` : opt.voteCount > 0 ? `${opt.voteCount}` : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {poll.allowsSuggestions && poll.isActive && meId && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSuggest()}
            placeholder="Add your own..."
            style={{
              flex: 1, fontSize: 12, padding: '6px 10px',
              borderRadius: 8, border: `1px solid ${c.border}`,
              background: c.inputBg, color: c.text, outline: 'none',
            }}
          />
          <button
            onClick={handleSuggest}
            disabled={suggesting || !suggestion.trim()}
            style={{
              fontSize: 12, padding: '6px 10px', borderRadius: 8,
              border: 'none', background: GRAD, color: 'white',
              cursor: suggesting || !suggestion.trim() ? 'not-allowed' : 'pointer',
              opacity: suggesting || !suggestion.trim() ? 0.5 : 1,
            }}
          >
            +
          </button>
        </div>
      )}

      <p style={{ margin: '8px 0 0', fontSize: 11, color: c.textFaint }}>
        {poll.totalVoters} {poll.totalVoters === 1 ? 'vote' : 'votes'} · {poll.isActive ? 'open' : 'closed'}
        {poll.allowsSuggestions && ' · suggestions on'}
      </p>
    </div>
  )
}

// ─── Message Item (iOS-style bubbles) ─────────────────────────────────────────

export interface MessageItemProps {
  msg: Message
  meId: number | null
  compact?: boolean
  darkMode: boolean
}

export function MessageItem({ msg, meId, compact = false, darkMode }: MessageItemProps) {
  const c = th(darkMode)
  const isMe = msg.sender.id === meId
  const color = memberColor(msg.sender.id)
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const fontSize = compact ? 12 : 15

  // Auto-poll messages render as poll cards
  if (msg.isAutoPoll && msg.poll && !compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginLeft: 36 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: c.textFaint }}>Poll</span>
        <PollCard poll={msg.poll} meId={meId} darkMode={darkMode} />
        <span style={{ fontSize: 10, color: c.textFaint }}>{time}</span>
      </div>
    )
  }

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
        <span style={{ fontSize: 10, color: c.textFaint, marginRight: 4 }}>{time}</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      {!compact && (
        <span style={{ fontSize: 11, fontWeight: 600, color, marginLeft: compact ? 0 : 40 }}>
          {msg.sender.name}
        </span>
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
          background: c.msgOtherBg, color: c.msgOtherTxt,
          borderRadius: compact ? '14px 14px 14px 3px' : '4px 18px 18px 18px',
          padding: compact ? '5px 11px' : '9px 15px',
          maxWidth: '78%',
          fontSize, lineHeight: 1.4, wordBreak: 'break-word',
        }}>
          {compact && <span style={{ fontWeight: 600, color, fontSize: 11, display: 'block', marginBottom: 2 }}>{msg.sender.name}</span>}
          {msg.content}
        </div>
      </div>
      <span style={{ fontSize: 10, color: c.textFaint, marginLeft: compact ? 0 : 40 }}>{time}</span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getMemberStatus(
  member: RtMember,
  comingEmojiId: number | null,
  notComingEmojiId: number | null,
  maybeEmojiId: number | null,
): Status {
  const comingScore    = comingEmojiId    ? (member.emojis.find(e => e.emojiId === comingEmojiId)?.score    ?? 0) : 0
  const notComingScore = notComingEmojiId ? (member.emojis.find(e => e.emojiId === notComingEmojiId)?.score ?? 0) : 0
  const maybeScore     = maybeEmojiId     ? (member.emojis.find(e => e.emojiId === maybeEmojiId)?.score     ?? 0) : 0

  const hasSignal = comingScore >= 0.4 || notComingScore >= 0.4 || maybeScore >= 0.4
  if (!hasSignal) return 'not-responded'

  if (notComingScore >= comingScore && notComingScore >= maybeScore) return 'not-coming'
  if (comingScore >= notComingScore && comingScore >= maybeScore)    return 'coming'
  return 'not-responded'
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

// ─── Invite Panel ─────────────────────────────────────────────────────────────

function InvitePanel({ groupId, darkMode, onClose }: { groupId: number; darkMode: boolean; onClose: () => void }) {
  const c = th(darkMode)
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await apiPost<{ user: { name: string } }>(`/groups/${groupId}/invite`, { phone })
      setStatus({ ok: true, msg: `${res.user.name} added to group!` })
      setPhone('')
    } catch (err) {
      setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Failed to add user' })
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', left: 0,
      background: c.panelBg, border: `1px solid ${c.border}`,
      borderRadius: 14, padding: '16px',
      boxShadow: darkMode ? '0 8px 28px rgba(0,0,0,0.4)' : '0 8px 28px rgba(0,0,0,0.12)',
      width: 240, zIndex: 50,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 10 }}>Add member by phone</div>
      <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
          style={{ borderRadius: 8, border: `1.5px solid ${c.border}`, padding: '7px 10px', fontSize: 13, color: c.text, background: c.inputBg, outline: 'none' }}
        />
        {status && (
          <p style={{ margin: 0, fontSize: 12, color: status.ok ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            {status.msg}
          </p>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="submit" disabled={loading} style={{
            flex: 1, background: GRAD, color: 'white', border: 'none', borderRadius: 8,
            padding: '7px 0', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? '…' : 'Add'}
          </button>
          <button type="button" onClick={onClose} style={{
            background: 'transparent', border: `1px solid ${c.border}`,
            borderRadius: 8, padding: '7px 12px', fontSize: 13, color: c.textSub, cursor: 'pointer',
          }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function EventPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [emojiMap, setEmojiMap] = useState<Record<number, EmojiType>>({})
  const [roundtable, setRoundtable] = useState<Roundtable>({ members: [] })
  const [messages, setMessages] = useState<Message[]>([])
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
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupLoading, setNewGroupLoading] = useState(false)
  const [newGroupError, setNewGroupError] = useState('')
  const [smallView, setSmallView] = useState<'roundtable' | 'chat'>('chat')
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [showInvite, setShowInvite] = useState(false)
  const inviteRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  // Refs so WebSocket closure always reads current values without needing to re-subscribe
  const aiSortedRef = useRef(aiSorted)
  const meRef = useRef(me)
  const feedReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isSmall = windowWidth < 900

  useLayoutEffect(() => {
    const page = document.querySelector('.page') as HTMLElement | null
    if (!page) return
    const prev = page.style.padding
    page.style.padding = '0'
    return () => { page.style.padding = prev }
  }, [])

  // Keep refs in sync with state/props so WS closure reads fresh values
  useEffect(() => { aiSortedRef.current = aiSorted }, [aiSorted])
  useEffect(() => { meRef.current = me }, [me])

  const scrollToBottom = () => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  // Sync dark mode to document so App.css header/body rules respond
  useEffect(() => {
    document.documentElement.dataset.dark = darkMode ? '1' : ''
    return () => { document.documentElement.dataset.dark = '' }
  }, [darkMode])

  // Close invite panel on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (inviteRef.current && !inviteRef.current.contains(e.target as Node)) {
        setShowInvite(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Load me, emoji types on mount
  useEffect(() => {
    apiGet<Me>('/auth/me').then(me => {
      setMe(me)
      apiGet<{ attributes: UserAttribute[] }>(`/attributes?userId=${me.userId}`)
        .then(r => { const m: Record<string, number> = {}; r.attributes.forEach(a => m[a.key] = a.score); setUserAttrs(m) })
        .catch(() => {})
    }).catch(() => {})
    fetch(`${API_BASE}/emoji-types`)
      .then(r => r.json())
      .then((types: EmojiType[]) => { const m: Record<number, EmojiType> = {}; types.forEach(t => m[t.id] = t); setEmojiMap(m) })
      .catch(() => {})
  }, [])

  // Load groups when me is available, restore last selected group
  useEffect(() => {
    if (!me) return
    apiGet<Group[]>('/groups').then(gs => {
      setGroups(gs)
      if (gs.length === 0) return
      const savedGroupId = Number(localStorage.getItem('bubble_groupId'))
      const restored = savedGroupId ? gs.find(g => g.id === savedGroupId) : null
      setSelectedGroup(restored ?? gs[0])
    }).catch(() => {})
  }, [me])

  // Load events when group changes, restore last selected event
  useEffect(() => {
    if (!selectedGroup) return
    localStorage.setItem('bubble_groupId', String(selectedGroup.id))
    setEvents([])
    setSelectedEvent(null)
    apiGet<Event[]>(`/groups/${selectedGroup.id}/events`).then(evts => {
      setEvents(evts)
      if (evts.length === 0) return
      const savedEventId = Number(localStorage.getItem('bubble_eventId'))
      const restored = savedEventId ? evts.find(e => e.id === savedEventId) : null
      setSelectedEvent(restored ?? evts[0])
    }).catch(() => {})
  }, [selectedGroup])

  // Load roundtable, messages, websocket when event changes
  useEffect(() => {
    if (!selectedEvent) return
    const eid = selectedEvent.id

    const loadRT = () => apiGet<Roundtable>(`/roundtable?eventId=${eid}`).then(setRoundtable).catch(() => {})
    const loadMsgs = () => apiGet<Message[]>(`/events/${eid}/messages`).then(setMessages).catch(() => {})
    const loadFeed = (uid: number) => apiGet<FeedMessage[]>(`/events/${eid}/feed?userId=${uid}`).then(setFeedMessages).catch(() => {})

    const scheduleFeedReload = (delayMs: number) => {
      if (feedReloadTimerRef.current) clearTimeout(feedReloadTimerRef.current)
      feedReloadTimerRef.current = setTimeout(() => {
        const uid = meRef.current?.userId
        if (uid) loadFeed(uid)
      }, delayMs)
    }

    loadRT(); loadMsgs()
    if (me) loadFeed(me.userId)

    const wsUrl = API_BASE.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsUrl}?eventId=${eid}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      const uid = meRef.current?.userId

      if (data.type === 'context_updated') {
        loadRT()
        scheduleFeedReload(1500)
      }

      if (data.type === 'new_message') {
        setMessages(prev => [...prev, data.message])
        if (aiSortedRef.current) {
          // In relevancy mode: debounce feed reload so reordering doesn't jump the view
          scheduleFeedReload(3000)
        } else {
          if (uid) loadFeed(uid)
        }
      }

      if (data.type === 'poll_updated') {
        const pollId = data.pollId as number
        apiGet<Poll>(`/polls/${pollId}/results${uid ? `?userId=${uid}` : ''}`).then(updatedPoll => {
          // Patch in-place in both lists — no full reload, no scroll
          setMessages(prev => prev.map(m => m.poll?.id === pollId ? { ...m, poll: updatedPoll } : m))
          setFeedMessages(prev => prev.map(m => m.poll?.id === pollId ? { ...m, poll: updatedPoll } : m))
        }).catch(() => {})
        // Reload event so location/time/description fields update from poll winner sync
        apiGet<Event>(`/events/${eid}`).then(updated => {
          setSelectedEvent(updated)
          setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
        }).catch(() => {})
      }
    }
    return () => {
      ws.close()
      if (feedReloadTimerRef.current) clearTimeout(feedReloadTimerRef.current)
    }
  }, [selectedEvent])

  // Snap to bottom on event switch, initial load, or filter toggle
  const prevEventIdRef = useRef<number | null>(null)
  const prevAiSortedRef = useRef(aiSorted)
  const hasScrolledForEventRef = useRef(false)
  const prevFeedLengthRef = useRef(0)

  useLayoutEffect(() => {
    const eventChanged = selectedEvent?.id !== prevEventIdRef.current
    const filterToggled = aiSorted !== prevAiSortedRef.current
    // In For You mode, treat the feed first arriving as a trigger (it reorders everything)
    const feedJustArrived = aiSorted && prevFeedLengthRef.current === 0 && feedMessages.length > 0
    const justLoaded = !hasScrolledForEventRef.current && messages.length > 0

    if (eventChanged) {
      prevEventIdRef.current = selectedEvent?.id ?? null
      hasScrolledForEventRef.current = false
      prevFeedLengthRef.current = 0
    }
    prevAiSortedRef.current = aiSorted
    prevFeedLengthRef.current = feedMessages.length

    if (eventChanged || filterToggled || feedJustArrived || justLoaded) {
      if (messages.length > 0) hasScrolledForEventRef.current = true
      scrollToBottom()
    }
  }, [messages, feedMessages, selectedEvent, aiSorted])

  const sendMessage = async () => {
    if (!text.trim() || !selectedEvent || !me) return
    try {
      await apiPost('/messages', { eventId: selectedEvent.id, senderId: me.userId, content: text.trim() })
      setText('')
    } catch { /* silent */ }
  }

  const updateEventField = async (field: string, value: string) => {
    if (!selectedEvent) return
    try {
      const updated = await apiPatch<Event>(`/events/${selectedEvent.id}`, { [field]: value })
      setSelectedEvent(updated)
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e))
    } catch { /* silent */ }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !me) { setNewGroupError('Enter a group name.'); return }
    setNewGroupLoading(true)
    setNewGroupError('')
    try {
      const group = await apiPost<Group>('/groups', { name: newGroupName.trim() })
      setGroups(prev => [...prev, group])
      setSelectedGroup(group)
      setNewGroupName('')
    } catch (err: unknown) {
      setNewGroupError((err as Error)?.message ?? 'Failed to create group.')
    }
    setNewGroupLoading(false)
  }

  const handleCreateEvent = async () => {
    if (!suggestName.trim() || !suggestMsg.trim() || !me || !selectedGroup) {
      setSuggestError('Please fill in both fields.')
      return
    }
    setSuggestLoading(true)
    setSuggestError('')
    try {
      // Backend creates the initial message and auto-polls in one call
      const event = await apiPost<Event>(`/groups/${selectedGroup.id}/events`, {
        name: suggestName.trim(),
        initialMessage: suggestMsg.trim(),
      })
      setEvents(prev => [event, ...prev])
      setSelectedEvent(event)
      localStorage.setItem('bubble_eventId', String(event.id))
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
  const comingEmojiId    = Object.values(emojiMap).find(e => e.name === 'coming')?.id    ?? null
  const notComingEmojiId = Object.values(emojiMap).find(e => e.name === 'not_coming')?.id ?? null
  const maybeEmojiId     = Object.values(emojiMap).find(e => e.name === 'maybe')?.id      ?? null
  const hasAttrs = Object.keys(userAttrs).length > 0

  const members = hasAttrs
    ? allMembers
        .filter(m => m.userId === me?.userId || memberRelevance(m, emojiMap, userAttrs) >= RELEVANCE_THRESHOLD || m.emojis.length === 0)
        .sort((a, b) => memberRelevance(b, emojiMap, userAttrs) - memberRelevance(a, emojiMap, userAttrs))
    : allMembers

  const comingMembers       = allMembers.filter(m => getMemberStatus(m, comingEmojiId, notComingEmojiId, maybeEmojiId) === 'coming')
  const notRespondedMembers = allMembers.filter(m => getMemberStatus(m, comingEmojiId, notComingEmojiId, maybeEmojiId) === 'not-responded')
  const notComingMembers    = allMembers.filter(m => getMemberStatus(m, comingEmojiId, notComingEmojiId, maybeEmojiId) === 'not-coming')

  const displayMessages = aiSorted
    ? (feedMessages.length > 0 ? feedMessages : [...messages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
        .filter(m => m.sender.id !== me?.userId || m.isAutoPoll)
        .reverse()
    : [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const myRecentMessages = messages
    .filter(m => m.sender.id === me?.userId && !m.isAutoPoll)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  const c = th(darkMode)

  return (
    <div style={{
      position: 'fixed', top: 52, bottom: 0,
      left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 1380,
      overflow: 'hidden',
      background: c.pageBg,
      transition: 'background 0.2s',
      zIndex: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: isSmall ? 8 : 12,
      padding: isSmall ? 8 : 16, boxSizing: 'border-box',
    }}>

      {/* Top header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
          {selectedEvent?.name ?? (selectedGroup ? '—' : 'No group')}
        </div>

        {/* Invite button with panel */}
        {selectedGroup && (
          <div ref={inviteRef} style={{ position: 'relative' }}>
            <button
              type="button"
              title="Invite members"
              onClick={() => setShowInvite(v => !v)}
              style={{
                height: 36, width: 36, borderRadius: '50%',
                border: `1px solid ${c.border}`, background: showInvite ? c.muted : 'transparent',
                color: c.textSub, cursor: 'pointer', flexShrink: 0, fontSize: 14,
              }}
            >
              👤+
            </button>
            {showInvite && (
              <InvitePanel
                groupId={selectedGroup.id}
                darkMode={darkMode}
                onClose={() => setShowInvite(false)}
              />
            )}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: c.textSub, fontWeight: 500 }}>Dark Mode</span>
          <Toggle on={darkMode} onToggle={() => setDarkMode(v => !v)} />
        </div>
      </div>

      {/* Small-screen tab strip */}
      {isSmall && (
        <div style={{
          display: 'flex', flexShrink: 0,
          background: c.muted, borderRadius: 12, padding: 4, gap: 4,
        }}>
          {(['roundtable', 'chat'] as const).map(view => (
            <button
              key={view}
              onClick={() => setSmallView(view)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 9, border: 'none',
                background: smallView === view ? c.tabActiveBg : c.tabInactBg,
                color: smallView === view ? c.text : c.textSub,
                fontWeight: smallView === view ? 600 : 400,
                fontSize: 13, cursor: 'pointer',
                boxShadow: smallView === view ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {view === 'roundtable' ? '🧑‍🤝‍🧑 Round Table' : '💬 Chat'}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, minHeight: 0, flex: 1 }}>

      {/* ── Left — Round Table ── */}
      {(!isSmall || smallView === 'roundtable') && <div style={{
        flex: isSmall ? '1' : '0 0 clamp(380px, 46%, 660px)',
        background: c.panelBg,
        borderRadius: 24, padding: '14px 16px 12px',
        boxShadow: darkMode ? '0 1px 8px rgba(0,0,0,0.3)' : '0 1px 8px rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', overflow: 'hidden', minHeight: 0,
        transition: 'background 0.2s',
      }}>

        {/* Group + Event selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {/* Group selector */}
          <div style={{ position: 'relative' }}>
            <select
              style={{
                appearance: 'none', paddingLeft: 12, paddingRight: 28, paddingTop: 6, paddingBottom: 6,
                fontSize: 13, color: 'white', borderRadius: 20, cursor: 'pointer',
                background: GRAD, border: 'none', outline: 'none',
              }}
              value={selectedGroup?.id ?? ''}
              onChange={e => {
                const g = groups.find(g => g.id === Number(e.target.value))
                if (g) setSelectedGroup(g)
              }}
            >
              <option value="">Select Group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id} style={{ background: '#1e293b' }}>{g.name}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'white', fontSize: 9, pointerEvents: 'none' }}>▾</span>
          </div>

          {/* Event selector — only shown if group is selected */}
          {selectedGroup && (
            <div style={{ position: 'relative' }}>
              <select
                style={{
                  appearance: 'none', paddingLeft: 12, paddingRight: 28, paddingTop: 6, paddingBottom: 6,
                  fontSize: 13, color: c.text, borderRadius: 20, cursor: 'pointer',
                  background: c.muted, border: `1px solid ${c.border}`, outline: 'none',
                }}
                value={selectedEvent?.id ?? ''}
                onChange={e => {
                  const ev = events.find(ev => ev.id === Number(e.target.value))
                  if (ev) { setSelectedEvent(ev); localStorage.setItem('bubble_eventId', String(ev.id)) }
                }}
              >
                <option value="">Select Event</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id} style={{ background: '#1e293b', color: 'white' }}>{ev.name}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: c.textSub, fontSize: 9, pointerEvents: 'none' }}>▾</span>
            </div>
          )}
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
          <EventDetails event={selectedEvent} onEdit={updateEventField} darkMode={darkMode} />
        </div>
      </div>}

      {/* ── Right — Messaging ── */}
      {(!isSmall || smallView === 'chat') && <div style={{
        flex: 1, minWidth: isSmall ? 0 : 280, background: c.panelBg,
        borderRadius: 24, boxShadow: darkMode ? '0 1px 8px rgba(0,0,0,0.3)' : '0 1px 8px rgba(0,0,0,0.07)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxSizing: 'border-box', transition: 'background 0.2s',
      }}>

        {/* Tabs */}
        <div style={{ display: 'flex', flexShrink: 0, borderBottom: `1px solid ${c.border}` }}>
          <button
            onClick={() => setCurrentView('suggest')}
            style={{
              flex: 1, padding: '10px 16px', fontSize: 14, fontWeight: 500,
              background: GRAD, color: 'white',
              border: 'none', cursor: 'pointer', borderRadius: '24px 0 0 0',
              opacity: currentView === 'suggest' ? 1 : 0.85,
              transition: 'opacity 0.15s',
            }}
          >
            + New
          </button>
          <button
            onClick={() => setCurrentView('current')}
            style={{
              flex: 1, padding: '10px 16px', fontSize: 14, fontWeight: 500,
              background: currentView === 'current' ? c.muted : c.panelBg,
              color: currentView === 'current' ? c.text : c.textFaint,
              border: 'none', cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            Current Event
          </button>
          <button
            onClick={() => setCurrentView('all')}
            style={{
              flex: 1, padding: '10px 16px', fontSize: 14, fontWeight: 500,
              background: currentView === 'all' ? c.muted : c.panelBg,
              color: currentView === 'all' ? c.text : c.textFaint,
              border: 'none', cursor: 'pointer',
              borderLeft: `1px solid ${c.border}`,
              borderRadius: '0 24px 0 0',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            All Events
          </button>
        </div>

        {/* ── New Event form ── */}
        {currentView === 'suggest' && (
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '28px 32px', gap: 20 }}>

            {/* ── New Group ── */}
            <div style={{ borderRadius: 14, border: `1px solid ${c.border}`, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: c.text }}>New Group</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. College Friends"
                  onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                  style={{ flex: 1, borderRadius: 8, border: `1.5px solid ${c.border}`, padding: '8px 12px', fontSize: 13, color: c.text, outline: 'none', background: c.inputBg }}
                  onFocus={e => (e.target.style.borderColor = '#93c5fd')}
                  onBlur={e => (e.target.style.borderColor = c.border)}
                />
                <button
                  onClick={handleCreateGroup}
                  disabled={newGroupLoading || !me}
                  style={{
                    background: GRAD, color: 'white', border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    cursor: (newGroupLoading || !me) ? 'not-allowed' : 'pointer',
                    opacity: (newGroupLoading || !me) ? 0.7 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  {newGroupLoading ? '…' : 'Create'}
                </button>
              </div>
              {newGroupError && <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>{newGroupError}</p>}
              {!me && <p style={{ margin: 0, fontSize: 12, color: c.textFaint }}>Sign in to create a group.</p>}
            </div>

            <div style={{ height: 1, background: c.border }} />

            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: c.text }}>New Event</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: c.textFaint }}>
                {selectedGroup ? `Adding to "${selectedGroup.name}"` : 'Create or select a group first.'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: c.textSub }}>Event name</label>
              <input
                value={suggestName}
                onChange={e => setSuggestName(e.target.value)}
                placeholder="e.g. Park Hangout Saturday"
                disabled={!selectedGroup}
                style={{ borderRadius: 10, border: `1.5px solid ${c.border}`, padding: '9px 14px', fontSize: 14, color: c.text, outline: 'none', background: c.inputBg }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = '#93c5fd' }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = c.border }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: c.textSub }}>Initial message</label>
              <textarea
                value={suggestMsg}
                onChange={e => setSuggestMsg(e.target.value)}
                placeholder="e.g. Hey everyone! Who's down for a park hangout this Saturday at 3pm?"
                rows={4}
                disabled={!selectedGroup}
                style={{ borderRadius: 10, border: `1.5px solid ${c.border}`, padding: '9px 14px', fontSize: 14, color: c.text, outline: 'none', background: c.inputBg, resize: 'none', fontFamily: 'inherit' }}
                onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#93c5fd' }}
                onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = c.border }}
              />
            </div>
            {suggestError && <p style={{ margin: 0, fontSize: 13, color: '#ef4444' }}>{suggestError}</p>}
            <button
              onClick={handleCreateEvent}
              disabled={suggestLoading || !selectedGroup}
              style={{
                background: GRAD, color: 'white', border: 'none', borderRadius: 12,
                padding: '11px 24px', fontSize: 14, fontWeight: 600,
                cursor: (suggestLoading || !selectedGroup) ? 'not-allowed' : 'pointer',
                opacity: (suggestLoading || !selectedGroup) ? 0.7 : 1, alignSelf: 'flex-start',
                boxShadow: '0 2px 8px rgba(96,165,250,0.25)', transition: 'opacity 0.15s',
              }}
            >
              {suggestLoading ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        )}

        {/* ── Current Event chat ── */}
        {currentView === 'current' && (
          <>
            <div style={{ padding: '16px 20px 12px', flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: c.text, lineHeight: 1.3 }}>
                  {selectedEvent?.name ?? (selectedGroup ? 'No events yet' : 'No group selected')}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: c.textFaint }}>
                  {selectedGroup?.name ?? 'Select a group to get started'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 12, color: c.textSub }}>For You Filter</span>
                <Toggle on={aiSorted} onToggle={() => setAiSorted(v => !v)} />
              </div>
            </div>

            <div style={{ height: 1, background: c.border, flexShrink: 0 }} />

            <div
              ref={messagesContainerRef}
              style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, position: 'relative' }}
            >
              {!selectedEvent
                ? <p style={{ fontSize: 12, color: c.textFaint, textAlign: 'center', marginTop: 32 }}>
                    {selectedGroup ? 'No events in this group yet. Create one with + New.' : 'Sign in and select a group to get started.'}
                  </p>
                : displayMessages.length === 0
                  ? <p style={{ fontSize: 12, color: c.textFaint, textAlign: 'center', marginTop: 32 }}>No messages yet</p>
                  : displayMessages.map(msg => (
                      <MessageItem key={msg.id} msg={msg} meId={me?.userId ?? null} darkMode={darkMode} />
                    ))
              }
              <div ref={messagesEndRef} />
            </div>

            {aiSorted && myRecentMessages.length > 0 && (
              <div style={{ flexShrink: 0, padding: '10px 20px', borderTop: `1px solid ${c.border}`, background: c.panelBg2 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: c.textFaint, margin: '0 0 8px' }}>Your Recent Messages</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                  {myRecentMessages.map(msg => <MessageItem key={msg.id} msg={msg} meId={me?.userId ?? null} compact darkMode={darkMode} />)}
                </div>
              </div>
            )}

            <div style={{ flexShrink: 0, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', borderTop: `1px solid ${c.border}` }}>
              <input
                style={{ flex: 1, borderRadius: 20, padding: '8px 16px', fontSize: 14, outline: 'none', background: c.inputBg, border: 'none', color: c.text }}
                placeholder={selectedEvent && me ? 'Type a message...' : selectedEvent ? 'Sign in to send messages' : 'Select an event first'}
                value={text}
                disabled={!selectedEvent || !me}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={sendMessage}
                disabled={!selectedEvent || !me}
                style={{ flexShrink: 0, width: 38, height: 38, borderRadius: '50%', background: GRAD, border: 'none', cursor: (!selectedEvent || !me) ? 'not-allowed' : 'pointer', color: 'white', fontWeight: 700, fontSize: 16, opacity: (!selectedEvent || !me) ? 0.5 : 1 }}
              >
                ↑
              </button>
            </div>
          </>
        )}

        {/* ── All Events list ── */}
        {currentView === 'all' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: c.text }}>
              {selectedGroup ? `Events in ${selectedGroup.name}` : 'All Events'}
            </h3>
            <p style={{ marginTop: 4, marginBottom: 16, fontSize: 12, color: c.textFaint }}>
              {selectedGroup ? 'Click an event to view its chat.' : 'Select a group to see events.'}
            </p>
            {events.length === 0 && selectedGroup && (
              <p style={{ fontSize: 12, color: c.textFaint }}>No events yet. Create one with + New.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => { setSelectedEvent(event); localStorage.setItem('bubble_eventId', String(event.id)); setCurrentView('current') }}
                  style={{
                    width: '100%', textAlign: 'left', borderRadius: 12,
                    border: `1.5px solid ${selectedEvent?.id === event.id ? '#93c5fd' : c.border}`,
                    padding: '10px 14px', cursor: 'pointer',
                    background: selectedEvent?.id === event.id ? (darkMode ? '#1e3a5f' : '#eff6ff') : c.panelBg,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: c.text }}>{event.name}</div>
                  <div style={{ fontSize: 12, color: c.textFaint, marginTop: 2 }}>{event.location || 'No location yet'}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>}
      </div>
    </div>
  )
}
