# 05 — Redis: how it's actually used here

You already know Redis theory, so this skips the fundamentals and covers only how
this codebase wires it up — plus the design decisions you'd need to defend and the
flaws you should raise before an interviewer finds them.

**This is your strongest technical talking point in the whole project.** It's the
part that isn't standard CRUD.

---

## 1. Why Redis is here at all

**→ If asked "why did you add a cache?"**
> Comment threads are read constantly and written rarely — a popular thread might
> get one comment a minute and a thousand reads. Every scroll was hitting MongoDB
> with a sorted query plus a per-user vote lookup. Redis holds the ranked comment
> IDs in a sorted set and the comment bodies in hashes, so the common path is a few
> in-memory operations instead of a disk-backed query with a sort.

**→ "Why not just index MongoDB better?"** (a fair challenge — have an answer)
> The Mongo query *is* indexed. The win isn't avoiding a table scan, it's avoiding
> the round trip and the per-user personalization work. Each comment also needs
> "did *this* user vote on it" and "did they bookmark it" — in Mongo that's two more
> queries against the votes and saved collections per page. In Redis those are
> single key lookups I can pipeline into one round trip.

---

## 2. The complete key map

Know this table. It's the shape of the whole design.

| Key | Type | Holds | TTL |
|---|---|---|---|
| `topComments:<questionId>` | **ZSET** | Top-level comment IDs, ranked | 3600s (read path) / 300s (write path & worker) |
| `replies:<parentId>` | **ZSET** | Reply IDs for one comment, ranked | same |
| `comment:<commentId>` | **HASH** | The full comment: body, author, votes, replyCount, timestamps | 3600s |
| `vote:<userId>:<commentId>` | STRING | `"1"` or `"-1"` — this user's vote | 3600s |
| `vote_ts:<userId>:<commentId>` | STRING | When they voted | 3600s |
| `saved:<userId>:<commentId>` | STRING | `"1"` if bookmarked | 3600s |
| `saved_ts:<userId>:<commentId>` | STRING | When they saved | 3600s |
| `user:<auth0Id>` | STRING (JSON) | `{_id, username, email, avatar}` | 3600s |
| `Comments_precomputed:<qid>` | STRING | Flag that the thread was warmed | 24h |

**Why the type choices:**

- **ZSET for ordering** — it keeps members sorted by score automatically, so
  "give me the top N comments" is `ZREVRANGE`, an O(log N + M) operation, with no
  sorting at read time.
- **HASH for the comment body** — fields can be read or updated individually.
  `HINCRBY comment:<id> replyCount 1` bumps one counter without deserializing and
  rewriting the whole object, which a JSON string would require.
- **STRING for votes/saves** — one key per user-comment pair. Trivially expirable,
  and pipelineable in bulk.

**Note the composite key pattern** `vote:<userId>:<commentId>`. Redis is a flat
keyspace with no secondary indexes, so **hierarchy lives in the key name.** That's
idiomatic. The cost: you can't query "all votes by this user" without `SCAN`ing —
which is why MongoDB remains the source of truth for votes.

---

## 3. Cache-aside — the pattern used everywhere

Every read path in this codebase follows the same three steps:

```
1. Ask Redis.
2. Hit  → return it.
   Miss → query MongoDB, write the result into Redis with a TTL, return it.
```

Applied in three places: resolving the user (`user:<auth0Id>`), fetching comment IDs
(`ZCARD` then either `ZREVRANGE` or a Mongo fallback), and backfilling missing
votes/saves.

**→ If asked "cache-aside vs write-through vs write-behind?"**
> Cache-aside means the application manages the cache — read from it, and on a miss
> populate it. Write-through means every write goes through the cache, which keeps
> them in sync but slows every write. Write-behind queues writes and flushes them
> later, which is fastest but risks data loss on a crash. I used cache-aside for
> reads because it's simple and the cache can be dropped entirely without data loss —
> MongoDB stays the source of truth. But my *writes* are effectively dual-writes:
> the route updates Mongo and Redis in the same handler.

