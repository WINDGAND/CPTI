import {
  encodeSseEvent,
  streamAiChatCompletionEvents,
} from '../server/ai-chat-service.js'
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

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')

  try {
    await streamAiChatCompletionEvents({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL,
      model: process.env.DEEPSEEK_MODEL,
      fetchImpl: fetch,
      body: readBody(req),
      fingerprintHash: await buildFingerprint(req),
      onEvent: (event) => {
        res.write(encodeSseEvent(event))
      },
    })
    res.end()
  } catch (error) {
    const status = Number(error?.status) || 500
    res.statusCode = status
    res.write(encodeSseEvent({
      error: error instanceof Error ? error.message : 'Unexpected error',
      code: error?.code || 'ai-chat-error',
      status,
    }))
    res.end()
  }
}
