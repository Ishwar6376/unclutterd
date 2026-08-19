# 07 — Interview Q&A (rehearse this out loud)

The highest-value file. Read the others for understanding; read this one for
**delivery**. Say the answers aloud — the gap between knowing something and
explaining it under pressure is larger than you expect.

---

## Part A — The opener

### "Tell me about a project you've worked on."

Structure: **what it is → the hard part → what you'd change.** Sixty to ninety
seconds. Then stop.

> Unclutterd is a Q&A platform, similar in shape to Reddit — users post questions
> with images and discuss them in nested comment threads with voting and bookmarks.
> It's Next.js 15 with the App Router, React 19, MongoDB, and Auth0.
>
> The interesting engineering wasn't the CRUD, it was the comment system. Threads
> are read far more than they're written, and each comment also needs per-user state
> — did *you* vote on it, did *you* bookmark it. Doing that naively is several
> MongoDB queries per page of comments. So I put Redis in front as a cache-aside
> layer: comment IDs live in sorted sets ranked by a composite score that encodes
> votes and recency together, the comment bodies live in hashes, and a cron worker
> pre-warms it every five minutes so the first reader of a thread isn't punished.
>
> If I picked it up again, the first thing I'd fix is an authorization bug I found
> reviewing it — the ownership check on delete compares a field that doesn't exist
> on either object, so it silently passes for every user.

That ending is deliberate. It hands them an interesting thread to pull *and* frames
you as someone who audits their own work.

### "What was your specific contribution?"

Two-person project with Ishwar. **Be accurate.** Say which parts you owned, which
were collaborative, and which you didn't touch. Interviewers can and do check
commit history, and getting caught is unrecoverable in a way that saying "we split
it" never is.

---

## Part B — Questions you should expect

### Architecture

**"Why did you add Redis? Wasn't MongoDB enough?"**
See file 05 §1. The core of it: read-heavy access pattern, plus per-user
personalization that would otherwise be extra queries per page. And be ready for
the pushback "why not just index Mongo better" — the answer is that the Mongo query
*is* indexed; the win is fewer round trips and no per-user join.

**"How does a comment get from the database to the screen?"**
Trace it: JWT verify → resolve user (Redis, fallback Mongo) → `ZCARD`/`ZREVRANGE`
for ranked IDs, fallback to Mongo and repopulate → pipelined `HGETALL` per ID →
batch-read vote/saved keys, backfill misses from Mongo → return with `nextCursor`.
File 01 §5 has the full version. **Practice this one; it's the most likely
"walk me through" prompt.**

**"What happens if Redis goes down?"**
Reads fall back to MongoDB — degraded but correct, which is the main reason
cache-aside was right. Then the honest caveat: most routes don't wrap Redis calls in
try/catch, so in practice several would 500 rather than degrading gracefully. Only
`postComment` handles it. That's a gap.

**"How would you scale this to a million users?"**
Layered answer, from cheapest to most involved:
1. Fix the in-memory pagination — use `ZRANGEBYSCORE` with limits instead of pulling
   the whole sorted set.
2. Cap the worker to recently-active threads and batch its queries; right now it's
   an N+1 over every question.
3. Add a stampede lock so a popular expired key doesn't trigger a thundering herd.
4. Redis Cluster for horizontal capacity; MongoDB read replicas or sharding on
   `questionId`, which is the natural shard key since it's in every hot query.
5. Move to a CDN + ISR for the public feed, which is identical for everyone.
6. Add rate limiting, and move the dual-write to an outbox/queue so cache updates
   are retryable rather than fire-and-forget.

### React

**"React vs Next.js?"** — File 03 §1. Library vs framework; routing, rendering,
API layer, bundling.

**"What is `useEffect` and when does the cleanup run?"** — File 02 §4. After render;
cleanup runs before the next effect and on unmount.

**"Why does your fetch effect have a `hasFetched` ref?"** — StrictMode's
deliberate double-mount in development. Then the better answer: an AbortController
in the cleanup is the real fix. File 02 §4.

