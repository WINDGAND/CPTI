import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { TRANSLATIONS } from './translations'

/**
 * CPTI 轻量级 i18n —— 仅依赖 React Context，无第三方库。
 *
 * 支持语言：'zh'（默认） | 'en'
 * 持久化：localStorage('cpti_lang')；首次访问读取浏览器语言，默认中文。
 *
 * 用法：
 *   const { lang, setLang, t } = useLanguage()
 *   t('common.start_test')                  // 简单 key
 *   t('foo.bar', { count: 3 })              // 占位符替换 {count}
 *   t('dim.SI.posLabel', { fallback: '' })  // 兜底
 */

const STORAGE_KEY = 'cpti_lang'
const SUPPORTED = ['zh', 'en']
const DEFAULT_LANG = 'zh'

function readInitialLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved && SUPPORTED.includes(saved)) return saved
  } catch {
    // 隐私模式静默
  }
  return DEFAULT_LANG
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined
  const segments = path.split('.')
  let cur = obj
  for (const seg of segments) {
    if (cur && typeof cur === 'object' && seg in cur) {
      cur = cur[seg]
    } else {
      return undefined
    }
  }
  return cur
}

function interpolate(template, vars) {
  if (typeof template !== 'string' || !vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`
  )
}

const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
    }
  }, [lang])

  const setLang = useCallback((next) => {
    if (SUPPORTED.includes(next)) setLangState(next)
  }, [])

  const t = useCallback((key, options = {}) => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG]
    let value = getByPath(dict, key)
    if (value === undefined) {
      // 回退到中文，再回退到 fallback 或 key
      const fallbackDict = TRANSLATIONS[DEFAULT_LANG]
      value = getByPath(fallbackDict, key)
    }
    if (value === undefined) {
      if ('fallback' in options) return options.fallback
      return key
    }
    if (typeof value === 'string' && options && Object.keys(options).length > 0) {
      return interpolate(value, options)
    }
    return value
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}

/**
 * 语言后缀辅助：把 zh 数据转换成英文等价版本时，按 lang 选择字段。
 * 如：pickByLang(lang, { zh: '中文', en: 'English' })
 */
export function pickByLang(lang, dict) {
  if (!dict) return ''
  return dict[lang] ?? dict[DEFAULT_LANG] ?? ''
}
