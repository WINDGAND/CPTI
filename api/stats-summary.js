import { createClient } from '@supabase/supabase-js'
import { buildStatsPayload, VALID_CODES } from './_shared/stats-helpers.js'

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

function rowToCodeCountMap(row) {
  return Object.fromEntries(
    VALID_CODES.map((code) => [code, Number(row[`${code.toLowerCase()}_count`] ?? 0)])
  )
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase
      .from('stats_summary_view')
      .select('*')
      .single()

    if (error || !data) {
      return res.status(500).json({ ok: false, error: 'Summary query failed' })
    }

    const totalSubmissions = Number(data.total_submissions ?? 0)
    const updatedAt = String(data.updated_at ?? new Date().toISOString()).slice(0, 10)
    const codeToCount = rowToCodeCountMap(data)
    const payload = buildStatsPayload(totalSubmissions, updatedAt, codeToCount)

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ ok: true, data: payload })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
    })
  }
}
