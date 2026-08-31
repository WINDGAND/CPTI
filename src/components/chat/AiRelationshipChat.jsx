/**
 * AI 关系助手 · 对话主界面
 *
 * 把最近一次测评（单人/双人 16 型）接到多会话聊天：发送、SSE 流式回填、停止、
 * 编辑用户消息后重答、多选复制/分享/删除，以及桌面侧栏 / 移动端抽屉。
 * 会话正文经 `aiChatSessions` 写入 localStorage；侧栏收起状态单独记
 * `cpti_ai_sidebar_collapsed`。网络只走 `sendAiChatMessage`（`/api/ai-chat` SSE），
 * 本组件不直接调用 DeepSeek。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown,
  CheckSquare,
  History,
  MessageCirclePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import { sendAiChatMessage } from '../../utils/aiChatApi'
import {
  buildAiRelationshipContext,
} from '../../utils/aiChatContext'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  MAX_MESSAGES_PER_SESSION,
  clearAllSessions,
  createSession,
  deleteSession,
  genId,
  listSessions,
  renameSession,
  resolveSessionTitle,
  saveSession,
  setCurrentSession,
} from '../../utils/aiChatSessions'
import { copyTextToClipboard, toMarkdown } from '../../utils/aiChatExport'
import ChatComposer from './ChatComposer'
import ChatEmptyState from './ChatEmptyState'
import ChatMessage from './ChatMessage'
import ChatSessionDrawer from './ChatSessionDrawer'
import ChatShareModal from './ChatShareModal'

/**
 * 把 `aiChatApi` 抛出的错误码转成 i18n 文案。
 * `aborted` 返回空串：用户点停止时不弹错误条。
 *
 * @param {{ code?: string, status?: number }} error
 * @param {function} t i18n
 * @returns {string}
 */
function formatError(error, t) {
  if (error?.code === 'aborted') return ''
  if (error?.code === 'message-too-long' || error?.status === 400) return t('chat.err_too_long')
  if (error?.code === 'deepseek-key-missing') return t('chat.err_key_missing')
  if (error?.code === 'network-error') return t('chat.err_network')
  if (error?.code === 'idle-timeout' || error?.code === 'hard-timeout') return t('chat.err_idle')
  if (error?.code === 'empty-response') return t('chat.err_empty')
  if (error?.status === 504) return t('chat.err_timeout')
  if (error?.code === 'ai-chat-rate-limited') return t('chat.err_rate_limited')
  if (error?.code === 'ai-chat-daily-limited') return t('chat.err_daily_limited')
  if (error?.code === 'ai-chat-global-limited') return t('chat.err_global_limited')
  // 不直接使用 error.message —— 它由 aiChatApi.js 写死为中文，会绕过 i18n。
  // 统一回退到字典里的默认错误提示，保证中英环境一致。
  return t('chat.err_default')
}

/**
 * 组装一条可写入会话的消息（id / role / content / ISO 时间）。
 *
 * @param {'user'|'assistant'} role
 * @param {string} content
 * @returns {{ id: string, role: string, content: string, createdAt: string }}
 */
