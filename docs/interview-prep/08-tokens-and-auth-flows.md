# 08 — Access Tokens, Refresh Tokens, and Three Auth Flows

File 06 covers *verification* — JWKS, RS256, the audience bug. This file covers
**issuance and renewal**: why two tokens exist, how the refresh dance actually
works, the full Auth0 redirect flow, and what you'd have to build yourself if you
dropped Auth0.

Read 06 first. This is the sequel.

---

## 1. Why two tokens exist at all

Stateless JWT auth has one structural weakness: **you cannot un-issue a token.**
The server doesn't store sessions, so there's nothing to delete. If a token leaks,
it's valid until `exp`.

That gives you a single dial to turn, and both ends are bad:

| Token lifetime | Leak damage | UX |
|---|---|---|
| 5 minutes | Small | User re-logs in every 5 minutes. Unusable. |
| 30 days | Catastrophic | Great |

The two-token split resolves it:

- **Access token** — short-lived (5–15 min), sent on *every* API request, and
  therefore exposed constantly (headers, logs, proxies, XSS).
- **Refresh token** — long-lived (days/weeks), sent to *exactly one* endpoint
  (`/oauth/token` or your `/api/auth/refresh`), and never touched otherwise.

**📌 Say this:**
> The two-token model trades the leak window against the login frequency. The token
> that's exposed on every request expires fast, and the token that lasts a long time
> is almost never transmitted. You get a small blast radius and a long session at
> the same time — and because refresh goes through a single endpoint, that's the one
> place where you *can* reintroduce state: a revocation list.

That last clause is the real point. **Refresh is where stateless auth gets its
revocation back.**

---

## 2. The two tokens, side by side

| | Access token | Refresh token |
|---|---|---|
| Lifetime | 5–15 min | 7–30 days (or sliding) |
| Format | JWT (self-verifying) | Usually **opaque random string** |
| Sent to | Every protected API route | Only the refresh endpoint |
| Stored in | Memory (ideally) | httpOnly `Secure` `SameSite` cookie |
| Server state | None — verified by signature | **Row in a DB**, so it can be revoked |
| On theft | Attacker has ≤15 min | Attacker has your account |

**⚠ Why refresh tokens are usually opaque, not JWTs** — a favourite follow-up.
You must be able to revoke a refresh token, which means a DB lookup on every use.
Once you're hitting the DB anyway, the self-contained property of a JWT buys you
nothing, and using one only risks someone verifying it *without* the DB check. So
issue 32+ bytes of `crypto.randomBytes`, store a **hash** of it, and look it up.

**→ If asked "why hash the refresh token in the DB?"**
> Same reason you hash passwords. A read-only DB leak — a backup, a log, an
> injection — otherwise hands the attacker every live session. Storing SHA-256 of
> the token means the leak is useless. bcrypt isn't needed here: the token is
> already 256 bits of entropy, so there's nothing to brute-force, and SHA-256 keeps
> the lookup fast enough to do on every refresh.

---

## 3. The refresh dance

```
  Client                         API                        Auth server / DB
    │                             │                                │
    │ GET /api/getComments        │                                │
    │  Authorization: Bearer AT   │                                │
    ├────────────────────────────►│ verify signature + exp         │
    │                             │  ✗ expired                     │
    │ ◄──── 401 token_expired ────┤                                │
    │                             │                                │
    │ POST /api/auth/refresh      │                                │
    │  Cookie: rt=<opaque>        │                                │
    ├─────────────────────────────┼───────────────────────────────►│
    │                             │       look up hash(rt)         │
    │                             │       ✓ exists, not revoked,   │
    │                             │         not expired            │
    │                             │       → revoke old row         │
    │                             │       → insert new rt          │
    │ ◄── new AT + Set-Cookie: rt ┼────────────────────────────────┤
    │                             │                                │
    │ retry GET /api/getComments  │                                │
    ├────────────────────────────►│  ✓ 200                         │
```

Steps 2–4 must be **invisible**. The user never sees the 401.

### 3a. The stampede problem — the detail that separates candidates

