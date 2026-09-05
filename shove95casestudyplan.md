# shove.95 — portfolio case study plan

Content roadmap for the `to-shove2d.html` page on lucasmaher.com.
Written 2026-09-03. Hand this to the Claude session working in
`TEMP/3D_Portfolio`.

---

## 0. What exists already

- **`public/to-shove2d.html` is a stub** — 1552 lines, but almost all of it is
  shared nav/style boilerplate. Real content is one `<h1>To Shove</h1>` and an
  empty `guide-section`. Nothing to preserve; build it out.
- **`public/unify2d.html` is the model.** Its section order is: hero → *At a
  Glance* (overview paragraph) → meta grid (Timeline / Team / Role / Skills) →
  `process-section` blocks (colour, typography, character design) → *Final
  Product* → `guide-section` feature blocks with their own headings.
- **Site conventions to respect:** every text node needs `data-i18n`, and every
  key needs an entry in **both** the EN and DE `TRANSLATIONS` blocks. The Unify
  page shipped with 6 keys missing from `TRANSLATIONS` entirely and German
  visitors silently saw English — check symmetry before calling it done.
- **The page voice, from the profile doc:** problem first, then how the project
  answers it, then a plain list of tools. Short. No self-praise.

---

## 1. What the research says

Sources: AppFollow, Screenhance, Design Decade, MyUX Academy, UX Playbook (2026).

**The numbers that shape everything:**

- Recruiters spend **30–60 seconds** on a first portfolio scan and **5–10
  minutes** on a first case study. Everything essential must survive the
  30-second version.
- An **800-word case study where every sentence counts beats a 4,000-word one**
  that buries its insights.
- Hiring managers judge a portfolio by its **weakest** case study, not its best.
  Three to five strong ones is the target.

**What they are actually looking for:**

They are not looking for prettier screens than the last candidate. They are
looking for evidence you can **identify a problem, make defensible decisions,
and move a product toward an outcome**. Process and rationale outrank final
screens.

**The canonical structure:** overview → problem → role → research and insights
→ process → key decisions with rationale → final solution → outcomes.

**Presenting a personal project with no metrics** (directly relevant here):
substitute three things for numbers — a sharply defined problem, explicit
decision rationale, and honest lessons learned. Answer "what problem, who
benefits, what actually changed" clearly and the absence of a funnel chart
stops mattering.

---

## 2. The app, in full

Reference material. The case study will use a fraction of this — but the
session writing it should know what exists before deciding what to leave out.

### The model

- **Three lists: Today, Tomorrow, Soon.** A task is in exactly one of them,
  always. There is no inbox, no project, no tag, no folder.
- **The lists are filters over a real date, not containers.** Each task holds a
  date (or none); the tab is computed from it. This is the load-bearing
  decision in the whole app — see below.
- **Overdue roll-forward is free.** A past date resolves to Today, so an
  unfinished task simply reappears there with a chip saying how late it is
  ("1 Day", "2 Days"). There is **no rollover job**, no midnight task, nothing
  to go wrong while the phone is asleep.
- **Undated tasks live in Soon**, under a "General" heading.
- Soon also groups dated tasks by day — "Sat 5 Sep", "Sat 31 Oct" — and those
  headings fold shut.

### The swipe — the core gesture

- **Right moves it later** (Today → Tomorrow → Soon), **left pulls it back**.
- The commit threshold is **0.22 of the row's width**, or a release velocity
  over 300 pt/s — so a fast flick commits from a shorter distance than a slow
  drag. The row carries the finger's velocity into the animation.
- Rubber-banding resists at the ends of the line.
- Every move is confirmed by an undo bar that retires itself.

### What you can do to a task

| Gesture | Result |
|---|---|
| Tap the circle | Tick it off — strikethrough, drops to the bottom |
| Tap the text | Inline edit; Return commits |
| Swipe L/R | Move a bucket |
| Long press | Menu: **Delete**, **Go Live**, **Mark as Important**, and a jump to the non-adjacent bucket (`>> Soon` from Today, `<< Today` from Soon) |
| Long press the grip, then drag | Reorder by hand |
| Camera / photo button while editing | Attach a photo |
| Calendar button (Soon only, while editing) | Pick a specific day |