function buildNewMessage(role, content) {
  return {
    id: genId(role),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

/**
 * AI 关系助手对话页：消息列表 + 输入条 + 会话抽屉。
 *
 * @param {object} props
 * @param {object} props.resultData 最近测评结果，压缩成模型上下文
 * @param {string} [props.themeClass='theme-blue'] 四大色系 class，传给分享海报
 * @param {*} [props.toolbarLeft] 工具栏左侧插槽（如返回按钮）
 * @returns {JSX.Element}
 * 副作用：读写会话 localStorage、侧栏收起键；经 `sendAiChatMessage` POST `/api/ai-chat`
 */
export default function AiRelationshipChat({ resultData, themeClass = 'theme-blue', toolbarLeft = null }) {
  const { t } = useLanguage()
  const context = useMemo(() => buildAiRelationshipContext(resultData), [resultData])

  // 会话列表 + 当前会话
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)

  // 当前会话的消息（独立于 sessions 数组以避免频繁全量重写）
  const [messages, setMessages] = useState([])

  // 输入与传输
  const [input, setInput] = useState('')
  const [quoteText, setQuoteText] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [canStop, setCanStop] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  const abortRef = useRef(null)

  // UI 状态
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return window.localStorage.getItem('cpti_ai_sidebar_collapsed') === '1' }
    catch { return false }
  })

  /* ── 持久化 sidebar 收起状态 ────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem('cpti_ai_sidebar_collapsed', sidebarCollapsed ? '1' : '0') }
    catch { /* 配额满或隐私模式静默 */ }
  }, [sidebarCollapsed])

  // 滚动
  const scrollerRef = useRef(null)
  const shouldAutoScrollRef = useRef(false)

  /* ── 初始化：读取会话 ───────────────────────────────────── */
  useEffect(() => {
    const { sessions: list, currentSessionId: persistedId } = listSessions(context)
    setSessions(list)
    if (list.length === 0) {
      setCurrentSessionId(null)
      setMessages([])
      return
    }
    const nextId = persistedId && list.some((s) => s.id === persistedId) ? persistedId : list[0].id
    setCurrentSessionId(nextId)
    const target = list.find((s) => s.id === nextId)
    setMessages(target?.messages || [])
    setCurrentSession(context, nextId)
  }, [context])

  /* ── 切换会话时清理临时状态 ─────────────────────────────── *
   * 关键：仅在「从一个已有会话切换到另一个会话」时才 abort 在途请求。
   * 否则会出现这样一个回归 bug —— 用户在「无当前会话」状态下点发送，
   * sendMessage → ensureSession 会同步把 currentSessionId 从 null 改成新 id，
   * 接着 React 触发本 effect，把刚刚发起的请求直接 abort 掉，
   * 表现为「发送后界面卡在『停止』按钮，AI 永远不会回复」。
   */
  const prevSessionIdRef = useRef(null)
  useEffect(() => {
    const prev = prevSessionIdRef.current
    prevSessionIdRef.current = currentSessionId

    setInput('')
    setQuoteText('')
    setError('')
    setSelectionMode(false)
    setSelectedIds(new Set())

    if (prev && prev !== currentSessionId && abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
      // 主动 abort 时，旧请求 finally 里的 `abortRef.current === controller` 判断会失败，
      // 因此这里同步重置发送状态，避免新会话进来还卡在「停止」按钮。
      setIsSending(false)
      setCanStop(false)
      setStreamingMessageId(null)
    }
  }, [currentSessionId])

  /* ── 持久化当前会话的消息 ─────────────────────────────── */
  const persistTimer = useRef(null)
  useEffect(() => {
    if (!currentSessionId) return
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      const current = sessions.find((s) => s.id === currentSessionId)
      const title = resolveSessionTitle(current?.title, messages, t('chat.new_chat'))
      const next = saveSession(context, {
        id: currentSessionId,
        title,
        messages: messages.slice(-MAX_MESSAGES_PER_SESSION),
        createdAt: current?.createdAt,
        updatedAt: new Date().toISOString(),
      })
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === next.id)
        const merged = exists
          ? prev.map((s) => (s.id === next.id ? next : s))
          : [next, ...prev]
        return [...merged].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      })
    }, 250)
    return () => persistTimer.current && clearTimeout(persistTimer.current)
  }, [messages, currentSessionId, context, sessions, t])

  /* ── 滚动 ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return
    shouldAutoScrollRef.current = false
    window.requestAnimationFrame(() => {
      const c = scrollerRef.current
      if (!c) return
      c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' })
    })
  }, [messages, isSending])

  useEffect(() => {
    const c = scrollerRef.current
    if (!c) return
    function handleScroll() {
      const distance = c.scrollHeight - c.scrollTop - c.clientHeight
      // 距底部超过约一屏内容才出「跳到最新」，避免轻轻上滑就闪浮标
      setShowJumpToBottom(distance > 240 && messages.length > 0)
    }
    c.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => c.removeEventListener('scroll', handleScroll)
  }, [messages.length])

  function scrollToBottom() {
    const c = scrollerRef.current
    if (!c) return
    c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' })
  }

  /* ── 发送 ──────────────────────────────────────────────── */
  // 调用方约定：baseMessages 内不包含本轮需要生成的 assistant 占位，
  // 这里统一在末尾追加一条 assistant 占位用于流式回填。
  // 重新生成场景中，调用方会把旧的 assistant 消息先从 baseMessages 切除。
  const requestAssistant = useCallback(async (baseMessages) => {
    const assistantMessage = buildNewMessage('assistant', '')
    const workingMessages = [...baseMessages, assistantMessage]

    shouldAutoScrollRef.current = true
    setMessages(workingMessages)
    setError('')
    setIsSending(true)
    setCanStop(true)
    setStreamingMessageId(assistantMessage.id)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // 只把有正文的最近 8 条交给模型，控制 prompt 体积（与服务端历史窗口对齐）
      const requestMessages = baseMessages
        .filter((m) => m.content)
        .slice(-8)
        .map(({ role, content }) => ({ role, content }))

      const assistantText = await sendAiChatMessage({
        context,
        messages: requestMessages,
        signal: controller.signal,
        onDelta: (_delta, message) => {
          shouldAutoScrollRef.current = true
          setMessages((cur) => cur.map((entry) => (
            entry.id === assistantMessage.id ? { ...entry, content: message } : entry
          )))
        },
      })

      shouldAutoScrollRef.current = true
      setMessages((cur) => cur.map((entry) => (
        entry.id === assistantMessage.id ? { ...entry, content: assistantText } : entry
      )))
    } catch (err) {
      if (err?.code === 'aborted') {
        setMessages((cur) => {
          // 尚未写出任何字就停：丢掉空占位，避免列表留下一条空白气泡
          const filtered = cur.filter((m) => !(m.id === assistantMessage.id && !m.content?.trim()))
          return filtered.map((m) => (
            m.id === assistantMessage.id && err.partial
              ? { ...m, content: `${err.partial}\n\n_${t('chat.stop_marker')}_` }
              : m
          ))
        })
      } else if (err?.partial && err.partial.trim()) {
        // 客户端超时但已经收到部分内容：保留半截回复 + 提示
        setMessages((cur) => cur.map((entry) => (
          entry.id === assistantMessage.id
            ? { ...entry, content: `${err.partial}\n\n_${t('chat.partial_marker')}_` }
            : entry
        )))
        setError(formatError(err, t))
      } else {
        console.warn('[AiRelationshipChat] request failed', err)
        setMessages((cur) => cur.filter((entry) => entry.id !== assistantMessage.id))
        setError(formatError(err, t))
      }
    } finally {
      // 仅当本轮的 controller 仍是 abortRef.current 时才清空，避免覆盖掉新一轮请求的 controller
      if (abortRef.current === controller) {
        setIsSending(false)
        setCanStop(false)
        setStreamingMessageId(null)
        abortRef.current = null
      }
    }
  }, [context])

  function ensureSession() {
    if (currentSessionId) return currentSessionId
    const created = createSession(context, { title: t('chat.new_chat') })
    setSessions((prev) => [created, ...prev])
    setCurrentSessionId(created.id)
    return created.id
  }

  // 主动 abort 的唯一入口：点击「停止」、发送/重新生成时打断上一轮、切换会话等都走这里。
  // 关键：旧请求 finally 里的 `abortRef.current === controller` 校验在这之后必然失败
  // （我们已经把 abortRef.current 置 null），所以那条路径不会再重置发送状态。
  // 必须在这里同步把 isSending/canStop/streamingMessageId 切回 idle，
  // 否则界面会卡在「停止」按钮上、composer 也无法继续发送。
  // 若调用方紧接着 requestAssistant() 起一轮新请求，新的 setIsSending(true) 会在
  // 同一个事件处理器内被 React 批处理合并，不会出现闪烁。
  function abortInflight() {
    if (abortRef.current) {
      try { abortRef.current.abort() } catch { /* ignore */ }
      abortRef.current = null
    }
    setIsSending(false)
    setCanStop(false)
    setStreamingMessageId(null)
  }

  const sendMessage = useCallback((content) => {
    const text = String(content ?? '').trim()
    if (!text) return
    if (isSending) {
      console.warn('[AiRelationshipChat] send while sending, aborting previous request')
      abortInflight()
    }

    ensureSession()
    let composedText = text
    if (quoteText) {
      composedText = `> ${quoteText.replace(/\n/g, '\n> ')}\n\n${text}`
      setQuoteText('')
    }
    setInput('')

    const userMessage = buildNewMessage('user', composedText)
    const baseMessages = [...messages, userMessage].slice(-MAX_MESSAGES_PER_SESSION)
    requestAssistant(baseMessages)
  }, [messages, isSending, quoteText, requestAssistant])

  function regenerateLastAssistant() {
    const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant')
    if (lastAssistantIdx === -1) {
      console.warn('[AiRelationshipChat] regenerate: no assistant message found')
      return
    }
    if (isSending) {
      console.warn('[AiRelationshipChat] regenerate while sending, aborting previous request')
      abortInflight()
    }
    const idx = messages.length - 1 - lastAssistantIdx
    // 把旧的 assistant 消息从基线里切除，requestAssistant 会在末尾追加新的占位
    const base = messages.slice(0, idx)
    requestAssistant(base)
  }

  // 修改最近一条 user 消息：截断到这条消息（含编辑后内容），
  // 顺带把它之后的（含被「停止」截断的 assistant 占位）一起丢弃，重新触发 AI 回复。
  function handleEditSave(message, nextContent) {
    const idx = messages.findIndex((m) => m.id === message.id)
    if (idx === -1) {
      console.warn('[AiRelationshipChat] edit: message not found', message?.id)
      return
    }
    const cleaned = String(nextContent || '').trim()
    if (!cleaned) return

    if (isSending) {
      console.warn('[AiRelationshipChat] edit while sending, aborting previous request')
      abortInflight()
    }

    const editedMessage = {
      ...message,
      content: cleaned,
      // 把时间戳更新成「刚刚」，提示用户这是一次新的提交
      createdAt: new Date().toISOString(),
    }
    const baseMessages = [...messages.slice(0, idx), editedMessage]
    requestAssistant(baseMessages)
  }

  function stopGeneration() {
    abortInflight()
  }

  /* ── 消息级操作 ─────────────────────────────────────────── */
  function handleCopy(message) {
    copyTextToClipboard(message.content)
  }
  function handleDelete(message) {
    setMessages((cur) => cur.filter((m) => m.id !== message.id))
  }
  function handleQuote(message) {
    const snippet = String(message.content || '').replace(/\s+/g, ' ').trim()
    // 引用条只展示一行摘要，超 280 字截断，避免把整段长回复塞进输入区
    setQuoteText(snippet.length > 280 ? `${snippet.slice(0, 280)}…` : snippet)
  }
  function handleRegenerate(message) {
    // 只允许「最后一条助手消息」重答，避免从中间气泡分叉出另一条时间线
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    if (lastAssistant?.id === message.id) regenerateLastAssistant()
  }

  /* ── 多选模式 ───────────────────────────────────────────── */
  function toggleSelect(message) {
    if (!selectionMode) setSelectionMode(true)
    setSelectedIds((cur) => {
      const next = new Set(cur)
      if (next.has(message.id)) next.delete(message.id)
      else next.add(message.id)
      return next
    })
  }
  function exitSelection() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }
  function batchDelete() {
    if (selectedIds.size === 0) {
      exitSelection()
      return
    }
    setMessages((cur) => cur.filter((m) => !selectedIds.has(m.id)))
    exitSelection()
  }
  function batchCopy() {
    const picked = messages.filter((m) => selectedIds.has(m.id))
    if (picked.length === 0) return
    const md = toMarkdown(picked, { context, title: t('chat.selected_collection_title') })
    copyTextToClipboard(md)
    exitSelection()
  }
  function batchShare() {
    setShareOpen(true)
  }

  /* ── 会话操作 ───────────────────────────────────────────── */
  function handleNewSession() {
    const created = createSession(context, { title: t('chat.new_chat') })
    setSessions((prev) => [created, ...prev.filter((s) => s.id !== created.id)])
    setCurrentSessionId(created.id)
    setMessages([])
  }
  function handleSwitchSession(id) {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    setCurrentSession(context, id)
    setCurrentSessionId(id)
    setMessages(target.messages || [])
  }
  function handleRenameSession(id, nextTitle) {
    renameSession(context, id, nextTitle)
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: nextTitle.trim().slice(0, 40) } : s)))
  }
  function handleDeleteSession(id) {
    const nextCurrent = deleteSession(context, id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (id === currentSessionId) {
      setCurrentSessionId(nextCurrent)
      const next = sessions.find((s) => s.id === nextCurrent)
      setMessages(next?.messages || [])
    }
  }
  function handleClearAll() {
    setConfirmClearOpen(false)
    clearAllSessions(context)
    setSessions([])
    setCurrentSessionId(null)
    setMessages([])
  }

  /* ── 渲染 ───────────────────────────────────────────────── */
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [sessions],
  )
  const currentSession = sortedSessions.find((s) => s.id === currentSessionId)
  const sessionTitle = resolveSessionTitle(currentSession?.title, messages, t('chat.new_chat'))
  // 多选且已勾消息时，分享海报只带勾选子集；否则分享整段会话
  const shareMessages = selectionMode && selectedIds.size > 0
    ? messages.filter((m) => selectedIds.has(m.id))
    : messages
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])
  const lastUserId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'user') return messages[i].id
    }
    return null
  }, [messages])

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col md:flex-row">
      {/* ── 桌面端左上角"控制岛" ──────────────────────────────────
       * 设计目标（参考 Claude.ai / Notion / Accio Work 等）：
       *   切换按钮在 viewport 中的 (x, y) 坐标永远不变，只切换图标。
       *   收起态下右侧紧贴一个"新建对话"按钮形成视觉锚点对，
       *   展开态下隐藏新建按钮（sidebar 内顶部本就有完整"新建对话"主按钮）。
       *
       * 用 absolute 锚到主容器左上角，不再放在工具栏 flex 行中 —
       * 这样不论 sidebar 0px↔260px 切换，按钮位置都不会水平移动。 */}
      <div className="pointer-events-none hidden md:flex absolute left-3 top-2.5 z-40 items-center gap-1">
        <button
          type="button"
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-md text-base-mute transition-colors hover:bg-black/[0.045] hover:text-base-text"
          aria-label={sidebarCollapsed ? t('chat.expand_sidebar') : t('chat.collapse_sidebar')}
          title={sidebarCollapsed ? t('chat.expand_sidebar') : t('chat.collapse_sidebar')}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
        {sidebarCollapsed && (
          <button
            type="button"
            onClick={handleNewSession}
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-md text-base-mute transition-colors hover:bg-black/[0.045] hover:text-base-text"
            aria-label={t('chat.new_chat_aria')}
            title={t('chat.new_chat')}
          >
            <MessageCirclePlus size={15} />
          </button>
        )}
      </div>

      {/* 桌面端会话侧栏（可折叠） */}
      <ChatSessionDrawer
        variant="desktop"
        collapsed={sidebarCollapsed}
        sessions={sortedSessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSwitchSession}
        onNewSession={handleNewSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        footer={(
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            disabled={sessions.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-semibold text-base-mute transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={12} />
            {t('chat.clear_all')}
          </button>
        )}
      />

      {/* 移动端抽屉 */}
      <ChatSessionDrawer
        variant="mobile"
        sessions={sortedSessions}
        currentSessionId={currentSessionId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectSession={handleSwitchSession}
        onNewSession={handleNewSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        footer={(
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            disabled={sessions.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[12px] font-semibold text-base-mute transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={12} />
            {t('chat.clear_all')}
          </button>
        )}
      />

      <ChatShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        messages={shareMessages}
        context={context}
        themeClass={themeClass}
        sessionTitle={sessionTitle}
      />

      {/* 主区域 */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">

        {/* 工具栏 — 透明背景，仅靠底部 hairline 与消息区分隔 */}
        <div className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="min-w-0 flex items-center gap-1.5">
            {/* sidebar 切换按钮已抽到外层"左上角控制岛"，工具栏不再放它。
                收起态下控制岛会占据工具栏左上方约 80px 空间，这里加一个 spacer
                让 toolbarLeft / 标题向右让位避开重叠；展开态时 sidebar 自身占据
                那块区域，spacer 宽度归零，让 toolbarLeft 紧贴 sidebar 边缘。 */}
            <div
              className="hidden md:block shrink-0 transition-[width] duration-300 ease-out"
              style={{ width: sidebarCollapsed ? 78 : 0 }}
              aria-hidden
            />
            {toolbarLeft}
            <div className="min-w-0 flex items-center gap-2">
              <p className="truncate text-[13.5px] font-bold leading-tight text-base-text">
                {selectionMode ? t('chat.selection_count', { n: selectedIds.size }) : sessionTitle}
              </p>
              {!selectionMode && context.code && (
                <span
                  className="hidden sm:inline-flex h-5 shrink-0 items-center rounded-full bg-brand-cyan/10 px-2 text-[10px] font-semibold tracking-wide text-brand-cyan"
                  title={context.mode === 'dual' ? t('chat.based_on_dual', { code: context.code }) : t('chat.based_on_single', { code: context.code })}
                >
                  {context.code}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {selectionMode ? (
              <>
                <button
                  type="button"
                  onClick={batchCopy}
                  disabled={selectedIds.size === 0}
                  className="hidden sm:inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-base-text transition-colors hover:bg-black/[0.045] disabled:opacity-40"
                >
                  {t('chat.copy_selected')}
                </button>
                <button
                  type="button"
                  onClick={batchShare}
                  disabled={selectedIds.size === 0}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-base-text transition-colors hover:bg-black/[0.045] disabled:opacity-40"
                >
                  <Share2 size={13} />
                  <span className="hidden sm:inline">{t('chat.share_selected')}</span>
                </button>
                <button
                  type="button"
                  onClick={batchDelete}
                  disabled={selectedIds.size === 0}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-rose-50 px-2 text-[12px] font-medium text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">{t('chat.delete_short')}</span>
                </button>
                <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
                <button
                  type="button"
                  onClick={exitSelection}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-base-mute hover:bg-black/[0.045] hover:text-base-text"
                  aria-label={t('chat.exit_selection')}
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-base-text transition-colors hover:bg-black/[0.045]"
                  aria-label={t('chat.new_chat_aria')}
                >
                  <MessageCirclePlus size={14} />
                  <span className="hidden sm:inline">{t('chat.new_short')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-base-text transition-colors hover:bg-black/[0.045] md:hidden"
                  aria-label={t('chat.chat_history_aria')}
                >
                  <History size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode(true)}
                  disabled={messages.length === 0}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-base-text transition-colors hover:bg-black/[0.045] disabled:opacity-40"
                  aria-label={t('chat.select_msg')}
                >
                  <CheckSquare size={14} />
                  <span className="hidden sm:inline">{t('chat.select_short')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  disabled={messages.length === 0}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-brand-cyan/10 px-2 text-[12px] font-semibold text-brand-cyan transition-colors hover:bg-brand-cyan/15 disabled:opacity-40"
                  aria-label={t('chat.share')}
                >
                  <Share2 size={13} />
                  <span className="hidden sm:inline">{t('chat.share_short')}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 消息滚动区 */}
        <div
          ref={scrollerRef}
          className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-4 sm:px-5"
        >
          {messages.length === 0 ? (
            <ChatEmptyState
              context={context}
              disabled={isSending}
              onPick={(prompt) => sendMessage(prompt)}
            />
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3.5">
              {messages
                // 流式占位可能尚无 content，仍要渲染以便显示光标；其余空正文跳过
                .filter((m) => m.content || m.id === streamingMessageId)
                .map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={message.id === streamingMessageId}
                    isSelected={selectedIds.has(message.id)}
                    selectionMode={selectionMode}
                    isLastAssistant={message.id === lastAssistantId}
                    isLastUser={message.id === lastUserId}
                    isSending={isSending}
                    onCopy={handleCopy}
                    onDelete={handleDelete}
                    onQuote={handleQuote}
                    onRegenerate={handleRegenerate}
                    onEditSave={handleEditSave}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              <div className="h-2" />
            </div>
          )}

          {/* 跳到最新浮标 — flex 居中，避免 motion 的 transform 覆盖 translate-x */}
          <AnimatePresence>
            {showJumpToBottom && (
              <motion.div
                key="jump-bottom"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none sticky bottom-3 z-10 flex w-full justify-center"
              >
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-base-text shadow-md hover:bg-white"
                >
                  <ArrowDown size={12} />
                  {t('chat.jump_to_bottom')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-3 mb-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] leading-5 text-rose-600 sm:mx-5">
            {error}
          </div>
        )}

        {/* 底部输入区 — 透明背景，顶部 fade overlay 让消息渐隐到背景，composer 自己是独立圆角浮泡 */}
        <div className="relative shrink-0 px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:pb-4 md:pb-4">
          {/* 渐隐遮罩：让消息滚到底部时柔和消失，而不是被硬白底切断 */}
          <div
            className="pointer-events-none absolute -top-8 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-base-bg"
            aria-hidden
          />
          <ChatComposer
            value={input}
            onChange={setInput}
            onSubmit={() => sendMessage(input)}
            onStop={stopGeneration}
            isSending={isSending}
            canStop={canStop}
            quoteText={quoteText}
            onClearQuote={() => setQuoteText('')}
          />
        </div>
      </div>

      {/* 确认清空 */}
      <AnimatePresence>
        {confirmClearOpen && (
          <motion.div
            key="confirm-clear"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4"
          >
            <div className="absolute inset-0" onClick={() => setConfirmClearOpen(false)} aria-hidden />
            <motion.div
              key="confirm-clear-panel"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            >
              <h4 className="text-[15px] font-bold text-base-text">{t('chat.clear_all_title')}</h4>
              <p className="mt-2 text-[13px] leading-6 text-base-mute">
                {t('chat.clear_all_desc', { count: sessions.length })}
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(false)}
                  className="rounded-lg px-3 py-2 text-[13px] font-semibold text-base-text hover:bg-black/[0.05]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-lg bg-rose-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-rose-600"
                >
                  {t('chat.clear_all_confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { Pencil }
