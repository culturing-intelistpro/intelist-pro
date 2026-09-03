import { supabase } from './supabase'

// Thin client for the /api/anthropic serverless proxy — the Anthropic key never reaches the browser.
export async function callClaude(body, { signal } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    const err = new Error('Not signed in')
    err.status = 401
    throw err
  }

  const res = await fetch('/api/anthropic', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}
