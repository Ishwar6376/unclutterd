# 04 — MongoDB & Mongoose

You said Mongo is weak. This teaches from the ground up, but anchored to this repo's
actual schemas and queries. Sections 5 (indexes), 8 (aggregation) and 9 (connection
caching) are the ones most likely to be probed.

---

## 1. The mental model

MongoDB is a **document database**. Instead of tables with fixed columns, you store
**documents** (JSON-like objects) inside **collections**.

| SQL | MongoDB |
|---|---|
| Database | Database |
| Table | **Collection** |
| Row | **Document** |
| Column | **Field** |
| JOIN | `$lookup`, or denormalize, or a second query |
| Schema enforced by the DB | Schema enforced by your app (Mongoose) |

Documents are stored as **BSON** — binary JSON — which adds types JSON lacks:
`ObjectId`, `Date`, `Decimal128`, binary data.

**`ObjectId`** — the default `_id`. A 12-byte value: a 4-byte timestamp, a 5-byte
random value, and a 3-byte counter. Two consequences that matter for this project:

1. It's **globally unique without a central coordinator**, so IDs can be generated
   client-side or across shards without collisions.
2. It's **roughly monotonically increasing over time**, because the first 4 bytes
   are a timestamp. **This is why `_id: { $lt: cursor }` works as a "give me older
   posts" pagination filter** in `fetchQuestion/route.ts` — sorting by `_id`
   descending is effectively sorting by creation time descending, for free, using
   an index that already exists.

**→ If asked "why MongoDB over Postgres?"**
> The comment model is a tree with variable depth and I'm not doing multi-table
> joins or transactions — reads are almost always "get me the comments for this
> question," which is a single-collection query. The flexible schema also let me
> denormalize author names onto comments so I could cache whole comments as flat
> Redis hashes. If the app needed strict referential integrity or complex
> analytical joins, Postgres would be the better fit — and honestly a recursive CTE
> in Postgres handles comment trees very elegantly, so this isn't a slam dunk either
> way.

That last clause is worth saying. Acknowledging the counter-argument reads as
confidence, not weakness.

---

## 2. Mongoose — what it adds

MongoDB itself is schemaless. **Mongoose** is an ODM (Object Document Mapper) that
layers on validation, typing, middleware, and query helpers.

Three concepts:

- **Schema** — the shape: fields, types, defaults, validation, indexes.
- **Model** — a constructor compiled from a schema, bound to a collection. The thing
  you call `.find()` on.
- **Document** — an instance returned from a query, with methods like `.save()`.

```js
const commentSchema = new mongoose.Schema({ /* fields */ }, { timestamps: true });
export default mongoose.models.Comment || mongoose.model("Comment", commentSchema);
```

### ⚠ Why `mongoose.models.Comment || mongoose.model(...)`?

**This is a very likely question because it looks odd.**

> Next.js hot-reloads modules in development. If this file is re-imported, calling
> `mongoose.model("Comment", schema)` a second time throws
> `OverwriteModelError: Cannot overwrite 'Comment' model once compiled`. The guard
> reuses the already-registered model if it exists. It's the same class of problem
> as the connection caching in `dbConfig.ts` — module-level state surviving a reload.

**Collection naming:** `mongoose.model("Comment", …)` creates a collection called
**`comments`** — Mongoose lowercases and pluralizes. That's why the `$lookup` stages
in `getUser` reference `from: "questions"` and `from: "comments"` in lowercase
plural: `$lookup` talks to raw MongoDB, which doesn't know about Mongoose's names.

**`{ timestamps: true }`** auto-manages `createdAt` and `updatedAt`.

---

## 3. Schema types and options in this repo

```js
{
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
  parentId:   { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
  authorName: { type: String, required: true },
  body:       { type: String, trim: true, required: true },
  votes:      { type: Number, default: 0 },
}
```

- **`ref`** — declares the relationship so `.populate()` knows which collection to
  pull from. It does **not** create a foreign-key constraint; MongoDB has none. If
  you delete a User, their comments still point at a dead ObjectId. Nothing stops you.
- **`required`, `default`, `trim`** — validation and normalization applied by
  Mongoose, in your app, not by the database.
