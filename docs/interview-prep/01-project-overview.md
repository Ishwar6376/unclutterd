# 01 — Project Overview & Architecture

Read this first. Everything else is a zoom-in on one box in this diagram.

---

## 1. The 60-second pitch

> Unclutterd is a Q&A platform — think Reddit or Stack Overflow. Users log in with
> Auth0, post questions with images, and discuss them in **infinitely nested comment
> threads** with voting and bookmarks.
>
> The engineering focus is the comment system. Comment threads are read far more
> often than they're written, and rendering one naively means a database query per
> thread per scroll. So I put **Redis in front of MongoDB** as a cache-aside layer:
> comment IDs live in Redis sorted sets ranked by a composite vote-and-recency
> score, comment bodies live in Redis hashes, and MongoDB is the source of truth
> that we fall back to on a cache miss. A cron worker pre-warms the cache every
> five minutes.
>
> It's Next.js 15 with the App Router, React 19 on the front end, Mongoose for
> MongoDB, and Auth0 for auth with per-route JWT verification.

**Stop there.** Let them ask the next question. Candidates who monologue for four
minutes lose the room.

---

## 2. The stack, and *why* each piece

Never list a technology without a reason. "We used X" is a weak answer; "we used X
because Y" is a strong one.

| Layer | Tech | Why it's there |
|---|---|---|
| Framework | Next.js 15 (App Router) | One codebase for UI *and* API. No separate Express server to deploy. |
| UI | React 19 | Component model; the comment tree is naturally recursive. |
| Styling | Tailwind v4 | Utility CSS, no separate stylesheet to maintain. |
| Client state | Zustand | Needed the logged-in user in many components; Redux was overkill for one store. |
| Database | MongoDB + Mongoose | Comments are variable-shape, deeply nested documents — a document store fits better than rigid SQL tables. |
| Cache | Redis (ioredis) | Read-heavy comment threads; sorted sets give ranked pagination for free. |
| Auth | Auth0 | Didn't want to own password storage, hashing, reset flows, or OAuth providers. |
| Images | Cloudinary | Offloads image storage/CDN/transforms. |
| Background job | node-cron worker | Pre-warms the Redis cache so the first reader of a thread isn't punished. |

**📌 Say this:** "I picked MongoDB over Postgres because the comment model is a
tree with variable depth and I wasn't doing multi-table joins or transactions. If
the app grew to need real relational integrity — say, financial data or strict
foreign keys — that trade-off would flip."

That sentence shows you made a *decision* rather than defaulting.

---

## 3. Architecture diagram (in words)

```
   Browser (React 19, all "use client")
        │
        │  1. Auth0 SPA SDK gets a JWT
        │  2. axios calls with `Authorization: Bearer <token>`
        ▼
   Next.js App Router  ──  src/app/api/*/route.ts   (the "backend")
        │
        ├──► verify JWT signature against Auth0 JWKS  (jwks-rsa)
        │
        ├──► Redis  ◄── read path FIRST (cache-aside)
        │      • topComments:<qid>   ZSET of comment IDs, ranked
        │      • replies:<parentId>  ZSET of reply IDs, ranked
        │      • comment:<id>        HASH of the comment body/meta
        │      • vote:<uid>:<cid>    STRING, this user's vote
        │      • saved:<uid>:<cid>   STRING, bookmark flag
        │      • user:<auth0Id>      STRING (JSON), cached user record
        │
        └──► MongoDB (Mongoose)  ◄── source of truth, fallback on cache miss
               • User, Question, Comment, Vote, Saved

   Separately:
   node-cron worker (every 5 min) ──► reads Mongo, warms the Redis keys above
```

---

## 4. The data model

Five collections that matter. (There are two dead `Answer` models — see §7.)

**User** — `auth0Id` (unique, sparse), `username`, `email`, `avatar`, timestamps.
Created/updated by upsert when someone logs in.

