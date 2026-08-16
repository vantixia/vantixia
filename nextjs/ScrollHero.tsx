'use client';

/**
 * ScrollHero — a scroll-driven hero for Next.js (App Router) built with
 * Framer Motion's `useScroll` + `useTransform`.
 *
 * Behaviour (all bound to a single scroll progress value):
 *   1. The central headline scales DOWN from 1.2 → 0.9 while its opacity fades to 0.
 *   2. A 3D mock-UI card scales UP from 0.8 → 1.0 and un-tilts from
 *      rotateX(20deg) → rotateX(0deg) as it settles into place.
 *   3. The section is PINNED (via position: sticky on a 100vh inner shell inside
 *      a tall outer wrapper) until all the text-card overlays have faded in,
 *      one after another, in sequence.
 *
 * Usage:
 *   1. npm i framer-motion            (or: yarn add framer-motion)
 *   2. Drop this file in e.g. app/components/ScrollHero.tsx
 *   3. Render it from a page:  import ScrollHero from './components/ScrollHero';
 *                              export default () => <ScrollHero />;
 *
 * The whole thing is self-contained (inline styles, no CSS files, no Tailwind
 * required) so you can paste it anywhere. Swap the palette variables below to
 * re-theme it.
 */

import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';

/* ---- palette (CyberXield dark theme) ---- */
const RED = '#ff3b57';
const CYAN = '#39d0ff';
const VOID = '#04070e';
const PANEL = 'rgba(13, 22, 40, 0.85)';
const LINE = 'rgba(102, 140, 255, 0.18)';
const TEXT = '#dbe6ff';
const MUTED = '#8294b8';

/* The overlay chips that fade in sequentially over the mock UI. */
const OVERLAYS = [
  { tag: 'RECON', title: 'Attack surface mapped', accent: CYAN, pos: { top: '8%', left: '-8%' } },
  { tag: 'EXPLOIT', title: '3 vectors validated', accent: RED, pos: { top: '44%', right: '-10%' } },
  { tag: 'REPORT', title: 'Zero false positives', accent: CYAN, pos: { bottom: '6%', left: '4%' } },
];

/* Fraction of the scroll where overlays begin/finish appearing. */
const OVERLAY_WINDOW_START = 0.45;
const OVERLAY_WINDOW_END = 0.9;

export default function ScrollHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  /* Track this section's scroll: progress is 0 when its top hits the top of the
     viewport, and 1 when its bottom hits the bottom. Everything below maps onto
     this single 0 → 1 value. */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  /* 1 · headline: scale 1.2 → 0.9, opacity 1 → 0 */
  const headlineScale = useTransform(scrollYProgress, [0, 1], [1.2, 0.9]);
  const headlineOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const headlineY = useTransform(scrollYProgress, [0, 0.45], [0, -40]);

  /* 2 · 3D card: scale 0.8 → 1.0, rotateX 20deg → 0deg (settles by ~50% scroll) */
  const cardScale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);
  const cardRotateX = useTransform(scrollYProgress, [0, 0.5], [20, 0]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.18], [0, 1]);

  /* Reduced-motion: render the finished state, skip the scroll choreography. */
  if (prefersReducedMotion) {
    return (
      <section style={{ background: VOID, color: TEXT, padding: '120px 24px', textAlign: 'center' }}>
        <h1 style={headlineTextStyle}>
          Unbreakable shield.<br />
          <span style={{ color: CYAN }}>Unmatched security.</span>
        </h1>
        <div style={{ margin: '48px auto 0', maxWidth: 620 }}>
          <MockUI />
        </div>
      </section>
    );
  }

  return (
    // Outer wrapper is tall (320vh) — this length IS the scroll distance the
    // pinned content stays on screen for.
    <section ref={sectionRef} style={{ position: 'relative', height: '320vh', background: VOID }}>
      {/* Inner shell is pinned: sticky, one viewport tall, holds everything. */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: 1200, // gives the card real 3D depth
          background:
            `radial-gradient(700px 420px at 50% 30%, rgba(57,208,255,0.06), transparent 70%), ${VOID}`,
        }}
      >
        {/* 1 · central headline (locked in the middle, scales + fades on scroll) */}
        <motion.h1
          style={{
            ...headlineTextStyle,
            position: 'absolute',
            zIndex: 3,
            scale: headlineScale,
            opacity: headlineOpacity,
            y: headlineY,
            pointerEvents: 'none',
          }}
        >
          Unbreakable shield.
          <br />
          <span style={{ color: CYAN }}>Unmatched security.</span>
        </motion.h1>

        {/* 2 · the 3D mock-UI card (scales up + un-tilts) with 3 · overlays */}
        <motion.div
          style={{
            position: 'relative',
            width: 'min(680px, 88vw)',
            transformPerspective: 1200,
            transformStyle: 'preserve-3d',
            scale: cardScale,
            rotateX: cardRotateX,
            opacity: cardOpacity,
            zIndex: 2,
          }}
        >
          <MockUI />

          {OVERLAYS.map((o, i) => (
            <OverlayCard key={o.tag} item={o} index={i} total={OVERLAYS.length} progress={scrollYProgress} />
          ))}
        </motion.div>

        <ScrollCue />
      </div>
    </section>
  );
}

