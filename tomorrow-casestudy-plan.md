# to.morrow — case study upgrade plan

Plan for turning `public/to-shove2d.html` into a full case study, in the structural style of
Jason Yuan's write-ups (a spine, a map of the page, research condensed into models, every
decision sourced, captions that carry findings) at portfolio length and in a **neutral,
professional voice**. Written 2026-09-18 from an interview with Lucas. Companion to
`unify-casestudy-plan.md`; general guidance lives in the vault at
`04 Ressourcen/Design & Craft/Case Study Aufbau.md`.

This file replaces the older content plan (`shove95casestudyplan.md`, 2026-09-03, now deleted —
in git history) that the current page was built from. That plan's description of how the app
works, the research it was based on, the page structure it set and its list of things to avoid are kept as
**Appendices A–D** at the end of this file.

> **All numbers in this file are example values** showing the *shape* of a finding and
> where it would go on the page. Replace every one with the real result before it ships.

---

## 0. What the interview established

| Topic | Answer |
|---|---|
| Status | **Live on the App Store** |
| Spine | **Moving costs nothing.** Rescheduling as the primary gesture (recommended by me, see §1) |
| User | **People who over-plan.** Their Today list is always too full, and nothing gets moved |
| Pivot signal | TestFlight users found the Windows 95 build **hard to read**, and **stopped using it** |
| Include | An **accessibility section** (currently zero mentions on the page) |
| Not included | The App Store rejection story, naming the AI-assisted build. Settings and Workspaces stay |
| Craft focus | **The design system's rules** — three shapes, one meaning each. Already on the page, to be strengthened with evidence |
| Voice | Neutral professional |
| Assets | Windows 95 build screens (on the page as `windows1–9.webp`), early sketches, the four existing screen recordings |

## 1. The spine, in one line

**Why "moving costs nothing" and not the pivot.** The pivot is the strongest *story*, but it is
about the designer. The swipe is the *product insight*: the thing a reviewer should remember
the app by. Yuan does the same in Mercury: the breakthrough ("I was asking the wrong questions")
is a turning point inside a larger argument, not the argument itself. So the swipe is the
spine and the pivot is the centrepiece section.

Proposed hero line:

> **to.morrow makes moving a task to tomorrow a single swipe — so the Today list stays
> true, instead of being wrong by mid-morning.**

---

## 2. Target page structure

```mermaid
flowchart TD
    A["1 · Hero + one-liner<br/>App Store badge · fact bar"] --> B["2 · The problem<br/>over-planners · moving costs 4+ steps"]
    B --> C["3 · The idea: moving costs nothing<br/>three lists · one swipe"]
    C --> D["4 · One thing in view<br/>the Live task"]
    D --> E["5 · The pivot<br/>Windows 95 → SkeuKit · with evidence"]
    E --> F["6 · Rules, not taste<br/>three shapes · one meaning each"]
    F --> G["7 · Accessibility<br/>measured, not assumed"]
    G --> H["8 · The rest, briefly<br/>workspaces · themes · settings"]
    H --> I["9 · Result, learnings, next<br/>store data · widgets · desktop"]
```

What happens to the current sections:

| Current section | Fate |
|---|---|
| At a Glance lead | Becomes the hero one-liner + fact bar |
| Problem (problem-1…4) | Keep the content; open with the over-planner as the named user; add the step-count benchmark (Study 2) |
| Live notifications (f1, f1b) | Moves **after** the swipe: the swipe is the spine, Live is the second feature |
| Order that costs nothing (f2, f2b) | Becomes section 3, the core. Gets the bucket-over-dates diagram |
| Workspaces, Settings (f3, f4) | Stay, as one compact section, ordered by measured use (Study 6) |
| Pivot (pivot-1…3) | Keep the honest wording ("there was no reason for it"). Replace "the longer I watched" with the evidence from Studies 4 and 5 |
| Type and icons | Becomes the last beat of the pivot: *what survived* (retro mode, chrome only) |
| Drei Formen (dna) | Section 6, the craft section, with Study 7 as proof |
| Colour ("Not just grey") | Folds into section 8, one paragraph plus the colour fan |
| Conclusion 1–4 | Keep 1, 2 and 4. **Rewrite 3**, which says nothing concrete. Add the store result |

---

## 3. Research programme

Nine studies. Each entry: **why**, **how**, **what to measure**, **what to show**, an
**example result**, and **what it changes on the page**.

### Study 1 — The over-planner, quantified

