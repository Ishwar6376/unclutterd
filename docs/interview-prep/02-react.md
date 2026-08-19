# 02 — React (as used in this project)

You said React is a weak spot. This file teaches the concepts properly, but every
example is code that actually exists in this repo, so you're revising and learning
at the same time.

Main file to keep open alongside this: [`src/components/comment/page.tsx`](../../src/components/comment/page.tsx).

---

## 1. The one idea React is built on

**UI is a function of state.**

```
UI = f(state)
```

You never touch the DOM directly. You change state, and React figures out what the
DOM should look like and updates it for you.

Compare the two styles:

```js
// Imperative (vanilla JS) — you describe the STEPS
const el = document.getElementById("count");
el.textContent = count + 1;

// Declarative (React) — you describe the RESULT
<span>{count}</span>   // and call setCount(count + 1)
```

**→ If asked "why React?"**
> Because manually keeping the DOM in sync with data doesn't scale. Once you have
> a comment tree where a vote changes a number, a colour, and an aria state in
> three places, imperative updates become a source of bugs. React lets me declare
> what the UI should look like for a given state and it handles the diffing.

**📌 Say this:** "React is a *library* for building UIs — it's just the view layer.
It has no opinion about routing, data fetching, or the server. That's exactly the
gap Next.js fills." (This sets up the Next.js question before they ask it.)

---

## 2. Components and props

A component is a function that takes **props** (inputs) and returns **JSX** (a
description of UI).

```tsx
type Props = { questionId: string };

export default function Comment({ questionId }: Props) {
  return <div>...</div>;
}
```

**Props are read-only.** A child cannot modify a prop. Data flows **down**;
to send something back **up**, the parent passes a *callback function* down. This
project does exactly that:

```tsx
<CommentItem
  comment={c}
  onDelete={handleCommentDelete}   // child calls this to tell parent "I was deleted"
  onEdit={handleCommentEdit}
/>
```

This is called **lifting state up**: the comments array lives in the parent, so
the child can't change it directly — it calls `onDelete(id)` and the *parent*
updates its own state.

**JSX** is not HTML. `<div className="x" />` compiles to
`React.createElement("div", { className: "x" })`. That's why it's `className` not
`class` (`class` is a reserved word in JS) and why `{}` embeds real JavaScript.

---

## 3. `useState` — the core hook

```tsx
const [comments, setComments] = useState<CommentType[]>([]);
//     ^current   ^setter                        ^initial value
```

**→ If asked "why not just use a normal variable?"**
> Two reasons. A normal variable resets on every render, because the component
> function reruns top to bottom each time. And changing it wouldn't tell React
> anything — no re-render would happen. `useState` gives me a value that *survives*
> across renders and a setter that *schedules* a re-render.

### Three rules that trip people up

**(a) State updates are asynchronous and batched.**

```tsx
setVotes(votes + 1);
console.log(votes);   // ⚠ still the OLD value — this render's `votes` is a constant
```

React batches multiple `setState` calls in the same event handler into one
re-render, for performance. The variable in the current render never changes.

**(b) Use the functional form when the new value depends on the old one.**

This codebase uses it constantly, and you should be able to explain why:

```tsx
setComments(prev => [tempComment, ...prev]);        // ✅
setComments([tempComment, ...comments]);            // ⚠ risky
```

The functional form receives the *latest* state, not the value captured when the
closure was created. If two updates queue up, the second one still sees the first
one's result. The direct form can silently drop an update.

**(c) State must be replaced, not mutated.**

```tsx
comments.push(newComment);   // ❌ React sees the same array reference → no re-render
setComments(prev => [...prev, newComment]);  // ✅ new array → re-render
```

React compares by reference (`Object.is`). Same reference means "nothing changed."

**⚠ Gotcha in this repo:** `handleReply` does
`comment.replyCount = (comment.replyCount || 0) + 1` — mutating a prop directly.
It happens to appear to work because a sibling state update re-renders the
component anyway, but it's a real anti-pattern. If asked to critique your own code,
this is a good honest one to raise.

### The update patterns used here

**Map-to-update** (change one item in a list):
```tsx
setComments(prev => prev.map(c =>
  c._id === deletedId ? { ...c, body: "[deleted]" } : c
));
```
Returns a *new* array where one item is a *new* object; all others keep their old
reference (which helps React skip re-rendering them).

**Filter-to-remove** (rollback of a failed optimistic insert):
```tsx
setComments(prev => prev.filter(c => c._id !== tempId));
```

