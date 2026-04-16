import {
  normalizeClientIp,
  sha256Hex,
} from '../server/stats-service.js'
import {
  normalizeTelemetrySubmissionPayload,
  submitTelemetryData,
} from '../server/telemetry-service.js'

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

async function buildFingerprint(req) {
  const ipHeader = req.headers['x-forwarded-for']
  const ip = normalizeClientIp(Array.isArray(ipHeader) ? ipHeader[0] : ipHeader)
  const ua = req.headers['user-agent'] || ''
  return sha256Hex(`${ip}|${ua}`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const body = readBody(req)
    const normalized = normalizeTelemetrySubmissionPayload(body)
    const fingerprintHash = await buildFingerprint(req)

    await submitTelemetryData({
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      fetchImpl: fetch,
      fingerprintHash,
      ...normalized,
    })

    return res.status(200).json({ ok: true })
  } catch (error) {
    const status = Number(error?.status) || 500
    return res.status(status).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
      code: error?.code || 'telemetry-submit-error',
    })
  }
}

