import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { MessagesPage } from './pages/MessagesPage'
import { PollsPage } from './pages/PollsPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <nav className="nav">
            <NavLink to="/sign-in">Sign in</NavLink>
            <NavLink to="/sign-up">Sign up</NavLink>
            <NavLink to="/messages">Messages</NavLink>
            <NavLink to="/polls">Polls</NavLink>
          </nav>
        </header>

        <main className="page">
          <Routes>
            <Route path="/" element={<Navigate to="/sign-in" replace />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/polls" element={<PollsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