**⚠ The honest weakness — and you should raise it yourself:**
> The dual write isn't atomic. If Mongo succeeds and Redis fails, the cache serves
> stale data until the TTL expires. `postComment` even catches the Redis error and
> continues deliberately, on the reasoning that Mongo is the source of truth and the
> TTL will heal it. That's a conscious choice, but the proper fix is either to
> invalidate rather than update — delete the key and let the next read repopulate —
> or to push cache updates through an outbox the worker drains.

**Invalidate vs update** is the key phrase there. Deleting a key is idempotent and
safe; updating it can leave a half-written state.

---

## 4. The composite score — the cleverest bit, explain it well

Comments must sort by **votes first, recency second**. A ZSET has only one score.
So the two values are packed into one number:

```js
const score = c.votes * 1e13 + new Date(c.createdAt).getTime();
```

**Why `1e13`?** A millisecond epoch timestamp is currently ~1.7 × 10¹² — 13 digits.
Multiplying votes by 10¹³ shifts them above the entire timestamp range, so the
timestamp can only ever break ties *within* the same vote count. Effectively:

```
score = [ votes ][ timestamp ]
         high bits  low bits
```

One comment with 5 votes always outranks one with 4, no matter when either was
posted; two comments with 5 votes are ordered newest-first.

**→ If asked "what's wrong with that?"** — have this ready, it's a real limitation:
> Redis sorted-set scores are IEEE-754 doubles, which give 53 bits of integer
> precision — about 9 × 10¹⁵. With a 10¹³ multiplier I run out of headroom at
> roughly 900 votes, and past that the timestamp bits start getting rounded away and
> tie-breaking degrades. For a bigger system I'd either use a smaller time
> resolution — seconds instead of milliseconds — or store a decayed "hot" score like
> Reddit does, which is `log10(votes)` plus a time term, and recompute it in the
> worker.

Mentioning Reddit's hot-ranking algorithm unprompted is a genuinely good signal.

---

## 5. Pipeline vs MULTI — know the difference

Both appear in this codebase, and they are **not** the same thing.

```js
redis.pipeline()   // used in getComments, getReplies, deleteComment
redis.multi()      // used in votes, saveComment, postComment
```

