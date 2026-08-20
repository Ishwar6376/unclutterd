# 06 — Authentication (Auth0, JWT, JWKS)

Short file, high value. Auth appears in every protected route, interviewers love JWT
questions, and **this project contains a real authorization vulnerability that makes
excellent interview material** (see §6).

---

## 1. The flow, end to end

```
1. User clicks Login  → Auth0Provider redirects to Auth0's hosted login page
2. User authenticates with Auth0 (password, Google, whatever)
3. Auth0 redirects back to /home with a code, SDK exchanges it for tokens
4. AuthSync (client) POSTs the profile to /api/users → upsert into MongoDB
5. home/page.tsx POSTs to /api/cacheUser → caches the user in Redis
6. Every later API call attaches `Authorization: Bearer <token>`
7. Each route verifies the token signature against Auth0's public JWKS keys
8. Route resolves the token's `sub` to a Mongo user (via the Redis cache)
```

**Why the app has its own User collection at all** — a likely question:
> Auth0 owns identity: credentials, email verification, social logins. But I need to
> reference users as ObjectIds from comments, votes and bookmarks, and I can't have
> a foreign key into a third-party service. So I keep a local User document keyed by
> `auth0Id` — Auth0's `sub` claim — which is the join between their identity system
> and my data. The upsert on login keeps it in sync.

---

## 2. JWT structure

Three base64url-encoded parts, dot-separated: `header.payload.signature`.

- **Header** — `{ "alg": "RS256", "kid": "abc123" }`. `kid` = key ID, which tells
  you *which* public key signed this.
