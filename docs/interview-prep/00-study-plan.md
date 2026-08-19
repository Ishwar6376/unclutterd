# 00 — Study Plan (Cram Day)

You have one day. This is the order to read in, and roughly how long to spend.
Do **not** read these files in numerical order top to bottom on the first pass.
Follow the plan.

---

## The single most important thing

In an SDE interview, you will not be asked "what is useState." You will be asked
**"walk me through your project"** and then the interviewer picks a thread and pulls.

So your job today is not to memorize definitions. It is to be able to:

1. Describe the project in 60 seconds without rambling. (File 01)
2. Explain **why** each piece of tech is there, not just that it is there. (Files 02–06)
3. Answer "what's wrong with it / what would you improve" with real, specific
   answers. (File 07) — **this question separates good candidates from average ones,
   and you have unusually good material for it.**

If you run out of time, files **01 and 07** are non-negotiable. Everything else
is depth you can partially fake if you understand the architecture.

---

## Suggested schedule (~7 hours, adjust freely)

| Time | File | Why now |
|---|---|---|
| 45 min | **01 — Project Overview** | Everything else hangs off this. Read first even though you wrote the code. |
| 90 min | **02 — React** | You said you're weak here, and it's the most likely thing to be probed line-by-line. |
| 60 min | **03 — Next.js** | The "React vs Next" question is near-guaranteed. |
| 75 min | **04 — MongoDB** | Second most likely deep-dive after React. Indexes and aggregation are classic. |
| 30 min | **05 — Redis here** | You already know Redis theory. This is only "how it's wired in this repo." |
| 30 min | **06 — Auth flow** | Short, but interviewers love JWT questions and you have a real vulnerability to discuss. |
| 60 min | **07 — Interview Q&A** | Rehearse out loud. Actually out loud. |
| 30 min | **Re-read 01 + 07** | Last thing before you sleep. |

---

## How to read these files

**Read actively, not passively.** After each section, close the file and try to
say the answer out loud. If you can't, reread that section only.

Each file uses these markers:

- **→ If asked:** a likely interview question and the shape of a good answer.
- **⚠ Gotcha:** something that is wrong or fragile in this codebase. These are
  gold — bring them up yourself before the interviewer finds them.
- **📌 Say this:** a phrase worth using close to verbatim, because it signals
  seniority.

---

## The three sentences that matter most

Memorize the *substance* of these. Not the words — you'll sound rehearsed.

1. **What it is:** "Unclutterd is a Reddit-style Q&A app. The interesting part
   isn't the CRUD, it's the nested comment system — I put Redis in front of
   MongoDB because comment threads are read constantly and written rarely."

2. **The hard problem:** "Sorting a comment tree by votes and recency at the same
   time, with pagination, without hitting Mongo on every scroll. I solved it with
   a Redis sorted set using a composite score."

3. **What you'd fix:** "The ownership check on delete and edit compares a field
   that doesn't exist on either object, so it silently passes for everyone. It's
   a real authorization bug and it's the first thing I'd fix."

That third one is the strongest thing you can say. Interviewers remember
candidates who criticize their own code accurately.

---

## What NOT to spend time on today

- The Tailwind/CSS in the components. Nobody will ask.
- `src/app/component/home/sidebar.tsx`, `header.tsx`, the landing page animations.
- The `galaxy` / `text-type` UI components (they're copied from a UI library site).
- Memorizing exact TTL numbers. Know the *pattern*, look up the number if pressed.

---

## Honesty policy for the interview

Some of this project is scaffolding — the answers feature doesn't exist, the
upload route can't work as written, middleware is untouched boilerplate.

**Do not pretend otherwise.** If asked about a part you didn't build out, say
"that's stubbed — I focused my effort on the comment system, which is where the
actual engineering was." That is a completely respectable answer. Getting caught
overclaiming is fatal; admitting scope is not.

File 07 has a full list of what's real vs. stubbed so you don't get ambushed.
