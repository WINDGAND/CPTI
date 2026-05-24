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
import {
  MAX_MESSAGES_PER_SESSION,
  clearAllSessions,
  createSession,
  deleteSession,
  deriveTitle,
  genId,
  listSessions,
  renameSession,
  saveSession,
  setCurrentSession,
} from '../../utils/aiChatSessions'
import { copyTextToClipboard, toMarkdown } from '../../utils/aiChatExport'
import ChatComposer from './ChatComposer'
import ChatEmptyState from './ChatEmptyState'
import ChatMessage from './ChatMessage'
import ChatSessionDrawer from './ChatSessionDrawer'
import ChatShareModal from './ChatShareModal'

function formatError(error) {
  if (error?.code === 'aborted') return ''
  if (error?.code === 'message-too-long' || error?.status === 400) {
    return '这次输入有点长，可以拆成一个更具体的问题再问我。'
  }
  if (error?.code === 'deepseek-key-missing') {
    return 'AI 服务还没有配置好 DeepSeek Key，部署环境需要补充环境变量。'
  }
  if (error?.status === 504) return 'AI 这次思考超时了，稍后再试一次。'
  return error?.message || 'AI 关系助手暂时没有回应，请稍后重试。'
}

function buildNewMessage(role, content) {
  return {
    id: genId(role),
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

export default function AiRelationshipChat({ resultData, themeClass = 'theme-blue', toolbarLeft = null }) {
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

  /* ── 切换会话时清理临时状态 ─────────────────────────────── */
  useEffect(() => {
    setInput('')
    setQuoteText('')
    setError('')
    setSelectionMode(false)
    setSelectedIds(new Set())
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [currentSessionId])

  /* ── 持久化当前会话的消息 ─────────────────────────────── */
  const persistTimer = useRef(null)
  useEffect(() => {
    if (!currentSessionId) return
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      const current = sessions.find((s) => s.id === currentSessionId)
      const title = current?.title && current.title !== '新的对话'
        ? current.title
        : deriveTitle(messages)
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
  }, [messages, currentSessionId, context, sessions])

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
  const requestAssistant = useCallback(async (baseMessages, { replaceAssistantId } = {}) => {
    const assistantMessage = buildNewMessage('assistant', '')
    let workingMessages

    if (replaceAssistantId) {
      workingMessages = baseMessages.map((m) => (
        m.id === replaceAssistantId
          ? { ...m, id: assistantMessage.id, content: '', createdAt: assistantMessage.createdAt }
          : m
      ))
    } else {
      workingMessages = [...baseMessages, assistantMessage]
    }

    shouldAutoScrollRef.current = true
    setMessages(workingMessages)
    setError('')
    setIsSending(true)
    setCanStop(true)
    setStreamingMessageId(assistantMessage.id)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const requestMessages = baseMessages
        .filter((m) => m.content && m.id !== replaceAssistantId)
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
          const filtered = cur.filter((m) => !(m.id === assistantMessage.id && !m.content?.trim()))
          return filtered.map((m) => (
            m.id === assistantMessage.id && err.partial
              ? { ...m, content: `${err.partial}\n\n_（已停止）_` }
              : m
          ))
        })
      } else {
        setMessages((cur) => cur.filter((entry) => entry.id !== assistantMessage.id))
        setError(formatError(err))
      }
    } finally {
      setIsSending(false)
      setCanStop(false)
      setStreamingMessageId(null)
      abortRef.current = null
    }
  }, [context])

  function ensureSession() {
    if (currentSessionId) return currentSessionId
    const created = createSession(context, { title: '新的对话' })
    setSessions((prev) => [created, ...prev])
    setCurrentSessionId(created.id)
    return created.id
  }

  const sendMessage = useCallback((content) => {
    const text = String(content ?? '').trim()
    if (!text || isSending) return

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
    if (isSending) return
    const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant')
    if (lastAssistantIdx === -1) return
    const idx = messages.length - 1 - lastAssistantIdx
    const targetMessage = messages[idx]
    const base = messages.slice(0, idx)
    requestAssistant(base, { replaceAssistantId: targetMessage.id })
  }

  function stopGeneration() {
    if (abortRef.current) {
      abortRef.current.abort()
    }
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
    setQuoteText(snippet.length > 280 ? `${snippet.slice(0, 280)}…` : snippet)
  }
  function handleRegenerate(message) {
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
    const md = toMarkdown(picked, { context, title: '对话精选' })
    copyTextToClipboard(md)
    exitSelection()
  }
  function batchShare() {
    setShareOpen(true)
  }

  /* ── 会话操作 ───────────────────────────────────────────── */
  function handleNewSession() {
    const created = createSession(context, { title: '新的对话' })
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
  const sessionTitle = currentSession?.title || (messages.length ? deriveTitle(messages) : '新的对话')
  const shareMessages = selectionMode && selectedIds.size > 0
    ? messages.filter((m) => selectedIds.has(m.id))
    : messages
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].id
    }
    return null
  }, [messages])

  return (
    <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
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
            清空所有对话
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
            清空所有对话
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
            {/* 桌面端 sidebar 收起/展开切换 */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md text-base-mute transition-colors hover:bg-black/[0.045] hover:text-base-text"
              aria-label={sidebarCollapsed ? '展开对话历史' : '收起对话历史'}
              title={sidebarCollapsed ? '展开对话历史' : '收起对话历史'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
            {toolbarLeft}
            <div className="min-w-0 flex items-center gap-2">
              <p className="truncate text-[13.5px] font-bold leading-tight text-base-text">
                {selectionMode ? `已选 ${selectedIds.size} 条` : sessionTitle}
              </p>
              {!selectionMode && context.code && (
                <span
                  className="hidden sm:inline-flex h-5 shrink-0 items-center rounded-full bg-brand-cyan/10 px-2 text-[10px] font-semibold tracking-wide text-brand-cyan"
                  title={`基于 ${context.code} 结果${context.mode === 'dual' ? '（双人）' : '（单人）'}`}
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
                  复制选中
                </button>
                <button
                  type="button"
                  onClick={batchShare}
                  disabled={selectedIds.size === 0}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-base-text transition-colors hover:bg-black/[0.045] disabled:opacity-40"
                >
                  <Share2 size={13} />
                  <span className="hidden sm:inline">分享选中</span>
                </button>
                <button
                  type="button"
                  onClick={batchDelete}
                  disabled={selectedIds.size === 0}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-rose-50 px-2 text-[12px] font-medium text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">删除</span>
                </button>
                <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
                <button
                  type="button"
                  onClick={exitSelection}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-base-mute hover:bg-black/[0.045] hover:text-base-text"
                  aria-label="退出选择"
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
                  aria-label="新建对话"
                >
                  <MessageCirclePlus size={14} />
                  <span className="hidden sm:inline">新建</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-base-text transition-colors hover:bg-black/[0.045] md:hidden"
                  aria-label="对话历史"
                >
                  <History size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode(true)}
                  disabled={messages.length === 0}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-base-text transition-colors hover:bg-black/[0.045] disabled:opacity-40"
                  aria-label="选择消息"
                >
                  <CheckSquare size={14} />
                  <span className="hidden sm:inline">选择</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  disabled={messages.length === 0}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-brand-cyan/10 px-2 text-[12px] font-semibold text-brand-cyan transition-colors hover:bg-brand-cyan/15 disabled:opacity-40"
                  aria-label="分享对话"
                >
                  <Share2 size={13} />
                  <span className="hidden sm:inline">分享</span>
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
                .filter((m) => m.content || m.id === streamingMessageId)
                .map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={message.id === streamingMessageId}
                    isSelected={selectedIds.has(message.id)}
                    selectionMode={selectionMode}
                    isLastAssistant={message.id === lastAssistantId}
                    isSending={isSending}
                    onCopy={handleCopy}
                    onDelete={handleDelete}
                    onQuote={handleQuote}
                    onRegenerate={handleRegenerate}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              <div className="h-2" />
            </div>
          )}

          {/* 跳到最新浮标 */}
          <AnimatePresence>
            {showJumpToBottom && (
              <motion.button
                key="jump-bottom"
                type="button"
                onClick={scrollToBottom}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto sticky bottom-3 left-1/2 z-10 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-base-text shadow-md hover:bg-white"
              >
                <ArrowDown size={12} />
                跳到最新
              </motion.button>
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
              <h4 className="text-[15px] font-bold text-base-text">清空所有对话？</h4>
              <p className="mt-2 text-[13px] leading-6 text-base-mute">
                将删除当前结果下所有 {sessions.length} 条对话历史。此操作仅作用于当前浏览器，无法撤销。
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(false)}
                  className="rounded-lg px-3 py-2 text-[13px] font-semibold text-base-text hover:bg-black/[0.05]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded-lg bg-rose-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-rose-600"
                >
                  全部清空
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