- **`enum: [-1, 1]`** on the Vote's `value` — restricts to those two values.
- **`unique: true`** — **not validation.** It builds a unique *index*. A duplicate
  raises a MongoDB error (code 11000), not a Mongoose validation error.
- **`sparse: true`** on `auth0Id` — the index skips documents where the field is
  missing. Without it, a unique index treats multiple missing fields as duplicate
  `null`s and rejects the second one.

---

## 4. Relationships: reference vs embed

The central modelling decision in MongoDB.

**Embedding** — nest the child inside the parent document:
```js
{ _id: 1, title: "Q", comments: [{ body: "hi" }, { body: "yo" }] }
```
✅ One read gets everything. Atomic updates.
❌ 16 MB document cap. Rewrites the parent to change a child. Can't paginate the
children independently.

**Referencing** — store an ID pointing elsewhere (what this project does):
```js
{ _id: 99, questionId: 1, parentId: null, body: "hi" }
```
✅ Unbounded growth, independent queries and pagination, small writes.
❌ Needs a second query or a `$lookup` to join.

**The rule of thumb worth quoting:** embed when the child is *owned by, bounded in
size, and always read with* the parent. Reference otherwise.

**→ If asked "how did you model the comment tree?"**
> An adjacency list — each comment stores a `parentId` pointing at its parent, with
> `null` meaning top-level. I chose it over embedding because threads are unbounded
> and I need to paginate each level independently. The trade-off is that fetching a
> whole deep tree needs one query per level, which I mitigate by lazy-loading: the
> UI only fetches a level when the user expands it.

**Other tree models worth naming if pushed** (shows breadth):
- **Materialized path** — store `"/root/child/grandchild"`; one regex query fetches
  a whole subtree, but moving a node means rewriting descendants.
- **Nested set** — left/right numbering; very fast subtree reads, expensive writes.
- **`$graphLookup`** — MongoDB's recursive aggregation stage, which could fetch the
  whole tree server-side in one query. Mentioning this as "what I'd explore next" is
  a strong move.

### `.populate()` — and why this project barely uses it

```js
await Comment.find({ questionId }).populate("author", "username avatar");
```
Populate issues a **second query** and stitches the results together in the
application. It's convenient but it's not a real join — and in a list of 50
comments it can be slow.

**This project sidesteps it by denormalizing `authorName` and `authorEmail` onto
every comment.** That's a deliberate read-optimization: no populate, no second
query, and the comment can be stored as a **flat Redis hash** (a hash can't hold a
nested object without serializing it). The cost is stale names after a rename.

**📌 Say this:** "I denormalized the author's display name onto the comment. It
duplicates data, but it makes the comment self-contained, which is what let me cache
it as a flat Redis hash and skip the join entirely on the read path."

---

## 5. Indexes — expect a question here

**What an index is:** a B-tree of a field's values pointing at documents. Without
one, MongoDB does a **COLLSCAN** — reads every document in the collection. With one,
it does an **IXSCAN** — a tree lookup.

**The trade-off:** indexes make reads fast and **writes slower** (every insert must
update every index) and consume RAM and disk. So you index what you actually query.

### The indexes in this project

```js
commentSchema.index({ questionId: 1, parentId: 1, _id: -1 });  // compound
questionSchema.index({ author: 1 });
questionSchema.index({ tags: 1 });      // multikey — it's an array field
questionSchema.index({ votes: -1 });
voteSchema.index({ userId: 1, commentId: 1 }, { unique: true });
savedSchema.index({ userId: 1, commentId: 1 }, { unique: true });
```

`1` means ascending, `-1` descending.

**The comment compound index deserves a full explanation** — it directly serves the
main query:
```js
Comment.find({ questionId, parentId: null }).sort({ _id: -1 })
```
`questionId` and `parentId` are the equality filters, `_id` is the sort. One index
covers filtering *and* sorting, so MongoDB never has to load and sort in memory.

**The ESR rule** — the thing to say if asked how to design a compound index:
> **Equality, Sort, Range** — put fields you match exactly first, then the fields
> you sort by, then range filters. Here `questionId` and `parentId` are equality,
> `_id` is the sort, and that's exactly the field order.

