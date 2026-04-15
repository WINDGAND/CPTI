import {
  createDualInvite,
  normalizeCreateInvitePayload,
} from '../server/invite-service.js'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed', code: 'method-not-allowed' })
  }

  try {
    const body = readBody(req)
    const payload = normalizeCreateInvitePayload(body)
    const created = await createDualInvite({
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      fetchImpl: fetch,
      ...payload,
    })

    return res.status(200).json({ ok: true, data: created })
  } catch (error) {
    const status = Number(error?.status) || 500
    return res.status(status).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
      code: error?.code || 'invite-create-error',
    })
  }
}