**Important** is red *and* semibold — colour is never the only signal.

### Live — the Lock Screen feature

- A dedicated section, reached by the ring at the bottom left.
- **One live task at a time**, typed into its own large box.
- It appears on the **Lock Screen and in the Dynamic Island** via a Live
  Activity, and stays until ticked off.
- A **Live / Off air** switch controls whether it is showing, without deleting
  the text. A bin deletes it, and greys out when the box is empty.
- Emptying the text ends the live note — the box and the Lock Screen cannot
  disagree.
- **The live task is shared across workspaces.** It is "the one thing you are
  doing", not "the one thing in this list".
- Implemented in a widget extension because that is the only place iOS allows
  Live Activities. **There is no Home Screen widget** and none appears in the
  widget gallery.

### Workspaces

- Separate lists — Personal and Work by default.
- The pill at the top left opens and switches; add, rename and delete live in
  Settings.
- **Deleting a workspace does not delete its tasks** — they fold into the
  default workspace.
- Every query in the app is scoped to the active workspace, so switching swaps
  the entire visible world in one assignment.

### Archive

- A completed **dated** task leaves its list at the **first midnight after
  completion**; a completed **undated** task leaves after **24 hours**. So a
  task you tick at 9am stays visible all day — you can see what you did.
- Grouped by completion day, newest first.
- **Unticking returns it to its bucket** (overdue if the date has passed —
  correct and intended).
- Deleting from the archive is permanent, by design.

### Undo

- Single-level, for **moves and deletes**.
- A status panel reports what happened and retires itself on a timer — it is
  news, not standing chrome.
- The delete snapshot carries the photos, the workspace and the live state, so
  undo restores the task exactly, in the list it came from.

### Photos

- **Several per task**, shown as thumbnails in the row.
- Attached from the library or the camera; downscaled on import.
- The viewer supports **pinch and double-tap zoom**, and **Live Text**
  (VisionKit) — so you can select a phone number or address out of a
  photographed label.
- Swipe down to dismiss the viewer; swipe a photo away to delete it.

### Settings

| Panel | What it offers |
|---|---|
| **Theme** | Four — Slate, Cream, Moss, Rose. Each derived from a single seed colour rather than hand-picked. |
| **Light & dark** | System / Light / Dark |
| **Typeface** | **Retro** (W95FA pixel type on chrome, readable system face for task text) or **Modern** |
| **Tab names** | Rename all three tabs, with a Default reset. Bounded length so the bar cannot break. |
| **Workspaces** | Add, rename, delete |
| **Data** | Archive, How to use, About |
| — | A one-line iCloud status |

### Sync and privacy

- **SwiftData + CloudKit private database.** No account, no login, no email, no
  server belonging to the developer.
- Works fully offline; syncs when it can.
- A remote-change observer means a task added on another device appears
  without a manual refresh.
- **Zero third-party dependencies.** No analytics, no crash reporter, no SDKs
  of any kind.

### Help, instead of onboarding

- **There is no first-run walkthrough** — it was built, then deleted.
- Instead, a **How to use** screen with three blocks: Go live, Swiping,
  Workspaces. Two of the three illustrations are the **real controls, running**
  — the Live switch toggling itself, the workspace pill opening and switching —
  rather than drawings of them. The third animates two task rows being shoved
  off the screen.

### Accessibility

- Dynamic Type through **AX5**; chrome scales at half the rate of text so
  controls do not swallow the screen.
- The tab that stops fitting **abbreviates** ("Tomorrow" → "Tmw") rather than
  shrinking, so all three labels stay the same size.
- **VoiceOver custom actions** for edit, reorder and photos — the row collapses
  to a single element, so without them those three were unreachable.
- **Reduce Motion** stops every looping animation dead rather than slowing it.
- 44pt touch targets throughout.

### Platform and stack

- **iOS 18+**, portrait only.
- SwiftUI, SwiftData, CloudKit, ActivityKit (Live Activities), VisionKit (Live
  Text), WidgetKit.
- `Shove95Kit` — a local Swift package holding the date engine, bucket model
  and placement logic, with **56 unit tests** covering rollover, archive
  visibility, timezone changes and non-Gregorian calendars.
