# Social Media University AI — Content & Data Specification

This is the authoritative spec for every data file in `js/data/`. All content files are plain
JavaScript (NOT modules — they load via `<script>` tags) and must:

1. Start with: `window.SMU_DATA = window.SMU_DATA || { schools: [] };`
2. Assign into `SMU_DATA` exactly as specified below.
3. Contain **no** `import`/`export`, no top-level `await`, no template literals containing `</script>`.
4. Pass `node --check <file>`.
5. Be fully self-contained — never reference other files, the DOM, or the network.

Tone of all content: elite, practical, specific. Write like a $10k/year mentorship, not a blog.
Every lesson teaches something the reader can apply the same day. No filler, no "in today's
digital landscape" fluff. Use concrete numbers, named techniques, and real craft vocabulary.

**Integrity rules:** Creator profiles cover real, well-known public figures using qualitative,
publicly-known information only — respectful, no fabricated statistics, no private claims.
Viral video entries are **format archetypes** (patterns seen across thousands of videos), not
claims about one specific real video. Never invent precise view counts as fact; phrasing like
"this format routinely clears 1M+ views" is fine.

**Skill keys** (used for the skill radar; every lesson/challenge/quiz tags exactly one):
`strategy | viral | video | photo | editing | marketing | branding | analytics`

**Niche keys** (shared vocabulary):
`luxury | cars | realestate | fitness | business | sales | lifestyle | fashion | food | travel | creator`

**Platform names** (exact strings): `Instagram`, `TikTok`, `YouTube`, `YouTube Shorts`,
`Facebook`, `LinkedIn`, `X`, `Threads`.

**Text formatting:** long-form text fields support markdown-lite rendered by the app:
blank line = paragraph break, `**bold**`, lines starting `- ` = bullet list, lines starting
`1. ` = numbered list. Nothing else (no headings, links, code, tables).

---

## 1. Curriculum schools — `js/data/curriculum-<id>.js`

One file per school. Each file pushes ONE school object:

```js
window.SMU_DATA = window.SMU_DATA || { schools: [] };
SMU_DATA.schools.push({
  id: "strategy",            // must match file name suffix
  order: 1,                  // sort order, see table below
  name: "Social Media Strategy",
  tagline: "Think like a strategist, grow like a machine",   // <= 60 chars
  icon: "🧭",                // one emoji
  hue: 42,                   // 0-360, per-school accent hue, see table
  description: "2-3 sentence description of what this school teaches and who it's for.",
  courses: [ /* exactly 5 course objects, one per level, in this order:
                Beginner, Intermediate, Advanced, Expert, Master */ ]
});
```

### Course object

```js
{
  id: "strategy-1",              // "<schoolId>-<1..5>"
  level: "Beginner",             // Beginner|Intermediate|Advanced|Expert|Master
  title: "Foundations of the Feed",
  description: "1-2 sentences on what this course covers.",
  lessons: [ /* 5-6 lesson objects */ ]
}
```

### Lesson object

```js
{
  id: "strategy-1-1",            // "<courseId>-<n>", n starts at 1
  title: "How the Algorithm Actually Ranks You",
  minutes: 8,                    // realistic read+practice time, 6-14
  xp: 50,                        // Beginner 50, Intermediate 60, Advanced 75, Expert 90, Master 110
  skill: "strategy",             // one skill key
  intro: "1-2 sentence hook framing why this lesson matters.",
  sections: [                    // 3-5 sections; each body 100-180 words, markdown-lite
    { h: "Section heading", body: "Teaching content..." }
  ],
  takeaways: ["...", "...", "..."],        // 3-5 one-line takeaways
  actions: ["...", "..."],                 // 2-4 concrete do-today action steps
  quiz: [                                   // exactly 3 questions
    { q: "Question?", options: ["A","B","C","D"], answer: 0, why: "1-sentence explanation." }
  ],
  drill: "One optional hands-on practice exercise (1-2 sentences)."
}
```

### Schools table (11 files)

