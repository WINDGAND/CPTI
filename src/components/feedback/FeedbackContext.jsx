/**
 * 全站问题反馈 · React Context
 *
 * 在根节点挂 FeedbackProvider，任意页可通过 useFeedback().openFeedback() 打开弹层。
 * 开关状态只存在内存；真正提交由 FeedbackModal → feedbackApi 完成。
 * 不读写 localStorage。
 */
import { createContext, useContext, useState } from 'react'
import FeedbackModal from './FeedbackModal'

const FeedbackContext = createContext(null)

/**
 * 读取反馈弹层控制面。必须包在 FeedbackProvider 内，否则抛错以免静默 no-op。
 *
 * @returns {{ openFeedback: function(): void }}
 * @throws {Error} 在 Provider 外调用
 */
export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider')
  return ctx
}

/**
 * 根级 Provider：提供 openFeedback，并把 FeedbackModal 挂到子树旁。
 *
 * @param {object} props
 * @param {*} props.children
 * @returns {JSX.Element}
 * 副作用：无存储、无网络；打开弹层后的提交见 FeedbackModal
 */
export function FeedbackProvider({ children }) {
  const [open, setOpen] = useState(false)

  return (
    <FeedbackContext.Provider value={{ openFeedback: () => setOpen(true) }}>
      {children}
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </FeedbackContext.Provider>
  )
}
