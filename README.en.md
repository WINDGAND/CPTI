<p align="center">
  <img src="public/logo.png" alt="CPTI logo" width="96" />
</p>

<h1 align="center">CPTI · Couple Type Indicator</h1>

<p align="center">
  <strong>Among 16 colors of love, find the shade that is yours.</strong>
</p>

<p align="center">
  A relationship quiz built for couples — it measures how you relate, not who you are as individuals.
</p>

<!-- README-I18N:START -->

<p align="center">
  <a href="./README.md">汉语</a> · <strong>English</strong>
</p>

<!-- README-I18N:END -->

<p align="center">
  <img src="https://img.shields.io/badge/status-V1.0%20live-0d9488" alt="V1.0 live" />
  <img src="https://img.shields.io/badge/platform-Web%20·%20phone%20%26%20desktop-3b82f6" alt="Web, phone and desktop" />
  <img src="https://img.shields.io/badge/couple%20types-16-a855f7" alt="16 couple types" />
  <a href="https://www.cpti.site"><img src="https://img.shields.io/badge/try%20it-www.cpti.site-ec4899" alt="Try it live" /></a>
</p>

<p align="center">
  <a href="#what-is-this">Overview</a>
  ·
  <a href="#why-it-stands-out">Highlights</a>
  ·
  <a href="#how-it-works">How it works</a>
  ·
  <a href="#product-tour">Product tour</a>
  ·
  <a href="#who-its-for">Who it's for</a>
  ·
  <a href="#run-it-locally-optional">Run locally</a>
  ·
  <a href="https://www.cpti.site">Live demo</a>
</p>

<br />

<p align="center">
  <img src="docs/screenshots/desktop/home-mode-select.png" alt="CPTI home: choose Solo Run or Duo Puzzle" width="860" />
</p>

---

## What is this?

Most personality quizzes focus on the **individual** — introvert or extrovert, planner or free spirit.  
**CPTI zooms out to a smaller unit of analysis: the relationship itself.**

Through 32 everyday scenario questions, it helps couples see how they relate: clingy vs. needing space, romantic vs. practical, planned vs. spontaneous, direct in conflict vs. cool down first.  
You get a shareable Intimacy Spectrum Report — a mirror that does not judge good or bad, only helps you put feelings into words.

> [!TIP]
> One person can take it first and see “us through my eyes.” Invite your partner to complete the puzzle, and you unlock the real combined couple result.

---

## Why it stands out

| Highlight | In one line |
|-----------|-------------|
| **About the relationship, not personal labels** | Focus on how you interact, not labeling either person |
| **Solo Run + Duo Puzzle** | Start alone, or both answer independently and combine |
| **16 couple types · four color families** | Peach Pink, Lake Blue, Violet, Mint Green — easy to remember and share |
| **Shareable results** | Built for screenshots, social posts, and sending to your partner |
| **AI relationship companion** | Chat about real situations using your result — not generic advice |
| **No good/bad ranking** | Gives you a shared language so you can keep talking |

---

## How it works

Three steps:

1. **Pick a mode** — Solo Run for your own view, or Duo Puzzle to invite your partner  
2. **Answer 32 scenario questions** — everyday moments; choose what feels true  
3. **Read, compare, share** — save the report, or send the link so you can complete the fuller picture of “us”

In Duo Puzzle, you each answer on your own. The system then blends both perspectives and highlights where you **align most** and where you are **most likely to mismatch** — a light check-in, not a graded exam.

---

## Product tour

### 16 couple types

Four relationship spectra combine into 16 types, grouped by color family so they are easy to remember and share.

<p align="center">
  <img src="docs/screenshots/desktop/couple-types.png" alt="Couple types overview: four color families and 16 types" width="860" />
</p>

The four spectra, roughly:

- **Space** — closer together, or more need for boundaries  
- **Expression** — ritual and romance, or practical action  
- **Pace** — planned and ordered, or more flexible  
- **Conflict** — talk it through right away, or cool down first  

### AI relationship companion

After the quiz, you can chat about specific situations with your type, spectrum, and conflict pattern in mind — for example, “We always fight when plans change last minute.”  
Advice is grounded in **this result**, not a one-size-fits-all lecture.

<p align="center">
  <img src="docs/screenshots/desktop/ai-companion.png" alt="AI relationship companion intro page" width="860" />
</p>

> Chat history stays in your current browser. Only a necessary relationship summary is sent to the companion — not nicknames or your full answer sheet.

### What does the wider spectrum look like?

The stats page aggregates anonymous quiz samples so you can see roughly where your type sits in the crowd — for observation only, not a ranking of better or worse.

<p align="center">
  <img src="docs/screenshots/desktop/statistics.png" alt="Intimacy spectrum statistics page" width="860" />
</p>

Soon after launch, a single Xiaohongshu note reached 3,200+ organic views, and 150+ real quiz samples were collected — a sign that people actually want to share after finishing.

---

## Who it's for

- Couples who want a light way to compare how you relate  
- Anyone curious how “us through my eyes” differs from “the real us”  
- Friends who want a report that is easy to share and talk about  

> [!NOTE]
> CPTI is a small tool for conversation and self-exploration. It is **not** a clinical diagnosis or medical advice. Use the result to start a dialogue, not to issue a final verdict on the relationship.

---

## Run it locally (optional)

To open the project on your machine:

```bash
npm install
npm run dev
```

Visit the local URL shown in the terminal. Full product detail lives in [`cpti_prd.md`](./cpti_prd.md).

To wire up live stats, duo invites, or the AI companion, copy `.env.example` to `.env.local`, fill in the values described there, then deploy.

---

## Tech at a glance

The front end is built with React + Vite and works on phone and desktop; motion and the result page prioritize readability and sharing.  
When stats, invites, or chat need persistence, light server-side pieces handle it; answering and scoring stay mostly on the client so the flow feels quick.

For deeper implementation notes, read the source and [`cpti_prd.md`](./cpti_prd.md) — this README is meant to explain the product clearly and leave the engineering detail to the code.

---

<p align="center">
  <a href="https://www.cpti.site"><strong>Try it → www.cpti.site</strong></a>
</p>
