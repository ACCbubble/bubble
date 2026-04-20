import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { apiDelete, apiPost, apiGet } from './api'
import { MessagesPage } from './pages/MessagesPage'
import { PollsPage } from './pages/PollsPage'
// SignInPage and SignUpPage are intentionally not rendered — routes redirect to /event
import { TempUsernameAssignmentPage } from './pages/TempUsernameAssignment'
import { MePage } from './pages/MePage'
import { GroupsPage } from './pages/GroupsPage'
import { RoundTablePage } from './pages/RoundTablePage'
import { EventPage } from './pages/EventPage'

interface Me { userId: number; name: string }

const AVATAR_COLORS = [
  '#3b82f6', '#10b981', '#f97316', '#8b5cf6',
  '#ef4444', '#0ea5e9', '#f59e0b', '#22c55e',
]
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length] }

const GRAD = 'linear-gradient(135deg, #86efac 0%, #60a5fa 50%, #c084fc 100%)'

// ─── Shared mini input style ──────────────────────────────────────────────────

function Field({
  label, name, type = 'text', value, onChange,
}: { label: string; name: string; type?: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        style={{
          borderRadius: 8, border: `1.5px solid ${focused ? '#93c5fd' : '#e5e7eb'}`,
          padding: '6px 10px', fontSize: 13, color: '#111827',
          outline: 'none', background: '#fafafa', transition: 'border-color 0.15s',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  )
}

function SubmitBtn({ label, loading }: { label: string; loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        background: GRAD, color: 'white', border: 'none', borderRadius: 8,
        padding: '7px 0', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, width: '100%', marginTop: 2,
        transition: 'opacity 0.15s',
      }}
    >
      {loading ? '…' : label}
    </button>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#f1f5f9', margin: '3px 0' }} />
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────

type Panel = null | 'me' | 'signin' | 'signup'

function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [me, setMe] = useState<Me | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Sign-in state
  const [siPhone, setSiPhone] = useState('')
  const [siPw, setSiPw] = useState('')
  const [siErr, setSiErr] = useState('')
  const [siLoading, setSiLoading] = useState(false)

  // Sign-up state
  const [suName, setSuName] = useState('')
  const [suPhone, setSuPhone] = useState('')
  const [suPw, setSuPw] = useState('')
  const [suErr, setSuErr] = useState('')
  const [suLoading, setSuLoading] = useState(false)
  const [suDone, setSuDone] = useState(false)

  function loadMe() {
    apiGet<Me>('/auth/me').then(setMe).catch(() => setMe(null))
  }

  useEffect(() => { loadMe() }, [])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setPanel(null)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  function toggle(p: Panel) {
    setPanel(prev => prev === p ? null : p)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault(); setSiErr(''); setSiLoading(true)
    try {
      await apiPost('/auth/login', { phone: siPhone, password: siPw })
      setSiPhone(''); setSiPw('')
      loadMe(); setPanel('me')
    } catch (err) {
      setSiErr(err instanceof Error ? err.message : 'Sign in failed')
    }
    setSiLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault(); setSuErr(''); setSuLoading(true)
    try {
      await apiPost('/auth/register', { name: suName, phone: suPhone, password: suPw })
      setSuName(''); setSuPhone(''); setSuPw('')
      setSuDone(true)
      setTimeout(() => { setSuDone(false); setPanel('signin') }, 1200)
    } catch (err) {
      setSuErr(err instanceof Error ? err.message : 'Sign up failed')
    }
    setSuLoading(false)
  }

  async function handleSignOut() {
    await apiDelete('/auth/logout').catch(() => {})
    setMe(null); setPanel(null); setOpen(false)
  }

  const color = me ? avatarColor(me.userId) : '#94a3b8'

  const menuItemStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', padding: '8px 14px', textAlign: 'left',
    background: active ? '#f0f9ff' : 'transparent',
    border: 'none', cursor: 'pointer', fontSize: 13,
    color: active ? '#3b82f6' : '#374151', fontWeight: active ? 600 : 400,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxSizing: 'border-box' as const,
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>

      {/* Avatar button */}
      <button
        onClick={() => { setOpen(o => !o); setPanel(null) }}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: color,
          border: '2px solid white',
          outline: open ? `2px solid ${color}` : '2px solid transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 13, fontWeight: 700,
          transition: 'outline 0.15s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
        }}
      >
        {me
          ? me.name[0].toUpperCase()
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
        }
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'white', borderRadius: 14, border: '1px solid #e5e7eb',
          boxShadow: '0 8px 28px rgba(0,0,0,0.11)',
          width: 220, zIndex: 200, overflow: 'hidden',
          padding: '4px 0',
        }}>

          {/* Identity row (signed in) */}
          {me && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px 8px' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 13, fontWeight: 700,
                }}>
                  {me.name[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {me.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Signed in</div>
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* ── Me panel ── */}
          {me && (
            <>
              <button style={menuItemStyle(panel === 'me')} onClick={() => toggle('me')}
                onMouseEnter={e => { if (panel !== 'me') (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                onMouseLeave={e => { if (panel !== 'me') (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <span>Me</span>
                <span style={{ fontSize: 9, color: '#9ca3af' }}>{panel === 'me' ? '▲' : '▼'}</span>
              </button>

              {panel === 'me' && (
                <div style={{ padding: '12px 14px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 17, fontWeight: 700,
                      boxShadow: `0 0 0 3px ${color}28`,
                    }}>
                      {me.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{me.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>User #{me.userId}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%', padding: '6px 0', borderRadius: 8, border: '1px solid #fee2e2',
                      background: 'white', color: '#ef4444', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
              <Divider />
            </>
          )}

          {/* ── Sign in panel ── */}
          <button style={menuItemStyle(panel === 'signin')} onClick={() => toggle('signin')}
            onMouseEnter={e => { if (panel !== 'signin') (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
            onMouseLeave={e => { if (panel !== 'signin') (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <span>Sign in</span>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>{panel === 'signin' ? '▲' : '▼'}</span>
          </button>

          {panel === 'signin' && (
            <div style={{ padding: '12px 14px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Field label="Phone" name="phone" type="tel" value={siPhone} onChange={setSiPhone} />
                <Field label="Password" name="password" type="password" value={siPw} onChange={setSiPw} />
                {siErr && <p style={{ margin: 0, fontSize: 11, color: '#ef4444' }}>{siErr}</p>}
                <SubmitBtn label="Sign in" loading={siLoading} />
              </form>
            </div>
          )}

          <Divider />

          {/* ── Sign up panel ── */}
          <button style={menuItemStyle(panel === 'signup')} onClick={() => toggle('signup')}
            onMouseEnter={e => { if (panel !== 'signup') (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
            onMouseLeave={e => { if (panel !== 'signup') (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <span>Sign up</span>
            <span style={{ fontSize: 9, color: '#9ca3af' }}>{panel === 'signup' ? '▲' : '▼'}</span>
          </button>

          {panel === 'signup' && (
            <div style={{ padding: '12px 14px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              {suDone
                ? <p style={{ margin: 0, fontSize: 12, color: '#10b981', fontWeight: 600, textAlign: 'center' }}>Account created!</p>
                : <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Field label="Name" name="name" value={suName} onChange={setSuName} />
                    <Field label="Phone" name="phone" type="tel" value={suPhone} onChange={setSuPhone} />
                    <Field label="Password" name="password" type="password" value={suPw} onChange={setSuPw} />
                    {suErr && <p style={{ margin: 0, fontSize: 11, color: '#ef4444' }}>{suErr}</p>}
                    <SubmitBtn label="Create account" loading={suLoading} />
                  </form>
              }
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <ProfileMenu />
        </header>

        <main className="page">
          <Routes>
            <Route path="/" element={<Navigate to="/event" replace />} />
            <Route path="/sign-in" element={<Navigate to="/event" replace />} />
            <Route path="/sign-up" element={<Navigate to="/event" replace />} />
            <Route path="/temp-username" element={<TempUsernameAssignmentPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/polls" element={<PollsPage />} />
            <Route path="/me" element={<MePage />} />
            <Route path="/roundtable" element={<RoundTablePage />} />
            <Route path="/event" element={<EventPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
