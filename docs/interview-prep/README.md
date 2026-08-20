# Unclutterd — Interview Prep

Revision notes for explaining this project in an SDE interview, written for a
one-day cram. Each file teaches the concept generally *and* anchors it to code that
actually exists in this repo, so you're revising fundamentals and the project at the
same time.

## Read in this order

| # | File | What it covers | Time |
|---|---|---|---|
| 00 | [Study Plan](00-study-plan.md) | The schedule, what to skip, the three sentences that matter most | 10 min |
| 01 | [Project Overview](01-project-overview.md) | Architecture, data model, request lifecycle, what's real vs. stubbed | 45 min |
| 02 | [React](02-react.md) | State, effects, refs, keys, recursion, optimistic UI, Zustand | 90 min |
| 03 | [Next.js](03-nextjs.md) | React vs Next, rendering strategies, App Router, Server vs Client Components | 60 min |
| 04 | [MongoDB](04-mongodb.md) | Documents, Mongoose, embed vs reference, indexes, aggregation, connection caching | 75 min |
| 05 | [Redis here](05-redis-in-this-project.md) | The key scheme, cache-aside, the composite score, pipeline vs MULTI | 30 min |
| 06 | [Auth flow](06-auth-flow.md) | Auth0, JWT, JWKS, and the authorization vulnerability | 30 min |
| 07 | [Interview Q&A](07-interview-qa.md) | Likely questions, model answers, ambush handling, final checklist | 60 min |
| 08 | [Tokens, crypto & auth flows](08-tokens-and-auth-flows.md) | Hashing vs encryption vs signing, JWT signatures and attacks, refresh rotation, the Auth0 PKCE flow, building auth yourself | 60 min |

**If you only have two hours:** read 01 and 07. Skim 02 §§3–5 and 03 §1.

## Markers used throughout

- **→ If asked:** a likely question and the shape of a good answer
- **⚠ Gotcha:** something wrong or fragile in this codebase — raise these yourself
- **📌 Say this:** a phrase worth using close to verbatim

## The short version

Unclutterd is a Reddit-style Q&A app: Next.js 15 App Router, React 19, MongoDB via
Mongoose, Redis as a cache-aside layer, Auth0 for identity, Cloudinary for images.
The substantial engineering is the nested comment system — Redis sorted sets ranked
by a composite vote-and-recency score, hashes for comment bodies, cursor pagination,
optimistic UI, and a cron worker that pre-warms the cache.

The three strongest things you can talk about:

1. **The composite ZSET score** — packing votes and recency into one sortable number
   (file 05 §4), including the precision ceiling that limits it.
2. **The broken authorization check** — `comment.auth0Id !== user.auth0Id` where
   neither field exists, so it never fires (file 06 §6). Volunteer this.
3. **Cursor vs offset pagination** and the compound index that serves it
   (file 04 §§5–6).

## Before the interview

Make sure you can actually run it: `npm run dev:all` (Next **plus** the cron worker).
Plain `npm run dev` leaves the Redis cache cold, so every read falls back to MongoDB —
still correct, but you won't be able to demo the caching path you're talking about.
