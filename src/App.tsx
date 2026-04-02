import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { MessagesPage } from './pages/MessagesPage'
import { PollsPage } from './pages/PollsPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { TempUsernameAssignmentPage } from './pages/TempUsernameAssignment'
import { MePage } from './pages/MePage'
import { GroupsPage } from './pages/GroupsPage'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <nav className="nav">
            <NavLink to="/sign-in">Sign in</NavLink>
            <NavLink to="/sign-up">Sign up</NavLink>
            <NavLink to="/temp-username">Temp username</NavLink>
            <NavLink to="/groups">Groups</NavLink>
            <NavLink to="/messages">Messages</NavLink>
            <NavLink to="/polls">Polls</NavLink>
            <NavLink to="/me">Me</NavLink>
          </nav>
        </header>

        <main className="page">
          <Routes>
            <Route path="/" element={<Navigate to="/sign-in" replace />} />
            //<Route path="/" element={<Navigate to="/groups" replace />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/temp-username" element={<TempUsernameAssignmentPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/polls" element={<PollsPage />} />
            <Route path="/me" element={<MePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
