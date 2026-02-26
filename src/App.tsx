import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

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
            <Route path="/sign-in" element={<h1>Sign in page</h1>} />
            <Route path="/sign-up" element={<h1>Sign up page</h1>} />
            <Route path="/messages" element={<h1>Messages page</h1>} />
            <Route path="/polls" element={<h1>Polls page</h1>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
