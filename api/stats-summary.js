/**
 * 公开统计摘要查询 API（Vercel Serverless Function）
 *
 * 职责：
 *   - 处理 GET 请求，从 stats-service 拉取聚合后的匿名统计摘要
 *     （维度分布、结果码分布、提交量等，供"大家的结果"页面展示）
 *   - 设置 CDN 缓存头：60 秒强缓存 + 5 分钟 stale-while-revalidate，
 *     在数据新鲜度与 Supabase 查询压力之间做权衡
 *
 * 响应：
 *   - 200 { ok: true, data }      查询成功，data 为聚合摘要
 *   - 405 { ok: false, error }    非 GET 请求
 *   - 5xx { ok: false, error }    Supabase 查询失败或未知错误（沿用上游错误的 status）
 */

import { fetchStatsSummaryData } from '../server/stats-service.js'

/**
 * Vercel API 路由主处理器
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    // 使用 service role key 在服务端直查 Supabase，绕过行级安全策略；
    // 数据本身已匿名聚合，不涉及个人敏感信息
    const payload = await fetchStatsSummaryData({
      supabaseUrl: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      fetchImpl: fetch,
    })

    // s-maxage=60：CDN 边缘缓存 60 秒；stale-while-revalidate=300：
    // 缓存过期后可先返回旧数据再后台刷新，避免高峰期请求全部打到 Supabase
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ ok: true, data: payload })
  } catch (error) {
    // 上游抛出的错误若带 status（如 503）则沿用，否则统一按 500 处理
    const status = Number(error?.status) || 500
    return res.status(status).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected error',
    })
  }
}
