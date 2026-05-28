/**
 * 四大色系分组元数据 — 英文翻译
 *
 * 仅覆盖文案字段（label / subtitle / desc），accent 颜色不翻译。
 * 与 src/data/typeGroups.js 配对使用，由 getLocalizedTypeGroupMeta(lang)
 * 选择当前语言版本。
 */
export const TYPE_GROUP_META_EN = {
  SR: {
    label: 'Peach Pink',
    subtitle: 'Honeymoon Immersion',
    desc: "Couples with Space (S) and Expression (R) — known for high companionship and romantic experience.",
  },
  SP: {
    label: 'Lake Blue',
    subtitle: 'Life Builders',
    desc: 'Couples with Space (S) and Expression (P) — known for pragmatic action and joint life-building.',
  },
  IR: {
    label: 'Lavender Purple',
    subtitle: 'Soul Resonance',
    desc: 'Couples with Space (I) and Expression (R) — known for independent boundaries and deep emotional connection.',
  },
  IP: {
    label: 'Mint Green',
    subtitle: 'Zen Slowness',
    desc: 'Couples with Space (I) and Expression (P) — known for relaxed coexistence and stable companionship.',
  },
}
