# Localhost Instructions

## Mac: 

Run the following commands within the project directory by hitting terminal>new in your IDE and install dependencies if needed:

```
npm install
npm run dev
```

## Windows:

Open PowerShell (or Command Prompt), go to the project folder, then run:
```
npm install
npm run dev
```

# Frontend GET/POST Examples (Localhost)

Use these patterns to build frontend features that read and write API data.

> Shared setup is already done in this project: API URL in `.env.development` and shared helper in `src/api.ts`.

**These examples won't work because this is not how you need to output your data and the API still needs to be written!** Base your code off them but don't expect it to function without a large overhaul.

## GET example

```tsx
import { useEffect, useState } from 'react'
import { apiGet } from '../api' // Shared GET helper

type Poll = { // Shape of each item from the API
  id: string
  question: string
}

export function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]) // Data for rendering
  const [loading, setLoading] = useState(true) // Loading UI state
  const [error, setError] = useState('') // Error UI state

  useEffect(() => {
    // Fetch data once when page loads
    apiGet<Poll[]>('/polls')
      .then((result) => setPolls(result)) // Save API result into state
      .catch(() => setError('Could not load polls.')) // Show error state
      .finally(() => setLoading(false)) // Stop loading spinner/state
  }, [])

  if (loading) return <p>Loading...</p> // Loading UI
  if (error) return <p>{error}</p> // Error UI
  if (!polls.length) return <p>No polls yet.</p> // Empty UI

  return (
    <div>
      {/* Populate page with API results */}
      {polls.map((poll) => (
        <p key={poll.id}>{poll.question}</p> // Render each poll
      ))}
    </div>
  )
}
```

## POST example

```tsx
import { FormEvent, useState } from 'react'
import { apiPost } from '../api' // Shared POST helper

type CreatedPoll = { // Shape of API response after POST
  id: string
  question: string
}

export function CreatePollPage() {
  const [question, setQuestion] = useState('') // Form field state
  const [saving, setSaving] = useState(false) // Submit/loading state
  const [message, setMessage] = useState('') // Success/error message

  // Submit handler that sends POST request
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question.trim()) return // Basic empty check

    setSaving(true)
    setMessage('')

    apiPost<CreatedPoll>('/polls', { question: question.trim() })
      .then((created) => {
        setQuestion('') // Clear input after success
        setMessage(`Created: ${created.question}`) // Show success feedback
      })
      .catch(() => {
        setMessage('Could not create poll.') // Show error feedback
      })
      .finally(() => {
        setSaving(false) // Re-enable button
      })
  }

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Poll question"
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Create poll'}
        </button>
      </form>

      {/* Message area for success/error */}
      {message && <p>{message}</p>}
    </div>
  )
}
```

## Temp - Username Assignment (Sprint 1)

Sprint 1 does not enforce authentication for messaging and polls, so a temporary username flow is used to identify requests.

How to use:

1. Visit `/temp-username`.
2. Enter a username and click **Save**.
3. Refresh the page to confirm it persists.

Storage details:

- localStorage key: `bubble_username`

Example of use: 
```ts
import { getUsername } from '../lib/username'
const username = getUsername() //Get username
```

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
