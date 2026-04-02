import { apiGet, apiPost } from '../api'
import { getUsername } from '../lib/username'
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export { apiGet, apiPost, getUsername }

interface FormData {
  name: string;
  phone: string;
  password: string;
}

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    name:'',
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
      await apiPost('/auth/register', formData);
      navigate('/sign-in', { replace: true });
    } catch (err) {
      setFormData({
        name:'',
        phone:'',
        password:'',
      });
      setErr(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  return (<>
    <h1>Sign up page</h1>
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="nameInput">Name</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
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