- **Why:** give the named user a number. "Nobody moves anything" is a claim until it's measured.
- **How:** survey, ~150 people who use a to-do app daily. Questions: How many tasks on your Today list this morning? How many will you finish? What happens to the rest (move / leave / delete)? How do you move a task to another day?
- **Show:** one sentence stat plus a **stacked bar** "What happens to unfinished tasks".
- **Example result:** median 9 tasks planned, 5 done; 62 % of the unfinished are left in place rather than moved.
- **Page change:** opens the problem section and defines the user: "over-planners — median 9 tasks planned, 5 done, the rest left where they are."

### Study 2 — What moving a task costs, app by app

- **Why:** the strongest visual argument available, and cheap to produce. "Four steps" becomes a comparison a reviewer grasps in two seconds.
- **How:** benchmark, 10 participants, each moves the same task to tomorrow in Reminders, Things, Todoist and to.morrow. Count taps and time.
- **Show:** a **horizontal bar chart: taps to move one task to tomorrow**, with to.morrow's single bar in the accent colour. Direct labels, no legend.
- **Example result:** Reminders 5 taps / 6.8 s · Things 4 / 5.1 s · Todoist 3 / 3.9 s · to.morrow 1 / 0.9 s.
- **Page change:** sits between the problem and the idea. **Caption:** "Moving one task to tomorrow. Everything else here is built around the bottom bar."

### Study 3 — Does the Today list stay true?

- **Why:** the claim "the Today list is wrong by mid-morning" is the product's promise. Test it.
- **How:** diary over 2 weeks, 15 over-planners. Week 1 with their usual app, week 2 with to.morrow. At 11:00 and 17:00, log how many Today tasks are still realistic for today.
- **Show:** a **two-line chart across the day**: share of Today tasks that are still realistic, usual app vs to.morrow.
- **Example result:** at 17:00, 41 % realistic with the usual app, 83 % with to.morrow.
- **Page change:** the evidence under the idea section. It turns "stays true" from a slogan into a measured claim.

### Study 4 — The pivot: Windows 95 vs SkeuKit (retention)

