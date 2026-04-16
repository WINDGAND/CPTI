import {
  normalizeClientIp,
  sha256Hex,
} from '../../server/stats-service.js'
import {
  normalizeTelemetrySubmissionPayload,
  submitTelemetryData,
} from '../../server/telemetry-service.js'

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

function getRequestIp(request) {
  const cfIp = request.headers.get('CF-Connecting-IP')
  if (cfIp) return cfIp.trim()

  return normalizeClientIp(request.headers.get('x-forwarded-for'))
}

async function buildFingerprintHash(request) {
  const ip = getRequestIp(request)
  const userAgent = request.headers.get('user-agent') || ''
  return sha256Hex(`${ip}|${userAgent}`)
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return jsonResponse(
      { ok: false, error: 'Method not allowed' },
      { status: 405, headers: { Allow: 'POST' } }
    )
  }

  try {
    const body = await readBody(context.request)
    const normalized = normalizeTelemetrySubmissionPayload(body)
    const fingerprintHash = await buildFingerprintHash(context.request)

    await submitTelemetryData({
      supabaseUrl: context.env.SUPABASE_URL,
      serviceRoleKey: context.env.SUPABASE_SERVICE_ROLE_KEY,
      fetchImpl: fetch,
      fingerprintHash,
      ...normalized,
    })

    return jsonResponse({ ok: true }, { status: 200 })
  } catch (error) {
    const status = Number(error?.status) || 500
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
        code: error?.code || 'telemetry-submit-error',
      },
      { status }
    )
  }
}