Your comment page fires several requests at once (comments, votes, bookmarks). The
access token expires. **All of them 401 simultaneously**, and all of them call
`/refresh` at once. With rotation on, the first call invalidates the token the other
four are still holding — so four of them fail, and with reuse detection (§3b) you
just **logged the user out for making parallel requests**.

The fix is a **single-flight** promise:

```ts
let refreshing: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  // everyone who arrives while a refresh is in flight awaits the same promise
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
    .then(r => {
      if (!r.ok) throw new Error("refresh_failed");
      return r.json();
    })
    .then(d => d.accessToken)
    .finally(() => { refreshing = null; });

  return refreshing;
}
```

Wire it into one axios response interceptor so no call site knows refresh exists:

```ts
api.interceptors.response.use(undefined, async (error) => {
  const req = error.config;
  if (error.response?.status !== 401 || req._retried) throw error;
  req._retried = true;                                  // ⚠ never retry twice
  const token = await refreshAccessToken();
  req.headers.Authorization = `Bearer ${token}`;
  return api(req);
});
```

**⚠ The `_retried` flag is not optional.** Without it, a genuinely-dead refresh
token gives you a 401 → refresh → 401 → refresh infinite loop.

**📌 Say this:**
> The interesting part of refresh isn't the happy path, it's concurrency. When the
> token expires, every in-flight request fails at once, and naive code fires N
> parallel refreshes. With rotation that's fatal — the first one rotates the token
> out from under the others and reuse detection kills the session. So I'd gate it
> behind a single shared promise and retry each request exactly once.

### 3b. Rotation and reuse detection

**Rotation:** every refresh burns the old token and issues a new one.

**Reuse detection:** if a *already-rotated* token is presented again, that means two
parties hold it — the legitimate client and a thief. You can't tell which is which,
so you **revoke the entire token family** (every descendant of the original login)
and force a re-login.

```
login → rt1 ──refresh──► rt2 ──refresh──► rt3   ← client is here
                          │
                          └── attacker replays rt2  →  🚨 rt1..rt3 all revoked
```

Store `familyId` on every row so one `UPDATE ... WHERE familyId = ?` kills the chain.

**→ If asked "isn't that a false-positive machine?"**
> It can be — a dropped network response mid-rotation looks exactly like theft. You
> mitigate it with a short grace window where the immediately-previous token still
> resolves to the same new token, rather than triggering the alarm. That's the
> tradeoff: a few seconds of overlap in exchange for not logging people out on
> flaky connections.

---

## 4. Where to store tokens — pick your poison

| Storage | XSS-safe | CSRF-safe | Survives reload |
|---|---|---|---|
| `localStorage` | ❌ **any script reads it** | ✅ | ✅ |
| JS variable / memory | ⚠ mostly | ✅ | ❌ |
| Cookie, non-httpOnly | ❌ | ❌ | ✅ |
| **Cookie, httpOnly + Secure + SameSite=Lax** | ✅ JS can't read it | ✅ | ✅ |

**The standard answer: access token in memory, refresh token in an httpOnly cookie.**

- Access token in memory dies on reload — fine, you refresh silently on boot.
- Refresh token in an httpOnly cookie can't be exfiltrated by XSS.
- `SameSite=Lax` + `Path=/api/auth/refresh` means it's only ever attached to the one
  endpoint that needs it.

**⚠ Be honest about the limit:** httpOnly stops *exfiltration*, not *use*. An XSS
payload can still call `/api/auth/refresh` from the victim's page and get a fresh
access token. It just can't steal the refresh token itself and use it from its own
machine later. That's a real reduction in blast radius, not immunity — saying so
scores points, claiming httpOnly "solves XSS" loses them.

---

## 5. Auth0's flow: Authorization Code + PKCE

This is what `@auth0/auth0-react` runs in [`AuthProvider.tsx`](../../src/providers/AuthProvider.tsx).