/* ---------- 3 · a single sequentially-fading overlay chip ---------- */
function OverlayCard({
  item,
  index,
  total,
  progress,
}: {
  item: (typeof OVERLAYS)[number];
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  // Spread each overlay across an even slice of the overlay window so they
  // appear one after another. The last one finishes before scroll progress
  // reaches 1, i.e. while the section is still pinned.
  const span = (OVERLAY_WINDOW_END - OVERLAY_WINDOW_START) / total;
  const start = OVERLAY_WINDOW_START + index * span;
  const end = start + span * 0.85;

  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [28, 0]);
  const x = useTransform(progress, [start, end], [index % 2 ? 24 : -24, 0]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        ...item.pos,
        opacity,
        y,
        x,
        zIndex: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '12px 16px',
        minWidth: 190,
        background: PANEL,
        border: `1px solid ${LINE}`,
        borderLeft: `2px solid ${item.accent}`,
        backdropFilter: 'blur(8px)',
        clipPath:
          'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
        boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: item.accent,
        }}
      >
        {item.tag}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>{item.title}</span>
    </motion.div>
  );
}

/* ---------- the mock security-dashboard UI inside the card ---------- */
function MockUI() {
  return (
    <div
      style={{
        border: `1px solid ${LINE}`,
        background: 'linear-gradient(180deg, rgba(19,30,56,0.6), rgba(9,15,30,0.85))',
        clipPath:
          'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        overflow: 'hidden',
        fontFamily: 'monospace',
      }}
    >
      {/* window bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          borderBottom: `1px solid ${LINE}`,
          color: MUTED,
          fontSize: 11,
          letterSpacing: '0.14em',
        }}
      >
        <i style={dot(RED)} />
        <i style={dot('#ffb02e')} />
        <i style={dot('#2ee6a8')} />
        <span style={{ marginLeft: 10 }}>xield@cyberxield: ~/engagement</span>
      </div>

      {/* body: a couple of readouts + progress bars to look like a live scan */}
      <div style={{ padding: 22, display: 'grid', gap: 16 }}>
        <Row label="Perimeter scan" value="COMPLETE" color="#2ee6a8" pct={100} />
        <Row label="Exploit chain" value="3 CONFIRMED" color={RED} pct={72} />
        <Row label="Report" value="ZERO FALSE POS" color={CYAN} pct={100} />
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: MUTED,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>shield integrity</span>
          <span style={{ color: CYAN }}>100%</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color, pct }: { label: string; value: string; color: string; pct: number }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: MUTED }}>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, opacity: 0.8 }} />
      </div>
    </div>
  );
}

function ScrollCue() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 26,
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'monospace',
        fontSize: 11,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        color: MUTED,
        zIndex: 5,
      }}
    >
      ▼ scroll
    </div>
  );
}

const headlineTextStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "'Chakra Petch', system-ui, sans-serif",
  fontWeight: 700,
  fontSize: 'clamp(2.2rem, 6vw, 5rem)',
  lineHeight: 1.05,
  letterSpacing: '0.01em',
  textTransform: 'uppercase',
  color: TEXT,
  textAlign: 'center',
};

const dot = (c: string): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: c,
  display: 'inline-block',
});