**Prefix rule:** a compound index on `{a, b, c}` also serves queries on `{a}` and
`{a, b}`, but **not** on `{b}` or `{c}` alone. Order matters enormously.

**Multikey index:** `{ tags: 1 }` on an array field indexes *each element*, so
`find({ tags: "react" })` is fast.

**Unique compound index as a business rule** — this is the good one:

**→ If asked "how do you stop a user voting twice?"**
> A unique compound index on `(userId, commentId)` in the votes collection. The
> database rejects the duplicate. I could check in application code first, but that's
> a race — two concurrent requests both read "no existing vote" and both insert. The
> index makes it impossible at the storage layer regardless of concurrency.

That answer — **enforce invariants at the lowest layer** — is a genuinely senior
instinct and interviewers notice it.

**`.explain("executionStats")`** — the tool for proving an index is used. Look for
`COLLSCAN` vs `IXSCAN` and compare `totalDocsExamined` against `nReturned`. If you
examined 10,000 documents to return 10, your index is wrong. **Mention this if asked
"how would you debug a slow query?"**

---

## 6. Queries used in this project

```js
Question.findById(q_id)                              // by _id
User.findOne({ auth0Id })                            // first match
Comment.find({ questionId, parentId: null })         // all matches
  .sort({ votes: -1, createdAt: -1 })                // multi-field sort
  .limit(200)
  .lean()

Question.findOne().sort({ _id: -1 })                 // "most recent"
Comment.findByIdAndUpdate(id, { $inc: { replyCount: 1 } })   // atomic increment
Vote.find({ userId, commentId: { $in: missedIds } }) // batch fetch
Question.find({ _id: { $lt: after } })               // cursor pagination
Saved.findOneAndDelete({ commentId, userId })
```

**Operators to know:** `$inc` (atomic increment), `$in` (match any of a list),
`$lt`/`$gt`/`$lte`/`$gte`, `$set`, `$push`, `$expr` (use an expression inside `$match`).

### `$inc` is atomic — say this if vote counting comes up

```js
Comment.findByIdAndUpdate(commentId, { $inc: { votes: delta } }, { new: true })
```
> `$inc` happens inside the database, so two simultaneous upvotes can't overwrite
> each other. Read-modify-write in application code — read votes, add one, save —
> would lose one of them under concurrency. `{ new: true }` returns the document
> *after* the update rather than before.

### Upsert

```js
User.findOneAndUpdate(
  { auth0Id },
  { email, username, avatar },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
```
**Upsert = update if found, insert if not.** One round trip, no race between a
`findOne` and a `create`. Used on every login so the user record stays in sync with
Auth0 without a separate "is this a new user" branch.

### `.lean()` — a favourite "do you actually know Mongoose" question

**→ If asked "what does `.lean()` do?"**
> It returns plain JavaScript objects instead of full Mongoose documents. Hydrating
> a document attaches getters, setters, validation, change tracking and `.save()` —
> all of which cost time and memory. On a read-only path where I'm just serializing
> to JSON, none of that is useful. It's meaningfully faster on large result sets.
> The catch is you can't call `.save()` on the result.

This project uses `.lean()` on every read-only query. Correct instinct.

### Cursor vs offset pagination — another strong topic

```js
// This project (cursor / keyset):
Question.find({ _id: { $lt: after } }).sort({ _id: -1 }).limit(20)

// The naive alternative (offset):
Question.find().skip(page * 20).limit(20)
```

**→ If asked "why not skip/limit?"**
> Two reasons. `skip(10000)` still has to walk and discard 10,000 documents, so it
> gets linearly slower the deeper you page. And it's unstable — if someone posts a
> new question while I'm on page 2, everything shifts down by one and I see a
> duplicate. Cursor pagination anchors on the last `_id` I saw, so it's O(log n) via
> the index and immune to insertions. The trade-off is that you can't jump to an
> arbitrary page number — which is fine for an infinite scroll feed.

---

## 7. The aggregation pipeline

A pipeline of stages; each transforms the documents and passes them on. Used in
`getUser/route.ts`.