```
1. loginWithRedirect()
   SDK generates:  verifier = random(43..128 chars)
                   challenge = base64url(SHA256(verifier))
                   state = random   (CSRF guard)
                   nonce = random   (replay guard for the ID token)
   verifier + state stashed in sessionStorage.

2. Browser → https://YOUR.auth0.com/authorize
       ?client_id=...
       &redirect_uri=https://app/home
       &response_type=code
       &scope=openid profile email
       &audience=https://your-api            ← without this you get an OPAQUE token
       &code_challenge=<challenge>
       &code_challenge_method=S256
       &state=...&nonce=...

3. User authenticates on Auth0's page (password / Google / whatever).
   Credentials NEVER touch your app. That is the whole point.

4. Auth0 → https://app/home?code=<one-time code>&state=...
   SDK checks state matches what it stored.  Mismatch → abort (CSRF).

5. SDK POSTs to https://YOUR.auth0.com/oauth/token
       grant_type=authorization_code
       code=<code>
       code_verifier=<the original verifier>     ← proof of possession

   Auth0 recomputes SHA256(verifier) and compares to the challenge from step 2.

6. Response: { access_token (JWT, aud=your API),
               id_token     (JWT, aud=your client),
               expires_in: 86400,
               refresh_token?  ← only if you asked for offline_access }

7. onRedirectCallback → router.push("/home")
```

### Why PKCE exists

The code in step 4 travels through the **URL bar** — browser history, `Referer`
headers, a malicious app registered for the same custom scheme on mobile. PKCE makes
a stolen code worthless: redeeming it requires the verifier, which never left the
original client.

**→ If asked "why not the implicit flow?"**
> Implicit returned the token directly in the URL fragment, so the credential itself
> ended up in browser history and could leak through the `Referer` header. Auth code
> + PKCE returns a single-use code that's worthless without the verifier, so the
> token only ever arrives in a POST response body. Implicit is deprecated for SPAs;
> PKCE is the current recommendation, and it's what the SDK does by default.

**→ "Why no client secret?"**
> An SPA ships to the browser, so it can't hold a secret — anyone can read the
> bundle. PKCE replaces the static secret with a per-request dynamic one. That's
> exactly the problem it was invented to solve, originally for mobile apps.

### ⚠ What this repo's config actually does

```tsx
<Auth0Provider
  domain={...} clientId={...}
  authorizationParams={{ redirect_uri: `${origin}/home`,
                         audience: NEXT_PUBLIC_AUTH0_AUDIENCE,
                         scope: "openid profile email" }}
/>
```

Two things are **missing**, and both are good things to volunteer:

**1. No `useRefreshTokens`.** So the SDK renews via a **hidden iframe** hitting
`/authorize?prompt=none`, which depends on Auth0's session cookie being readable in
a third-party context. Safari's ITP and Chrome's third-party cookie work break
exactly that. The result is that silent renewal fails on some browsers and the user
gets bounced to the login page.

**2. No `cacheLocation`.** The default is `memory`, so **every full page reload
loses the token** and triggers a fresh redirect round-trip.

The fix is two props:

```tsx
useRefreshTokens={true}          // real refresh tokens instead of iframe + 3P cookies
cacheLocation="localstorage"     // survives reload
```

**⚠ And be ready for the pushback**, because a good interviewer will push:
> `localstorage` is XSS-readable, which is the tradeoff people object to. Auth0's
> answer is refresh token rotation — enable it in the tenant and a stolen token is
> single-use, so replaying it triggers reuse detection and kills the family. The
> alternative is `cacheLocation="memory"` with `useRefreshTokens`, keeping the token
> in a worker-scoped store; you keep the XSS resistance and pay a silent-auth
> round-trip on every reload.

**And note the `scope` doesn't request `offline_access`** — that's the scope that
actually asks Auth0 for a refresh token. `useRefreshTokens` adds it for you.