| file | id | order | name | hue | skill emphasis | must cover |
|---|---|---|---|---|---|---|
| curriculum-strategy.js | strategy | 1 | Social Media Strategy | 42 | strategy/analytics | algorithms (how ranking, distribution & interest graphs work), content pillars, posting strategy & cadence, audience building, brand positioning, growth systems, analytics & iteration loops |
| curriculum-viral.js | viral | 2 | Viral Content Science | 0 | viral | viral psychology, hooks (verbal/visual/text), first-3-seconds, retention engineering, storytelling structures, emotional triggers, curiosity gaps, CTAs, shareability & save-ability |
| curriculum-instagram.js | instagram | 3 | Instagram & Reels | 320 | viral/video | reel structures, editing styles for IG, trending formats, captions & hashtags, cover images & grid, retention tactics, stories & broadcast channels, IG-specific algorithm signals |
| curriculum-tiktok.js | tiktok | 4 | TikTok Mastery | 175 | viral | TikTok viral formats, trend research & sounds, TikTok SEO & search, community/comment strategy, posting windows, series & live, creativity program |
| curriculum-youtube.js | youtube | 5 | YouTube & Shorts | 4 | video/strategy | Shorts strategy, long-form structure, thumbnails, titles & packaging, watch time & AVD, audience retention curves, session time, channel architecture |
| curriculum-platforms.js | platforms | 6 | LinkedIn, X & Beyond | 210 | strategy/marketing | LinkedIn personal-brand playbook, X/Twitter writing & threads, Threads, Facebook pages/groups/reels, cross-posting intelligently, choosing your platform stack |
| curriculum-photography.js | photography | 7 | Photography | 28 | photo | composition, natural & artificial lighting, camera settings (exposure triangle), lenses, portraits, luxury product photography, automotive photography, brand/lifestyle shoots, phone photography |
| curriculum-cinematography.js | cinema | 8 | Cinematography | 258 | video | camera movement, shot selection & coverage, visual storytelling, commercial filmmaking, the luxury cinematic look, lighting for video, framing for vertical |
| curriculum-editing.js | editing | 9 | Video Editing | 190 | editing | CapCut / Premiere Pro / DaVinci Resolve / Final Cut workflows, cuts & transitions, color grading, sound design, speed ramps, motion graphics, VFX basics, pro workflow & organization |
| curriculum-marketing.js | marketing | 10 | Marketing & Money | 145 | marketing | consumer psychology, copywriting, sales psychology, funnels, paid ads, offers, community building, monetization models (brand deals, products, services) |
| curriculum-branding.js | branding | 11 | Personal Brand | 48 | branding | brand identity, brand voice, content pillars for personal brands, visual identity systems, positioning & niching, reputation & trust, luxury brand codes, becoming known for one thing |

Every school: 5 courses × 5-6 lessons = 25-30 lessons. Lessons must ladder in difficulty —
Master-level content should feel like agency/creative-director material, not repeats.

---

## 2. Viral database — `js/data/viral.js`

```js
SMU_DATA.viral = [ /* 24 entries: 4 per niche for luxury, business, sales, fitness, cars, lifestyle */ ];
```

Entry:

```js
{
  id: "vv-lux-1",
  title: "The Silent Luxury Morning",        // archetype name
  niche: "luxury",                            // luxury|business|sales|fitness|cars|lifestyle
  platform: "Instagram",                      // primary platform (exact string)
  emoji: "🕯️",
  format: "One-line description of the format archetype.",
  hook: "What the hook is and why it stops the scroll.",
  first3: "Exactly what happens in seconds 0-3.",
  retention: "The retention mechanics that keep viewers to the end.",
  editing: "Cut style, pacing, effects.",
  camera: "Camera work, angles, movement.",
  storytelling: "Narrative structure at play.",
  emotion: "Primary emotion triggered and how.",
  caption: "Caption strategy for this format.",
  cta: "The CTA approach that fits.",
  whyItWorks: "2-3 sentence synthesis of the psychology.",
  recreate: ["Step 1 ...", "Step 2 ...", "..."],   // 5-7 concrete steps to recreate
  difficulty: 2,                              // 1 easy, 2 medium, 3 hard
  tags: ["asmr", "no-talking"]               // 2-4 lowercase tags
}
```

---

## 3. Creator library — `js/data/creators.js`

```js
SMU_DATA.creators = [ /* 18 real, famous, safe-to-discuss creators */ ];
```

Pick globally known creators across niches (e.g. Alex Hormozi, Gary Vaynerchuk, MrBeast,
Ali Abdaal, MKBHD, Peter McKinnon, GRWM/luxury creators, real-estate creators like Ryan
Serhant, fitness creators, etc.). Qualitative analysis only.

```js
{
  id: "cr-hormozi",
  name: "Alex Hormozi",
  handle: "@hormozi",
  niche: "business",
  platforms: ["YouTube","Instagram","LinkedIn"],
  emoji: "📈",
  known: "One line: what they're known for.",
  brand: "Analysis of their brand identity & positioning.",
  contentStyle: "Formats, topics, delivery style.",
  editingStyle: "Signature editing look and why it works.",
  storytelling: "How they structure narrative & teach.",
  growth: "The strategy behind their growth.",
  monetization: "How the audience becomes revenue.",
  audience: "Audience psychology: who follows and why.",
  lessons: ["Lesson 1 you can steal", "...", "..."],   // 4-6
  studyThis: "One specific homework: what to watch/deconstruct this week."
}
```

---

## 4. Trend intelligence — `js/data/trends.js`

```js
SMU_DATA.trends = [ /* 22 entries */ ];
```

Mix of `evergreen` viral mechanics (majority — these never expire) and current-era formats.