- **Why:** you said testers stopped using the Windows 95 build. That's a retention signal; show it.
- **How:** TestFlight data from both builds: the share of testers still opening the app after 1, 3, 7 and 14 days. Plus 3–5 short tester quotes about the old build.
- **Show:** the **side-by-side Windows 95 vs SkeuKit, same screen** (the page's most important image), and next to it a **retention curve with two lines**.
- **Example result:** day-7 retention 24 % on the Windows 95 build, 61 % on SkeuKit.
- **Page change:** replaces "the longer I watched, the clearer it got" (pivot-2) with the curve and one quote. **Caption example:** "Same features, same testers. Only the interface changed."

### Study 5 — The pivot: legibility

- **Why:** the second signal testers gave, "hard to read". It also justifies why retro mode survives on chrome only.
- **How:** reading test, 20 participants. The same task list in W95FA at the build's 2× pixel scale vs the system font. Measure reading time and errors reading back quantities and dates.
- **Show:** a **pair of numbers** (reading time, errors) next to a crop of each typeface.
- **Example result:** 38 % slower and 3× the errors in W95FA.
- **Page change:** closes the pivot. It explains the rule that survived: pixel type on chrome only, task text always in the system face.

### Study 6 — App Store usage data (live)

- **Why:** the app is live. Real usage is the result section, and it tests the spine.
- **How:** App Store Connect plus an anonymous event count in the app: share of task actions by type, median session length, Live task adoption, retention.
- **Show:**
  - **the fact bar** in the hero: three numbers
  - a **sorted bar chart: share of all task actions** (swipe, add, complete, edit, reorder, photo)
  - **median session length** as one big number
- **Example result:** swipes 58 % of all task actions · median session 14 s · 46 % of active users use the Live task · day-30 retention 31 %.
- **Page changes:**
  - "58 % of actions are swipes" is the proof that the spine is what people actually use.
  - "Median session 14 s" proves the problem-1 principle, an app you want to spend the least time in, with a number.
  - Workspaces and settings get their share from this chart. If workspaces sit at 3 %, they get one sentence.

### Study 7 — Rules, not taste: can people read the three shapes?

- **Why:** the design system's claim is that you learn the three shapes once, and every view explains itself. That's testable, and it makes the craft section evidence instead of description.
- **How:** first-use test, 20 participants who have never seen the app. Show 6 unlabelled screens and ask for each element: "Can you tap this, type in it, or choose with it?"
- **Show:** the **three-shapes diagram** (bubble / trough / toggle) with the correct-answer rate printed under each shape.
- **Example result:** bubble 94 %, trough 89 %, toggle 91 % correct, on screens they had never seen.
- **Page change:** section 6 becomes "Three shapes, three jobs — and 9 in 10 first-time users read them correctly." **Caption example:** "No labels. The shape says what it does."

### Study 8 — Accessibility audit

- **Why:** you chose to include it, and it's rare in portfolios. Make it measured.
- **How:**
  - Dynamic Type checked at every size up to AX5.
  - A VoiceOver pass over every row action.
  - Reduce Motion checked on every animation.
  - Contrast measured for every text/background pair in all four themes, light and dark.
  - Ideally, 2–3 VoiceOver users complete five core tasks.
- **Show:**
  - **the same screen at default and AX5 size**, side by side
  - a **small contrast table**: text role, measured ratio, the WCAG target
  - one line on what the audit found and fixed
- **Example result:** 3 row actions unreachable by VoiceOver, fixed as custom actions. Body text 6.4:1 in every theme. VoiceOver users 5/5 tasks completed after the fix.
- **Page change:** section 7. Short and factual: a list, one comparison image, one table.

### Study 9 — App Store reviews

- **Why:** real words from strangers who paid attention to the app, not testers you recruited. The strongest proof on the page that the app works for someone other than you, and the only study here that needs no setup: the reviews already exist in App Store Connect.
- **How:**
  1. Export every review and rating from App Store Connect (*Ratings and Reviews*).
  2. Tag each review with the themes it mentions: swipe / speed, Live task, design / look, simplicity, a missing feature, a bug.
  3. Count the themes, then pick quotes.
- **Show:**
  - **the average rating and the number of ratings** in the fact bar
  - **2–3 review cards** in the page's own style: stars, the review text unedited, reviewer name as shown in the store, country, month
  - optionally, a **sorted bar chart of review themes**, if there are enough reviews (about 20+) for the shares to mean something
- **Example result:** 4.8 average from 63 ratings. 41 % of written reviews mention the swipe or speed, 27 % the Live task, 12 % ask for widgets.
- **Page changes:**
  - **Result section:** the rating in the fact bar, one card that names the swipe (proof of the spine).
  - **Live section:** one card that names the Live task.
  - **Next steps:** if reviews ask for widgets, conclusion-4's "widgets first" stops being your plan and becomes a response to users. Quote the request.

Rules for using them:
- **Unedited.** Quote exactly, including the reviewer's wording. Shorten only with a visible `…`.
- **Pick for content, not just for stars.** A 4-star review that names the swipe beats a 5-star "great app". If a review criticises something you then fixed, it can be the best card on the page: problem → fix → proof.
- **State the total.** Always print the rating count next to the average; a 5.0 from 4 ratings reads differently from 4.8 from 63.
- **Translate, don't paraphrase.** A German review on the English page gets a translation with the original available, not a rewrite.

---

## 4. From studies to page

```mermaid
flowchart LR
    S1["Survey n≈150"] --> P["Problem<br/>the over-planner"]
    S2["Taps benchmark n=10"] --> P2["Problem → idea<br/>bar chart"]
    S3["Diary n=15"] --> I["The idea<br/>list stays true"]
    S4["TestFlight retention"] --> PV["Pivot<br/>side-by-side + curve"]
    S5["Legibility n=20"] --> PV
    S6["App Store data"] --> F["Fact bar · feature order · result"]
    S7["Shape test n=20"] --> DS["Rules, not taste"]
    S8["A11y audit"] --> A["Accessibility"]
    S9["App Store reviews"] --> F
    S9 --> L["Live section<br/>review card"]
    S9 --> N["Next steps<br/>widgets requested"]
```

---

## 5. Text changes

- **Voice:** neutral and professional, in both German and English. Replace the personal asides with statements of decision and evidence. Keep the honest core of the pivot ("There was no reason for it"). That sentence is the page's best, and it's neutral already.
- **Remove the "not X but Y" construction.** It appears repeatedly: "not polish, but the product itself", "not a draw, it was an obstacle", "not out of nostalgia, but because". State the positive claim directly.
- **Rewrite conclusion-3.** "The most interesting part was rethinking something everyday" makes no claim. Replace it with a learning tied to evidence, e.g. from Study 6: speed was measurable, and the median session length became the design target.
- **Name the user** once, early: over-planners.
- **Every decision gets a source.** Pattern: *finding → decision*. "Testers stopped opening the Windows 95 build after the first week; day-7 retention was 24 %. The interface went; the pixel type stayed on chrome only."
- **Page map.** Under the hero, one line announcing the structure: *Problem → Idea → Live → Pivot → System → Accessibility → Result.*
- **Length:** the page is ~1,030 words now. Adding evidence must not grow it past ~1,100: most studies get one sentence and one visual, and sections 4 and 8 shrink.
- **Both languages:** every changed key in both `TRANSLATIONS` blocks, and the `@m` mobile twins updated where they exist (`glance-lead`, `problem-2`, `f1-text`, `f2b-text`, `f3-text`, `pivot-1`, `dna-forms`, `conclusion-4`).
- **Out, per the interview:** the App Store rejection story and the AI-assisted build.

---

## 6. Visual inventory

| # | Visual | Type | Section | Source |
|---|---|---|---|---|
| 1 | Hero icon + App Store badge | Existing | Hero | On the page |
| 2 | Fact bar: store data | Big numbers | Hero | Study 6 |
| 3 | Unfinished-task fate | Stacked bar | Problem | Study 1 |
| 4 | **Taps to move one task** | Horizontal bar chart | Problem → idea | Study 2 |
| 5 | The swipe | Video (exists: `swipe.mp4`) | Idea | Existing |
| 6 | Lists as filters over real dates | Step diagram: one task, its date, which list shows it on which day | Idea | Draw |
| 7 | Today list realistic across the day | Two-line chart | Idea | Study 3 |
| 8 | The Live task | Video (exists: `live-pair.mp4`) | Live | Existing |
| 9 | Early sketches | Photo collage | Pivot, opening | Existing |
| 10 | **Windows 95 vs SkeuKit, same screen** | Side-by-side (slider if easy) | Pivot | `windows1–9.webp` + a matching current screen |
| 11 | Retention, two builds | Two-line curve | Pivot | Study 4 |
| 12 | W95FA vs system type | Crop pair + two numbers | Pivot | Study 5 |
| 13 | Three shapes, correct-read rate | Annotated diagram (the live SkeuKit components already on the page) | System | Study 7 |
| 14 | Default vs AX5 | Side-by-side | Accessibility | Screenshot |
| 15 | Contrast table | Table | Accessibility | Study 8 |
| 16 | Share of task actions | Sorted bar chart | The rest / result | Study 6 |
| 17 | Colour fan | Existing | The rest | On the page |
| 18 | Average rating + rating count | Big number in the fact bar | Hero / result | Study 9 |
| 19 | Review cards (2–3) | Quote cards in SkeuKit style | Result, Live | Study 9 |
| 20 | Review themes | Sorted bar chart (only with ~20+ reviews) | Result | Study 9 |

Rules, from the vault guide:
- Motion only where the thing moves. The swipe, the Live task and the pivot's interaction differences are video; charts, diagrams and the side-by-side are stills.
- One message per chart, stated in its caption. Direct labels. to.morrow's bar or line in the accent colour, everything else grey.
- Draw charts in the page's own style (SkeuKit troughs as chart backgrounds would tie them to the system), not pasted from a spreadsheet.
- 30-second test: headings, captions and visuals alone must tell the story.

---

## 7. Work order

- [ ] **Study 6 and Study 9 first.** The app is live and both datasets already exist in App Store Connect; together they decide the fact bar, the feature order and the result section
- [ ] Study 2 (taps benchmark). A single afternoon, and it produces the page's clearest chart
- [ ] Pick the Windows 95 screen whose SkeuKit twin shows the change best; export both at the same crop
- [ ] Study 4 (retention of both builds) → pivot evidence
- [ ] Studies 1, 3, 5, 7, 8
- [ ] Draw: the dates diagram, the three-shapes diagram with rates, all charts in the page's style
- [ ] Reorder the page: swipe before Live, then pivot, system, accessibility
- [ ] Rewrite in neutral voice, DE + EN + `@m` twins; remove every "not X but Y"; rewrite conclusion-3
- [ ] Check: every example number above replaced with a real one

## 8. Open questions

1. How many TestFlight testers used each build? The retention curve needs a stated n.
2. Do tester messages about the Windows 95 build still exist? One real quote is worth more than the curve.
3. Is in-app event counting in place, or does Study 6 have to rely on App Store Connect alone?

---

## Appendix A. The app, in full

*Moved here from the retired `shove95casestudyplan.md` (written 2026-09-03, when the app was still called shove.95 and ran the Windows 95 look). Check details against the app source before quoting them.*

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

---

## Appendix B. Research on case-study length and scanning

*From the retired shove.95 plan, 2026-09-03.*

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

---

## Appendix C. The page structure the current page was built from

*From the retired shove.95 plan, 2026-09-03. This is how `to-shove2d.html` is laid out today; §4 of this file is the planned replacement.*

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

---

## Appendix D. What to avoid

*From the retired shove.95 plan, 2026-09-03.*

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
