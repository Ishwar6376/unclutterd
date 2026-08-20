# 08 — Access Tokens, Refresh Tokens, and Three Auth Flows

File 06 covers *verification* — JWKS, RS256, the audience bug. This file covers
everything around it: the **cryptography** underneath (§§2–3), **issuance and
renewal** (§§4–6), the **full Auth0 redirect flow** (§7), and **what you'd build
yourself** if you dropped Auth0 (§8).

Read 06 first. This is the sequel.

**If you're short on time:** §2 (hashing vs encryption vs signing) and §3c–3d (the
JWT attacks) are the highest-yield pages in the whole set — they're asked in almost
every backend interview and they're the ones candidates most often fumble.

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

## 2. Encoding, hashing, encryption, signing — the four things people confuse

Interviewers ask this constantly, usually as "what's the difference between hashing
and encryption?", and a surprising number of candidates blur them. Learn this table
cold:

| | Reversible? | Needs a key? | What it gives you | Example |
|---|---|---|---|---|
| **Encoding** | ✅ by anyone | ❌ | Nothing. Just a safe representation | base64url, URL-encoding |
| **Hashing** | ❌ never | ❌ | Integrity, fingerprints, password storage | SHA-256, argon2id |
| **Encryption** | ✅ with the key | ✅ | **Confidentiality** — nobody can read it | AES-GCM, RSA-OAEP |
| **Signing** | n/a — you verify, not reverse | ✅ | **Authenticity + integrity** — nobody can forge or alter it | HMAC-SHA256, RS256 |

**📌 The one-liner:**
> Encoding is for transport, hashing is one-way, encryption hides content, signing
> proves origin. A JWT is **encoded and signed, never encrypted** — so anyone can
> read the payload, but nobody can change it.

---

### 2a. Encoding — and why the JWT payload is public

Base64url is *not* security. It exists because a JWT travels in HTTP headers and
URLs, which can't carry raw bytes. Anyone can paste a token into jwt.io and read
every claim.

`base64url` differs from plain base64 in two ways: `+/` become `-_` (URL-safe), and
the `=` padding is stripped. That's the whole difference.

**⚠ Therefore: never put anything secret in a JWT.** No PII beyond what the client
already knows, no internal IDs you'd rather not leak, never a password or API key.
If you genuinely need a confidential payload you want **JWE**, not JWS (§3f).

---

### 2b. Hashing — one-way, and two very different kinds

A hash is deterministic, fixed-length, and irreversible, with the *avalanche*
property: change one bit of input, roughly half the output bits flip.

The critical distinction, and the one interviews probe:

| | Fast hashes | Password hashes |
|---|---|---|
| Examples | SHA-256, SHA-3, BLAKE3 | **argon2id**, bcrypt, scrypt, PBKDF2 |
| Speed | Billions/sec on a GPU | Deliberately ~100ms each |
| Salted | No (you add one) | Built in, automatically |
| Use for | Integrity, fingerprints, **high-entropy tokens** | **Anything a human chose** |

**⚠ The classic wrong answer is "I hash passwords with SHA-256."** SHA-256 is
*designed to be fast*, which is exactly wrong for passwords: a consumer GPU tries
billions of candidates per second, so a short password falls quickly. A password
hash is deliberately **slow** and, in argon2id/scrypt's case, **memory-hard** — it
needs a large working memory buffer, which is cheap for your one server and ruinous
for an attacker fanning out across thousands of GPU cores. That's the real defence:
not secrecy, but making each guess cost something.

**Salt** — a unique random value per user, stored in plaintext alongside the hash.

> Salt isn't secret; its job is to make *precomputation* useless. Without it, one
> rainbow table cracks every user in every breached database at once, and two users
> with the same password get the same hash — which leaks that fact. A per-user salt
> means the attacker has to start over for every single row.

**Pepper** — an app-wide secret mixed in before hashing, stored **outside** the
database (env var, KMS). If someone dumps the DB but not your server config, the
hashes are uncrackable. It defends the exact scenario salt doesn't: a DB-only leak.

**⚠ Constant-time comparison.** Comparing secrets with `===` leaks information: it
returns early on the first differing byte, so response time reveals how many leading
bytes were right. Use `crypto.timingSafeEqual`, or a library that does it for you —
`argon2.verify` and `bcrypt.compare` already handle it.

```js
// ❌ leaks a byte at a time via timing
if (tokenFromUser === storedToken) { ... }

// ✅
crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))   // throws if lengths differ
```

**→ "So why did you say SHA-256 for the refresh token in §8a?"** — a sharp
interviewer will catch this apparent contradiction. Have the answer ready:

