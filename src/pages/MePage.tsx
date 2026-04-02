import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../api'

interface MeResponse {
  userId: number
  name: string
}

export const MePage: React.FC = () => {
  const [data, setData] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<MeResponse>('/auth/me')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>

  if (!data) {
    return (
      <>
        <h1>Profile</h1>
        <p>You are not signed in.</p>
        <Link to="/sign-in">Sign in</Link>
      </>
    )
  }

  return (
    <>
      <h1>Profile</h1>
      <dl>
        <dt>Name</dt>
        <dd>{data.name}</dd>
        <dt>User ID</dt>
        <dd>{data.userId}</dd>
      </dl>
    </>
  )
}
