import { useMemo, useState } from 'react'
import { ChevronDown, ArrowRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLanguage } from '../../i18n/LanguageContext'

const FAQ_GROUP_DEFS = [
  {
    id: 'macro',
    titleKey: 'help.macro_title',
    descKey: 'help.macro_desc',
    items: [
      { id: 'q-what' },
      { id: 'q-dimensions' },
      { id: 'q-likert' },
      { id: 'q-goodbad' },
      { id: 'q-diff' },
    ],
  },
  {
    id: 'micro',
    titleKey: 'help.micro_title',
    descKey: 'help.micro_desc',
    items: [
      { id: 'q-mode' },
      { id: 'q-invite' },
      { id: 'q-perspective' },
      { id: 'q-alignment' },
      { id: 'q-display' },
    ],
  },
]

function getFaqItem(t, groupId, id) {
  const groupKey = groupId === 'macro' ? 'macro' : 'micro'
  const itemKeyMap = {
    'q-what': 'q_what', 'q-dimensions': 'q_dimensions', 'q-likert': 'q_likert',
    'q-goodbad': 'q_goodbad', 'q-diff': 'q_diff',
    'q-mode': 'q_mode', 'q-invite': 'q_invite', 'q-perspective': 'q_perspective',
    'q-alignment': 'q_alignment', 'q-display': 'q_display',
  }
  const k = itemKeyMap[id]
  return {
    id,
    question: t(`faq_data.${groupKey}.${k}.q`),
    answer: t(`faq_data.${groupKey}.${k}.a`),
    action: t(`faq_data.${groupKey}.${k}.action`),
  }
}

function StartTestButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-cyan px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(66,152,180,0.7)] transition-all duration-200 hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {label}
      <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
    </button>
  )
}

function FAQItem({ item, index, expanded, onToggle, tryThisLabel }) {
  const contentId = `${item.id}-content`
  return (
    <div
      className={[
        'relative border-t border-gray-100 last:border-b last:border-gray-100',
        'transition-colors duration-200',
        expanded ? 'bg-brand-cyan/[0.025]' : '',
      ].join(' ')}
    >
      {/* 左侧主题色短色条（展开时显示） */}
      <span
        className={[
          'absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-brand-cyan transition-all duration-300',
          expanded ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        aria-hidden
      />
      <h3>
        <button
          type="button"
          className="group flex w-full items-start gap-3 py-4 pl-4 pr-2 text-left"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={contentId}
        >
          <span className="font-display text-xs font-bold tabular-nums text-base-mute shrink-0 mt-0.5 w-7">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-sm font-semibold leading-relaxed text-base-text flex-1 group-hover:text-brand-cyan transition-colors">
            {item.question}
          </span>
          <ChevronDown
            className={[
              'h-4 w-4 shrink-0 mt-1 text-base-mute transition-transform duration-300',
              expanded ? 'rotate-180 text-brand-cyan' : 'rotate-0',
            ].join(' ')}
            aria-hidden
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={contentId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 0.84, 0.34, 1] }}
            className="overflow-hidden"
          >
            <div className="pl-[2.75rem] pr-2 pb-4">
              <p className="text-sm leading-relaxed text-base-text">{item.answer}</p>
              <p className="mt-2 text-xs leading-relaxed text-base-mute">
                <span className="text-eyebrow mr-1.5">{tryThisLabel}</span>
                {item.action}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 分组滚动入场（与全站同一套曲线）
const sectionReveal = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.5, ease: [0.16, 0.84, 0.34, 1] },
}

export default function FAQPage({ onStartTest }) {
  const { t } = useLanguage()
  const FAQ_GROUPS = useMemo(() => FAQ_GROUP_DEFS.map((group) => ({
    id: group.id,
    title: t(group.titleKey),
    description: t(group.descKey),
    items: group.items.map((it) => getFaqItem(t, group.id, it.id)),
  })), [t])

  const firstItemId = useMemo(() => FAQ_GROUPS[0]?.items[0]?.id ?? null, [FAQ_GROUPS])
  const [expandedId, setExpandedId] = useState(firstItemId)

  function toggleItem(id) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="pb-10">
      <header className="pt-4 pb-7 text-center md:pt-8">
        <p className="text-eyebrow">{t('help.faq_eyebrow')}</p>
        <h1 className="mt-2 text-2xl md:text-[30px] font-extrabold leading-tight text-base-text">{t('help.faq_title')}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-base-mute">
          <span className="block">{t('help.faq_subtitle_line1')}</span>
          <span className="block">{t('help.faq_subtitle_line2')}</span>
        </p>
      </header>

      <div className="space-y-8">
        {FAQ_GROUPS.map((group) => (
          <motion.section {...sectionReveal} key={group.id}>
            <div className="flex items-start gap-3 mb-2">
              <span className="mt-1 h-6 w-[3px] shrink-0 rounded-full bg-brand-cyan" aria-hidden />
              <div>
                <p className="text-eyebrow">{group.id === 'macro' ? t('help.macro_eyebrow') : t('help.micro_eyebrow')}</p>
                <h2 className="mt-1 text-lg md:text-xl font-bold text-base-text leading-snug">{group.title}</h2>
                <p className="mt-1 text-sm text-base-mute">{group.description}</p>
              </div>
            </div>
            <div className="mt-3">
              {group.items.map((item, idx) => (
                <FAQItem
                  key={item.id}
                  item={item}
                  index={idx}
                  expanded={expandedId === item.id}
                  onToggle={() => toggleItem(item.id)}
                  tryThisLabel={t('help.try_this')}
                />
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <footer className="pt-10 text-center">
        <p className="mb-5 text-sm text-base-mute">
          {t('help.faq_footer_text')}
        </p>
        <StartTestButton onClick={onStartTest} label={t('common.start_test')} />
      </footer>
    </div>
  )
}
