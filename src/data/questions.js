/**
 * CPTI 题库 — 32 道情境题，每维 8 题
 *
 * 接口约定（对接 src/utils/scoring.js）：
 *   id        — 维度缩写 + 序号，如 'SI-1'
 *   dimension — 'SI' | 'RP' | 'OF' | 'DA'
 *   polarity  — 1 = 完全同意 → 第一字母 (S/R/O/D) +3
 *              -1 = 完全同意 → 第二字母 (I/P/F/A) +3
 *   text      — 题干，统一关系视角「我们」
 *
 * 顺序策略：
 *   - 采用预设静态乱序（所有用户一致，便于运营对比）
 *   - 避免 SI→RP→OF→DA 的固定循环，减少“摸规律作答”
 */

export const QUESTIONS_PER_DIMENSION = 8

export const QUESTION_MODE_COPY = {
  single: {
    badge: '单人感知版',
    title: '先看你眼中的我们',
    description:
      '你将基于自己的真实感受来作答，结果代表你如何理解这段关系，不等于双方最终完全一致的结论。',
    hint: '请按你的主观体验选择，不需要替对方作答。',
    cta: '开始记录我的关系感知',
    progressLabel: '你的视角',
  },
  dual: {
    badge: '双人拼图正式版',
    title: '一起拼出真正的我们',
    description:
      '你们将分别独立作答，系统会合成双方视角后生成最终 Couple Type，并标出一致与错位的部分。',
    hint: '请双方独立完成，不要提前讨论答案，也不必追求一致。',
    cta: '开始第一位作答',
    progressLabel: '当前作答者',
  },
}

export function getQuestionPrompt(question, mode = 'dual', index = 0) {
  return question.text
}

export const QUESTIONS = [
  // 1-8
  {
    id: 'SI-1',
    dimension: 'SI',
    polarity: 1,
    text: '周末都空下来时，我们更常一起待着，而不是各有各的安排。',
  },
  {
    id: 'DA-1',
    dimension: 'DA',
    polarity: 1,
    text: '闹别扭后，我们通常会尽快把话摊开，而不是先拖着不提。',
  },
  {
    id: 'RP-1',
    dimension: 'RP',
    polarity: 1,
    text: '遇到有纪念意义的日子时，我们会希望有点被认真对待的感觉。',
  },
  {
    id: 'OF-1',
    dimension: 'OF',
    polarity: 1,
    text: '出门前，我们更习惯先把时间和路线大致定一下。',
  },
  {
    id: 'DA-2',
    dimension: 'DA',
    polarity: -1,
    text: '情绪上来时，我们通常会先暂停沟通，哪怕这会让问题晚点再谈。',
  },
  {
    id: 'SI-2',
    dimension: 'SI',
    polarity: -1,
    text: '就算关系稳定，我们也会需要各自独处来回血。',
  },
  {
    id: 'OF-2',
    dimension: 'OF',
    polarity: -1,
    text: '临时出现新想法时，我们通常会接受改计划。',
  },
  {
    id: 'RP-2',
    dimension: 'RP',
    polarity: -1,
    text: '比起专门制造惊喜，我们更常通过把日常事务做好来表达在意。',
  },

  // 9-16
  {
    id: 'OF-3',
    dimension: 'OF',
    polarity: 1,
    text: '如果共同花销没先定预算，我们会明显不安。',
  },
  {
    id: 'RP-3',
    dimension: 'RP',
    polarity: 1,
    text: '即使平时很忙，我们也会给彼此留一点“像约会”的时刻。',
  },
  {
    id: 'SI-3',
    dimension: 'SI',
    polarity: 1,
    text: '分开几天时，我们通常会主动抽时间通话或认真聊近况。',
  },
  {
    id: 'DA-3',
    dimension: 'DA',
    polarity: 1,
    text: '有不舒服时，我们通常会直接说出来，不太会一直闷着。',
  },
  {
    id: 'RP-4',
    dimension: 'RP',
    polarity: -1,
    text: '当一方状态很差时，我们更常先帮对方把现实问题处理好。',
  },
  {
    id: 'OF-4',
    dimension: 'OF',
    polarity: -1,
    text: '我们对“今天临时改安排”这件事的接受度通常比较高。',
  },
  {
    id: 'DA-4',
    dimension: 'DA',
    polarity: -1,
    text: '吵到上头时，我们更容易先冷处理，而不是当场定输赢。',
  },
  {
    id: 'SI-4',
    dimension: 'SI',
    polarity: -1,
    text: '在同一个空间里，我们长时间各做各的也不会觉得疏远。',
  },

  // 17-24
  {
    id: 'SI-5',
    dimension: 'SI',
    polarity: 1,
    text: '工作日结束后，我们通常会优先把一段固定时间留给彼此。',
  },
  {
    id: 'DA-5',
    dimension: 'DA',
    polarity: 1,
    text: '出现分歧时，我们更倾向尽快把核心问题聊清楚。',
  },
  {
    id: 'OF-5',
    dimension: 'OF',
    polarity: 1,
    text: '提前约好的行程一旦被临时改动，我们通常会不太舒服。',
  },
  {
    id: 'RP-5',
    dimension: 'RP',
    polarity: 1,
    text: '那些带一点仪式感的小安排，确实会让我们更有被爱感。',
  },
  {
    id: 'RP-6',
    dimension: 'RP',
    polarity: -1,
    text: '送礼或表达心意时，我们更看重实用度，而不是惊喜感。',
  },
  {
    id: 'SI-6',
    dimension: 'SI',
    polarity: -1,
    text: '就算在同城，我们也不太需要随时报备彼此行程。',
  },
  {
    id: 'DA-6',
    dimension: 'DA',
    polarity: -1,
    text: '对方在气头上时，我们更倾向先留空间，而不是当下追问。',
  },
  {
    id: 'OF-6',
    dimension: 'OF',
    polarity: -1,
    text: '下班后临时冒出新安排时，我们通常也能快速切换。',
  },

  // 25-32
  {
    id: 'OF-7',
    dimension: 'OF',
    polarity: 1,
    text: '在搬家、换工作这类大决定上，不先把信息梳理清楚我们很难推进。',
  },
  {
    id: 'DA-7',
    dimension: 'DA',
    polarity: 1,
    text: '即使是容易尴尬的话题，我们也会主动约一个时间聊清楚。',
  },
  {
    id: 'RP-7',
    dimension: 'RP',
    polarity: 1,
    text: '一起出行时，我们会刻意安排一些“只属于我们”的时刻。',
  },
  {
    id: 'SI-7',
    dimension: 'SI',
    polarity: 1,
    text: '涉及双方的社交场合（朋友局/家庭局），我们更倾向一起出现。',
  },
  {
    id: 'DA-8',
    dimension: 'DA',
    polarity: -1,
    text: '有些冲突我们会先隔一段时间再谈，这样通常比当场谈更有效。',
  },
  {
    id: 'OF-8',
    dimension: 'OF',
    polarity: -1,
    text: '旅行时我们更愿意到了再决定吃住行，而不是提前排满。',
  },
  {
    id: 'SI-8',
    dimension: 'SI',
    polarity: -1,
    text: '见面频率下降时，我们通常不会立刻担心亲密感变淡。',
  },
  {
    id: 'RP-8',
    dimension: 'RP',
    polarity: -1,
    text: '比起专门策划“浪漫项目”，我们更享受踏实过日子的默契。',
  },
]
