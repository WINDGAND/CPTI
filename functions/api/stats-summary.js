import { fetchStatsSummaryData } from '../../server/stats-service.js'

function jsonResponse(payload, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  })
}

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return jsonResponse(
      { ok: false, error: 'Method not allowed' },
      { status: 405, headers: { Allow: 'GET' } }
    )
  }

  try {
    const payload = await fetchStatsSummaryData({
      supabaseUrl: context.env.SUPABASE_URL,
      serviceRoleKey: context.env.SUPABASE_SERVICE_ROLE_KEY,
      fetchImpl: fetch,
    })

    return jsonResponse(
      { ok: true, data: payload },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300' } }
    )
  } catch (error) {
    const status = Number(error?.status) || 500
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : 'Unexpected error' },
      { status }
    )
  }
}

