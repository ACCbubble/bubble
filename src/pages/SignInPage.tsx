import { apiPost, apiDelete } from '../api'
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface FormData {
  phone: string;
  password: string;
}

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    phone:'',
    password:'',
  });
  const [err,setErr] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name,value} = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setErr('');

    try {
      await apiPost('/auth/login', formData);
      // Cookies are set automatically by the server via Set-Cookie headers
      navigate('/messages', { replace: true });
    } catch (err) {
      setFormData({
        phone:'',
        password:'',
      });
      setErr(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  const handleSignOut = async () => {
    await apiDelete('/auth/logout').catch(() => {})
    navigate('/sign-in', { replace: true })
  }

  return (<>
    <h1>Sign in page</h1>
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="phoneInput">Phone</label>
        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
        <label htmlFor="pwInput">Password</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} required />
      </div>
      <button type="submit">Submit</button>
      {err && <p>{err}</p>}
    </form>
    <button type="button" onClick={handleSignOut}>Sign out</button>
  </>);
}