> Because the threat model is different. Password hashing is slow in order to defeat
> *guessing*, and guessing only works because humans pick low-entropy passwords. A
> refresh token is 32 bytes from a CSPRNG — there is nothing to guess and no
> dictionary to run. All I need is a one-way function so a DB leak doesn't yield
> usable tokens, and I need it fast because I look it up on every refresh. Slow
> hashing there would buy no security and add latency to every call.

That answer — *match the primitive to the entropy of the input* — is the actual
principle underneath both choices.

---

### 2c. Encryption — symmetric vs asymmetric

**Symmetric (AES-256-GCM):** one key encrypts and decrypts. Fast, used for bulk
data. GCM is **AEAD** — authenticated encryption — meaning it also detects tampering.
Prefer AEAD modes always; plain AES-CBC is malleable and has produced a decade of
padding-oracle bugs.

**Asymmetric (RSA-OAEP, ECDH):** public key encrypts, private key decrypts. Slow,
and size-limited, so nobody encrypts real data with it directly.

**Hybrid encryption** is what everything actually does, TLS included: generate a
random symmetric key, encrypt the data with AES, encrypt *that key* with the
recipient's public key. You get asymmetric key distribution at symmetric speed.

**⚠ Note the direction flips between encryption and signing** — worth stating
explicitly, because it's the thing that makes asymmetric crypto click:

```
Encrypting:  PUBLIC key locks  →  PRIVATE key unlocks   (anyone can send you a secret)
Signing:     PRIVATE key signs →  PUBLIC key verifies   (anyone can check it was you)
```

---

### 2d. Signing — HMAC vs a true digital signature

Both prove "this wasn't altered and came from someone holding the key." They differ
in *who* can produce one:

| | HMAC (HS256) | Digital signature (RS256, ES256) |
|---|---|---|
| Key | One shared secret | Private signs, public verifies |
| Who can verify | Only someone who could also **forge** | Anyone, and they still can't forge |
| Non-repudiation | ❌ — either party could have made it | ✅ — only the private key holder could |
| Speed | Very fast | Slower to sign, fast to verify |
| Use when | You sign and verify in the same service | A **different** party verifies |

**📌 Say this:**
> HMAC is symmetric, so verification and forgery are the same capability. The moment
> a second party needs to verify my tokens, HMAC forces me to hand them the power to
> mint tokens. That's why Auth0 uses RS256: they hold the private key, I fetch the
> public key from JWKS, and I can check every token but could never issue one.

This is the same argument as file 06 §3, arrived at from the crypto side rather than
the JWKS side. Being able to give it either way is what makes it sound understood
rather than memorised.

---

### 2e. The decision table

| I want to… | Use | Never use |
|---|---|---|
| Store a user password | **argon2id** (bcrypt is fine) | SHA-256, MD5, encryption |
| Store a refresh/reset token | SHA-256 (input is already random) | Plaintext |
| Prove a token wasn't tampered with | HMAC-SHA256 / RS256 | Encoding, "unguessable" IDs |
| Let a *third party* verify tokens | **RS256 / ES256** | HS256 |
| Hide data from the user holding it | AES-256-**GCM**, or JWE | A JWT — it's readable |
| Compare two secrets | `timingSafeEqual` | `===` |
| Generate a token / salt / ID | `crypto.randomBytes` | `Math.random()` |

**⚠ `Math.random()` is not a CSPRNG.** It's seeded predictably and its output stream
can be reconstructed from a few samples. Session IDs, tokens, salts and password
reset codes all need `crypto.randomBytes` / `crypto.randomUUID`.

---

## 3. How a JWT signature is actually computed — and the attacks on it

File 06 §2 gives you the three parts. Here's what actually happens to them.

### 3a. The signing input

The signature is computed over the **base64url header and payload joined by a dot** —
not over the JSON, and not including the signature itself:

```
signingInput = base64url(header) + "." + base64url(payload)
signature    = HMAC-SHA256(signingInput, secret)           // HS256
             = RSASSA-PKCS1-v1_5(signingInput, privateKey) // RS256

jwt = signingInput + "." + base64url(signature)
```

A real, verifiable HS256 example (secret: `a-string-secret-at-least-256-bits-long`):

