import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Server-only key — never prefixed with VITE_, so Vite never inlines it into the client bundle.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const ALLOWED_MODELS = new Set(['claude-opus-4-6'])
const ALLOWED_TOOLS  = new Set(['web_search_20250305'])
const MAX_TOKENS_CAP = 3000

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Require a signed-in Supabase session so this proxy can't be hit anonymously and run up API cost.
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing auth token' })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid session' })

  const { model, max_tokens, messages, tools } = req.body || {}

  if (!ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: 'Invalid model' })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid messages' })
  }
  if (typeof max_tokens !== 'number' || max_tokens < 1 || max_tokens > MAX_TOKENS_CAP) {
    return res.status(400).json({ error: 'Invalid max_tokens' })
  }
  if (tools !== undefined) {
    if (!Array.isArray(tools) || tools.some((t) => !ALLOWED_TOOLS.has(t?.type))) {
      return res.status(400).json({ error: 'Invalid tools' })
    }
  }

  try {
    const msg = await anthropic.messages.create({
      model,
      max_tokens,
      messages,
      ...(tools ? { tools } : {}),
    })
    return res.status(200).json(msg)
  } catch (err) {
    console.error('[api/anthropic] Anthropic error:', err)
    const status = Number.isInteger(err.status) ? err.status : 502
    return res.status(status).json({ error: err.message || 'Upstream error' })
  }
}