- `SkeuKit` — the in-app design system: tokens, palettes, depth primitives
  (trough, glass, bloom), one press behaviour.

### Debug affordances (not shipped behaviour)

`-seedDemo YES` fills a clean install with presentable content,
`-seedFillers YES` adds 40 rows for scroll testing, `-wipeAll YES` empties
every workspace. Useful for producing screenshots.

---

## 3. Why this project is unusually strong material

Worth knowing before writing, because it changes what to emphasise.

**It shipped.** Most student case studies end at a Figma prototype. This one is
a real native app, on a real Apple Developer account, that went through App
Review. That alone separates it from the pile.

**There is a real pivot with a real reason.** On 2026-08-22 the entire
interface was thrown away — a complete, pixel-faithful Windows 95 build at 2×
scale — and replaced with SkeuKit, a soft-skeuomorphic system. A designer who
can kill their own most distinctive work and say why is exactly what the
research says hiring managers are testing for. **This should be the spine of
the case study, not a footnote.**

**There is a second scoping decision.** Four buckets (Today / Tomorrow / Week /
General) became three (Today / Tomorrow / Soon) on 2026-08-17. Smaller, but
shows the same instinct.

**There is a rejection.** Apple returned the first submission under Guideline
2.1. Handled honestly — what it was, what it wasn't, what changed — this reads
as maturity, not failure. It was a paperwork rejection, not a quality one.

**The accessibility work is genuinely rare** in a junior portfolio and is all
measurable: Dynamic Type verified at AX5, VoiceOver custom actions added after
an audit found three row actions unreachable, Reduce Motion honoured across
every animation, contrast ratios measured (6.4:1 body, 3.4:1 decorative) with a
documented trade-off where a value was knowingly taken below the text floor.

**The honest weaknesses**, to be named rather than hidden:

- User research is n=1 — the designer's own workflow, observed over years. That
  is a legitimate starting point but is not usability testing.
- No usage metrics, no downloads.
- Built with an AI coding agent rather than hand-written Swift. Lucas already
  frames this openly as "vibe coding"; naming it is stronger than letting a
  reader wonder.

---

## 4. The structure

Eight sections. Roughly 900–1100 words of prose total — every section should be
cuttable to two paragraphs.

### 1 — Hero + one-liner

The 30-second version lives here. A single sentence that states the problem and
the answer.

> A to-do app where moving a task to tomorrow takes one swipe instead of six
> taps.

Plus the meta grid, matching Unify's:

| Field | Value |
|---|---|
| **Timeline** | Aug 2026 – ongoing |
| **Role** | Concept, product design, design system, build |
| **Team** | Solo |
| **Platform** | iOS 18+, SwiftUI, SwiftData + CloudKit |
| **Status** | Submitted to the App Store |

### 2 — The problem

The strongest paragraph in the case study and the one that must survive the
30-second scan. It is already written, in `docs/VISION.md`:

> Task apps make *creating* a task cheap and *rescheduling* it expensive.
> Moving an item from today to tomorrow means opening it, finding a date
> picker, choosing a date, and saving — so people stop doing it. Every task
> collapses into one undifferentiated "today" list that is mostly lies by 11am.

Follow with the honest source: observed in his own workflow over years, across
Reminders, Things, Todoist, Notes and paper. **Say that it is n=1** and say why
that was enough to start.

### 3 — The one idea

The insight the whole app follows from: **rescheduling should be the primary
gesture, and everything else should be deliberately ordinary.**

Then the model, in three lines: three buckets, a task is always in exactly one,
swipe right pushes it later and left pulls it back. Include the detail that the
buckets are *filters over a real date* rather than folders — so nothing needs a
rollover job and an unfinished task simply reappears with a day chip. That is a
systems decision a reader can respect.

### 4 — The pivot *(the centrepiece)*

Give this the most room.

- **What v1 was:** a complete Windows 95 interface at 2× pixel scale — taskbar
  navigation, bevelled controls, status bar with persistent undo, W95FA type
  throughout. Genuinely finished, not a mood board.
- **Why it went:** the joke was louder than the app. A pixel-faithful 1995
  interface is a costume; it made a daily tool tiring, fought every iOS
  convention, and the retro-computing audience it flattered was not the
  audience that would use it every morning.
