# CPTI - 亲密光谱测试（Couple Type Indicator）

一个面向情侣关系的多端 H5 测评应用。  
通过 4 个维度、16 种类型与可分享结果页，帮助用户理解“关系如何运作”，而非给个人贴标签。

---

## 目录

- [项目简介](#项目简介)
- [核心能力](#核心能力)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [本地开发](#本地开发)
- [环境变量](#环境变量)
- [数据与算法说明](#数据与算法说明)
- [统计系统说明](#统计系统说明)
- [问题反馈系统说明](#问题反馈系统说明)
- [部署说明](#部署说明)
- [常见问题（开发侧）](#常见问题开发侧)
- [后续迭代建议](#后续迭代建议)

---

## 项目简介

**CPTI（Couple Type Indicator）** 是一个关系测评产品，聚焦“情侣互动模式”而不是“个人性格标签”。  
当前版本包含：

- 单人感知版：先看用户主观视角下的关系画像
- 双人拼图版：双方独立作答后合成最终关系类型
- 结果报告页：展示代码类型、光谱分布、优势挑战、冲突模式、建议等
- AI 关系助手：测试后基于当前 CPTI 结果进行轻量情感问答，聊天记录仅保存在当前浏览器
- 统计页：展示实时（或回退）样本分布与类型趋势
- 问题反馈：全站可用的轻量反馈入口，写入 Supabase `user_feedback` 表

> 设计原则：移动端优先、动画流畅、静态前端优先、可快速社交传播。

---

## 核心能力

### 1) 测评流程

- 第 0 题选择模式（单人 / 双人）
- 32 道情境题（4 维度 * 8 题）
- 7 点量表作答（+3 至 -3）
- 自动进入 2 秒分析过渡页
- 生成结果报告页，可输入昵称并分享

### 2) 双人拼图机制

- 第一位完成后生成一次性邀请链接（仅携带 `dualToken`）
- 第二位通过链接进入并完成答题
- 邀请链接默认 24 小时有效，成功提交后立即失效
- 系统合成双方结果，输出：
  - 关系主类型
  - 双方各自视角类型
  - 最一致维度 / 最错位维度

### 3) 数据统计能力

- 客户端在结果生成后上报 `resultCode + mode`
- Serverless API 写入 Supabase
- 统计页优先读取在线聚合结果，失败时回退到本地演示数据

---

## 技术栈

- **前端框架**：React 18
- **构建工具**：Vite 5
- **样式系统**：Tailwind CSS 3
- **动画**：Framer Motion
- **图标**：Lucide React
- **后端形态**：Vercel Serverless（`/api`）+ Cloudflare Pages Functions（`/functions/api`）
- **数据库**：Supabase（统计存储与聚合视图）
- **AI 模型**：DeepSeek V4 Flash（OpenAI-compatible Chat Completions）

---

## 项目结构

```text
CPTI/
├─ api/                         # Vercel Serverless API（兼容层）
│  ├─ _shared/
│  │  └─ stats-helpers.js       # 统计聚合辅助函数、合法类型定义
│  ├─ dual-invite-create.js     # 创建双人邀请 token（24h）
│  ├─ dual-invite-consume.js    # 校验/消费双人邀请 token
│  ├─ stats-submit.js           # 提交测评结果（写入 Supabase）
│  ├─ telemetry-submit.js       # 匿名埋点（每题分布/每维得分聚合）
│  ├─ stats-summary.js          # 拉取统计汇总（读视图）
│  ├─ feedback-submit.js        # 提交用户反馈（写入 user_feedback 表）
│  └─ ai-chat.js                # AI 关系助手（调用 DeepSeek）
├─ functions/
│  └─ api/                      # Cloudflare Pages Functions（兼容层）
│     ├─ dual-invite-create.js
│     ├─ dual-invite-consume.js
│     ├─ stats-submit.js
│     ├─ telemetry-submit.js
│     ├─ stats-summary.js
│     ├─ feedback-submit.js
│     └─ ai-chat.js
├─ public/
│  ├─ logo.png
│  └─ images/cpti/              # 16 型配图（按 CODE 命名）
├─ src/
│  ├─ components/
│  │  ├─ layout/                # AppShell / Header
│  │  ├─ home/                  # 首页引导模块
│  │  ├─ types/                 # 情侣类型总览页
│  │  ├─ stats/                 # 统计页
│  │  ├─ faq/                   # FAQ 页
│  │  ├─ about/                 # About 页
│  │  ├─ feedback/              # 问题反馈（FeedbackContext + FeedbackModal）
│  │  ├─ chat/                  # AI 关系助手
│  │  ├─ Questionnaire.jsx      # 问卷核心流程
│  │  ├─ LikertScale.jsx        # 7 点量表组件
│  │  ├─ Loading.jsx            # 分析过渡页
│  │  └─ ResultPoster.jsx       # 结果报告页
│  ├─ data/
│  │  ├─ questions.js           # 题库与模式文案
│  │  ├─ results.js             # 16 型完整结果文案库
│  │  ├─ stats.js               # 本地统计回退数据
│  │  ├─ typeGroups.js          # 色系分组元数据
│  │  └─ typeImages.js          # 类型配图路径工具
│  ├─ utils/
│  │  ├─ scoring.js             # 计分、类型判定、单双人结果计算
│  │  ├─ inviteCodec.js         # 双人邀请 token 参数读写
│  │  ├─ statsApi.js            # 统计 API 客户端请求
│  │  ├─ feedbackApi.js         # 反馈提交 API 客户端
│  │  ├─ aiChatApi.js           # AI 对话 API 客户端
│  │  ├─ aiChatContext.js       # AI 对话上下文摘要生成
│  │  └─ typeListing.js         # 类型列表简介生成
│  ├─ App.jsx                   # 顶层视图切换与流程编排
│  ├─ main.jsx
│  └─ index.css
├─ supabase/
│  ├─ stats_schema.sql          # Supabase 表、索引、RLS、统计视图
│  └─ user_feedback.sql         # user_feedback 表与 RLS（反馈功能）
├─ server/
│  ├─ stats-service.js          # Vercel + Cloudflare 共用统计服务逻辑
│  ├─ invite-service.js         # 双人邀请令牌创建/校验/消费
│  ├─ telemetry-service.js      # 匿名埋点聚合写入逻辑
│  ├─ feedback-service.js       # 用户反馈写入逻辑（含限流）
│  └─ ai-chat-service.js        # DeepSeek 对话调用与输入校验
├─ cpti_prd.md                  # 产品需求文档（权威）
└─ README.md
```

---

## 本地开发

### 1) 安装依赖

```bash
npm install
```

### 2) 启动开发环境

```bash
npm run dev
```

### 3) 构建生产包

```bash
npm run build
```

### 4) 本地预览构建结果

```bash
npm run preview
```

---

## 环境变量

复制 `.env.example` 为 `.env.local`（或在部署平台直接配置）：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

说明：

- `SUPABASE_SERVICE_ROLE_KEY` 仅用于 Serverless API，**不可暴露给浏览器端**
- 本项目客户端不直连写库，提交与汇总均走 `/api/*`
- `DEEPSEEK_API_KEY` 仅用于 Serverless API，浏览器端只请求 `/api/ai-chat`
- `DEEPSEEK_BASE_URL` 与 `DEEPSEEK_MODEL` 可按部署环境覆盖，默认使用 `deepseek-v4-flash`

---

## 数据与算法说明

### 1) 维度模型

- `SI`：空间距离（S 黏合 / I 独立）
- `RP`：情感表达（R 浪漫 / P 务实）
- `OF`：生活节奏（O 有序 / F 随性）
- `DA`：冲突解决（D 直球 / A 缓冲）

### 2) 题目计分

- 7 点量表映射：`[+3, +2, +1, 0, -1, -2, -3]`
- 每题有 `polarity`，用于决定分数方向翻转
- 每维总分 `>= 0` 取正向字母，否则取反向字母

### 3) 类型判定

- 4 个维度拼接为四字母类型码（如 `SROD`）
- 同时计算每个字母百分比，展示在结果光谱条中

### 4) 双人合成

- 分别计算双方维度得分
- 对每维做平均后得到关系合成得分
- 额外输出一致性分析（最一致 / 最错位维度）

---

## 统计系统说明

### 提交接口：`POST /api/stats-submit`

请求体：

```json
{
  "resultCode": "SROD",
  "mode": "single"
}
```

特性：

- 参数合法性校验（16 型白名单 + `single|dual`）
- 基于 IP + UA 的 hash 做窗口限流（15 分钟最多 3 次）
- 写入 `quiz_submissions` 表

### 匿名埋点接口：`POST /api/telemetry-submit`

用途：用于分析题库与量表是否存在系统性偏置（例如某维度长期偏正/偏负、某些题大量“极端同意”）。

请求体（匿名，不包含昵称/结果文案等）：

```json
{
  "mode": "single",
  "questionCount": 32,
  "answers": { "SI-1": 0, "DA-1": 3 },
  "dimensionScores": { "SI": 12, "RP": 4, "OF": -3, "DA": 9 }
}
```

特性：

- 基于 IP + UA hash 做窗口限流（15 分钟最多 3 次）
- 不存储单个用户答案表，只写“按天聚合计数”
- 写入/更新：
  - `telemetry_submissions`（仅用于限流）
  - `quiz_question_choice_agg`（每题 0-6 档位分布）
  - `quiz_dimension_score_agg`（四维原始得分分布）

### 汇总接口：`GET /api/stats-summary`

流程：

- 查询 `stats_summary_view`
- 还原 16 型计数并计算占比、Top3/Bottom3、色系分布
- 响应缓存：`s-maxage=60, stale-while-revalidate=300`

### 前端失败策略

- 首屏先显示骨架屏（不注入静态统计值）
- 若在线汇总失败，显示错误提示与 `--` 占位
- 用户可点击“重试获取数据”手动重拉

---

## 问题反馈系统说明

### 反馈入口

- **移动端**：顶栏 Logo 右侧的气泡图标按钮（`md:hidden`）
- **桌面端**：顶栏下方、内容区右上角的「反馈」链接按钮（`hidden md:flex`）

### 提交接口：`POST /api/feedback-submit`

请求体：

```json
{
  "body": "用户填写的反馈内容（1-2000 字符）",
  "pagePath": "/（当前页面路径，可选）"
}
```

特性：

- 必填校验（`body` 非空，≤ 2000 字符）
- 基于 IP + UA 的 hash 做窗口限流（60 分钟最多 5 次）
- 写入 `user_feedback` 表，存储 `body`、`page_path`、`fingerprint_hash`
- 浏览器不可直连写库（RLS 全拦截）

### 前端交互说明

- 点击入口打开固定蒙层 + 卡片弹层（`FeedbackModal`）
- 提交中禁用按钮，防止重复提交
- 成功后展示感谢提示，关闭按钮收起弹层
- 失败时展示错误信息并允许重试
- 状态通过 React Context（`FeedbackProvider`）管理，无需 props 透传

## 部署说明

支持两种部署平台：**Vercel** 与 **Cloudflare Pages**

### 1) 基础配置

- Framework Preset：Vite
- Build Command：`npm run build`
- Output Directory：`dist`

### 2) 环境变量（Vercel / Cloudflare 均需配置）

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `DEEPSEEK_MODEL`

### 3) 平台路由说明

- Vercel：使用 `api/` 下函数文件
- Cloudflare Pages：使用 `functions/` 下函数文件
- 前端始终请求统一路径：
  - `/api/stats-submit`
  - `/api/stats-summary`
  - `/api/dual-invite-create`
  - `/api/dual-invite-consume`
  - `/api/feedback-submit`
  - `/api/ai-chat`

### 4) Supabase 初始化

在 Supabase SQL Editor **依次**执行：

1. `supabase/stats_schema.sql`
2. `supabase/user_feedback.sql`

`stats_schema.sql` 将创建：

- `quiz_submissions` 数据表
- `dual_invites` 一次性双人邀请令牌表
- 匿名埋点相关表与 RPC（用于题库分析与偏差诊断）
- 必要索引
- RLS 策略（禁用客户端直接访问该表）
- `stats_summary_view` 聚合视图（供 API 查询）

`user_feedback.sql` 将创建：

- `user_feedback` 用户反馈表（含字段：`body`、`page_path`、`fingerprint_hash`）
- 必要索引
- RLS 策略（客户端无法直接读写，仅 Service Role 可插入）

---

## 常见问题（开发侧）

### Q1：为什么统计页显示“--”并提示获取失败？

通常是以下原因：

- 未配置 Supabase 环境变量（或配在错误环境）
- 数据库 SQL 未初始化
- API 路由部署异常或返回非 200
- Cloudflare 下未生效 `functions/api/*` 路由

## 图片性能验收阈值

针对结果页与情侣类型页，建议按以下阈值做灰度验收（弱网 4G + 中端机）：

- 结果页主图可见时间：`P75 <= 1.8s`，`P95 <= 2.5s`
- 情侣类型页首屏 4 张图可见时间：`P75 <= 1.2s`，`P95 <= 1.8s`
- 图片加载失败率：`< 0.5%`
- WebP 命中率：`>= 95%`

前端已内置轻量级图片指标采集（`src/utils/imageMetrics.js`），会按页面记录 `success / fallback-success / failed` 与加载耗时，可用于灰度期抽样评估。

### Q2：如何新增或修改题目？

编辑 `src/data/questions.js`，保持：

- `id` 唯一
- `dimension` 与 `polarity` 正确
- `QUESTIONS_PER_DIMENSION` 与实际题量一致

### Q3：如何新增结果文案？

编辑 `src/data/results.js` 对应类型条目，确保字段完整（标题、描述、优势、挑战、冲突模式、tips、funFacts 等）。

### Q4：为什么双人链接失效？

常见场景：

- 链接已被第二位成功使用（一次性链接）
- 链接超过 24 小时有效期
- token 被篡改、截断或不存在
- 当前题库长度与邀请生成时不一致（防错保护）

对应处理逻辑在 `src/utils/inviteCodec.js`、`src/components/Questionnaire.jsx` 与 `server/invite-service.js`。

---

## 后续迭代建议

- 引入自动化测试（单元 + 关键流程 E2E）
- 增加结果海报导出能力（`html2canvas`）
- 统计 API 增加防刷策略（验证码 / WAF / 设备指纹增强）
- 提炼 i18n 结构，支持多语言文案管理
- 为双人模式增加任务状态追踪（邀请已查看 / 已完成等）

---

如果你正在接手本项目，建议先阅读：

1. `cpti_prd.md`（产品目标与约束）  
2. `src/App.jsx`（流程编排）  
3. `src/components/Questionnaire.jsx` + `src/utils/scoring.js`（核心业务）  
4. `src/components/ResultPoster.jsx` + `src/data/results.js`（结果呈现）  
5. `api/` + `supabase/stats_schema.sql`（统计闭环）

