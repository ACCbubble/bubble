import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string
const GRAD = 'linear-gradient(135deg, #86efac 0%, #60a5fa 50%, #c084fc 100%)'

export function DemoSignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/demo-signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Sign up failed')
      }
      // Cookies are set by the server — go straight to the event page
      navigate('/event', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a',
    }}>
      <div style={{
        width: '100%', maxWidth: 380, padding: '40px 36px',
        background: '#1e293b', borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {/* Logo / heading */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            background: GRAD, borderRadius: 16, padding: '10px 20px',
            fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.5px',
            marginBottom: 10,
          }}>
            bubble
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Sign up to join the demo</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              placeholder="Your name"
              style={{
                borderRadius: 10, border: '1.5px solid #334155',
                padding: '10px 14px', fontSize: 14, color: '#f1f5f9',
                background: '#0f172a', outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Phone number</span>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
              placeholder="e.g. 5550001234"
              style={{
                borderRadius: 10, border: '1.5px solid #334155',
                padding: '10px 14px', fontSize: 14, color: '#f1f5f9',
                background: '#0f172a', outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Choose a password"
              style={{
                borderRadius: 10, border: '1.5px solid #334155',
                padding: '10px 14px', fontSize: 14, color: '#f1f5f9',
                background: '#0f172a', outline: 'none',
              }}
            />
          </label>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#f87171', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              background: loading ? '#334155' : GRAD,
              color: 'white', border: 'none', borderRadius: 12,
              padding: '13px 0', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Joining…' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}