- **Payload (claims)** — `sub` (the user's Auth0 ID), `iss` (issuer), `aud`
  (audience), `exp` (expiry), `iat` (issued at), plus profile claims.
- **Signature** — proves the payload wasn't tampered with.

**⚠ The thing people get wrong:** a JWT is **signed, not encrypted.** Anyone can
base64-decode the payload and read it. Never put secrets in a JWT. Signing
guarantees *integrity and authenticity*, not confidentiality.

**Stateless auth:** the server doesn't store sessions — everything needed is in the
token, verified by signature. **Cost:** you can't revoke a token before it expires,
which is why access tokens are short-lived and refresh tokens exist.

---

## 3. RS256 and JWKS — why this project fetches keys over the network

**HS256** is symmetric: one shared secret both signs and verifies. Anyone who can
verify can also *forge*.

**RS256** is asymmetric: Auth0 signs with a **private** key it never shares; my
server verifies with the matching **public** key. My server can check tokens but
could never mint one. That's essential when a third party issues the tokens.

**JWKS** (JSON Web Key Set) is how the public keys are published, at
`https://<domain>/.well-known/jwks.json`. Auth0 rotates keys, so you fetch by `kid`
rather than hardcoding one.

```ts
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 10 * 60 * 1000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

const jwksCache: Record<string, string> = {};   // second, module-level cache
function getKey(header, callback) {
  if (jwksCache[header.kid]) return callback(null, jwksCache[header.kid]);
  client.getSigningKey(header.kid, (err, key) => {
    jwksCache[header.kid] = key.getPublicKey();
    callback(null, jwksCache[header.kid]);
  });
}
```

**→ If asked "why two layers of caching?"**
> Without caching, every single API request would make an outbound HTTPS call to
> Auth0 before doing any work — adding latency to every request and risking rate
> limits. The `jwks-rsa` client caches internally, and I keep a module-level map
> keyed by `kid` on top of it so the common case is a plain object lookup. Keys
> rotate rarely, so this is safe; the `cacheMaxAge` bounds how long a rotated-out
> key could linger.

**Verification checks:** signature valid for that `kid`, `exp` not passed, `iss`
matches my Auth0 domain, and — **it should** — `aud` matches my API identifier.

---

## 4. Two tokens, and a mistake this project makes

| | ID Token | Access Token |
|---|---|---|
| Audience | The **client app** | The **API** |
| Purpose | "Here's who the user is" — for the UI | "Here's permission to call this API" |
| Should be sent to an API? | **No** | **Yes** |

**⚠ In `src/app/home/page.tsx`:**
```tsx
const tokenClaims = await getIdTokenClaims();
const token = tokenClaims?.__raw;          // ← raw ID token
await fetch("/api/cacheUser", { headers: { Authorization: `Bearer ${token}` } });
```
That sends the **ID token** to an API. The comment component does it correctly with
`getAccessTokenSilently()`, so the codebase is inconsistent.

**→ If asked, or better, raised by you:**
> I'm mixing ID tokens and access tokens. The ID token is meant for the client to
> learn who the user is — it's audienced to the app, not the API. Sending it as a
> bearer credential works here only because my verification doesn't check the
> audience claim, which is itself the bug. The fix is `getAccessTokenSilently()`
> everywhere plus audience validation server-side.

---

## 5. `getAccessTokenSilently()`

```tsx
const token = await getAccessTokenSilently({
  audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
  scope: "openid profile email",
});
```
Returns a cached access token, and silently renews it via a hidden iframe or refresh
token if it's expired — so the user isn't bounced to a login page mid-session.

**⚠ Note:** it's called before *every single* API request in this codebase. The SDK
caches internally so it's usually cheap, but hoisting it would be cleaner.

**`audience`** tells Auth0 which API the token is for. Without it Auth0 returns an
opaque token instead of a JWT — which is why `NEXT_PUBLIC_AUTH0_AUDIENCE` is
required for this to work at all.

**`scope`** — `openid` requests an ID token, `profile` and `email` add those claims.

---

## 6. ⚠ THE VULNERABILITY — your best talking point

In both [`deleteComment/route.ts`](../../src/app/api/deleteComment/route.ts) and
[`editComment/route.ts`](../../src/app/api/editComment/route.ts):

```ts
if (comment.auth0Id !== user.auth0Id) {
  return NextResponse.json({ error: "Forbidden: not your comment" }, { status: 403 });
}
```

**This check never fires.** Neither side exists:

- The Comment schema has **no `auth0Id` field** — it stores `author`, an ObjectId.
  (`editComment` even `.select()`s specific fields and doesn't include it.)
- The cached `user` object is `{_id, username, email, avatar}` — **no `auth0Id`** either.

So it evaluates `undefined !== undefined` → `false` → the guard is skipped.
**Any authenticated user can edit or delete anyone's comment** by passing a
`commentId`.

**The fix:**
```ts
const comment = await Comment.findById(commentId).select("_id author body").lean();
if (comment.author.toString() !== user._id.toString()) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**→ How to use this in the interview.** Do not hide it. Volunteer it when asked
"what would you improve" or "what did you learn":

> The most valuable thing I found reviewing this was a broken authorization check.
> Delete and edit compare `comment.auth0Id` to `user.auth0Id`, and neither object
> has that field — so it's `undefined !== undefined`, always false, and the guard
> silently passes for every user. Any logged-in user can delete anyone's comment.
>
> What makes it dangerous is that it *looks* correct in review and behaves correctly
> in manual testing, because you're normally testing with your own comments. It
> taught me two things: authorization needs a negative test — a test that asserts
> another user gets a 403 — and comparing possibly-undefined fields in TypeScript
> should be caught by typing the lean result properly instead of using `any`.

**That is a genuinely excellent interview answer.** It shows you can audit code,
you understand why the bug is invisible, and you draw a generalizable lesson. Many
candidates cannot criticize their own work at all.

**Related, mention it as a second-order issue:** the client-side ownership check is
also wrong — `comment.authorName === User.username` compares display names, not IDs.
Two users with the same display name would see each other's edit buttons. Client
checks are only cosmetic anyway; the server is the real gate, and here it's open.

---

## 7. Other auth weaknesses to have ready

**No audience validation.** Every `jwt.verify` passes `issuer` and `algorithms` but
never `audience`, even though `AUTH0_AUDIENCE` is in `.env.local`. So a token minted
for *any* API in the same Auth0 tenant is accepted here.
```ts
jwt.verify(token, getKey, {
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  audience: process.env.AUTH0_AUDIENCE,   // ← missing
  algorithms: ["RS256"],
});
```
**Note `algorithms: ["RS256"]` is present and important** — pinning the algorithm
prevents the classic `alg: none` and RS256→HS256 confusion attacks, where an
attacker re-signs a token using the public key as an HMAC secret. Good thing to
point out as something the code *does* get right.

**No rate limiting** on any route. Someone could hammer `postComment` freely.

**No input sanitization.** Comment bodies are stored and rendered raw. React escapes
by default so this isn't stored XSS *today*, but the moment anyone adds markdown or
`dangerouslySetInnerHTML` it becomes one.

**`cacheUser` can crash on an unknown user.** It does `User.findOne(...)` then
immediately `user._id` with no null check, so a valid token for a user not yet in
Mongo throws a TypeError and returns 401 with a confusing message.

**Auth is copy-pasted across seven routes.** ~40 identical lines of JWKS setup and
user resolution in each.
> The right fix is one `withAuth(handler)` wrapper or a shared `getAuthedUser(req)`
> helper. And that's not just DRY — the ownership bug exists *because* the logic was
> duplicated. Fixing it in one file wouldn't fix the other. Duplication is how
> security bugs survive.

**That last line is a strong thing to say.** It connects a code-quality concern to a
security outcome, which is exactly the reasoning interviewers are probing for.

---

**Next:** file 07 — the actual Q&A rehearsal.

**See also:** [08 — Tokens & auth flows](08-tokens-and-auth-flows.md) for refresh-token
rotation, the full Auth0 authorization-code + PKCE sequence, and what building auth
from scratch would involve.