**Merge-and-dedupe** (appending a page of results):
```tsx
const merged = [...prev, ...transformed];
return Array.from(new Map(merged.map(c => [c._id, c])).values());
```
Building a `Map` keyed by `_id` collapses duplicates — later entries overwrite
earlier ones. Needed because pagination can return an overlapping item if a
comment was inserted between requests.

---

## 4. `useEffect` — the most misunderstood hook

**Mental model:** "after React has rendered and committed to the DOM, run this
side effect."

A *side effect* is anything outside React's render: network calls, timers,
subscriptions, direct DOM APIs, logging.

```tsx
useEffect(() => {
  // effect body — runs after render
  return () => { /* cleanup — runs before the next effect, and on unmount */ };
}, [dep1, dep2]);   // dependency array
```

### The dependency array is the whole game

| Form | When it runs |
|---|---|
| `useEffect(fn)` — no array | After **every** render. Almost always a bug. |
| `useEffect(fn, [])` — empty | **Once** after the first render (mount). |
| `useEffect(fn, [a, b])` | On mount, and whenever `a` or `b` changes (compared with `Object.is`). |

React compares each dependency to its previous value. If any differ, it runs the
cleanup from last time, then the effect again.

### Cleanup — why it matters

This repo's observer effect returns a cleanup:

```tsx
useEffect(() => {
  if (observerRef.current) observerRef.current.disconnect();
  observerRef.current = new IntersectionObserver(...);
  observerRef.current.observe(trigger);

  return () => observerRef.current?.disconnect();   // ← cleanup
}, [hasMore, loading, cursor]);
```

Without the cleanup you'd leak an observer on every dependency change. The
component would end up with dozens of live observers all firing `fetchComments`.
**Cleanup prevents leaks and duplicate subscriptions.**

### ⚠ The `hasFetched` ref — a genuinely good interview story

```tsx
const hasFetched = useRef(false);

useEffect(() => {
  if (!hasFetched.current) {
    hasFetched.current = true;
    fetchComments();
  }
}, []);
```

**Why is this guard here if the array is empty?** Because in **development**,
React 18+ **StrictMode** deliberately mounts every component, unmounts it, and
mounts it again, to surface effects that aren't cleanup-safe. So a `[]` effect
fires **twice** in dev, which fired two fetches and double-loaded comments. The
ref survives that remount cycle and blocks the second call.

**→ If asked about it:**
> That's a guard against React StrictMode's double-invoke in development. The
> *proper* fix is an AbortController in the cleanup so the first request is
> cancelled rather than deduped by a flag — the ref approach works but it's
> papering over the symptom.

Saying that shows you know *why* StrictMode does it, not just that it does.

### ⚠ Stale closures

The classic `useEffect` trap:

```tsx
useEffect(() => {
  const t = setInterval(() => console.log(count), 1000);
  return () => clearInterval(t);
}, []);   // count is captured from the FIRST render, forever
```

The effect closes over `count` as it was at mount. Fixes: add `count` to deps, or
use the functional setter form. This is why the observer effect in this repo lists
`[hasMore, loading, cursor]` — it must rebuild the observer whenever those change,
or the callback would call `fetchComments` with stale values.

---

## 5. `useRef` — two completely different jobs

```tsx
const ref = useRef(initialValue);   // → { current: initialValue }
```

A ref is a **mutable box that persists across renders and does NOT trigger a
re-render when changed.** That's the whole definition. It's used for two things:

**(a) Grabbing a DOM node:**
```tsx
const scrollContainerRef = useRef<HTMLDivElement>(null);
...
<div ref={scrollContainerRef} className="overflow-y-auto">
```
React assigns the real DOM element to `.current` after mount.

**(b) Storing a mutable value that shouldn't cause renders:**
```tsx
const hasFetched = useRef(false);              // a flag
const observerRef = useRef<IntersectionObserver | null>(null);  // an object
```

**→ If asked "useRef vs useState?"**
> Both persist across renders. The difference is that changing state schedules a
> re-render and changing a ref doesn't. So: if the value should appear in the UI,
> it's state. If it's bookkeeping — a flag, a timer ID, a DOM node, an observer
> instance — it's a ref. Putting an observer in state would cause an infinite
> render loop.

---

## 6. Lists and the `key` prop

```tsx
{comments.map(c => <CommentItem key={c._id} comment={c} ... />)}
```