```
header   {"alg":"HS256","typ":"JWT"}
payload  {"sub":"auth0|68f2c1","iss":"https://unclutterd.auth0.com/","aud":"https://api.unclutterd.dev","iat":1755561600,"exp":1755562500}

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.eyJzdWIiOiJhdXRoMHw2OGYyYzEiLCJpc3MiOiJodHRwczovL3VuY2x1dHRlcmQuYXV0aDAuY29tLyIsImF1ZCI6Imh0dHBzOi8vYXBpLnVuY2x1dHRlcmQuZGV2IiwiaWF0IjoxNzU1NTYxNjAwLCJleHAiOjE3NTU1NjI1MDB9
.rDC8V79l2FfXHDN0wFkY9qnhNcWSbNC_5zSdjKTBoKE
```

Change **one character** of that payload and the recomputed HMAC no longer matches
the third part. That is the entire integrity guarantee — and note that it costs the
verifier no database lookup, which is exactly why JWTs scale and exactly why they
can't be revoked (§1).

### 3b. Verification, in the correct order

```
1. split on "."; base64url-decode the header
2. check alg is in YOUR allowlist        ← BEFORE you trust anything else
3. select the key (by kid, from JWKS)
4. recompute the signature over parts[0] + "." + parts[1]; compare constant-time
5. ⚠ ONLY NOW decode the payload and trust it
6. check claims: exp, nbf, iss, aud
```

**⚠ Step 2 comes before step 3 for a reason.** The header is attacker-controlled and
unauthenticated until step 4 completes. Every JWT attack below is a variation on
"the verifier trusted the header."

### 3c. `alg: none`

The JWT spec includes an "unsecured" mode where `alg` is `none` and the signature is
empty. A verifier that reads `alg` from the header and dispatches on it will happily
accept `{"alg":"none"}` with **any payload you like** and no signature at all.

```
eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.        ← note the empty third part
```

**Defence:** pin the algorithm — `algorithms: ["RS256"]`. Your routes do this
correctly (file 06 §7); it is the single most important verify option.

### 3d. RS256 → HS256 confusion

The elegant one, and the best answer to "tell me about a JWT attack."

> The server expects RS256 and verifies with Auth0's public key. The attacker
> changes the header to `alg: HS256` and signs the token using **that public key as
> the HMAC secret**. A verifier that picks the algorithm from the header does the
> symmetric thing with the only key it has — the public one — and the signature
> matches. The attacker forged a token out of nothing but public information.

The root cause isn't the algorithms; it's that the *key type* and the *algorithm*
were chosen independently, one by the server and one by the attacker. Pinning
`algorithms` fixes it because the key and the algorithm are then decided together.

### 3e. The rest of the list

**Unverified decode.** `jwt.decode()` parses without checking anything. It exists for
inspection, and it appears in production code more often than you'd hope. If a route
reads `sub` from `decode()` and trusts it, auth is fully bypassed by editing the
payload. Only `jwt.verify()` counts.

**`kid` injection.** `kid` is a string the attacker controls, and it's used to look up
a key. If the implementation treats it as a **file path** (`../../dev/null`, then sign
with an empty key) or interpolates it into **SQL**, that's traversal or injection
inside your auth layer. `jwks-rsa` looks it up in a fetched key set, so this repo is
fine — but it's why "never build a key path out of `kid`" is a rule.

**`jku` / `x5u` header injection.** These headers name a *URL* to fetch the verifying
key from. Honour them and an attacker points you at their own key set and signs
whatever they like. Never fetch keys from a location the token specifies; the JWKS
URI belongs in your config, as it is here (file 06 §3).

**Weak HMAC secret.** HS256 with a secret like `"secret"` or `"mysecretkey"` is
brute-forceable offline in seconds — hashcat has a mode for exactly this. If you use
HS256, use ≥256 bits from `crypto.randomBytes(32)`.

**Missing claim checks.** A valid signature only proves *someone with the key* issued
it. Without `exp` you've built a permanent credential; without `iss`/`aud` you accept
tokens minted for a different API — **which is this codebase's live bug** (file 06 §7).

### 3f. JWS vs JWE

What everyone calls "a JWT" is a **JWS** — JSON Web *Signature*: signed, readable.

**JWE** — JSON Web *Encryption* — has five parts instead of three, and the payload is
genuinely encrypted, so even the holder can't read it.

**→ If asked "when would you use JWE?"**
> Almost never for an access token, because the client is supposed to know who it is,
> and a JWE still can't be revoked. It's for cases where the token passes through a
> party who shouldn't read the claims — an opaque session cookie carrying internal
> state, or claims a partner relays but mustn't see. In practice, if the content is
> that sensitive the better answer is usually to keep it server-side and hand out an
> opaque reference, exactly like the refresh tokens in §4.

### 3g. The registered claims

