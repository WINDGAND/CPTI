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
    text: '情绪顶上来时，我们更容易先停一下，等缓和后再聊。',
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
    text: '比起准备浪漫桥段，我们更常用把事办妥来表达在意。',
  },

  // 9-16
  {
    id: 'OF-3',
    dimension: 'OF',
    polarity: 1,
    text: '涉及共同花销时，我们会先对预算有个基本共识。',
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
    text: '分开几天时，我们会主动找时间保持联系。',
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
    text: '比起惊喜感，我们更看重日常里的稳定配合。',
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
    text: '在同一个空间里，我们可以长时间各做各的也不别扭。',
  },

  // 17-24
  {
    id: 'SI-5',
    dimension: 'SI',
    polarity: 1,
    text: '工作日结束后，我们通常会想把晚上的一段时间留给彼此。',
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
    text: '提前约好的行程，我们一般会按原计划执行。',
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
    text: '和花心思制造氛围相比，我们更在意彼此是否把生活照顾好。',
  },
  {
    id: 'SI-6',
    dimension: 'SI',
    polarity: -1,
    text: '就算一阵子互动少一点，我们也能先顾好各自节奏。',
  },
  {
    id: 'DA-6',
    dimension: 'DA',
    polarity: -1,
    text: '对方在气头上时，我们多半会先给空间，不急着追问。',
  },
  {
    id: 'OF-6',
    dimension: 'OF',
    polarity: -1,
    text: '我们更像边走边看，很少把每周都排得特别满。',
  },

  // 25-32
  {
    id: 'OF-7',
    dimension: 'OF',
    polarity: 1,
    text: '遇到搬家、换工作这类大决定时，我们会先把关键信息梳理清楚。',
  },
  {
    id: 'DA-7',
    dimension: 'DA',
    polarity: 1,
    text: '一些不太好聊的话题，我们通常也会找机会正面谈。',
  },
  {
    id: 'RP-7',
    dimension: 'RP',
    polarity: 1,
    text: '一起出行时，我们会有意识地留下一些“属于我们”的记忆。',
  },
  {
    id: 'SI-7',
    dimension: 'SI',
    polarity: 1,
    text: '日常的小事（买菜、办事、散步）我们常会想一起去做。',
  },
  {
    id: 'DA-8',
    dimension: 'DA',
    polarity: -1,
    text: '有些冲突我们会先隔一段时间再谈，效果反而更好。',
  },
  {
    id: 'OF-8',
    dimension: 'OF',
    polarity: -1,
    text: '没有明确周计划时，我们反而更容易放松下来。',
  },
  {
    id: 'SI-8',
    dimension: 'SI',
    polarity: -1,
    text: '即使见面频率下降，我们也能先把各自生活过稳。',
  },
  {
    id: 'RP-8',
    dimension: 'RP',
    polarity: -1,
    text: '比起专门策划“浪漫项目”，我们更享受踏实过日子的默契。',
  },
]
