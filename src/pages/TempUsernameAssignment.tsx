import { useState } from 'react'
import type { FormEvent } from 'react'
import { getUsername, setUsername } from '../lib/username'

export function TempUsernameAssignmentPage() {
  const [inputValue, setInputValue] = useState('')
  const [savedUsername, setSavedUsername] = useState<string | null>(() => getUsername())

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUsername(inputValue)
    setSavedUsername(getUsername())
    setInputValue('')
  }

  return (
    <section>
      <h1>Temp - Username Assignment</h1>
      <p>Set a username for messaging and polls in Sprint 1.</p>

      <p>Current username: {savedUsername ?? 'Not set'}</p>

      <form onSubmit={onSubmit}>
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Enter username"
        />
        <button type="submit">Save</button>
      </form>
    </section>
  )
}