| Claim | Name | Why it matters |
|---|---|---|
| `iss` | Issuer | Who minted it. Verify it. |
| `sub` | Subject | The user. Auth0 puts `auth0\|abc123` here — your `auth0Id`. |
| `aud` | Audience | **Which API it's for.** ⚠ Unchecked in this repo. |
| `exp` | Expires | Seconds since epoch, **not** ms. |
| `nbf` | Not before | Rarely used; clock-skew footgun. |
| `iat` | Issued at | Lets you reject tokens older than a password change. |
| `jti` | JWT ID | Unique ID — **the hook for a revocation denylist** (§8e). |

**⚠ `exp` is in seconds, `Date.now()` is milliseconds.** Signing `exp: Date.now() +
900000` creates a token that expires roughly 55,000 years from now. Use
`Math.floor(Date.now() / 1000) + 900`, or just pass `expiresIn: "15m"` and let the
library do it.

---

## 4. The two tokens, side by side

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

## 5. The refresh dance

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

### 5a. The stampede problem — the detail that separates candidates

Your comment page fires several requests at once (comments, votes, bookmarks). The
access token expires. **All of them 401 simultaneously**, and all of them call
`/refresh` at once. With rotation on, the first call invalidates the token the other
four are still holding — so four of them fail, and with reuse detection (§5b) you
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

### 5b. Rotation and reuse detection

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

## 6. Where to store tokens — pick your poison

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

## 7. Auth0's flow: Authorization Code + PKCE

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

## 8. If you built it yourself — the full flow

**Ingredients:** `argon2` (or `bcrypt`), `jsonwebtoken`, `crypto`, a `RefreshToken`
collection.

### 8a. Schema

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

### 8b. Signup

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

### 8c. Login

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

### 8d. Refresh — with rotation and reuse detection

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

### 8e. Logout, and the revocation problem

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

### 8f. Password reset

Same single-use-token pattern, and the same rules: token is `randomBytes`, **hashed**
in the DB, 15-minute expiry, deleted on use, and — critically — **revoke every
refresh token for that user on success.** A reset exists to lock an attacker out;
leaving their session alive defeats the point.

### 8g. HS256 or RS256 for your own tokens?

**HS256 is fine when you sign and verify in the same service.** One secret, faster,
simpler. Reach for RS256 when a *different* party verifies (microservices, a mobile
backend, third-party consumers) — then they hold only the public key and can never
forge. This project needs RS256 because Auth0 signs and you verify (file 06 §3).

**⚠ Always pin `algorithms: ["HS256"]` on verify**, exactly as file 06 §7 notes. An
unpinned verifier accepts `alg: none`, or accepts an RS256 public key used as an
HMAC secret.

---

## 9. Auth0 vs. rolling your own

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

## 10. Rapid fire

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

**Hashing vs encryption?** Hashing is one-way and keyless — you can only ever
recompute and compare. Encryption is two-way and keyed — it's for data you need back.
Passwords are hashed, never encrypted; encrypting them means someone holds a key that
turns the whole table back into plaintext.

**Why not SHA-256 for passwords?** It's built to be fast, and speed is the attacker's
resource. A GPU does billions of SHA-256s a second. argon2id is slow *and*
memory-hard, so parallelising it costs real RAM per guess.

**Salt vs pepper?** Salt is per-user, stored next to the hash, and kills
precomputed rainbow tables plus the "same password → same hash" leak. Pepper is one
app-wide secret stored outside the DB, so a database-only breach yields nothing.

**Is a hash the same as a signature?** No. A bare hash proves nothing — an attacker
who edits the data recomputes the hash. A signature is a hash **plus a key**, so only
a key holder can produce a valid one.

**HMAC vs digital signature?** HMAC uses one shared secret, so anyone who can verify
can also forge, and there's no non-repudiation. RS256/ES256 splits it: private key
signs, public key verifies. Needed the moment a second party verifies your tokens.

**Is a JWT encrypted?** No — signed. Base64url is encoding, not encryption; anyone can
read the payload. Signing gives integrity and authenticity, not confidentiality. If
you truly need the payload hidden, that's JWE, not JWS.

**Name a JWT attack.** `alg: none`, or RS256→HS256 confusion: flip the header to
HS256 and sign with the server's *public* key as the HMAC secret. A verifier that
takes `alg` from the header accepts it. Fix: pin `algorithms` — which this repo does.

**Session cookies vs JWTs?** Sessions are stateful — trivially revocable, need a
shared store, scale by adding Redis. JWTs are stateless — scale free, revoke badly.
For a single app, sessions are honestly often the better default; JWTs earn their
keep when multiple services must verify independently without a shared store.

---

**Back to:** [06 — Auth flow](06-auth-flow.md) · [07 — Interview Q&A](07-interview-qa.md)
