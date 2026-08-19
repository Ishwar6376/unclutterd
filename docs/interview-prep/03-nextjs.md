# 03 — Next.js (and how it differs from React)

The "React vs Next.js" question is close to guaranteed. Section 1 is the highest-
value thing in this file. Learn it properly.

---

## 1. React vs Next.js — the answer

**The one-liner:**

> React is a **library** for building user interfaces — just the view layer.
> Next.js is a **framework** built *on top of* React that supplies everything React
> deliberately leaves out: routing, server-side rendering, an API layer, bundling,
> and optimization.

**The elaboration, if they want more:**

React alone gives you components, state, and a way to render them into a DOM node.
That's it. It has no opinion about:

| Concern | Plain React (e.g. Vite/CRA) | Next.js |
|---|---|---|
| Routing | Install React Router, configure it | **File-system based** — a folder becomes a URL |
| Rendering | Client-side only; browser gets an empty `<div id="root">` and JS fills it | Server-side, static, streaming, or client — per route |
| Backend / API | Separate Express/Nest server, separate deploy, CORS | `route.ts` files in the same project |
| Data fetching | `useEffect` + fetch, after mount | Can fetch on the **server** before the HTML is sent |
| Bundling / splitting | Configure Webpack/Vite yourself | Automatic per-route code splitting |
| Images, fonts | Manual | `next/image`, `next/font` with optimization built in |
| SEO | Poor by default — crawlers see an empty shell | Good — real HTML is served |

**📌 Say this:** "The practical difference in this project is that I didn't have to
stand up a separate backend. My API routes live in `src/app/api/` next to my pages,
share the same TypeScript types and the same deployment, and I get one `npm run dev`
for the whole stack."

**→ If asked "when would you NOT use Next.js?"** (a real senior-level follow-up)
> If I'm building something behind a login with no SEO requirement — an internal
> dashboard, say — the server rendering buys me little, and plain React with Vite
> is a simpler, faster build. Next.js earns its complexity when you need SEO, fast
> first paint on slow connections, or you want the API colocated.

---

## 2. Rendering strategies — know all four

This is the classic follow-up. The difference is **where and when the HTML is built.**

**CSR — Client-Side Rendering.** The server sends a nearly empty HTML file plus a
JS bundle. The browser downloads, parses, executes, then renders. Slow first paint,
bad for SEO, but cheap and fine after the app has loaded.

**SSR — Server-Side Rendering.** The server runs the React components **per request**
and sends complete HTML. The browser shows content immediately, then **hydration**
attaches event listeners to make it interactive. Good SEO, good first paint, costs
server CPU per request. Use when content is personalized or changes constantly.

**SSG — Static Site Generation.** HTML is built once **at build time** and served
from a CDN. Fastest possible, but content is frozen until the next deploy. Use for
blogs, docs, marketing pages.

**ISR — Incremental Static Regeneration.** SSG plus a revalidation window. Serve
the cached static page; after N seconds, the next request triggers a rebuild in the
background. You get CDN speed with content that isn't stale forever.

**→ If asked "which would you use for the question feed?"**
> The feed is public and mostly the same for everyone, so ISR would be a real win —
> serve a statically generated feed revalidating every 30 seconds or so. The comment
> threads are personalized (each user's own votes and bookmarks are baked into the
> response), so those stay client-rendered or would need the personalized part split
> out. Right now everything is client-rendered, which is the honest weakness of this
> implementation.

**Hydration** — worth being able to define: the process where React takes
server-rendered HTML and attaches its event handlers and state to it, "adopting"
the existing DOM instead of rebuilding it. A **hydration error** happens when the
server HTML and the first client render disagree — commonly caused by
`Date.now()`, `Math.random()`, or reading `window` during render.

---

## 3. App Router vs Pages Router

This project uses the **App Router** (`src/app/`), the modern one, default since
Next 13.

| | Pages Router (`pages/`) | App Router (`app/`) |
|---|---|---|
| Component default | Client Components | **Server Components** |
| Data fetching | `getServerSideProps`, `getStaticProps` | `async` components, `fetch` with caching |
| Layouts | One `_app.tsx` for everything | Nested `layout.tsx` per folder, preserved across navigation |
| API | `pages/api/x.ts` | `app/api/x/route.ts` with Web `Request`/`Response` |
| Streaming | No | Yes, with `loading.tsx` and Suspense |

---

## 4. File conventions — the routing system

In the App Router, **folders define URLs and specially-named files define behaviour.**