**"Why keys in lists?"** — Reconciliation identity; without them React matches by
position and destroys DOM state on insertion. Critical here because new comments
prepend. File 02 §6.

**"What's optimistic UI and when is it inappropriate?"** — File 02 §10. Inappropriate
when failure is common or the rollback is destructive or confusing — payments,
irreversible actions.

**"How do you render an arbitrarily deep comment tree?"** — Recursive component,
lazy-loading each level. Then the follow-up about depth limits. File 02 §9.

**"useState vs useRef?"** — Both persist; only state triggers re-renders. File 02 §5.

**"Why Zustand and not Redux or Context?"** — File 02 §12. And admit the
`useUserStore()` no-selector mistake if it comes up.

### MongoDB

**"Why MongoDB and not SQL?"** — File 04 §1. **Include the counter-argument** —
a recursive CTE in Postgres handles trees well. Showing you know the trade-off cuts
both ways is stronger than defending the choice absolutely.

**"Walk me through your indexes."** — File 04 §5. The compound
`{questionId: 1, parentId: 1, _id: -1}` and the ESR rule. This is the one to know
best.

**"How do you prevent double voting?"** — Unique compound index on
`(userId, commentId)`. Enforce at the storage layer, because an application-level
check is a race. File 04 §5.

**"Embed or reference for comments?"** — Reference/adjacency list. 16 MB cap,
independent pagination, small writes. File 04 §4.

**"What does `.lean()` do?"** — Plain objects instead of hydrated documents; faster,
but no `.save()`. File 04 §6.

**"Why cursor pagination instead of skip/limit?"** — Skip degrades linearly and is
unstable under insertion. File 04 §6. **Strong topic — know it.**

**"Explain that connection caching in dbConfig."** — Hot reload in dev, warm
containers in serverless, and the promise-caching detail that stops ten concurrent
requests opening ten connections. File 04 §8.

### Redis

**"Why a sorted set?"** — Ordering maintained on write, so reads don't sort.

**"How do you sort by votes and recency with one score?"** — The `votes * 1e13 +
timestamp` packing, and the 53-bit double precision ceiling that limits it. File 05 §4.
**This is your best "I thought about this carefully" moment.**

**"Pipeline vs MULTI?"** — Network batching vs transaction. And that Redis
transactions don't roll back. File 05 §5.

**"How do you handle cache invalidation?"** — Dual-write plus TTL as a backstop.
Then volunteer that invalidate-and-repopulate is safer than update-in-place, and
that the dual write isn't atomic. File 05 §3.

### Auth

**"How does JWT verification work?"** — Signature check against the JWKS public key
selected by `kid`, plus issuer, expiry, and (should be) audience. File 06 §3.

**"HS256 vs RS256, and why does it matter here?"** — Symmetric vs asymmetric; with a
third-party issuer you need to verify without being able to forge. File 06 §3.

**"Is a JWT encrypted?"** — No. Signed. Anyone can read the payload.

---

## Part C — "What would you improve?"

**Prepare three, ranked. This is where interviews are won.**

**1. The authorization bug** (file 06 §6). Lead with this. It's specific, it's real,
it's serious, and the lesson — that you need a negative test asserting another user
gets a 403 — is generalizable.

**2. The score-scale mismatch** (file 05 §6). The worker and `postComment` write
bare timestamps into a sorted set that the read path scores with
`votes * 1e13 + timestamp`. Two incompatible scales in one structure means the
ranking is silently wrong. The fix is one shared scoring helper both sides import,
so the formula physically cannot drift.

**3. In-memory pagination** (file 05 §7). Pulling the entire sorted set with
`ZREVRANGE key 0 -1` and slicing in JavaScript defeats the point of using a sorted
set. Fine at 200 members, badly wrong at 50,000.

**Held in reserve, if they want more:**
- Everything is a Client Component, so the App Router's main benefit is unused.
- Duplicated auth logic across seven routes — and note that the duplication is
  *why* the security bug survived.
