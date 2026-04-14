import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { VALID_CODES, VALID_MODES } from './_shared/stats-helpers.js'

const WINDOW_MINUTES = 15
const MAX_SUBMITS_PER_WINDOW = 3

function readBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body
}

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables are missing')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function buildFingerprint(req) {
  const ipHeader = req.headers['x-forwarded-for']
  const ip = Array.isArray(ipHeader) ? ipHeader[0] : String(ipHeader || '').split(',')[0].trim()
  const ua = req.headers['user-agent'] || ''
  const raw = `${ip}|${ua}`
  return createHash('sha256').update(raw).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = readBody(req)
    const resultCode = String(body.resultCode || '').toUpperCase()
    const mode = String(body.mode || '').toLowerCase()

    if (!VALID_CODES.includes(resultCode)) {
      return res.status(400).json({ ok: false, error: 'Invalid resultCode' })
    }

    if (!VALID_MODES.includes(mode)) {
      return res.status(400).json({ ok: false, error: 'Invalid mode' })
    }

    const fingerprintHash = buildFingerprint(req)
    const now = Date.now()
    const windowStartIso = new Date(now - WINDOW_MINUTES * 60 * 1000).toISOString()
    const supabase = getSupabaseAdminClient()

    const { count, error: countError } = await supabase
      .from('quiz_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('fingerprint_hash', fingerprintHash)
      .gte('created_at', windowStartIso)

    if (countError) {
      return res.status(500).json({ ok: false, error: 'Rate check failed' })
    }

    if ((count ?? 0) >= MAX_SUBMITS_PER_WINDOW) {
      return res.status(429).json({
        ok: false,
        error: 'Too many submissions in a short time',
      })
    }

    const { error: insertError } = await supabase
      .from('quiz_submissions')
      .insert({
        result_code: resultCode,
        mode,
        fingerprint_hash: fingerprintHash,
        source: 'web',
      })

    if (insertError) {
      return res.status(500).json({ ok: false, error: 'Insert failed' })
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
    })
  }
}
