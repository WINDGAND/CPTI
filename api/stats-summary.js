import { fetchStatsSummaryData } from '../server/stats-service.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const payload = await fetchStatsSummaryData({
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      fetchImpl: fetch,
    })

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ ok: true, data: payload })
  } catch (error) {
    const status = Number(error?.status) || 500
    return res.status(status).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
    })
  }
}