```js
{
  id: "tr-01",
  name: "Silent vlog / no-talking content",
  type: "format",              // sound|format|editing|platform|strategy
  status: "evergreen",         // rising|peak|evergreen
  platforms: ["Instagram","TikTok"],
  description: "What the trend is, 1-2 sentences.",
  whyItWorks: "The psychology/algorithm mechanics behind it.",
  adapt: ["Step to adapt it to your brand", "...", "..."],   // 3-5 steps
  fitsIf: "One sentence: brands/creators this fits.",
  skipIf: "One sentence: when to skip it.",
  example: "A concrete example execution for a luxury or business brand."
}
```

---

## 5. Training pools — `js/data/training.js`

```js
SMU_DATA.training = {
  challenges: [ /* 60 daily challenges */ ],
  editingDrills: [ /* 20 */ ],
  photoDrills: [ /* 20 */ ],
  marketingDrills: [ /* 20 */ ],
  quizBank: [ /* 60 questions */ ]
};
```

Challenge: `{ id: "ch-01", title: "The 3-Hook Rewrite", task: "Concrete task doable today in the stated time.", skill: "viral", minutes: 15, xp: 40 }`
Drill (all three drill arrays): `{ id: "ed-01", title: "...", task: "...", xp: 30 }` — editing drills may name a specific app in the task; photo drills need only a phone; marketing drills are writing/thinking exercises.
Quiz bank question: `{ q: "...", options: ["A","B","C","D"], answer: 2, why: "...", skill: "viral" }` — spread across all 8 skills.

---

## 6. Generator playbooks — `js/data/playbooks.js`

Powers the offline AI Content Creator tools. Quality bar: every template usable verbatim.

```js
SMU_DATA.playbooks = {
  hooks: [ /* 120 */ ],      // { t: "POV: you finally {goal} and nobody claps", cat: "story", niches: ["business","fitness"] }
                             // cat: curiosity|status|fear|desire|controversy|tutorial|story|proof
                             // Use {topic} {goal} {niche} {number} {timeframe} placeholders where natural.
  ideas: [ /* 88, 8 per niche */ ],   // { idea: "...", niche: "luxury", format: "talking-head|voiceover-broll|pov|tutorial|vlog|carousel|text-on-screen", platform: "Instagram" }
  scripts: [ /* 10 frameworks */ ],   // { name: "The Problem-Agitate-Reveal", structure: ["0-3s: ...","3-10s: ...","..."], example: "Full 60-90 word example script.", bestFor: "..." }
  captions: [ /* 12 formulas */ ],    // { name: "...", formula: "Line-by-line formula", example: "..." }
  ctas: [ /* 40 */ ],                 // { text: "Comment 'SYSTEM' and I'll send you the template", goal: "comment" }  goal: follow|comment|share|save|dm|link
  calendars: [ /* 4 */ ],             // { name: "The Authority Builder", cadence: "5 posts/week", days: [{ day: "Mon", post: "..." }, ...7 days] }
  shotlists: [ /* 8 */ ],             // { name: "Luxury Car Feature", scenario: "...", shots: [{ shot: "...", angle: "...", movement: "...", purpose: "..." }, 6-10 shots] }
  broll: [ /* 11, one per niche */ ], // { niche: "luxury", items: ["...", ... 10-14 b-roll ideas] }
  editRecipes: [ /* 12 */ ]           // { name: "The Speed-Ramp Reveal", app: "CapCut", steps: ["...", ...4-7], effect: "What it achieves" }
};
```

---

## 7. App conventions (for view modules — reference only)

- Views live in `js/views/<name>.js` and register `SMU.views.<name> = { title, render(root, params) }`.
- Routing is hash-based: `#/today`, `#/learn`, `#/learn/<schoolId>`, `#/learn/<schoolId>/<courseId>/<lessonId>`,
  `#/coach`, `#/studio`, `#/studio/<toolId>`, `#/intel`, `#/intel/<tab>`, `#/profile`. Navigate with `SMU.nav("learn/strategy")`.
- Read data via `SMU_DATA`; schools sorted by `SMU.schools()` helper.
- Persistent state: `SMU.state` (auto-saved via `SMU.save()`); XP via `SMU.addXP(xp, skill)`;
  lesson completion via `SMU.completeLesson(lessonId, quizScore)`.
- Markdown-lite rendering: `SMU.md(text)` returns HTML string (already escaped).
- UI helpers in `js/ui.js` (`SMU.ui.*`). Toasts: `SMU.toast(msg)`. Sheets: `SMU.sheet(title, bodyHTML)`.
- AI calls: `SMU.ai.chat(messages, opts)` — resolves to text, throws `SMU.ai.NoKeyError` if no API key.
  `SMU.ai.hasKey()` to branch. Every AI feature MUST have a quality offline fallback from playbooks/data.