**⚠ Third finding, from file 06 §4:** [`home/page.tsx:42`](../../src/app/home/page.tsx#L42)
sends `getIdTokenClaims().__raw` — the **ID token** — as a bearer credential, while
[`comment/page.tsx:121`](../../src/components/comment/page.tsx#L121) correctly uses
`getAccessTokenSilently()`. It only works because no route validates `aud`.

---

## 6. If you built it yourself — the full flow

**Ingredients:** `argon2` (or `bcrypt`), `jsonwebtoken`, `crypto`, a `RefreshToken`
collection.

### 6a. Schema

```js
// User
{ email, emailVerified: Boolean, passwordHash, tokenVersion: { type: Number, default: 0 } }

// RefreshToken  — one row per issued token
{ tokenHash,          // sha256(raw), UNIQUE index
  userId,
  familyId,           // the login session; rotation preserves it
  expiresAt,          // TTL index → Mongo evicts expired rows for free
  revokedAt,
  replacedBy,         // the token this one rotated into (audit trail)
  userAgent, ip }     // "sign out other devices" needs these
```

### 6b. Signup

```
POST /api/auth/signup { email, password }
  1. validate: length ≥ 12, check against a breached-password list
  2. hash = await argon2.hash(password)          ← argon2id, memory-hard
  3. insert user, emailVerified: false
  4. email a signed, single-use, 24h verification link
  5. 201 — but do NOT log them in yet
```

**⚠ Never `bcrypt` a raw password over 72 bytes** — bcrypt silently truncates, so
two different long passwords can collide. Either pre-hash with SHA-256 or use
argon2id, which has no such limit.

**⚠ Don't leak which emails are registered.** Return the identical response whether
or not the email exists ("check your inbox"), and send a *"someone tried to sign up
with your address"* mail to the existing account instead.

### 6c. Login

```
POST /api/auth/login { email, password }
  1. rate limit by IP *and* by email       ← both, or credential stuffing walks in
  2. user = findOne({ email })
  3. if (!user) await argon2.hash(dummy)   ← constant-time-ish; don't leak via latency
  4. if (!await argon2.verify(user.passwordHash, password)) → 401 "Invalid credentials"
                                             (never "wrong password" vs "no such user")
  5. if (!user.emailVerified) → 403
  6. accessToken  = jwt.sign({ sub: user._id, tv: user.tokenVersion },
                             SECRET, { expiresIn: "15m", issuer, audience })
     refreshToken = crypto.randomBytes(32).toString("base64url")
  7. insert RefreshToken { tokenHash: sha256(refreshToken), familyId: randomUUID(), ... }
  8. Set-Cookie: rt=<refreshToken>; HttpOnly; Secure; SameSite=Lax;
                 Path=/api/auth/refresh; Max-Age=1209600
  9. return { accessToken, user }          ← access token in the BODY, kept in memory
```

**Note step 3.** Skipping the hash when the user doesn't exist makes "no such user"
measurably faster than "wrong password" — a timing oracle for enumerating accounts.

### 6d. Refresh — with rotation and reuse detection

```
POST /api/auth/refresh   (cookie only, no body)
  1. row = findOne({ tokenHash: sha256(cookie.rt) })
  2. if (!row)                     → 401, clear cookie
  3. if (row.revokedAt)            → 🚨 REUSE
        updateMany({ familyId: row.familyId }, { revokedAt: now })
        → 401, clear cookie, alert
  4. if (row.expiresAt < now)      → 401
  5. rotate:  new raw token, insert new row with the SAME familyId,
              mark old row revokedAt + replacedBy
  6. new access token, signed fresh
  7. Set-Cookie (new rt) + return { accessToken }
```

### 6e. Logout, and the revocation problem

```
POST /api/auth/logout        → revoke this one row, clear cookie
POST /api/auth/logout-all    → revokeMany({ userId }) AND user.tokenVersion++
```

**⚠ Logout does not invalidate the access token.** It's a signed JWT; it stays
valid until `exp` no matter what your DB says. Three options:

| Approach | Cost |
|---|---|
| Accept it — 15-minute window | Free. Usually the right call. |
| `tokenVersion` claim, compared per request | A DB/Redis read on every request |
| Redis denylist of revoked `jti`s, TTL'd to `exp` | One Redis GET; small, self-cleaning |

**📌 Say this** — it's the sentence that shows you understand the model:
> Logging out is a client-side act in a stateless system. You delete the refresh
> token so no *new* access tokens can be minted, but the one already issued keeps
> working until it expires. If that's unacceptable — a banking app, an admin panel —
> you reintroduce state: a `tokenVersion` claim or a Redis denylist keyed by `jti`,
> TTL'd to the token's own expiry so it cleans itself up. **This project already
> runs Redis and caches the user on every authed request, so a denylist would cost
> essentially nothing here.**

That last line lands because it connects auth back to the caching layer in file 05.

### 6f. Password reset

Same single-use-token pattern, and the same rules: token is `randomBytes`, **hashed**
in the DB, 15-minute expiry, deleted on use, and — critically — **revoke every
refresh token for that user on success.** A reset exists to lock an attacker out;
leaving their session alive defeats the point.

### 6g. HS256 or RS256 for your own tokens?

**HS256 is fine when you sign and verify in the same service.** One secret, faster,
simpler. Reach for RS256 when a *different* party verifies (microservices, a mobile
backend, third-party consumers) — then they hold only the public key and can never
forge. This project needs RS256 because Auth0 signs and you verify (file 06 §3).

**⚠ Always pin `algorithms: ["HS256"]` on verify**, exactly as file 06 §7 notes. An
unpinned verifier accepts `alg: none`, or accepts an RS256 public key used as an
HMAC secret.

---

## 7. Auth0 vs. rolling your own

**→ "Why did you use Auth0 instead of building auth?"** — near-certain question.

> Auth0 owns the parts that are easy to get subtly wrong and that nobody sees until
> they're exploited: password hashing and rotation, breached-credential detection,
> email verification and reset flows, social login, MFA, brute-force protection,
> and key rotation. I get all of that plus a hosted login page, which means user
> passwords never touch my servers at all — so my breach surface for credentials is
> zero.
>
> What I gave up is control and portability. My users live in someone else's
> database, I'm bound to their uptime and pricing, and local dev needs a real tenant.
> I also carry the join-table cost: a local `User` document keyed by `auth0Id`,
> upserted on login, because I can't foreign-key into a third-party service.
>
> For a project this size that's clearly the right trade. I'd revisit it if I needed
> unusual login logic, offline-first dev, or if per-MAU pricing started to matter.

| | Auth0 | Own auth |
|---|---|---|
| Time to working login | ~1 hour | ~1–2 weeks done properly |
| Password breach risk | Not your problem | Entirely yours |
| Social / MFA / SSO | Toggle | Weeks each |
| Revocation control | Their model | Total |
| Cost at 100k users | Real money | Server cost |
| Offline / local dev | Needs a tenant | Trivial |

---

## 8. Rapid fire

**Can you invalidate a JWT?** Not the token itself — it's self-validating. You
invalidate the ability to *renew* it (delete the refresh token) and optionally add
state: `tokenVersion` or a `jti` denylist.

**Where do you store the access token?** Memory. Not localStorage — XSS reads it.
Refresh token goes in an httpOnly cookie.

**What if the refresh token is stolen?** Rotation + reuse detection: the thief's
replay revokes the whole family, and the real user is logged out and alerted. Without
rotation, the thief has the account until expiry, undetected.

**Why is the access token short-lived?** It's the token exposed on every request, so
its leak window is what you're minimising. Short expiry is the only mitigation that
works without per-request server state.

**Why is `aud` important?** It's what stops a token minted for API A from being
accepted by API B. **This codebase doesn't check it** (file 06 §7) — volunteer that.

**`state` vs `nonce`?** `state` is CSRF protection on the redirect — you check the
value that comes back is the one you sent. `nonce` is replay protection on the ID
token — it's embedded in the token, so an old one can't be reused.

**Access token vs refresh token vs ID token?** Access = permission to call an API.
Refresh = permission to mint a new access token. ID = a statement about who the user
is, for the UI, never a credential. **This repo sends the ID token as a credential in
one place** — file 06 §4.

**Session cookies vs JWTs?** Sessions are stateful — trivially revocable, need a
shared store, scale by adding Redis. JWTs are stateless — scale free, revoke badly.
For a single app, sessions are honestly often the better default; JWTs earn their
keep when multiple services must verify independently without a shared store.

---

**Back to:** [06 — Auth flow](06-auth-flow.md) · [07 — Interview Q&A](07-interview-qa.md)