| | `pipeline()` | `multi()` |
|---|---|---|
| What it does | Batches commands into **one round trip** | Batches **and** wraps in a transaction |
| Atomic? | **No** — commands can interleave with other clients | **Yes** — executed as one unit, nothing runs in between |
| On error | Other commands still run | Still runs the rest (Redis doesn't roll back!) |
| Use for | Bulk reads, independent writes | Writes that must land together |

**→ If asked:**
> A pipeline is purely a network optimization — instead of fifty round trips for
> fifty `HGETALL`s, I send them all at once and read all the replies. It doesn't
> make them atomic. `MULTI`/`EXEC` does guarantee that no other client's command
> interleaves. I use `MULTI` where two keys must agree — setting the vote and its
> timestamp together — and pipelines for bulk reads where interleaving is harmless.

**Important nuance most people get wrong:** Redis transactions **do not roll back**.
If one command in a `MULTI` fails at runtime, the others still apply. `MULTI`
guarantees *isolation*, not *atomicity-with-rollback* in the SQL sense. Saying this
correctly is a strong signal.

The pipelining here is a real win — the vote/saved lookup issues 2 commands per
comment, so a page of 10 comments is 20 commands in **one** round trip rather than
20 sequential ones.

---

## 6. The precompute worker

`src/workers/precomputeWorker.ts` — `node-cron`, every 5 minutes plus once on boot.
For each question it loads the top 200 comments and their replies from Mongo and
warms the ZSETs and hashes.

**Purpose:** move the cold-start cost off the user's critical path. Without it, the
first visitor to a stale thread pays the Mongo query *and* the cache population.

**`ZADD ... NX`** — "only add if the member does not already exist." This stops the
worker overwriting the score of a comment that was added or voted on since the last
run. (`XX` would be the opposite: only update existing.)

**⚠ Three real problems — bring at least one up yourself:**

1. **Score-scale mismatch.** The worker scores with a bare `createdAt` timestamp
   (~10¹²), while the read path scores with `votes * 1e13 + createdAt`. Both write
   to the same ZSET, so a worker-written entry with 50 votes scores *lower* than a
   read-path entry with 0 votes. **The ranking is silently wrong whenever both have
   run.** `postComment` has the same bug — it uses a bare `Date.now()`.
2. **It doesn't scale.** `Question.find({})` loads *every* question, then runs a
   query per comment to get replies — a classic N+1. At a thousand questions this
   is tens of thousands of round trips every five minutes. It should only warm
   recently-active threads, and it should pipeline.
3. **TTL mismatch.** The worker sets a 300-second TTL but runs every 300 seconds,
   so the cache expires right as the next run begins — the warm window is racing
   the cron. The read path meanwhile sets 3600s. These should agree.

**→ If asked "how would you fix the worker?"**
> Compute the score in one shared helper imported by both the worker and the routes,
> so the formula can't drift. Only warm threads with recent activity rather than the
> whole collection. Batch the reply queries with a single `$in` instead of one per
> comment. And set the TTL to comfortably exceed the cron interval — say 15 minutes
> for a 5-minute job — so there's no cold gap.

---

## 7. Other flaws worth knowing about

**Pagination happens in application memory.**
```js
commentIds = await redis.zrevrange(zsetKey, 0, -1);   // pulls ALL ids
const index = commentIds.indexOf(after);              // linear scan
commentIds = commentIds.slice(index + 1).slice(0, limit);
```
> I pull the entire sorted set and paginate in JavaScript. That defeats the point of
> a sorted set — Redis can do this natively with `ZREVRANGEBYSCORE` and a `LIMIT`
> offset, or `ZRANK` to find the cursor's position and `ZREVRANGE` for just that
> slice. On a 200-member set it's harmless; on a 50,000-comment thread I'd be
> shipping the whole ID list over the wire on every page request.

**This is the single best "what would you optimize" answer for the Redis layer.**

**No cache stampede protection.** If a popular thread's ZSET expires, every
concurrent request misses simultaneously and they *all* run the Mongo fallback and
all write the same data back. The fix is a short-lived lock — `SET key value NX EX 10`
— so one request rebuilds while the others wait or serve stale.

**Deletes don't remove ZSET members.** `deleteComment` soft-deletes and rewrites the
hash to `[deleted]`, but the ID stays in the sorted set — correct here, actually,
since Reddit-style soft deletes keep the placeholder in the thread. Worth being able
to explain as deliberate rather than an oversight.

**No eviction policy considered.** Nothing configures `maxmemory-policy`. For a
pure cache it should be `allkeys-lru`. Since every key here has a TTL,
`volatile-lru` would also work. **Good answer to "what happens when Redis fills up?"**

**Connection handling.** `src/utils/reddis.ts` creates a single ioredis client at
module scope, shared across all routes. That's correct — ioredis maintains one
connection and pipelines automatically. But there's no `global` caching like
`dbConfig.ts` has, so hot reload in dev can leak clients.

---

## 8. Likely rapid-fire questions

**"Is Redis single-threaded?"** — Command execution is, yes. That's *why* operations
are atomic without locks. Networking and some background tasks use extra threads in
Redis 6+.

**"What if Redis goes down?"** — Every read path falls back to MongoDB, so the app
degrades to slower but still correct. Writes go to Mongo first regardless. That's the
main reason cache-aside was the right pattern here — the cache is genuinely optional.
(Honest caveat: the ioredis client would throw on connect errors and these routes
don't wrap Redis calls in try/catch except in `postComment`, so in practice some
routes *would* 500. Worth admitting if pressed.)

**"Persistence?"** — RDB snapshots, AOF logs, or both. **Irrelevant here** — this
data is 100% reconstructible from MongoDB, so persistence is unnecessary and you'd
disable it for speed. Saying that shows you understand cache vs datastore.

**"How do you pick a TTL?"** — Trade staleness against load. Here, an hour is
tolerable because the worker refreshes every five minutes and writes update the
cache directly, so the TTL is a backstop for drift rather than the primary
freshness mechanism.

---

**Next:** file 06 (Auth), then 07 (Q&A).