```js
User.aggregate([
  { $match: { _id: new mongoose.Types.ObjectId(id) } },   // 1. filter
  { $lookup: {                                            // 2. join
      from: "questions",
      let: { questionIds: "$questions" },
      pipeline: [
        { $match: { $expr: { $in: ["$_id", "$$questionIds"] } } },
        { $sort: { createdAt: -1 } },
      ],
      as: "questionsData",
  }},
  { $project: { username: 1, email: 1, questionsData: 1 } }, // 3. shape output
]);
```

**Stages to know:**

| Stage | Does |
|---|---|
| `$match` | Filter. **Put it first** so later stages handle fewer docs and it can use an index. |
| `$lookup` | Left outer join to another collection. |
| `$sort` | Order. |
| `$project` | Choose/rename/compute fields. |
| `$group` | Aggregate — counts, sums, averages. |
| `$unwind` | Flatten an array into one doc per element. |
| `$limit` / `$skip` | Paginate. |
| `$graphLookup` | Recursive join — the tree-fetching one. |

**Syntax detail worth knowing:** `$field` means "the value of this field."
`$$variable` means "a variable defined by `let`." That's why the inner match reads
`{ $in: ["$_id", "$$questionIds"] }` — `$_id` from the joined collection, `$$questionIds`
from the outer document. `$expr` is what lets you use aggregation expressions inside
a `$match`.

**The optimization rule:** `$match` and `$limit` as early as possible. A `$sort`
before a `$match` sorts documents you're about to throw away.

**⚠ This particular aggregation is broken** — it joins on `$questions`, `$answers`
and `$comments`, but the User schema declares none of those fields. They're always
undefined, so the lookups return empty arrays. See file 07.

### Atlas Search

`getSearch/route.ts` uses `$search`, which is **not** normal MongoDB — it's Atlas
Search, backed by Apache Lucene, and requires an index named `default` configured in
Atlas. It gives real full-text relevance ranking across `title`, `description` and
`tags`.

**→ If asked why not a regex?** — `find({ title: /foo/i })` can't use an index
(unless anchored), does no relevance ranking, no stemming ("running" won't match
"run"), and no typo tolerance. **`$search` must be the first stage in the pipeline.**

---

## 8. Connection caching — a classic serverless question

```ts
let cached: Cached = (global as any).mongoose;
if (!cached) cached = (global as any).mongoose = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!cached.promise) cached.promise = mongoose.connect(MONGODB_URI).then(m => m);
  cached.conn = await cached.promise;
  return cached.conn;
};
```

**→ If asked "why cache the connection on `global`?"** (very likely — this pattern
looks strange and it's in every Next.js + Mongoose codebase)

> Two problems it solves. In development, Next.js hot-reloads modules on every file
> change; without the cache each reload opens a brand-new connection pool and you
> exhaust MongoDB's connection limit within minutes. In serverless production, each
> invocation may reuse a warm container — caching on `global` lets an existing
> connection survive between invocations instead of reconnecting on every request,
> which would add 100+ ms to every single API call.
>
> The `promise` field matters as much as `conn`: if ten requests arrive
> simultaneously while the connection is still being established, they all see
> `conn === null`. Caching the in-flight *promise* means they all await the same
> connection attempt rather than starting ten of their own.

That last paragraph is the detail most candidates miss. It's worth memorizing.

**Connection pooling** — Mongoose keeps a pool (default max 100) and reuses sockets.
Opening a TCP connection plus auth handshake per query would be far too slow.

---

## 9. Things you should be ready to admit

**No transactions.** Posting a reply writes to Mongo *and* Redis and increments a
counter. If the process died between them, the counter would be wrong.
> MongoDB supports multi-document transactions on replica sets. I don't use them —
> for a comment counter, eventual consistency is acceptable and the worker
> re-syncs. For anything financial I'd need them.

**No cascading deletes.** Deleting a comment leaves its replies orphaned, and its
Vote and Saved rows behind. Mongo won't clean up for you.

**Soft delete.** `deleteComment` sets `body: "[deleted]"` rather than removing the
row — the right call, because hard-deleting a parent would orphan its whole subtree.
Reddit does the same thing.

**No pagination cap.** `limit(200)` on the cache warm is arbitrary; a thread with
more than 200 comments silently truncates.

---

**Next:** file 05 (Redis, short).