**→ If asked "why keys?"**
> Keys let React's reconciler match elements between renders. Without them React
> matches by position, so inserting an item at the top makes it think every
> element changed, which throws away DOM state — a half-typed reply box would jump
> to the wrong comment. With a stable key React knows "this is the same comment,
> it just moved."

**Never use the array index as a key** in a list that reorders or has items
inserted at the front — which is exactly this project's case, since new comments
go to the top. Using `_id` is correct.

This is also why the optimistic temp ID matters: the fake comment gets
`_id: "temp-1699..."`, and when the server responds React swaps it for the real
one. The key changes, React unmounts the temp node and mounts the real one.

---

## 7. Controlled components

```tsx
<textarea value={comment} onChange={e => setComment(e.target.value)} />
```

The React state is the **single source of truth** for the input's value. The DOM
input doesn't hold its own state — every keystroke fires `onChange`, updates state,
and re-renders with the new value.

**→ If asked "controlled vs uncontrolled?"**
> Controlled means React state drives the input value. Uncontrolled means the DOM
> holds the value and you read it with a ref when you need it. Controlled gives you
> validation, formatting, and conditional disabling for free — that's why the
> Comment button here can be `disabled={!comment.trim()}`. The cost is a re-render
> per keystroke, which only matters on very large forms.

---

## 8. Conditional rendering

Three patterns, all used in this file:

```tsx
{isEditing ? <textarea/> : <p>{body}</p>}          // ternary — either/or
{showReplyBox && <ReplyBox/>}                       // && — render or nothing
{comments.length === 0 && !loading ? <Empty/> : <List/>}
```

**⚠ Gotcha with `&&`:** if the left side is the number `0`, React renders "0" on
screen instead of nothing — because `0` is falsy but still a valid React node.
This repo has a live instance:

```tsx
{(comment.replyCount || replies.length) > 0 && (...)}   // ✅ safe, compares to > 0
```
That one's fine because it compares. But `{items.length && <List/>}` would print
a bare `0`. Good detail to mention if asked about React gotchas.

---

## 9. Recursive components — the interesting bit

`CommentItem` renders `CommentItem`:

```tsx
function CommentItem({ comment, onDelete, onEdit }) {
  ...
  return (
    <div style={{ marginLeft: comment.parentId ? 20 : 0 }}>
      {/* ...this comment... */}
      {showReplies && replies.map(r => (
        <CommentItem key={r._id} comment={r} onDelete={handleReplyDelete} ... />
      ))}
    </div>
  );
}
```

**→ If asked "how do you render an arbitrarily nested comment tree?"**
> A component that renders itself. The base case is a comment with no loaded
> replies, so recursion terminates naturally. Each level fetches its own children
> lazily — only when you click "show replies" — so the initial payload is one level
> deep regardless of how deep the thread goes. Indentation is driven by whether
> `parentId` is set.

**Follow-up they may ask: "what happens at 100 levels deep?"**
> Two problems. Visually the indentation runs off screen, so real products cap
> nesting — Reddit collapses past a depth and gives you a "continue thread" link.
> Technically, each level is a component with its own state and its own
> IntersectionObserver, so deep trees get memory-heavy. I'd cap render depth and
> flatten beyond it.

That's a strong answer because it shows product thinking *and* technical awareness.

**Note the state isolation:** every `CommentItem` has its own `votes`, `saved`,
`replies`, `showReplies`. That's why one comment's reply box opening doesn't
affect its siblings — each instance of a component gets its own independent state.

---

## 10. Optimistic UI — a genuine talking point

```tsx
const tempId = `temp-${Date.now()}`;
setComments(prev => [tempComment, ...prev]);   // 1. show it immediately
setComment("");                                 // 2. clear the box

try {
  const res = await axios.post("/api/postComment", {...});
  setComments(prev => prev.map(c => c._id === tempId ? realComment : c));  // 3. swap
} catch {
  setComments(prev => prev.filter(c => c._id !== tempId));                 // 4. rollback
}
```

**→ If asked "what is optimistic UI?"**
> Updating the interface as if the request already succeeded, then reconciling
> when the response lands. It makes the app feel instant instead of showing a
> spinner for 300 ms. The requirement is that you must be able to roll back — here,
> if the POST fails I remove the temporary comment. It's only appropriate when
> failure is rare and the rollback is cheap and non-destructive. I wouldn't do it
> for a payment.

The voting handler does the same thing, and its rollback is more careful — it
snapshots `prevVotes` and `prevUserVote` before mutating and restores both on error.