```
src/app/
├── layout.tsx            → root layout, wraps EVERY page (html/body live here)
├── page.tsx              → "/"                    (the landing page)
├── globals.css
├── home/page.tsx         → "/home"
├── ask/page.tsx          → "/ask"
├── question/[id]/page.tsx→ "/question/:id"        (dynamic segment)
├── user/[id]/page.tsx    → "/user/:id"
└── api/
    ├── getComments/route.ts   → GET  /api/getComments
    ├── postComment/route.ts   → POST /api/postComment
    └── auth/[...auth0]/route.ts → catch-all: /api/auth/anything/here
```

The filenames that matter:

- **`page.tsx`** — makes a route publicly reachable. A folder without one isn't a URL.
- **`layout.tsx`** — wraps its folder's pages. **Persists across navigation** — it
  does not re-render or lose state when you move between child pages. This project's
  root layout holds the fonts and the `AuthProvider`, which is exactly right: auth
  context stays mounted across every page.
- **`route.ts`** — an API endpoint. Exports functions named for HTTP verbs.
- **`[id]`** — dynamic segment, read with `useParams()` on the client.
- **`[...auth0]`** — catch-all, matches any number of segments.
- Also exist (unused here): `loading.tsx`, `error.tsx`, `not-found.tsx`, `template.tsx`.

---

## 5. Server Components vs Client Components — `"use client"`

**This is the single biggest conceptual shift in modern Next.js.** Expect a question.

In the App Router, **every component is a Server Component by default.** It runs on
the server, its code is never sent to the browser, and it can `await` a database
call directly.

Adding `"use client"` at the top of a file opts that file — and everything it
imports — into being a **Client Component**: shipped to the browser, hydrated, able
to use hooks and browser APIs.

| | Server Component | Client Component |
|---|---|---|
| Runs | On the server | Server (for initial HTML) **and** browser |
| Ships JS to browser | **No** | Yes |
| `useState` / `useEffect` | ❌ | ✅ |
| `onClick` and other handlers | ❌ | ✅ |
| Direct DB access | ✅ | ❌ |
| `window` / `localStorage` | ❌ | ✅ |

**The rule:** you must add `"use client"` the moment you need state, an effect, an
event handler, or a browser API.

**⚠ The honest weakness of this project:** almost every component here starts with
`"use client"` — the landing page, home, the question page, the whole comment tree.
So the app is effectively a client-side React SPA that happens to be served by
Next.js, and it isn't using the App Router's main advantage.

**→ If asked "why is everything a client component?"** — Answer honestly, it's a
strong answer:
> Because the comment tree needs state and event handlers at every level, and once
> a component is a client component everything it imports becomes one too — the
> boundary is contagious downward. Also, Auth0's React SDK is client-side, so the
> whole tree under the provider has to be client. If I refactored, I'd move to
> Auth0's server-side SDK, render the static shell — question title, body, images —
> as Server Components, and keep only the interactive comment widgets as client
> islands. That would cut the JS bundle significantly and let the question content
> be server-rendered for SEO.

That answer demonstrates you understand the model *and* can see the migration path.
It's much better than pretending it was deliberate.

**Extra credit:** a Server Component can *render* a Client Component, but not the
reverse (you can only pass one through as `children`). And props crossing the
boundary must be serializable — you can't pass a function from a server component
to a client component.

---

## 6. Route Handlers — the API layer

```ts
// src/app/api/getComments/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("questionId");
  return NextResponse.json({ comments }, { status: 200 });
}
```

Key points:

- Export a function **named after the HTTP method**: `GET`, `POST`, `PATCH`,
  `DELETE`, `PUT`. That's how routing to a handler works — no `if (method === ...)`.
- The argument is a standard **Web `Request`**, not Express's `req`. Read the body
  with `await req.json()`, headers with `req.headers.get("authorization")`, query
  params by constructing `new URL(req.url)`.
- `NextResponse.json(body, { status })` builds the response.
- These run **server-side only**, so secrets like `MONGODB_URI`, `AUTH0_CLIENT_SECRET`
  and `CLOUDINARY_API_SECRET` are safe here.

The verbs used in this project map sensibly onto REST semantics:
`GET` for reads, `POST` to create a comment, `PATCH` for votes/saves/edits (partial
update), `DELETE` for deletion.

**⚠ Gotcha:** the routes are named `getComments`, `postComment`, `deleteComment` —
verbs in the URL. RESTful design would use one `/api/comments` resource with the
HTTP method carrying the verb. Worth acknowledging if asked about API design:
> The naming isn't RESTful — I've got the verb in the path and in the method. A
> cleaner design is a single `/api/comments` route exporting GET/POST/PATCH/DELETE.