**Question** — `author` (ref User), `title`, `description`, `image` (array of
Cloudinary URLs), `tags`, `votes`, `isAnswered`.

**Comment** — the important one:
```js
{
  questionId,   // ref Question   — which thread it belongs to
  parentId,     // ref Comment, default null — null means top-level
  author,       // ref User
  authorName,   // denormalized copy
  authorEmail,  // denormalized copy
  body,
  votes,        // running total
  replyCount,   // running total of direct children
  timestamps
}
```

**Vote** — `userId`, `commentId`, `value` (−1 or 1), with a **unique compound
index on (userId, commentId)** so one user can't double-vote at the DB level.

**Saved** — `userId`, `commentId`, same unique-pair index. Bookmarks.

### Two design decisions worth defending

**(a) The comment tree is an adjacency list, not nested documents.**
Each comment stores a `parentId` pointing at its parent, rather than embedding
children inside the parent document.

**→ If asked "why not embed replies inside the parent comment?"**
> Three reasons. MongoDB documents cap at 16 MB, and a viral thread would blow
> that. Embedding means rewriting the whole parent document to add one reply,
> which is a big write for a small change. And I need to paginate replies
> independently — with embedding I'd have to load the entire subtree to show the
> first five replies. The adjacency list lets me query one level at a time.

**(b) `authorName` and `authorEmail` are denormalized onto every comment.**
They're duplicated from the User document.

**→ If asked "isn't that data duplication?"**
> Yes, deliberately. It means rendering a comment list requires zero joins and
> zero populate calls — everything the UI needs is on the comment itself, which
> matters because I'm caching whole comments as flat Redis hashes and a hash
> can't hold a nested join result. The cost is that if a user changes their
> username, old comments show the stale name until they're rewritten. For a
> display name that's an acceptable trade; for something like permissions it
> wouldn't be.

That answer — naming the cost, not just the benefit — is what a senior answer
sounds like.

`replyCount` and `votes` on the comment are the same idea: **denormalized
counters**, so the UI can render "show 12 replies" without a `COUNT` query.

---

## 5. The request lifecycle — trace one read end to end

Know this cold. It's the most likely "walk me through what happens when..." question.

**Scenario: user opens a question and the comment list loads.**

1. `CommentComponent` mounts. A `useEffect` fires once and calls `fetchComments()`.
2. The client asks Auth0's SDK for a token (`getAccessTokenSilently`) and sends
   `GET /api/getComments?questionId=…&after=…&limit=10` with a Bearer header.
3. **Route handler** ([getComments/route.ts](../../src/app/api/getComments/route.ts)):
   - `await connectDB()` — reuses a cached Mongoose connection (see file 04).
   - Verifies the JWT. Fetches Auth0's public signing key via JWKS, caches it in
     a module-level object so we don't re-fetch per request.
   - Resolves the user: try `user:<auth0Id>` in Redis; on miss, query Mongo and
     write it back with a 1-hour TTL. **This is the cache-aside pattern, and it
     appears again and again in this codebase.**
4. **Get the ranked comment IDs:**
   - `ZCARD topComments:<questionId>` — is the sorted set populated?
   - **Hit:** `ZREVRANGE` pulls the IDs, highest score first.
   - **Miss:** fall back to Mongo — `Comment.find({questionId, parentId: null})`
     sorted by `votes` then `createdAt`, limit 200 — then write the whole result
     back into Redis in a pipeline (ZSET + one hash per comment) so the next
     reader hits cache.
5. **Paginate:** find the cursor ID in the array, slice forward, take `limit`.
6. **Hydrate:** one pipelined `HGETALL comment:<id>` per ID, parsed back into objects.
7. **Personalize:** for the logged-in user, batch-read `vote:<uid>:<cid>` and
   `saved:<uid>:<cid>`. Anything missing from Redis is backfilled from Mongo and
   re-cached. This is why each comment comes back with `userVote` and `saved`
   already resolved — the client never computes it.
