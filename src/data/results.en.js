/**
 * 16 型完整英文翻译。
 *
 * 仅覆盖文案字段：title / slogan / description / strengths / challenges /
 * conflictPattern / energyMap / longterm / tipsForCouple / funFacts。
 * code / group / themeClass / soulmate / nemesis 保持原值（结构性数据，不翻译）。
 *
 * 与 src/data/results.js 配对使用，由 getLocalizedResults(lang)
 * 在运行时挑选当前语言版本，introByMode / differenceHintByMode 通过
 * useLocalized result 的辅助函数动态生成。
 */

export const RESULTS_EN = [
  // ───────────────────── Peach Pink SR ─────────────────────
  {
    code: 'SROD',
    title: 'All-Weather Pure-Love Alliance',
    slogan: 'A teen-drama lead couple — only this one talks.',
    description: [
      "You're the kind of couple who'll argue for 10 minutes about which yogurt to buy and end up taking both — full of plans, full of ritual, and absolutely unable to leave a thing unsaid that day.",
      'High companionship × Full-throttle romance × Careful planning × Direct communication — all four stack together to create a relationship that almost never has a silent dead zone. Your love is highly transparent; each of you always knows where the other is and how they feel.',
      "Cold-shouldering isn't a tool for you, it's physically uncomfortable. There's no 'let's drop it for now', only 'I want to make up right now' — one of the rare types that genuinely closes the day's emotional ledger before going to bed.",
    ],
    strengths: [
      { title: 'Emotional transparency creates deep safety', desc: "Both of you say what you're feeling, so there's almost no 'what's going on with you' guessing tax. Full information transparency is extremely rare in long-term relationships: it frees both of you from decoding emotions, so the energy goes into actually being together." },
      { title: 'Ritual is backed by planning — it never fizzles', desc: "What you promised in the honeymoon phase, you usually actually do. O's planning power gives R's romantic dreams wings — every anniversary is a surprise that was prepared a month in advance, a steady source of 'I matter' in the relationship, not just sweet words." },
      { title: 'Conflicts close on the same day — no buried mines', desc: "Direct communication means you rarely go to bed with unresolved emotion. A heated argument isn't necessarily bad — what hurts a relationship isn't fighting, it's never quite saying it clearly. You trade intensity for clarity, and no quiet reefs grow underwater." },
    ],
    challenges: [
      { title: "High companionship's invisible 'oxygen tax'", desc: "Sustained, dense togetherness — no matter how deep the love — still drains energy. A relationship with no solitude tends to accumulate quiet fatigue: not falling out of love, just being tired without knowing how to say it. S-types especially must watch out for reading 'I need space' as 'we're in trouble'." },
      { title: 'Out-of-proportion emotional cost when a plan collapses', desc: "When a carefully planned date suddenly falls through, the O+S combo can spiral into disproportionate distress — disappointment, anxiety, even 'do you really care?' You need to remember: plans are tools, not proof of love. The unexpected is not betrayal, it's just life." },
      { title: 'Argument intensity and the weight of words', desc: "S's investment + R's emotional intensity + D's directness become a high-damage combo in fights. You often realize after apologizing 'that's not what I meant, but it's already out'. Many wounds aren't from the event itself, but from the words said in that moment — they deserve real, careful repair afterwards." },
    ],
    conflictPattern: {
      pattern: "The most common triggers are two: one, a plan changed unilaterally (even just 'tonight to tomorrow' counts); two, ritual expectations going unmet — an anniversary with zero action, or noticeably less effort than expected. With direct personalities, emotion turns into words with almost zero delay. Bystanders barely register what's happening, and you're already at peak volume.",
      resolution: "High intensity also means high efficiency: your fights rarely last two hours, apologies are clean, reconciliations are quick. Neither of you can tolerate distance lasting more than a day, and that 'we refuse to be cold' instinct is the most precious moat in this relationship.",
    },
    energyMap: {
      charging: [
        'Executing a long-awaited shared plan together and having it land smoothly',
        'The other person noticing — and naming — your small efforts: a remembered preference, a quietly prepared detail',
        'An important day being taken seriously, ritual showing up exactly as expected — feeling truly held in mind',
      ],
      draining: [
        'Messages going unanswered for a long time with no explanation',
        'Plans repeatedly pushed or cancelled unilaterally, with no alternative offered',
        "Sensing emotional distance from the other person, but not being able to pinpoint when it started",
      ],
    },
    longterm: "Five years in, you're the couple your friends 'never have to worry about'. Shared experience accumulates into a thick layer of safety, and your direct-communicator's 'resolved-problems list' is the longest of any type. Watch out: as life gets busier, ritual easily gets traded for 'next time' and companionship loses priority to work. Keep important anniversaries on the calendar, and create 'recharge separately' space on purpose — when you reunite, you'll find the spark is still there.",
    tipsForCouple: [
      "Schedule one 'recharge day' per month — each of you does your own thing, replies aren't required. The reunion that night usually tastes better than sticking together all day. Missing each other is sometimes the best seasoning love can have.",
      "Pre-agree on the 'Plan B' principle: when the official date falls through, an improvised late-night snack still counts as real time together. Let plans be a frame, not the standard — that way you keep believing in each other even when life refuses to be perfect.",
    ],
    funFacts: [
      { label: 'Average cold-war length', value: '≤ 2 hours' },
      { label: "'What's for dinner' efficiency", value: 'SSS-tier (the answer is decided long ago)' },
      { label: 'Holiday ritual coverage', value: 'Curated · sourced one month ahead' },
      { label: 'Sweet social posts per week', value: '≥ 3' },
    ],
  },

  {
    code: 'SROA',
    title: 'The Cuddle Philosopher',
    slogan: "I love you fiercely — but let me think first.",
    description: [
      "By day you're each other's oxygen — inseparable. The moment a fight starts, you become two introverts who need to digest alone. You hold both 'glued together' and 'leave me alone first' as equally real, equally valid needs.",
      "Romantic ritual × Orderly life × Mutual reliance × Talk after emotions cool — it tastes sweet with texture. The cost: both of you must learn to trust the other's very different processing style.",
      "Your silence isn't a cold war — it's brewing the line 'I'm sorry, I finally see it'. Reading this right is the key to this relationship's depth.",
    ],
    strengths: [
      { title: 'Daily warmth and emotional depth coexist', desc: "High companionship keeps the relationship warm, while the cool-down instinct gives it depth. You have the everyday 'we share a fried egg' and the soulful 'we talked it all the way through' — a combo few couples achieve, and few outsiders can copy." },
      { title: 'Conflicts get fully resolved, no residue', desc: "You don't rush to 'make up fast'. Once the cool-down ends, talk becomes more rational, the core problem clearer, the consensus more solid. The aftermath of your arguments tends to be far smaller than 'quick-apology couples' — because you genuinely finished the conversation, not just hit pause." },
      { title: 'Romance backed by planning, never half-hearted', desc: "O's organization makes R's romantic visions actually happen. Anniversaries get genuine preparation, planned trips actually take place — there's always a 'next thing to look forward to', which is a quiet, steady source of happiness." },
    ],
    challenges: [
      { title: 'Cool-down feels like torture to the clingy one', desc: "For A, needing space after a fight is completely reasonable. For an S partner, that wait can be agony — every silent minute risks being read as 'you don't care anymore'. Without an explicit 'I just need time, I'm not running' from A, misunderstandings escalate at alarming speed and both sides lose." },
      { title: "'Let's cool down' sometimes drifts into 'never mind'", desc: "Processing your own emotion first is a virtue, but if 'we'll talk later' keeps getting pushed, small issues quietly pile up. The A+O combo sometimes lets 'emotion management' silently morph into 'this issue went away on its own' — and those issues can come back in unexpected ways and unexpected sizes." },
      { title: 'Companionship needs vs. processing boundaries — a lifelong negotiation', desc: "S's hunger for togetherness and A's need to be alone after a fight is the central tension this combo must keep working on. There's no universal answer, only the balance you reach through one honest conversation at a time — and that process itself is the most important part of growing the relationship." },
    ],
    conflictPattern: {
      pattern: "Conflict rarely starts with 'explosion'. Usually A has been quietly stacking grievances, waiting for the right moment. During that wait, S senses the temperature drop and starts anxious checking: 'what's wrong?' 'are you still mad?' A feels pushed and retreats further; S chases harder, A pulls back more — the classic chase-and-flee. Both are exhausted, and neither is sure what the original issue was.",
      resolution: "The key always lies with A: 'I'm not okay right now, I need time to sort myself out, but I'm fine and not going anywhere' — that single sentence breaks the cycle. With that signal, S can usually wait peacefully. The cost is tiny, the payoff huge — worth practicing until it becomes instinct.",
    },
    energyMap: {
      charging: [
        'After the cool-down ends, sitting down and finally talking the issue all the way through',
        'A late-night quiet conversation where a long-held thought is said out loud for the first time',
        'Planning and executing a thoughtfully prepared trip or anniversary together',
      ],
      draining: [
        "A goes silent and sends no reassuring signal for a long stretch",
        "Ritual expectations get casually shelved, with no explanation or substitute",
        "Feeling a clear emotional temperature gap — one of you running hot, the other faintly present",
      ],
    },
    longterm: "Time is your best friend. As you learn each other's emotional rhythms, chase-and-flee gradually gives way to trust-and-wait. Ten years in, you'll likely be the couple that 'fights sometimes but never threatens the foundation'. That ease is built from countless 'I'll wait for you to settle' and 'thank you for waiting' — outsiders can't copy it, because it's a language only you two share.",
    tipsForCouple: [
      "For A: before going silent, take 30 seconds to send 'I need a little time, this isn't your fault, I'll come find you when I've calmed down'. That single line gives S's anxiety a safe parking spot and protects your own quiet processing space — win-win.",
      "For S: their silence is processing, not disappearing. Practice doing something soothing while you wait — a show, a friend, a walk. It's more effective than chasing and protects you from being drained by anxiety.",
    ],
    funFacts: [
      { label: 'Average cool-off time', value: '2–6 hours (sleep on it type)' },
      { label: 'Anniversary readiness', value: 'Curated · sourced 2 weeks ahead' },
      { label: 'Late-night heart-to-hearts per week', value: '≥ 2 — the more you talk, the clearer it gets' },
      { label: 'Long-term stability', value: 'A+ (gets better with age)' },
    ],
  },

  {
    code: 'SRFD',
    title: 'The Improvised Burn',
    slogan: 'Every day is a sequel — and we never wrote the outline.',
    description: [
      "Your dates don't need an itinerary — wandering into a street or a tiny restaurant is enough to manufacture memories. Three years in, friends still see you as if you're on date three. And that, in itself, is the promise you've made to each other.",
      "High companionship × Full-throttle romance × Improvisational life × Direct communication — the kind of couple who decide at 3pm to go watch the sunset, actually go, and actually cry watching it.",
      "Life is a little messy, and you don't care. Because being together is already the best plan.",
    ],
    strengths: [
      { title: 'Natural guardians of relationship freshness', desc: "F's spontaneity + R's romantic instinct mean you don't have to work at 'not being boring' — new experiences just happen. You're not staging activities 'to keep the spark', you genuinely enjoy discovering things together, and that authenticity is the hardest quality to fake." },
      { title: 'Zero emotional inventory, cleared on the spot', desc: "D-types saying-it-out-loud, in this combo, becomes the talent of 'no pile-up'. Whatever it is, say it; today's bill closes today; no resentment fermenting underground. Even arguments leave each side knowing what the other actually thinks — transparency protects this relationship better than politeness." },
      { title: 'High energy for shared adventures', desc: "Both of you love spontaneity, both have low tolerance for monotony, both have high standards for shared memories. Life is packed with 'our first time…', which makes you one of the most energetic and most enviable couples among bystanders." },
    ],
    challenges: [
      { title: 'No planning brings a drifting feeling', desc: "Embracing the present is a huge strength, but completely avoiding 'where are we headed' creates anxiety at certain milestones. The F+S combo means you may sink so deep into the present that, when a directional decision arrives, you realize you've never aligned on it." },
      { title: 'Direct speech sometimes hits harder than meant', desc: "F's unfiltered + D's direct combo can produce sentences that exceed your true intent during fights. After, you think 'that's not what I meant', but it's already in their head. This combo needs to practice 'pause three seconds before saying it' — not to suppress directness, but to be precise." },
      { title: 'High-companionship needs vs. shifting life rhythm', desc: "S's hunger for togetherness + a life without fixed rhythm scrapes against work pressure or external change: one needs more presence, the other has no recurring 'arrangement' to fall back on, and 'we haven't been together as much lately' becomes a frequent worry." },
    ],
    conflictPattern: {
      pattern: "Arguments arrive fast — a sentence, a gesture, even an expression can light the fuse. D-types say it the moment they feel it, no warm-up, very present. Bystanders barely react before you're already at peak volume.",
      resolution: "They leave just as fast. Direct apologies are also clean — 'I was wrong, I'm sorry', then a hug, world restored. You rarely loop the same issue. That's a precious relational asset. Cherish it and don't let pride waste it.",
    },
    energyMap: {
      charging: [
        "A spur-of-the-moment plan that actually lands perfectly and becomes one of your favorite memories",
        "A roadside eatery, a small market or a square stumbled upon together becomes 'our spot'",
        "Any 'our first…' — first food, first city, first silly thing you did together",
      ],
      draining: [
        'Days stuck in a monotonous loop, no novelty, no spark',
        "The other person suddenly going quiet and low, refusing to say why",
        "The relationship slipping into the comfort-of-familiarity plateau, with the excitement faded",
      ],
    },
    longterm: "As long as you two keep wanting to 'play', this love won't age. That's your biggest strength, and the deepest difference between you and other types. The one thing to do: at some milestone, sit down for an honest 'where do we want to go together' — not to limit spontaneity, but to give this improvised trip a compass, so it can travel further with more confidence, to the places you actually want to reach.",
    tipsForCouple: [
      "Set a 'minimum anchor' — say, one fixed cooking day a week, or one serious 'how are we' talk a month. Leaving a single steady line inside spontaneity gives the relationship somewhere to return when it drifts.",
      "After a quick reconciliation, take five more minutes to say 'what I really meant was…' — fast make-ups are an asset, and finishing one thing properly makes that asset worth more.",
    ],
    funFacts: [
      { label: 'Packing time for a spontaneous trip', value: '< 1 hour' },
      { label: "'Our first…' moments logged", value: 'Lost count, still growing' },
      { label: 'Decision-making for tonight', value: 'Spin · rock-paper-scissors · whoever is hungrier loses' },
      { label: 'Friends say', value: "'In love every single day, ugh' (jealous)" },
    ],
  },

  {
    code: 'SRFA',
    title: 'Honey Drift Bottle',
    slogan: 'Leave at a moment\'s notice — but make it beautiful.',
    description: [
      "You don't need an itinerary — each other is the destination. To outsiders, you're the enviably sweet duo. Inside, you're natural romantics who 'sleep on a fight and wake up to find the sun makes everything fine'.",
      "High companionship × Full-throttle romance × Improvisational life × Cool-down before talking — this combo creates an unusually high baseline daily happiness; the surface is still as a lake, and the movement only happens deep down.",
      "You're the easiest couple to envy — and the easiest one to silently accumulate 'never mind, drop it' under the calm surface. Both things are true; both deserve real attention.",
    ],
    strengths: [
      { title: 'Romance you never have to work for', desc: "Spontaneous + romantic by nature: you don't 'plan romance' — you can manufacture a heart-stopping moment on a street stall, a rooftop, an unprepared afternoon. The ability to 'feel something anytime, anywhere' is the rarest quality in love." },
      { title: 'Highly elastic relationship — small frictions leave no mark', desc: "A's calmness + F's easygoing nature build a strong self-healing relationship. Small conflicts rarely escalate — not because there are none, but because you both choose not to amplify them. That elasticity is a real stabilizer." },
      { title: 'Lightweight bonding: together but not trapped', desc: "You rely on each other without controlling each other — like two kites tied by a slender thread, each drifting its own direction but always feeling the line. This intimacy style is mentally kind to both — never suffocating, an ideal many couples chase but rarely reach.",
      },
    ],
    challenges: [
      { title: 'Unresolved issues drift to the bottom', desc: "The A+F combo produces a high frequency of 'never mind, drop it'. Each individual 'never mind' looks reasonable, but stacked, they form an opaque sediment in the relationship. Some small spark may one day detonate emotion that surprises both of you — 'why so intense over such a small thing?'" },
      { title: 'Lack of direction and shared goals', desc: "No planning + cool-down on conflict = a relationship like a rudderless ship. Both enjoy drifting in the moment but rarely discuss where you're sailing. Romantic at first; at a critical node — long distance, job change, big life choices — you might find your directions never aligned." },
      { title: 'Real feelings unexpressed, unseen', desc: "You both lean toward 'not bringing it up', keeping surface peace. That means real needs, hurts, expectations remain unknown to the other. One day, you may both feel confused: 'I thought you were fine, turns out you weren't — you just never said'.",
      },
    ],
    conflictPattern: {
      pattern: "Open clashes are rare; 'invisible accumulation' is more common. Small grievances get swallowed one by one, and the surface stays calm, fooling both of you into thinking 'we're okay'. Until some seemingly trivial moment — a forgotten promise, a casual remark — overflows the dam, and the intensity surprises everyone, including yourselves.",
      resolution: "Reconciliation is usually gentle and quiet: a nap, a shared hobby to distract, then it's as if nothing happened. Caution: 'seemingly okay' and 'truly resolved' are not the same. After making up, find a calm moment to actually finish that conversation once.",
    },
    energyMap: {
      charging: [
        "A pointless drive or walk together — just walking and talking, losing track of time",
        "The other person does a tiny romantic thing without warning",
        "Sitting in the same room doing your own things, exchanging an occasional glance — feeling settled",
      ],
      draining: [
        'Long-accumulated small knots starting to feel inexplicably heavy without a clear cause',
        'Sensing the frequency of togetherness quietly drop without being sure whether to mention it',
        'No clear shared expectations in the relationship — the feeling of just floating in place',
      ],
    },
    longterm: "If you go ten years smoothly, it'll be the 'outsiders never spot any dissatisfaction, but each of you privately carries many unsaid things' kind. You have strong emotional connection and equally strong silence inertia. Build a 'clearing' habit early — even once a month, sit down and say what's in your heart, without judgment, with listening. Give your drifting love a harbor, so you can actually reach the far place you want to go.",
    tipsForCouple: [
      "Schedule a 'real-talk day' once a month: say one thing you normally wouldn't — something that mattered but stayed unspoken, something you actually want. No solution required, just being heard. One honest hour beats twelve unspoken months.",
      "Add a small anchor to your spontaneity: an 'important dates list' (three to five is enough), or a fixed annual trip direction. Direction makes the drift purposeful and is the cheapest way to take this love far.",
    ],
    funFacts: [
      { label: 'How you make up after a fight', value: 'Sleep, and by morning forget what it was about (truly)' },
      { label: 'Travel-plan completion rate', value: '50% (the other 50% turn into better accidents)' },
      { label: "'Where shall we go?'", value: "'Anywhere' — said with full sincerity" },
      { label: 'Friend envy index', value: 'Off the chart, no ceiling' },
    ],
  },

  // ───────────────────── Lake Blue SP ─────────────────────
  {
    code: 'SPOD',
    title: 'The Love Planning Bureau',
    slogan: 'You live your days like a five-year plan.',
    description: [
      'Your shared doc has a trip list, a savings plan and a dream list — for you, love is an executable project, and the execution rate sits well above market average.',
      "Pragmatic expression × Orderly life × Tight companionship × Direct talk — romance, for you, isn't fireworks; it's the cumulative proof that 'we said it, we did it'.",
      "From the outside, you look rock-steady; from the inside, you know that rock isn't natural — you placed it one stone at a time.",
    ],
    strengths: [
      { title: 'Trust built by action runs deep', desc: "You don't accumulate safety through sweet words but through every 'we said it, we did it'. The trust stacked through countless follow-throughs holds up to reality far better than any love sonnet and is the hardest baseline to replicate quickly." },
      { title: 'Strong joint force in building a life', desc: "Set a goal, split the work, ship it — you treat life as a project worth running well. Trips, savings, home, future planning — your 'shared completed' list is the longest of any type, with most boxes checked." },
      { title: 'High-efficiency conflict resolution', desc: "D-style direct talk puts problems on the table before they grow into landmines. State it, find a plan, solve it — no detours, no buildup. Rare in many relationships; for you, it comes naturally." },
    ],
    challenges: [
      { title: 'Love can lose its warmth outside the plan', desc: "When everything runs on plan, the surprise that quickens the heart goes missing. As life stabilizes, days can feel efficient but cool — you'll get things done, but you may forget to ask 'are you actually happy lately?'" },
      { title: 'Problem solved, emotion missed', desc: "An overly pragmatic style can solve the thing without comforting the feeling. Sometimes the other person needs not a solution but 'I know this is hard for you, I'm here' — and that line is genuinely a practiced skill for you." },
      { title: 'High emotional cost when plans break', desc: "O+S can react disproportionately to last-minute changes — anxiety plus a low-grade 'why can't we just stick to the plan' criticism. Remember: plans are tools for love, not proof of love." },
    ],
    conflictPattern: {
      pattern: "Two common triggers: one, a plan disrupted unilaterally with no recovery; two, at a key moment, expecting the other to support 'the right way' but their behavior doesn't match expectation. Both of you express dissatisfaction directly, rational but cool — outsiders might say you're holding a meeting instead of a fight.",
      resolution: "The advantage is solution orientation: once the issue is talked through, you usually find a concrete improvement agreement and don't loop on the same problem. After the solution, linger five more minutes to say 'what really hurt me wasn't the issue itself, it was…' — those five minutes are worth more than the solution.",
    },
    energyMap: {
      charging: [
        'Together completing a long-awaited big goal — a trip, a finished home, an over-delivered outcome',
        "The other person noticing — and naming — your daily attention to detail, making you feel seen",
        'Efficiently solving a problem that looked thorny, in tight collaboration',
      ],
      draining: [
        'Plans pushed repeatedly or cancelled unilaterally, with no substitute',
        "Love reduced to 'execution and scheduling', losing the room for just enjoying and feeling",
        "At a moment that needed emotional support, getting a solution instead of warmth",
      ],
    },
    longterm: "Ten years in, you'll likely be the couple your friends describe as 'they have everything sorted' — career, family, plans, all running steady. The active thing to resist is letting the relationship drift into pure operations. Schedule romance like an important project — not because it must be planned, but because what isn't planned tends to disappear in your hands.",
    tipsForCouple: [
      "Quarterly 'relationship review' — not just goal status; ask 'when was the last time we were happy simply because we were together? what happened then?' Love deserves real retrospective, like a project.",
      "Try gifting each other a 'no-plan date': fully unstructured, the other decides on the day — no judgment, no resistance, just follow along. Losing control once doesn't end the world; sometimes it refreshes it.",
    ],
    funFacts: [
      { label: 'Shared-goal completion rate', value: 'Over-delivered · early · with docs' },
      { label: 'Travel-guide word count', value: 'Publishable' },
      { label: "'Where are we in 5 years'", value: 'Specific coordinates + backup plans' },
      { label: 'Bug-fix turnaround for life issues', value: 'T+0, closed within the day' },
    ],
  },

  {
    code: 'SPOA',
    title: 'The Steady Pragmatist',
    slogan: 'I never say "I love you" — I just cook every meal with care.',
    description: [
      "You don't say 'I love you', but you remember they hate cilantro, bring an umbrella when it rains, charge their phone before they leave the house. Stacked together, that's more solid than any declaration.",
      "High companionship × Pragmatic action × Orderly life × Cool down first — the kind of couple who 'feel safer the longer you're together'. The warmth here isn't fueled by passion but by tiny, certain acts of care every day.",
      "You may not be the most romantic; you're very likely the most reassuring — and reassurance is love's highest form.",
    ],
    strengths: [
      { title: 'Love hidden in details, growing more precious with time', desc: "Quietly remembering all of the other person's small preferences, replacing words with action — this love makes no noise but is everywhere. Five years on, the details of 'I never had to ask, you just knew' become the most irreplaceable source of safety." },
      { title: 'Top-tier relationship stability', desc: "S+P+O+A means very few violent swings — not because love is shallow, but because both of you instinctively 'steady' rather than 'detonate'. Through outside storms, this relationship stays the place you both lean on." },
      { title: 'Emotional maturity carries you further', desc: "No impulsive reactions, plenty of room for processing — no decisions in anger, no wounding words in heat. That steadiness is a quality many couples only build after several storms — and you have it from the start." },
    ],
    challenges: [
      { title: 'Single love language — they sometimes miss it', desc: "Your action speaks volumes, but different people need different languages. Sometimes the other person just needs a direct 'I miss you', 'I love you' — a line hard for you to utter but, to them, more confirming than anything you've ever done." },
      { title: 'Feelings internalized for long periods may overflow unexpectedly', desc: "A's cool-down + P's silence on feelings means both of you tend to digest emotion rather than express it. Stacked over time, a tiny trigger may release a disproportionate flood — surprising you both: 'I thought we were fine'." },
      { title: 'Buried need for companionship — hard for the other to detect', desc: "S has a strong need for togetherness, but P+O+A makes it almost impossible to voice. The other person may genuinely not know you need more presence — and may assume 'you're very independent, you don't need company' — then choose to do something else exactly when you needed them most." },
    ],
    conflictPattern: {
      pattern: "Conflict rarely 'explodes'. It quietly accumulates: 'you've felt off lately', 'we feel a little distant' — vague, but real. Neither of you raises it directly — A waits for the right moment, P feels action matters more than talk — so the issue keeps sinking until a tiny event sparks it.",
      resolution: "Breaking the ice usually starts with action: one of you cooks their favorite noodles, quietly handles a lingering chore — the distance dissolves silently. After the action, work up the courage to say 'I needed you back then, but I didn't say it'. That line lingers longer than the noodles.",
    },
    energyMap: {
      charging: [
        'Quiet daily co-existence — cooking, tidying, walking — no words needed, just both present',
        'The other person noticing the things you do invisibly, pausing to say it out loud',
        "Comfortable silence in the same space — a high-quality stillness where both feel grounded",
      ],
      draining: [
        'Effort taken for granted for a long time — unseen, unthanked',
        "Going long without verbal or behavioral confirmation of the other's actual emotional state",
        'Sharing a space yet sensing an invisible glass wall between you',
      ],
    },
    longterm: "This love grows more valuable over time. Young, it might look like 'no big story, no fireworks'. Thirty years on, every unremarkable act of daily care has stacked into something hard to shake. The hard thing to push against is the line 'they know, no need to say it' — sometimes, without saying, they really don't. Voice the unsaid occasionally — not because it's required, but because they deserve to hear it.",
    tipsForCouple: [
      "Each week, name one small specific thing 'that made me feel loved this week' — one line is enough. The point isn't scoring, it's making each other see the unspoken effort.",
      "For A: don't wait until everything is fully thought out — 'I need you a little right now, I can't fully explain it, can you sit with me' is enough. To S, that's more comforting than any action.",
    ],
    funFacts: [
      { label: 'Precision of remembering food allergies', value: 'Down to ingredient line three' },
      { label: 'Household emergency plan readiness', value: 'Written and rehearsed' },
      { label: 'Stability rating', value: 'Polaris (no flicker)' },
      { label: 'Holiday-gift lead time', value: '≥ 2 weeks, with backup' },
    ],
  },

  {
    code: 'SPFD',
    title: 'Action-First Zen',
    slogan: "Loving easy, never lazy.",
    description: [
      "You don't put faith in grand ritual, but you fix the lamp and I make breakfast — those are the things that prove love actually existed.",
      "High companionship × Pragmatic action × Improvisational life × Direct talk — low-key, low-maintenance, deeply reassuring. No earth-shaking stories, just one tiny issue after another, properly handled together.",
      "You may not be the sweetest pair, but you're the one your friends call first when life goes sideways.",
    ],
    strengths: [
      { title: 'Reliability built by following through', desc: "P+D combo: say it, do it, speak plainly — don't leave the other guessing or waiting. That 'words match actions' is the hardest-to-fake and most foundational trust base in any relationship, and you've delivered it from day one." },
      { title: 'Very low friction in daily life', desc: "F's spontaneity keeps life unstiff; P's pragmatism means you won't be disappointed by 'romance not meeting form'. Your expectations of each other land on 'will you show up when needed' — and you do." },
      { title: 'Conflicts handled fast, no aftertaste', desc: "Say it, address it, move on — issues don't compound. A fight doesn't become 'that thing we never quite settled', because your communication style doesn't allow buildup — one of the most underrated assets of this combo." },
    ],
    challenges: [
      { title: 'Lack of direction breeds quiet anxiety', desc: "F's spontaneity + no long-term planning sometimes makes the relationship feel like a ship without a destination — fine now, but 'where are we going' never gets a real answer. At a big life node (new city, big decision), the lack of direction shows up at once." },
      { title: 'Pragmatic expression sometimes reads as cold', desc: "At moments needing emotional confirmation — an anniversary, a low day — your love still hides in action while they may need a gentle line, not a solution. To them, 'you didn't say it' and 'you don't care' can feel identical." },
      { title: 'Directness can sometimes cross the line', desc: "F's unfiltered + D's direct combo has a higher rate of saying-it-too-far in fights. The aftermath is often 'that came out wrong', but it's already out. Build a habit: feel, pause three seconds, then say it — not to suppress, but to be precise." },
    ],
    conflictPattern: {
      pattern: "Fights arrive fast with low ignition: a misspoken line, a forgotten task. D-types say it the moment they feel it — no warm-up. To bystanders 'really, you're fighting over this?' But you both know there's a deeper, unresolved problem behind that sentence.",
      resolution: "Good news: fights also leave fast. One side concedes 'sorry, that was too far', and you flip the page. Neither of you likes nursing grudges — a precious asset. Before flipping the page, take five minutes for 'what was really behind that' — they save you the same fight three months later.",
    },
    energyMap: {
      charging: [
        "Tackling a tricky task together with smooth coordination and better-than-expected results",
        "Showing up — silently — exactly when they needed you most",
        "A spontaneous trip that lands surprisingly well and becomes one of 'your highlights'",
      ],
      draining: [
        "A growing 'I don't know where we're heading' fog, sensed by both, named by neither",
        "Direct talk escalating into mutual attack — no longer about the issue, but labeling each other",
        "Days looping pragmatically with nothing new, both feeling a flat, unnamed plainness",
      ],
    },
    longterm: "Your biggest long-term strength is mutual ease — no drama, problem-solving, things said on the spot, no overnight inventory. The challenge: easy relationships make it easy to forget 'we also need to feel the love itself sometimes'. Plant some non-pragmatic moments — a date with no agenda, an emphatic 'I love you', a non-useful but heartfelt act. Those details give pragmatic love its emotion, and make it more memorable.",
    tipsForCouple: [
      "Have a regular 'where to next' conversation — not necessarily five-year planning, but at least one thing 'we're looking forward to together for the next three months', giving the relationship a small shared compass.",
      "Differentiate 'said clearly' from 'won the argument' — sometimes they need not your correctness but 'I understand why you feel that way'. That line is the real resolution, not just the end of the fight.",
    ],
    funFacts: [
      { label: 'Household-task division', value: 'No meeting needed — a silent understanding' },
      { label: "'What to eat tonight'", value: "Open the takeout app, decided in 3 minutes" },
      { label: 'Time to recover from a fight', value: 'On the spot — never carried into tomorrow' },
      { label: 'Friends call you first when in trouble', value: 'Confirmed' },
    ],
  },

  {
    code: 'SPFA',
    title: 'The Quiet Practitioner',
    slogan: "I won't say love — but I already handled it.",
    description: [
      "Your love doesn't hang on your lips; it hangs on each silent act of care — renewed their membership, scheduled their checkup, checked their tire pressure before they left. They probably don't know, but it all happened.",
      "High companionship × Pragmatic action × Improvisational life × Cool-down before talking — the kind of couple who 'feel more grounded the longer they're together'. Others run on passion, you run on trust and habit — usually more durable.",
      "Outsiders see calm; underneath is a deep, unspoken understanding. Sometimes both of you just need the courage to say the thing you usually don't.",
    ],
    strengths: [
      { title: 'Lowest-friction style of coexistence', desc: "P+F+A means very few storms: no obsession with form, no escalation over trifles, no decisions at emotional peaks. The most energy-efficient yet authentic style — neither of you gets tired here." },
      { title: 'Silent safety is the most solid promise', desc: "Love is tangible and visible — it lives in quiet arrangements. The other doesn't have to wonder 'is anyone handling this?' or 'can I get through this alone?' — you were already there before they noticed." },
      { title: 'Elastic adaptability gives the relationship long life', desc: "F's spontaneity means no obsession with a fixed mode of being together; you follow life and let your own rhythm emerge. When life changes or plans shift, this combo doesn't shake — that calm adaptability is a real stabilizer." },
    ],
    challenges: [
      { title: 'S+P+A make needs go fully invisible', desc: "S deeply needs companionship, P doesn't articulate feelings well, A internalizes before speaking — stacked, you may desperately need each other while the other has no idea, possibly even thinking 'you do well on your own, you don't need much'. This is the most easily misread emotional pattern across all types." },
      { title: 'Problems quietly expire — and come back in a different form', desc: "Not saying things + going with the flow can make many real issues quietly 'vanish' — but they're only shelved, fermenting in the corner. A day comes when a tiny trigger drags all of them back at once.",
      },
      { title: "The low-key style is easily misread — by outsiders and the other person too", desc: "Too calm, too 'whatever' — long enough and the other person may begin to wonder 'do you not really care about us?' Not because you don't — your actions prove constant care — but because those actions are too hidden; without being told, the other doesn't notice." },
    ],
    conflictPattern: {
      pattern: "Visible heated arguments are almost nonexistent. Instead, a 'still-water deep current' distance slowly accumulates: neither raises it, so issues sink under daily 'we're fine' until one day the relationship 'feels off', without a clear starting point.",
      resolution: "Reconnection often needs a small breakthrough: a slightly deeper bedtime talk, the other admitting 'I haven't been well lately', or an unexpected gentle act — and the buildup begins to thaw. The problem: who opens the mouth first? You're both waiting for the other. Pre-agree on 'if it feels off, either of us can speak first' — that's the most valuable relationship pact for this combo.",
    },
    energyMap: {
      charging: [
        "Silently handling life's small and big things side by side — no words, just both there",
        "The other noticing what you've quietly been doing and stopping to thank you — feeling truly seen",
        "A deeper-than-expected bedtime talk that finally airs the unsaid — the relationship suddenly feels clear",
      ],
      draining: [
        'Effort going unseen, both running independently, sometimes forgetting the other also needs company',
        "More and more 'whatever's and 'either is fine's piling into an unnamed numbness",
        "Entering a steady tunnel with no clear exit — stable, but unsure where it's leading",
      ],
    },
    longterm: "Ten, twenty years on, outsiders will still call you 'the most stable couple'. True — but watch the other side: one day a partner may suddenly realize 'I don't know how much life is left in us' or 'we've just gotten used to each other'. It's not a broken relationship — it's the cost of long-term silence. Build habits that refresh vitality on purpose; don't wait until you need it, because by then speaking up is much harder.",
    tipsForCouple: [
      "Set a 'needs day': periodically, each name one specific thing 'I'd really like you to do for me lately' — not 'spend more time with me' but 'Friday I'd like you to come with me to that restaurant I've been wanting to try'. Concrete needs are the kind that get met.",
      "Break the 'whatever' habit on purpose: you deserve preference, and the other deserves to know what truly matters to you. 'I actually want hotpot' is closer to the real you — and the real us — than 'whatever'.",
    ],
    funFacts: [
      { label: 'Quiet problems solved for them', value: "They still don't know" },
      { label: 'Argument intensity (out of 10)', value: 'Daily under 3' },
      { label: "Frequency of 'whatever' / 'either is fine'", value: 'Historic high' },
      { label: '10-year forecast', value: "Still each other's most reliable partner" },
    ],
  },

  // ───────────────────── Lavender Purple IR ─────────────────────
  {
    code: 'IROD',
    title: 'Soul Crossings',
    slogan: "We don't meet every day — but every meeting is worth remembering.",
    description: [
      "You don't need constant stickiness — solitude charges you, reunions hit the highlight reel. Independent growth gives both of you something to bring back, making each meeting deeper and more surprising than the last.",
      "Independent boundary × Strong ritual × Orderly life × Direct talk — the kind of 'not merged but deeply connected' high-quality relationship. You haven't dissolved into each other, yet you still choose each other on purpose.",
      "Two free hearts, more whole because you chose each other. Your love isn't sustained by dependency but by repeated, sincere re-choosing.",
    ],
    strengths: [
      { title: 'Independent yet not distant — the real high-quality connection', desc: "You give each other full personal space, and the love doesn't fade — sometimes reunions are even more intense than couples who see each other every day. The 'not attached but deeply present' style needs huge emotional maturity, and you have it natively." },
      { title: 'Every reunion is a carefully designed gift', desc: "O's planning + R's romanticism means time together never gets randomly burned through — important days get scheduled, every meeting carries the ritual of being cherished. That 'cherish for the moment' is the strongest counter to relational flattening." },
      { title: 'Clean conflict resolution, no hidden reefs', desc: "D-type direct talk puts problems on the table before they fester. You don't bury landmines because something went unsaid. In a type that values space, that's especially valuable — independence isn't distance, and directness keeps you both real." },
    ],
    challenges: [
      { title: "'Out of contact anxiety' during recharge periods", desc: "Even though you're both I-types, one of you sometimes needs more companionship — while the other is happily alone. Without a habit of saying 'I need you', the mismatch quietly accumulates as 'feeling overlooked', and the other has no idea because they assume 'you also love space, great'." },
      { title: 'Sync issues with ritual expectations', desc: "O makes both of you prone to pre-imagining 'which reunion should feel ritualistic'. When one of you prepares carefully and the other simply isn't in the mood, the expectation-reality gap hits harder than for ordinary couples — because the meeting was planned, the gap gets magnified." },
      { title: 'Directness can overstep at emotional peaks', desc: "I-type boundary + D-type directness can produce defensive words at emotional peaks — not what you really meant, just the defense mechanism speaking. You may regret 'that was too sharp', but it's out. Practice 'pause three seconds before speaking'." },
    ],
    conflictPattern: {
      pattern: "Most common triggers: one, 'I need you, but you're inside your own world' creating rhythm mismatch; two, a shared plan executed half-heartedly, making the planner feel 'you don't care how much this mattered to me'. Both of you express dissatisfaction directly; clarity comes fast, but at emotional peaks directness becomes sharpness, words exceeding intent.",
      resolution: "D makes sure issues hit the table fast — no '3-month-old unfinished business'. A clean fight often leaves both more relieved than not fighting. After clarity, take five minutes for 'what really hurt me was…' — that line is the actual repair.",
    },
    energyMap: {
      charging: [
        "A carefully curated two-person time where every detail was chosen for them — making them feel 'this is for me'",
        "After each spending a full solo stretch, the 'I have so much to tell you' reunion feeling",
        "A deep conversation that gently opens a quiet corner of the other's inner world",
      ],
      draining: [
        "Being forced to be together when not in sync — both carrying their own minds, tired instead of charged",
        "A carefully prepared ritual hitting an 'off-mood' partner — disappointment doubled by expectation",
        "Feeling the relationship turn into 'strangers who meet on schedule' — connection slowly fading",
      ],
    },
    longterm: "This is one of the best combos at keeping a relationship fresh across time. Because every meeting is cherished, the relationship doesn't get worn down by familiarity — ten years in, you'll still have things to share and still feel quickened by reunion. What needs active defense: as life gets busier, your 'carefully scheduled together time' is repeatedly squeezed. Treat important together-time like an important work commitment — your relationship's texture lives in those cherished moments.",
    tipsForCouple: [
      "Practice saying 'I really want to see you today' — don't pretend not to care. Two independent people occasionally voicing dependence isn't losing self; it's a signal of deepening trust. They will cherish it more than you imagine.",
      "Design an annual 'big ritual' (a trip, a serious anniversary) as a connection anchor. Independent days are fine when there's a yearly node — no matter how far each drifts, you both know where the compass points.",
    ],
    funFacts: [
      { label: 'How reunions feel', value: 'Every time like a first date' },
      { label: 'Solo-time satisfaction', value: 'Full marks both sides, no interference' },
      { label: 'Anniversary preparation seriousness', value: 'More careful than most weddings' },
      { label: 'Friends say', value: "'Good — quietly, deeply good'" },
    ],
  },

  {
    code: 'IROA',
    title: 'Poetic Free Spirits',
    slogan: 'Two moons, each shining alone, occasionally pulling tides.',
    description: [
      "Each on your own orbit, drawing each other in only on certain nights, lighting each other. Love is a resonant pause, not constant noise — and you understand this better than most.",
      "Independent boundary × Romantic ritual × Orderly life × Internalize before talking — a relationship with texture, restraint and depth. You don't lose yourselves by being together; you become clearer about who you are.",
      "Your aesthetic is the ceiling — but be careful: that beautiful pause can sometimes become a wall of silence.",
    ],
    strengths: [
      { title: 'Relationship aesthetic at the ceiling', desc: "Independence + romance + order = every time together has design — never sticky, always ritualistic. Dates are planned, reunions are anticipated, anniversaries are taken seriously — from the outside, the whole relationship reads like a polished piece of art." },
      { title: 'Emotional maturity carries you further', desc: "A's calmness + I's boundaries mean very few regretted words at emotional peaks. Conflicts rarely lose control, love rarely goes extreme — you're each other's most stable emotional harbor. A quietly strong protective force." },
      { title: 'Two complete individual lives keep the love alive', desc: "Not dependent, each with their own story — love is icing, not the whole cake. That makes the relationship sustainable. Both of you keep growing, each brings back something fresh, reunions always have things to say, and 'too familiar' never becomes 'nothing to say'." },
    ],
    challenges: [
      { title: 'Double-I plus A — triple silence dynamics', desc: "After a fight, I needs solitude, A needs to process — stacked, the silence may far exceed what the issue deserves. They think you're mad; you think they're hiding; really both are just processing alone, with nobody saying so. The silence becomes a bigger problem than the original.",
      },
      { title: "Both hide in vulnerability", desc: "You both 'handle it alone'. Real low points stay invisible to the other. Over time, you may stop knowing what the other is going through — not from lack of care, but from never formally inviting them into that vulnerable space. Independence becomes its own obstacle." },
      { title: 'Precise misalignment on ritual expectations', desc: "Both of you understand ritual but may disagree on 'which moment matters most'. When one is fully anticipating and the other is simply off-mood, the gap hurts more than for ordinary couples — your expectations are higher, so the gap is magnified." },
    ],
    conflictPattern: {
      pattern: "After a fight, both retreat into their own worlds — I needs space, A needs time. Stacked, the silence can stretch long enough that you both start to wonder 'is there a bigger problem?' That doubt hurts the relationship more than the issue. A single fight may become days of quiet cold-war; both uncomfortable, neither speaking first.",
      resolution: "Breakthrough usually arrives from one side sending a gentle but explicit 'I'm ready to talk'. Once started, the conversation is often unusually calm and deep — both have done internal homework, and the words come out more rational than impulsive. That talk often becomes one of the relationship's highlights.",
    },
    energyMap: {
      charging: [
        "Each finishing something you're proud of and rushing to share it — the other genuinely delighted",
        'One ritual-filled evening — a curated dinner, an unfenced deep conversation, the sense of growing closer again',
        "An unexpected detail showing 'they truly know me'",
      ],
      draining: [
        'Post-fight silence stretching too long — both uneasy, both refusing to speak first',
        'Things turning procedural — ritual without warmth, meetings feeling like fulfilling a schedule',
        "One of you going through hard times while the other doesn't notice — a hidden hole forming",
      ],
    },
    longterm: "Ten years on, you'll still surprise each other — independent growth means familiarity never erodes charm. The one capacity to build on purpose: 'opening up vulnerability when it's time'. Not pouring all emotion outward, but occasionally letting deep care come out of action and ritual into direct language. They need to hear 'I need you' sometimes — not just inferred from your arrangements.",
    tipsForCouple: [
      "Set a 'silence-breaking' protocol: when silence crosses 48 hours, either side sends 'thinking of you — shall we talk?' — not to immediately solve, just to signal 'I'm here, I care'. That single line does far more than you imagine.",
      "Occasionally drop the careful planning — accept one 'chaos with intent' improv day. Let them see you without a script. That's the deepest knowing — and the one thing perfectly planned ritual can never give.",
    ],
    funFacts: [
      { label: 'Personal space for each', value: 'Sacred, mutually honored' },
      { label: 'Date quality vs. frequency', value: 'Quality wins by a mile' },
      { label: 'Post-cold-war reconciliation', value: 'Each brews their thoughts, one late-night line is enough' },
      { label: 'Outsider impression', value: "'Tasteful — can't quite describe how, but tasteful'" },
    ],
  },

  {
    code: 'IRFD',
    title: 'Wild Romantic Free',
    slogan: "Don't know tomorrow — today is enough.",
    description: [
      "You don't plan, but every moment gets lived hard — improvised, romantic, unbound. The kind of couple that 'people fall in love watching, and also worry watching'.",
      "Independent boundary × Full-throttle romance × Improvisational life × Direct talk — creating a periodically high-concentration relationship: intense in reunion, vibrant in solitude, each meeting a re-confirmation.",
      "Don't ask about outcomes; ask whether this moment is worth it — and the answer is almost always yes. The catch: 'this moment' needs to be actively crafted, not passively awaited.",
    ],
    strengths: [
      { title: 'Ultimate guardians of relationship freshness', desc: "I keeps independence, F brings spontaneity, R injects romance — every meeting has 'long-time-no-see' intensity. You don't have to work at 'not being boring', because your relationship isn't built that way. One of the hardest combos for love to grow old; bystanders envy your seemingly perpetual honeymoon mode." },
      { title: 'Romance independent of form, triggered anytime', desc: "R's romantic nature + F's freedom from form means any moment can suddenly become 'special' — no ritual, no plan, just both being present and in tune. The talent of 'falling for each other anytime, anywhere' is the rarest to fabricate." },
      { title: 'Directness keeps the connection real', desc: "Say what you think — no 'I assumed you understood'. Your information density is high; you both know what the other actually thinks. Especially valuable for I-types who rarely open up, dramatically reducing guessing tax." },
    ],
    challenges: [
      { title: 'Two free lines barely cross sometimes', desc: "I's independence + F's lack of fixed rhythm means 'being together' can easily be diluted by individual lives. Below a frequency threshold, one side may quietly start to wonder 'are we still us?' but won't say it because of I-type traits — the issue widens in silence." },
      { title: "A real conversation about shared direction never starts", desc: "'Live in the now' is this combo's greatest charm and most hidden flaw. Both enjoy the present, neither wants 'planning' to disrupt it — and one day, when life demands a directional choice, you may realize you never aligned on 'where we're going'." },
      { title: 'Direct + improv = high probability of saying things you regret', desc: "F's unfiltered + D's direct combo has high odds of saying things exceeding intent at emotional peaks. 'That's not what I meant' is a frequent post-fight line. Build a habit: feel — pause three seconds — speak." },
    ],
    conflictPattern: {
      pattern: "Conflict often starts with 'I need you, and you sink into yourself again' — even both being I-types, there are off-sync moments. D makes those feelings come out immediately, with no buffer, sometimes sharper than intended, hurting each other.",
      resolution: "D's upside: fights don't enter cold-war — issues get said quickly, and after the storm there's a 'rain cloud parting' clarity. After fast reconciliation, take five minutes for 'what I actually cared about behind that' — keeping the issue from recurring three months later.",
    },
    energyMap: {
      charging: [
        "A fully improvised yet uncannily perfect together-time, no plan but long remembered",
        "Each pulled off something the other was impressed by, then rushed to share the excitement",
        "A late-night honest conversation that voiced the usually unsaid — the relationship suddenly more real",
      ],
      draining: [
        "Meeting frequency quietly dropping because of individual lives — low enough to start worrying 'do we still exist?'",
        "One side entering a life stage that needs more stability while the other stays in 'easy and free' mode",
        "Direct talk degrading into 'who's right' competitions instead of actually listening",
      ],
    },
    longterm: "Your relationship will be a story of replay-worthy highlights. To make it to silver hair, at some node you'll need to consciously talk about 'what's our shared direction'. Not to cage the freedom but to find a route both free souls are willing to walk — give the improv trip a compass. Without one, drift can still get lost, no matter how beautiful.",
    tipsForCouple: [
      "Maintain a shared 'wish list' — not a calendar, just a place to drop 'things we want to do together'. The relationship gets forward-looking momentum instead of only replaying old highlights.",
      "Practice 'I feel ___' instead of 'you always ___' in fights — use directness on your feelings, not on labeling. Same words, one opens, the other closes.",
    ],
    funFacts: [
      { label: 'Plans for next date?', value: 'None — waiting for inspiration' },
      { label: 'Last special date was', value: 'This week (every week is)' },
      { label: 'Love-intensity curve', value: 'Periodic explosions' },
      { label: 'Friends say', value: "'In love every time we see you — annoying' (jealous)" },
    ],
  },

  {
    code: 'IRFA',
    title: 'Cloud Resonance',
    slogan: 'Love is rapport — not adhesive.',
    description: [
      "You don't need many words to know what each other is thinking, don't need plans to drift in the same direction — this rapport is the kind many long-term couples never build.",
      "Independent boundary × Romantic perception × Improvisational life × Cool down before talking — the 'no explanation needed' soul-match type. This relationship runs on feeling, and that feeling has never truly lost you.",
      "You're the best illustration of 'love doesn't need daily confirmation' — but occasionally confirming on purpose wouldn't hurt either.",
    ],
    strengths: [
      { title: 'Deep, irreplaceable soul-level rapport', desc: "No words needed, no plans needed — two close-frequency hearts naturally align. This rapport can't be cultivated on demand — it's evidence of real attunement. You sense each other's subtle shifts; you understand without speaking. A treasure most relationships only glimpse." },
      { title: 'Natural respect for boundaries — no mutual draining', desc: "I+F+A combined means neither feels hurt or rejected when the other needs space — giving max freedom paradoxically builds deeper trust. No suffocation, no control. Psychologically generous to both — a relationship with real air in it." },
      { title: "Romance with texture that doesn't depend on form", desc: "R's romantic perception + F's freedom from form means a gesture, a song, a sentence in passing can register as deep affection. The most effortless romance, and the most authentic — not performed for an audience, but landing exactly on the other's heart." },
    ],
    challenges: [
      { title: "Rapport is a gift, but it can't replace language", desc: "You're great at 'sensing', but sometimes the other needs not silent telepathy but the actual line — 'I'm not okay', 'I need you here', 'I love you'. Without saying it, they can only feel-and-guess; perception is good but imperfect. Some important things only language can carry." },
      { title: 'I+F+A triple stack — issues drift away most easily', desc: "All three axes point the same way: not sticky, not fixed, not on-the-spot. After a fight, both drift into your own worlds for so long that, by the time you meet again, you assume 'it's fine' — but the issue never got finished, just covered by time.",
      },
      { title: "Hard for the relationship to move to its next step on its own", desc: "F (no plan) + I (no attachment) + A (no initiative) make natural advancement hard. You may sit in 'a just-right comfort zone' for a long time — real and good, but also quietly consuming the relationship's possibility to keep growing forward." },
    ],
    conflictPattern: {
      pattern: "Open confrontations almost never happen. More common is a vague 'something is drifting between us' — unclear, just off. Neither raises it: I doesn't want stickiness, A waits for the right moment, F thinks 'it'll pass'. Silence continues, drift accelerates, and the relationship gradually grows distant — by the time you notice, you need warm-up time to reconnect.",
      resolution: "The most effective ice-breaker is a low-pressure re-approach: a message, a song you both love, an 'I'm thinking of you, how are you?' — cheap, effective. Reconnection naturally leads to a real conversation, often the one that brings texture and direction back.",
    },
    energyMap: {
      charging: [
        "A 'soul moment' of unintentional sync — each reading the same passage and feeling something, in silence yet both full",
        "An accidental romance landing perfectly — no plan, just both present at the right time",
        "A sudden, true, unedited emotional opening — vulnerable, but real — the relationship deepens at once",
      ],
      draining: [
        "Long stretches of not knowing where the other is or what they're going through — connection thinning quietly",
        "Slipping into 'occasional strangers' — reunion has barriers, needs warm-up time",
        "Having something to say but no opening — silence stacking into an invisible wall",
      ],
    },
    longterm: "The biggest gift of this relationship: it never forces you to lose yourself. The biggest challenge: it also never forces you to face issues. Ten years from now, if you consciously 'add some structure' — one serious deep talk monthly, one solemn mutual confirmation annually — you'll have a depth others spend decades reaching. That depth is uniquely available to this combo, but it must be summoned, not awaited.",
    tipsForCouple: [
      "Monthly 'face-to-face honesty' time — not to solve, just to each name 'one feeling from this month, and one wish'. Five minutes is enough. Don't let rapport become the reason to stop opening your mouth.",
      "Don't let 'I assumed they got it' replace speaking. Rapport is a gift, but it can't handle what only language can. 'I love you' said and 'I love you' sensed weigh entirely different to the other.",
    ],
    funFacts: [
      { label: 'Wordless communication success rate', value: '≥ 90% (you even read cat-face emojis)' },
      { label: 'Cold-war style', value: 'Each drifts away, then quietly drifts back' },
      { label: "How 'we're together' was confirmed", value: 'Never quite formally said' },
      { label: 'Friends say', value: "'Don't get you, but it feels good'" },
    ],
  },

  // ───────────────────── Mint Green IP ─────────────────────
  {
    code: 'IPOD',
    title: 'Independent Order Companions',
    slogan: 'Each does their own — and nobody gets left behind.',
    description: [
      "Each of you keeps your own schedule, circle, goal list — and the shared plans always land precisely, because what you say, you do.",
      "High independence × Pragmatic action × Orderly life × Direct talk — a quiet, highly efficient duo. Love isn't merging; it's two complete people choosing to walk side by side.",
      "Outsiders may not see 'passionate love'; you know that steady, never-disappearing 'I'm safe with you' is exactly the deepest form of love.",
    ],
    strengths: [
      { title: 'Reliability built from doing what you said is the deepest love', desc: "I+P+O+D — love isn't sweet talk but 'we said it, we did it'. Every kept promise, every show-up, every 'you go, I'll handle this' adds to the trust account. More durable than any declaration." },
      { title: 'Clear boundaries create real respect', desc: "Not sticky, not dependent — giving maximum freedom builds deeper trust. You're not together because of need but because of choice. That intentionality grants real respect — a quality many couples chase but rarely keep." },
      { title: 'Direct talk prevents pile-up', desc: "Say it, no detours, problem stated, solution stated. D's directness is especially valuable in independent types — it blocks the typical 'I+P' invisible buildup, giving this relationship an extra safety valve compared to other IP combos." },
    ],
    challenges: [
      { title: "Risk of sliding into a 'high-efficiency strategic partnership' mode", desc: "I+P+O is extremely pragmatic and efficient, but efficiency and warmth can be inversely related. Long-running 'you handle that, I handle this' partnership sometimes loses the 'I just want to be with you' part, turning the relationship into a well-running life contract." },
      { title: 'Scarce emotional affirmation produces hidden loneliness', desc: "P+I unconsciously compresses the 'useless' emotional time. 'Everyone's doing well, things are handled' — but one of you may quietly ask at 3am 'is there anything between us beyond getting things done?' The question stays unsaid because I doesn't open up and D doesn't press." },
      { title: 'Solving the problem sometimes misses the emotion itself', desc: "D's direct handling + P's pragmatic orientation can leave 'thing solved' but emotion unsoothed. The issue resolved, but the rough night never properly sat-with." },
    ],
    conflictPattern: {
      pattern: "Conflicts usually orbit 'agreement not kept' or 'wrong kind of support expected'. Both express directly but, being rational, rarely personal. More like two thoughtful PMs reviewing a deviation — professional, sometimes lacking warmth.",
      resolution: "Finding a solution is the priority; both switch from emotion mode to problem-solving fast and rarely loop on the same issue. After the solution, take five extra minutes to ask 'what really hurt about that?' — the part this combo is most likely to skip and most needs to keep.",
    },
    energyMap: {
      charging: [
        "Together pulling off something important with tight coordination and better-than-expected results",
        "Showing up exactly when help was most needed, getting it done, leaving the other with 'someone's here'",
        "A short but sincere 'thank you for always being here' actually voiced — feeling seen",
      ],
      draining: [
        "Repeatedly talking through the same behavioral problem with no real change",
        "Love reduced to scheduling and execution, with no 'just being with you, doing nothing' moments",
        "Feeling occasional loneliness yet finding the other also independently handling their own things — neither speaks first",
      ],
    },
    longterm: "You're among the best combos in the world at jointly running two lives — thirty years on, likely clear goals, ordered lives, mutual respect. The real thing to push against: don't let 'life runs well' become a proxy for 'love is enough'. Schedule 'our relationship quality' separately in your plans — not just a variable in life but an independent project worth nourishing.",
    tipsForCouple: [
      "Weekly 'unproductive together time': no planning, no problem-solving, no scheduling — just being, feeling. You may discover you need it more than you thought.",
      "Upgrade the love check-up from 'any problems?' to 'how good is it?' — say 'this thing this week made me really happy' instead of 'all normal'. A good relationship isn't just no problems; it's actively observed and cherished.",
    ],
    funFacts: [
      { label: 'Shared-plan completion', value: '100%, usually ahead of schedule' },
      { label: "'What to do tonight'", value: '< 5 minutes — efficient' },
      { label: 'Personal-space violations', value: 'Nearly zero' },
      { label: 'Friends say', value: "'Lowest-maintenance couple — honestly'" },
    ],
  },

  {
    code: 'IPOA',
    title: 'Parallel-Universe Resonators',
    slogan: "Not interrupting is my deepest tenderness.",
    description: [
      "You each run on your own and stay on the same frequency — no need to sync every second, but always in sync when it matters, like two planets respecting each other yet bound by precise gravity.",
      "High independence × Pragmatic action × Orderly life × Internalize before speaking — a low-noise, high-trust, extremely stable relationship. 'Together' doesn't mean 'all of each other' — you both quietly understand this.",
      "The hallmark of this love isn't presence, it's reliability — you just know they're there, no confirmation needed, because that feeling has never disappeared.",
    ],
    strengths: [
      { title: 'High-quality non-interruptive co-presence', desc: "You can sit in the same room doing your own things, each full, glancing up occasionally — just right. The 'comfortable without words' style requires high mutual trust and safety as a foundation, and you have it natively." },
      { title: 'Highest stability within all IP types', desc: "I+P+O+A — almost untouched by outside noise. Not pulled by emotion, not dragged by small things, no decisions in heat. The world may shift; this relationship remains both your most solid anchor." },
      { title: 'Emotional maturity saves the relationship many detours', desc: "Internalize first, talk after cool-down — avoiding much unnecessary verbal damage. Maturity here isn't suppression but giving emotion room to be metabolized — not saying the wrong thing at the wrong time, the deepest protection." },
    ],
    challenges: [
      { title: 'I+P+A triple stack — needs are almost permanently invisible', desc: "I doesn't open up, P doesn't articulate feelings, A internalizes first — stacked, real needs almost always stay inside. The other can only guess, and guesses usually miss. 'I thought you didn't need it' and 'I needed it but never said' are the most common sources of misunderstanding here." },
      { title: 'The invisible glass wall thickens over time', desc: "You both tend to 'handle it yourself'. When one falls into an emotional low, the other may have no idea. Over time, you build a 'we're both fine' consensus default — and beneath it, each may carry things never voiced.",
      },
      { title: 'Outsiders (even yourselves) misread the relationship', desc: "Too calm, too independent — friends may question 'are you two actually doing well?' And that question can shake your own assessment. Remember: 'not passionate' ≠ 'not deep'; the metric for your relationship isn't outside noise." },
    ],
    conflictPattern: {
      pattern: "Almost no open conflict, but a 'thin layer of glass between us' feeling — both feel it, both say nothing. I doesn't want stickiness, A waits for the right moment, P thinks action matters more. The glass thickens, and by the time you both register 'this isn't right', it's hard to break.",
      resolution: "Reconciliation usually doesn't start with a talk but with a meaningful action: cooking together, walking together, one of you quietly solving something the other never got to — let bodies make up first, hearts follow. Then in a calm moment, break the glass once: 'I needed you a bit lately, but I didn't say it'.",
    },
    energyMap: {
      charging: [
        "Independent yet quietly supporting at critical moments — like two trees whose roots tangle underground, both feeling it without announcing",
        "Both entering a 'full and calm' state at once, each satisfied yet present — a rare high-quality stillness",
        "An unexpectedly deep conversation breaking the calm balance, both seeing a truer version of the other — the relationship suddenly closer",
      ],
      draining: [
        'Long stretches of physical co-existence without real emotional exchange — each running solo',
        "Love reduced to 'stable and orderly' — no anticipation, no heart-quickening moments",
        "One sinking into an emotional low while the other has no idea — by the time it's noticed, much time has passed",
      ],
    },
    longterm: "Your relationship is like a great tree — deep roots, sturdy trunk, hard to shake. Mutual understanding deepens over time, sensing each other without words. The only thing to do on purpose: fertilize this tree regularly — not because it's withering, but because good relationships deserve continuous nourishment, not waiting until 'thirsty' to remember.",
    tipsForCouple: [
      "Set a safe space for 'I need you' to be said directly — not weakness, the highest form of trust, and the part this relationship most needs to reinforce. Practice 'I need a little more time with you lately' — let need be seen, not always silently metabolized.",
      "Periodically do something 'breaking the fixed rhythm': go somewhere new, try something untried — inject novelty. Not because you're bored, but because flowing water keeps a relationship from becoming a pond.",
    ],
    funFacts: [
      { label: 'When each is alone', value: 'Full and content, no interference' },
      { label: 'Conflict handling', value: 'Cool down, then carry on as usual' },
      { label: 'Core relationship expectation', value: 'Stable, respectful, unforced' },
      { label: '10-year forecast', value: 'Each accomplished, still together' },
    ],
  },

  {
    code: 'IPFD',
    title: 'Free-and-Easy Duo',
    slogan: "Together because we want to — not because we can't be apart.",
    description: [
      "You both need space, both enjoy going with the flow — being together is like two streams occasionally merging into a river: flowing, natural, unforced, but the stretch you do share runs unusually clear.",
      "High independence × Pragmatic action × Improvisational life × Direct talk — a light, non-sticky, very real relationship. Your strongest foundation: being together is because you sincerely want to — not habit, not dependence, but choice.",
      "Outsiders may wonder 'are you two even serious?' You know you are. You just don't perform it.",
    ],
    strengths: [
      { title: 'The air-quality of this relationship is real freedom', desc: "Not sticky, not heavy, no planning, no force — together because you genuinely want to be. The lowest-pressure, highest-autonomy style across all types. Both have intact selves; being together doesn't lose that self — a balance many couples chase and rarely find." },
      { title: 'Direct talk cuts down guessing and drain', desc: "Say whatever — both know where the other is, no guessing, no detours. D's direct talk is especially valuable in independent types — it gives this otherwise 'handle it silently' relationship a 'say it out loud' safety lane." },
      { title: 'High personal freedom and real emotional connection coexist', desc: "Each lives well; together is easy — no sacrifice of freedom to maintain love. Two things many couples find contradictory, you've made routine — both genuine, not performed." },
    ],
    challenges: [
      { title: "Direction stays highly ambiguous for a long time", desc: "F+I combo means 'where are we heading' rarely gets raised — both enjoy the present, neither wants 'planning' to break the lightness. One day, when life demands a direction, you may realize you never aligned." },
      { title: "Pragmatic love sometimes feels like 'friends'", desc: "P-types don't chase ritual, but sometimes the other needs exactly the 'taken seriously' feeling — a serious date, a useless but heartfelt gift, an out-loud 'I like you' in public. Stepping outside pragmatic once in a while is worth trying." },
      { title: 'Direct + improv = emotion without a filter', desc: "F's unfiltered + D's direct talk has a high rate of saying too much when emotion arrives. Regret comes later, but the words are out. Build a habit: feel — pause three seconds — then speak. Not suppression, just precision." },
    ],
    conflictPattern: {
      pattern: "Fights are usually short and direct — say it, state it, label it, move on, sometimes before bystanders can react. F's spontaneity means triggers can look random; D ensures the feeling is voiced rather than swallowed.",
      resolution: "Neither holds grudges — 'never mind, move on' is the common ending — highly efficient. Before moving on, take five minutes: say what was actually behind that fight, or the same one comes back three months later with a different surface trigger.",
    },
    energyMap: {
      charging: [
        "They show up unannounced with your favorite thing, saying nothing — but you get it",
        "An unexplained, perfectly easy time together — just being, no performance",
        "Saying 'I want you with me today' directly — they come, no questions asked",
      ],
      draining: [
        "A persistent 'what are we, where are we going' fog — unclear but uneasy",
        "Pragmatic days stretching too long, with no highlights — love becoming flat and mechanical, like a scheduled system",
        'One side slowly starting to want more without saying it — the other unaware, the gap quietly widening',
      ],
    },
    longterm: "Your love is so light that outsiders sometimes worry 'are these two for real?' The answer: yes, just in a different way. To bring this lightness all the way to silver hair, at some node, you'll need to consciously 'add weight' — a serious future conversation, a clear 'I choose you'. It won't cost you freedom; it gives the lightness roots, and confidence to travel far.",
    tipsForCouple: [
      "Periodic 'where are we now' conversation — not for scoring, just for both to know each other's real state and expectation, so you don't one day discover the expectations diverged long ago, neither aware.",
      "Design a 'no utility, all heart' act for them — not to solve a problem, just to spike their heart. That single heartbeat gives later 'going with the flow' more weight.",
    ],
    funFacts: [
      { label: 'After a cancelled date', value: 'Mutual understanding, next time — and there is a next time' },
      { label: "'Where shall we go?' attitude", value: "'Anywhere, you decide' — sincere" },
      { label: 'Pressure index', value: 'Near zero' },
      { label: 'Frequent outsider question', value: "'Are you two actually together?'" },
    ],
  },

  {
    code: 'IPFA',
    title: 'Minimalist Lovers',
    slogan: "We don't fuss, we don't perform — but the sincerity has never been less.",
    description: [
      "No clinginess, no plans, no on-the-spot arguments — your love is like a glass of plain water: simple, clean, needed daily, only truly valued by those who actually need it.",
      "High independence × Pragmatic action × Improvisational life × Internalize before speaking — four axes stacked into the most effortless, possibly most durable form across all types. You don't chase grand drama; you just want every day to be real, and that itself is the rarest thing.",
      "Your love almost never makes a sound. It lives in concrete small things, in care that was never mentioned but always present. Outsiders don't get it, but you do.",
    ],
    strengths: [
      { title: 'The most mature boundary — real freedom for both', desc: "No invasion, no kidnapping, no using each other as an emotional container — giving maximum freedom; the lowest 'suffocation', the highest 'respect' across types. That freedom isn't coldness — it's deep trust: you're you, I'm me, but we chose each other." },
      { title: 'Love barely consumes energy — sustainable forever', desc: "Co-existence is so easy you barely feel friction; both charge in this relationship rather than drain. In long-term relationships, this 'low-internal-cost' style is precious — many relationships fade not from lack of love but from sheer exhaustion, and yours rarely tires either of you." },
      { title: 'Quiet depth gains weight over time', desc: "No declaration, no display, no performance — but the silent caring is the truest form of existence. The longer time goes, the clearer it becomes: the understanding that doesn't need to be said, the companionship without scheduling, the care never mentioned but always present — that's the entire weight of this love." },
    ],
    challenges: [
      { title: 'I+P+F+A quadruple stack — drift is the biggest hidden risk', desc: "All four axes point the same way — not sticky, not romantic, not planned, not on-the-spot. The relationship can quietly grow distant without either noticing: not because something happened, but because nothing happened, nothing got said, and time slowly pushed the hearts apart." },
      { title: 'Relationship lacks forward momentum, often staying too long in the comfort zone', desc: "Neither wants to take the first step. The relationship may sit a long time on a 'just right' plateau — real comfort, but quietly consuming the chance to move forward. At a major life node, you may suddenly find you've never seriously discussed 'where are we headed'." },
      { title: 'Hard to evaluate the love temperature, even for yourselves', desc: "So calm that sometimes you both wonder at night 'are we okay?' Outside doubt amplifies it. Remember: your metric isn't intensity — it's 'when they need me, am I there?'" },
    ],
    conflictPattern: {
      pattern: "Almost no open conflict — I doesn't press, P doesn't elaborate, F thinks 'it'll pass', A waits for the right moment. Real issues get quietly dissolved by 'whatever' and 'never mind', then one day a seemingly trivial thing triggers long-built emotion — both confused: 'I thought we were fine'.",
      resolution: "Repair doesn't need a long talk, but it does need a 'signal' — an action, a surprise gentle gesture, a calm 'how have you been?' is enough to pull two drifting hearts back into the same frequency. After making up, find a moment to actually speak the unsaid once, even just 'I needed you back then' — to truly close the thing, not just let it disappear.",
    },
    energyMap: {
      charging: [
        "An unplanned reunion — they happened to be free, you happened to want to see them, nothing arranged, more precious than any curated date",
        "Them showing you they've been paying attention all along — remembering a tiny thing you mentioned in passing, quietly doing or buying it",
        "Both sitting in the same room doing your own thing — no words, but deeply settled — 'this is what home is'",
      ],
      draining: [
        "Long stretches without a real, deeper exchange — not knowing the other's true emotional state, not sure they know yours",
        "Love just 'existing' — no growth, no direction, unclear whether you're still moving forward, unclear what it adds up to",
        "One side undergoing a quiet inner shift while the other has no idea — by the time you notice, you don't know where to start mending",
      ],
    },
    longterm: "Time is this combo's litmus test. Reaching ten years means two independent hearts each kept a light reserved for the other, even if never voiced. But 'reaching ten years' needs someone to take a step — small is fine, just occasionally saying the thing held inside, so the other can confirm you're still here and haven't quietly drifted. Saying it won't damage your freedom; it gives this calm depth roots.",
    tipsForCouple: [
      "Every once in a while, seriously ask 'does our relationship feel fulfilling to you now?' — not a challenge, an act of care, a chance to re-align. The question itself is deep caring and the very flow this relationship needs most.",
      "You don't have to become a fervent couple, but the relationship sometimes needs active flow: each month, do one thing 'not in the plan but meaningful' — not because something is wrong, but because good relationships deserve to be nourished, not passively waited on.",
    ],
    funFacts: [
      { label: 'Holiday-gift strategy', value: '"Tell me what you want, I\'ll buy it" (with full sincerity)' },
      { label: 'Comfort with silence together', value: 'Extremely high — silence is the norm' },
      { label: 'Relationship energy cost', value: 'Lowest tier (eco-friendly, sustainable)' },
      { label: "Outsiders' most common misjudgment", value: "'Are they doing well?' (yes, they just don't flaunt it)" },
    ],
  },
]
