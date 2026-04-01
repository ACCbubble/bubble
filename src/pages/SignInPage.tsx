import { apiGet, apiPost } from '../api'
import { getUsername } from '../lib/username'
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export { apiGet, apiPost, getUsername }

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

  interface APIResponse {
    token: string;
    user: Object;
  }

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setErr('');

    try {
      const res: APIResponse = await apiPost('/api/auth/login', formData);
      console.log(res);
      // assume success (200)
      navigate('/messages', { replace: true });
      localStorage.setItem('bubble_token',res.token);
    } catch (err) {
      setFormData({
        phone:'',
        password:'',
      });
      setErr(err instanceof Error ? err.message : 'An error occurred');
    }
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
  </>);
}