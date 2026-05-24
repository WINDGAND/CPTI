import { requestAiChatCompletion } from '../server/ai-chat-service.js'
import {
  normalizeClientIp,
  sha256Hex,
} from '../server/stats-service.js'

export const config = {
  maxDuration: 60,
}

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
    const data = await requestAiChatCompletion({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL,
      model: process.env.DEEPSEEK_MODEL,
      fetchImpl: fetch,
      body: readBody(req),
      fingerprintHash: await buildFingerprint(req),
    })

    return res.status(200).json({ ok: true, data })
  } catch (error) {
    const status = Number(error?.status) || 500
    return res.status(status).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
      code: error?.code || 'ai-chat-error',
    })
  }
}