8. Respond with `{ comments, nextCursor, hasMore }`.
9. React merges the batch into state, dedupes by `_id`, and the IntersectionObserver
   arms itself for the next page.

**Now trace a write — posting a comment:**

1. Client **optimistically** inserts a fake comment with `_id: "temp-<timestamp>"`
   and clears the textarea. The user sees it instantly.
2. `POST /api/postComment` verifies the JWT, resolves the user, `Comment.create(...)`.
3. **Dual write:** the new comment is also pushed into Redis — `ZADD` into the
   thread's sorted set, `HSET` the hash. If it's a reply, `$inc` the parent's
   `replyCount` in Mongo *and* `HINCRBY` it in Redis.
4. Response returns the real comment; React swaps the temp one out by ID.
5. If the request failed, React removes the temp comment — a rollback.

**📌 Say this:** "Every mutation has to write to both Mongo and Redis in the same
handler, otherwise the cache serves stale data until the TTL expires. That dual-write
requirement is the main cost of this design, and it's exactly where bugs creep in."

---

## 6. The background worker

`src/workers/precomputeWorker.ts` runs `node-cron` every 5 minutes (and once on
startup). For every question, it pulls the top 200 comments and their replies from
Mongo and warms the Redis keys.

**Why it exists:** without it, the *first* person to open a cold thread pays the
full MongoDB round trip plus the cache-population cost. The worker moves that cost
off the user's critical path.

It uses `ZADD ... NX` — **only add if the member doesn't already exist** — so it
never overwrites the score of a comment that was added or voted on since the last
run.

Run it with `npm run dev:all` (Next + worker via `concurrently`). Plain `npm run dev`
leaves the cache cold and everything falls back to Mongo — still correct, just slower.

**⚠ Gotcha:** the worker scores entries with a plain `createdAt` timestamp, while
the read path scores with a composite `votes * 1e13 + createdAt`. Two different
scales in one sorted set means the ordering is wrong whenever both have written.
See file 05.

---

## 7. What's real vs. what's scaffolding

Know this so you're never caught overclaiming.

**Real and built out:**
- Nested comments — post, reply, edit, delete, vote, bookmark, infinite scroll.
- The Redis caching layer and the precompute worker.
- Auth0 login + per-route JWT verification.
- Question creation with Cloudinary image upload, and the question feed.
- Cursor-based pagination on both questions and comments.

**Stubbed, dead, or broken — do not claim these:**
- **Answers don't exist.** Two conflicting models both register as `Answer`; no
  API routes; the components are stubs. The app only has questions + comments.
- `src/app/comment/page.tsx` is a dead local-state demo, unrelated to the real
  comment component in `src/components/comment/page.tsx`.
- `src/middleware.ts` is untouched Next.js boilerplate matched to `/about/*`,
  a route that doesn't exist.
- The upload route uses `multer` against `req.req`/`req.res`, which don't exist on
  a Web `Request` in the App Router — it can't work as written.
- Search depends on a MongoDB **Atlas Search** index named `default`, so it only
  works against Atlas, not a local mongod.
- No tests, no CI.

**→ If asked "did you build all of this?"** — Say plainly which parts are yours
and which are collaborative. This is a two-person project with Ishwar. Claiming
solo authorship of a repo with someone else's commits in the log is an easy way
to get caught.

---

## 8. Numbers worth knowing

Interviewers like candidates who know their own system's shape.

- Page size: 10 top-level comments, 5 replies per expansion.
- Cache warm depth: top 200 comments per question, 50 replies per comment.
- TTLs: 1 hour for hashes and user records; sorted sets are 1 hour in the read
  path but 5 minutes in the write path and worker (inconsistent — see file 05).
- Worker cadence: every 5 minutes.
- The comment component is ~835 lines with a recursive child component.

---

**Next:** file 02 (React) if you're following the plan.
