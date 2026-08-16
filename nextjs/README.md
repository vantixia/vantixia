# ScrollHero — Next.js + Framer Motion scroll hero

A self-contained, drop-in hero section for a **Next.js (App Router)** project,
built with Framer Motion's `useScroll` and `useTransform`.

> Note: the CyberXield website itself is a static HTML/CSS/JS site (no build
> step). This component is a **separate deliverable** for a Next.js codebase —
> it is not wired into the static site. The equivalent effect already lives on
> the static homepage via GSAP ScrollTrigger (`/js/motion.js`, the Shield
> Protocol section) and in the standalone `/story.html` prototype.

## What it does

Everything is driven by one scroll-progress value (`scrollYProgress`, `0 → 1`):

1. **Headline** scales **1.2 → 0.9** and fades its opacity to 0 as you scroll.
2. **3D mock-UI card** scales **0.8 → 1.0** and un-tilts **rotateX(20deg) → rotateX(0deg)**.
3. The section is **pinned** (a `position: sticky`, 100vh inner shell inside a
   tall `320vh` outer wrapper) and stays on screen until the **three text-card
   overlays have faded in, one after another**.

It also respects `prefers-reduced-motion` (renders the finished state, no
scroll choreography).

## Install & use

```bash
npm install framer-motion
# or: yarn add framer-motion   /   pnpm add framer-motion
```

```tsx
// app/page.tsx
import ScrollHero from './components/ScrollHero'; // move the file wherever you like

export default function Page() {
  return (
    <main>
      <ScrollHero />
      {/* the rest of your page scrolls in normally below */}
    </main>
  );
}
```

The component is `'use client'` (it uses scroll hooks), so it must run on the
client — importing it into a server component page as above is fine.

## Tuning

- **How long it stays pinned** → change the outer wrapper height (`320vh`). Taller = slower.
- **When the card settles** → the `[0, 0.5]` input ranges on `cardScale` / `cardRotateX`.
- **Overlay timing** → `OVERLAY_WINDOW_START` / `OVERLAY_WINDOW_END` and the `OVERLAYS` array.
- **Theme** → the palette constants (`RED`, `CYAN`, `VOID`, …) at the top.

## How the pin works (no plugin needed)

Framer Motion has no dedicated "pin" like GSAP ScrollTrigger. The standard
pattern — used here — is:

```
<section style={{ height: '320vh' }}>          // tall spacer = scroll distance
  <div style={{ position: 'sticky', top: 0,     // stays fixed in the viewport…
                height: '100vh' }}>             // …for the full 320vh of scroll
     …animated content driven by scrollYProgress…
  </div>
</section>
```

The sticky child is "pinned" for `320vh - 100vh = 220vh` of scrolling, which is
exactly the window the animations play out in.