**Vote arithmetic worth understanding:**
```tsx
let newVote = userVote === value ? 0 : value;   // clicking the same arrow toggles off
const newVotes = votes - userVote + newVote;    // remove old contribution, add new
```
Downvote (−1) → upvote (+1) is a swing of 2: `votes - (-1) + 1`. Clean formula,
worth being able to derive on a whiteboard.

---

## 11. IntersectionObserver + infinite scroll

Not a React API — a browser API — but React manages its lifecycle.

```tsx
observerRef.current = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting && hasMore && !loading) fetchComments();
  },
  { threshold: 0.1, rootMargin: "100px" }
);
observerRef.current.observe(loadMoreTriggerRef.current);
```

An invisible sentinel `<div>` sits at the bottom of the list. When it scrolls into
view, the callback fires and the next page loads.

**→ If asked "why not a scroll event listener?"**
> Scroll events fire on every frame and run on the main thread, so you have to
> throttle them and do manual `getBoundingClientRect` maths, which forces layout.
> IntersectionObserver is handled by the browser off the main thread and just tells
> me when the element enters the viewport. `rootMargin: 100px` makes it fire 100
> pixels *before* the sentinel is actually visible, so the next page is already
> loading by the time the user gets there.

The `!loading` guard prevents firing a second request while one is in flight.

---

## 12. Global state — Zustand

```tsx
export const useUserStore = create<UserState>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),
}));

// anywhere, no provider needed:
const User = useUserStore().user;
```

**→ If asked "why Zustand instead of Context or Redux?"**
> The logged-in user is needed by components at very different depths — the comment
> box, every comment item, the header — so prop drilling was out. Context would
> work, but every consumer re-renders whenever *any* part of the context value
> changes. Zustand lets components subscribe to a slice, so a component reading
> `user` doesn't re-render when `accessToken` changes. And Redux would mean
> actions, reducers, and a provider for what is genuinely one small store.

**⚠ Gotcha in this repo:** `useUserStore().user` subscribes to the *whole* store,
which throws away Zustand's main advantage. The selector form
`useUserStore(s => s.user)` — used correctly in `profile/page.tsx` — is the right
way. Good self-critique material.

**Also worth knowing:** this store isn't persisted, so a hard refresh empties it
until `AuthSync` repopulates it from Auth0.

---

## 13. Quick-fire definitions

**Virtual DOM** — an in-memory tree of what the UI should look like. React diffs
the new tree against the old and applies the minimal set of real DOM changes.
DOM mutations are the expensive part; diffing objects in memory is cheap.

**Reconciliation** — the diffing algorithm. Same type + same key → update in place.
Different type → tear down and rebuild.

**Why hooks must be called at the top level, never in conditions or loops** —
React tracks hooks by *call order*, not by name. It's an array indexed by position.
If a hook is skipped by an `if`, every subsequent hook shifts index and reads the
wrong state.

**Custom hook** — just a function starting with `use` that calls other hooks. The
prefix is a convention that lets the linter enforce the rules above. This project
has none; the fetch logic in the comment component is a prime candidate to extract
into `useComments()` — mention that as a refactor you'd make.

**React 19 notes** — this project pins React 19. It brings Actions, `useOptimistic`
(a built-in hook for exactly the optimistic pattern hand-rolled here), `use()`, and
Server Components as the default in the App Router. **If asked how you'd modernize
this: `useOptimistic` would replace the manual temp-ID juggling.**

---

## 14. Self-critique list (have two of these ready)

Interviewers ask "what would you do differently." Pick from:

1. **The 835-line component should be split.** `CommentItem` alone handles voting,
   saving, editing, deleting, replying, and pagination. Each of those is a candidate
   for a custom hook.
2. **No memoization anywhere.** No `React.memo`, `useCallback`, or `useMemo`. Every
   parent re-render re-renders the whole visible comment tree. It's fine at 10
   comments; it wouldn't be at 500.
3. **`useUserStore()` without a selector** over-subscribes (see §12).
4. **Ownership is checked by username** — `comment.authorName === User.username` —
   which is a display string, not an ID. Should compare IDs. (And the *server-side*
   check is broken outright — see file 07.)
5. **No error UI.** Every failure path is `console.error`. A user whose comment
   fails to post just sees it vanish with no explanation. `react-hot-toast` is
   already a dependency and unused.
6. **No loading skeletons** — just a spinner.

Pick the ones you can talk about for 30 seconds each. Number 4 is the strongest.

---

**Next:** file 03 (Next.js).
