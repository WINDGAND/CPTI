import {
  createDualInvite,
  normalizeCreateInvitePayload,
} from '../../server/invite-service.js'

function jsonResponse(payload, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  })
}

async function readBody(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return jsonResponse(
      { ok: false, error: 'Method not allowed', code: 'method-not-allowed' },
      { status: 405, headers: { Allow: 'POST' } }
    )
  }

  try {
    const body = await readBody(context.request)
    const payload = normalizeCreateInvitePayload(body)
    const created = await createDualInvite({
      supabaseUrl: context.env.SUPABASE_URL,
      serviceRoleKey: context.env.SUPABASE_SERVICE_ROLE_KEY,
      fetchImpl: fetch,
      ...payload,
    })
    return jsonResponse({ ok: true, data: created }, { status: 200 })
  } catch (error) {
    const status = Number(error?.status) || 500
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
        code: error?.code || 'invite-create-error',
      },
      { status }
    )
  }
}