- **What replaced it:** SkeuKit — a soft-skeuomorphic system built from tokens,
  four themes in light and dark, depth from light rather than texture.
- **What survived:** the pixel typeface, kept as an optional "Retro" mode that
  applies to chrome only while task text stays in the system face. The idea
  did not have to die for the interface to.

Show both. A side-by-side of the old Windows 95 build and the current one is
the single most valuable image on the page.

### 5 — Design system

Short, evidenced, no lecture.

- Four themes × light/dark, derived from one seed colour each rather than
  hand-picked.
- Depth comes from light: troughs for recesses, glass for controls, plain text
  on the ground for content.
- One press behaviour for every control in the app.
- Named contrast floors: 6.4:1 body text, 3.4:1 for decorative, with one
  documented exception taken deliberately.

### 6 — Craft details

Two or three, no more. Pick the ones that are hard and invisible:

- **The swipe carries velocity.** Release position alone would make a flick and
  a drag feel identical; the release velocity projects where the row is going.
- **The three-bucket line is one-dimensional on purpose** — right is later,
  left is earlier, no grid to learn.
- **The live task** sits on the Lock Screen via a Live Activity, so the one
  thing you are doing does not need the app open to be seen.

### 7 — Accessibility

A short, factual list. This section will do more for a hiring manager than
another screenshot.

- Verified at the largest Dynamic Type size; the tab that stopped fitting
  abbreviates rather than shrinking, so all three labels stay one size.
- VoiceOver: an audit found edit, reorder and photos unreachable because the
  row collapses to a single element — added as custom actions.
- Reduce Motion stops every looping animation dead rather than slowing it.
- Contrast measured, not eyeballed, and one deliberate trade recorded in
  writing.

### 8 — Shipping it, and what it taught

Where the honesty lands.

- Submitted to the App Store; **rejected under Guideline 2.1 — Information
  Needed.** Say plainly what that is: the App Review Information section was
  left blank, so the reviewer could not complete a review. Not a quality
  finding. Resubmitted with reviewer notes and a demonstration recording.
- **Lessons, three at most.** Candidates:
  - Finishing an interface is not the same as validating it — the Windows 95
    build had to be complete before it was obvious it was wrong.
  - Constraint beat capability: cutting the fourth bucket made the gesture
    explainable in one sentence.
  - Accessibility found real bugs, not just compliance items — three row
    actions were genuinely unreachable and nobody had noticed.

---

## 5. Assets to produce

| Asset | Priority | Note |
|---|---|---|
| Old Win95 build vs current, side by side | **Highest** | The pivot section is worthless without it. Old screenshots are in `shove-95/store/screenshots/` |
| A swipe, mid-gesture | High | Still or short loop. The core gesture cannot be shown by a static list |
| Lock Screen with a live task | High | Nobody expects this from a to-do app |
| The four themes, light and dark | Medium | Proves the system, not just a skin |
| A task with photos attached | Medium | Concrete and visual |
| Dynamic Type at AX5 | Low | Only if the accessibility section needs proof |

Current app screenshots live in `shove-95/store/screenshots-new/`.
`-seedDemo YES` as a launch argument fills a clean install with presentable
content.

---

## 6. What to avoid

- **Do not open with the aesthetic.** The retro look is the hook on a design
  community, not on a hiring manager. Problem first.
- **Do not claim research that did not happen.** No personas, no invented user
  interviews, no fabricated metrics. n=1 stated plainly is stronger than a
  fake study, and reviewers spot the difference instantly.
- **Do not bury the pivot** in a "challenges" section at the bottom. It is the
  best evidence of judgement on the page.
- **Do not explain SwiftUI.** The reader is hiring a designer.
- **Do not pad.** If the page needs a scroll bar longer than Unify's, cut.

---

## 7. Open questions for Lucas

1. **Name.** The profile records an undecided rename to "shovv". The case study
   should use one name throughout — settle it first.
2. **How to frame the AI-assisted build.** Named openly as part of the process,
   or left out? Recommend naming it; he already uses "vibe coding" as a CV
   section, and a reviewer who discovers it later will trust the page less.
3. **Publish before or after approval?** The page can say "submitted" honestly
   today, or wait for "on the App Store". Waiting is stronger but blocks on
   Apple.