- No tests at all. If asked what you'd test first: the authorization paths.
- No error UI — every failure is a `console.error` and a silent vanish.
- `next/image` instead of raw `<img>`.
- The 835-line component should be split into custom hooks.

---

## Part D — Ambush questions, and how not to panic

**"Where are the tests?"**
> There aren't any, and that's the biggest gap. If I were adding them I'd start with
> the authorization paths — a test asserting that user B gets a 403 deleting user A's
> comment would have caught the bug I mentioned. Then the vote arithmetic, which is
> pure logic and trivial to test. I'd use Vitest with an in-memory MongoDB.

Confident ownership beats an excuse.

**"This route can't work — multer doesn't get a Node request in the App Router."**
> You're right, that route is broken. It was written against the Pages Router's API
> shape and never updated. The working path is `next-cloudinary` on the client.
> The fix is `await req.formData()` and streaming the buffer to Cloudinary directly —
> multer isn't needed at all in the App Router.

**"Why is `middleware.ts` redirecting `/about`?"**
> It's leftover template code, it's dead. Where middleware would actually help is
> gating unauthenticated page requests centrally instead of re-verifying in seven
> routes — with the caveat that it runs on the Edge runtime, so it can verify a JWT
> but can't touch Mongoose.

**"What's this second Answer model?"**
> Dead code. There are two files that both register a model called `Answer` and one
> of them doesn't even import mongoose, so it would throw if anything imported it.
> Nothing does. Answers were scoped and never built — the app only has questions and
> comments. I should have deleted them rather than leaving them in the tree.

**"Your git history is a lot of merge commits."**
> It's a two-person project and we both worked on `main` rather than branching, so
> the history has more merge commits than it should. With hindsight I'd use feature
> branches and pull requests — partly for a cleaner history, but mainly because code
> review is the thing that would most likely have caught the authorization bug.

**A question you genuinely don't know.**
> I don't know that offhand. My instinct would be [X] because [reasoning], but I'd
> want to verify it before relying on it.

**Never bluff.** Interviewers probe further precisely when an answer sounds
confident but thin, and the follow-up is where bluffing collapses. "I don't know,
here's how I'd find out" costs you almost nothing.

---

## Part E — Behavioural, tied to this project

**"Tell me about a bug you found."** — The authorization check. Structure it:
what it was, why it was invisible (the comparison *looks* right, and manual testing
uses your own comments), how you'd prevent the class of bug (negative tests, and
typing lean results properly instead of `any`).

**"A technical decision you made and its trade-off."** — Denormalizing `authorName`
onto comments. Faster reads, no joins, cacheable as a flat hash; the cost is stale
names after a rename. Name both sides.

**"Something you'd do differently with hindsight."** — Extracting the auth logic
into one helper before writing the seventh route. The duplication is the reason a
bug fixed in one place wasn't fixed in the other.

**"How did you work with your collaborator?"** — Be straightforward about the split.
Mentioning that the repo shows real merge history is fine; that's what collaboration
looks like.

---

## Part F — Final checklist

**Before you walk in:**

- [ ] Be able to run it — `npm run dev:all`, not just `npm run dev`, or the cache
      stays cold and you can't demo the path you're describing.
- [ ] Skim the repo for anything half-finished you'd be embarrassed to screen-share.
- [ ] Reread file 01 §5 (the request trace) and Part C above.
- [ ] Have the repo open at `src/components/comment/page.tsx` and one API route.

**Three things to make sure you say at some point:**

1. A trade-off with **both** sides named — denormalization, or Mongo vs Postgres.
2. The authorization bug, volunteered rather than extracted.
3. One thing you'd do differently, with the *reason*, not just the change.

**Three things not to do:**

1. Don't claim the answers feature, the upload route, or middleware work.
2. Don't monologue. Answer, then stop and let them steer.
3. Don't bluff a term you half-remember. Say you're unsure and reason out loud —
   reasoning visibly is often what they're actually measuring.

---

Good luck. The material is genuinely there — the caching layer is more interesting
than most portfolio projects, and being able to critique it accurately will land
better than a flawless project you can't discuss.