**⚠ Gotcha:** `DELETE` requests carry a JSON body here (`{ commentId }`). That works
but is unconventional — bodies on DELETE aren't universally supported by proxies. A
query param or path segment would be safer.

---

## 7. Environment variables — a favourite interview question

```
MONGODB_URI=...                      ← server only, never sent to browser
AUTH0_CLIENT_SECRET=...              ← server only
NEXT_PUBLIC_AUTH0_DOMAIN=...         ← inlined into the browser bundle
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...← inlined into the browser bundle
```

**The rule:** only variables prefixed **`NEXT_PUBLIC_`** are exposed to the browser.
Next.js **statically replaces** them in the bundle at build time — which means two
things people get wrong:

1. Anything with that prefix is **public**. Assume it's on a billboard.
2. They're baked in at **build** time, not read at runtime, so changing one requires
   a rebuild, not just a restart.

**→ If asked "how do you keep secrets out of the client?"**
> Any variable without the `NEXT_PUBLIC_` prefix is only readable in server contexts
> — route handlers, server components, middleware. If I reference one in a client
> component it comes back `undefined`. So the Mongo URI and the Cloudinary API
> secret live only in the route handlers.

Note this project has both `AUTH0_DOMAIN` (server, used for JWT verification) and
`NEXT_PUBLIC_AUTH0_DOMAIN` (client, used by the SDK) — same value, two names,
because both sides need it and only one side is allowed the unprefixed one.

---

## 8. Middleware

`src/middleware.ts` runs **before a request reaches a route**, on the Edge runtime.
Typical uses: auth gating, redirects, locale detection, rewrites.

```ts
export function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL("/home", request.url));
}
export const config = { matcher: "/about/:path*" };
```

**⚠ This file is untouched Next.js boilerplate.** It matches `/about/*`, a route
that doesn't exist in this app, so it never runs.

**→ If asked about it, don't bluff:**
> That's leftover scaffolding, it's dead. Where middleware *would* earn its place
> here is route protection — right now `/home` and `/ask` are reachable without
> logging in and each API route re-verifies the JWT by copy-pasted code. Middleware
> could do the redirect for unauthenticated page requests centrally.

Know the limits: middleware runs on the **Edge runtime**, so no Node APIs, no
Mongoose, no filesystem. That's precisely why the auth check *can't* simply move
there wholesale — it can verify a JWT, but it can't hit MongoDB.

---

## 9. Other Next.js features this project uses

**`next/font`** —
```tsx
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
```
Downloads the font at **build time** and self-hosts it. No request to Google Fonts
at runtime, so no extra round trip and no layout shift (it generates the fallback
metrics automatically). Exposed as a CSS variable.

**Metadata API** —
```tsx
export const metadata: Metadata = { title: "Unclutter" };
```
The App Router way to set `<head>` tags. Replaces `next/head`.

**`useParams()`** — reads a dynamic segment client-side:
```tsx
const { id } = useParams();   // from /question/[id]
```

**`useRouter()` from `next/navigation`** — programmatic navigation. Note the import
path: `next/navigation` in the App Router, `next/router` in the Pages Router.
Mixing them up is a common error.

**⚠ Not used but should be:** `next/image`. The project uses raw `<img>` tags for
Cloudinary images. `next/image` gives automatic resizing, WebP/AVIF conversion,
lazy loading, and reserved space to prevent layout shift. **This is an easy,
credible "what would you improve" answer.**

---

## 10. Quick-fire Next.js answers

**"What does `npm run build` do?"** — Compiles and bundles, type-checks, pre-renders
every static route to HTML, and reports which routes are static vs dynamic.

**"How is Next deployed?"** — Vercel natively; anywhere Node runs via `next start`;
or as a standalone Docker output. Serverless deployment is why the Mongoose
connection-caching pattern in `dbConfig.ts` exists — see file 04, it's a great
question to be ready for.

**"What's code splitting?"** — Next automatically splits the bundle per route, so
visiting `/home` doesn't download the code for `/ask`. `next/dynamic` gives you
manual control plus optional `ssr: false`.

**"App Router caching?"** — Next 15 caches at several layers: the fetch cache,
the full route cache, and the client-side router cache. In Next 15 `fetch` is
**no longer cached by default** (it was in 14) — a change worth knowing if you
claim Next 15 on your CV. This project doesn't use it, since it fetches with axios
from client components, which bypasses Next's cache entirely.

**"Why is `dynamic = 'force-dynamic'` sometimes needed?"** — To opt a route out of
static generation when it depends on request-time data. Not used here (these routes
read headers, so Next treats them as dynamic automatically).

---

**Next:** file 04 (MongoDB).
