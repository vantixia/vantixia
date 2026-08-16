/* ============================================================
   VANTIXIA - site-wide scroll-driven motion layer
   GSAP + ScrollTrigger + Lenis, loaded as a PROGRESSIVE ENHANCEMENT
   on every page. Effects are opt-in via data-fx="…" attributes so
   they never collide with cyber.js's IntersectionObserver reveals.

   Baseline (no libs / reduced motion): the page is fully usable and
   every element is visible - this file only adds the cinematic layer.

   Effects:
     .story                       -> pinned Shield Protocol (home)
     [data-fx="rail"]             -> horizontal fade-rail (pinned, desktop)
     [data-fx="scanline"]         -> a gradient line that fills on scroll
     [data-fx="parallax"]         -> gentle scrub parallax on media
     [data-fx="prose"]            -> per-element reveal for long-form copy
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);

  var story = document.querySelector(".story");
  var shieldPaths = story ? story.querySelectorAll(".shield-path, .shield-check") : [];
  var storyLines = story ? story.querySelectorAll(".story-line") : [];

  // ---- Baseline fallback: show everything in its finished state ----
  function showFinishedState() {
    shieldPaths.forEach(function (p) { p.style.strokeDashoffset = "0"; });
    storyLines.forEach(function (l) { l.classList.add("show"); });
    var integ = story && story.querySelector("[data-integrity]");
    if (integ) integ.textContent = "100%";
    // scanlines finish full; rails/prose already visible via CSS
    document.querySelectorAll(".scanline-bar").forEach(function (b) { b.style.transform = "scaleX(1)"; });
  }

  if (!hasGSAP || reduceMotion) {
    showFinishedState();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  var mm = gsap.matchMedia();

  /* ---------- Lenis smooth scroll (desktop wheel; native on touch) ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6
    });
    window.__lenis = lenis;
    document.documentElement.classList.add("lenis", "lenis-smooth");

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Route back-to-top / in-page anchors through Lenis (capture phase runs
    // before cyber.js's own handler, which we then suppress).
    document.addEventListener("click", function (e) {
      var el = e.target && e.target.closest ? e.target.closest(".back-top, a[href^='#']") : null;
      if (!el) return;
      var href = el.getAttribute("href");
      if (el.classList.contains("back-top") || href === "#" || href === "#top") {
        e.preventDefault(); e.stopImmediatePropagation();
        lenis.scrollTo(0, { duration: 1.2 });
        return;
      }
      if (href && href.length > 1) {
        var target = document.querySelector(href);
        if (target) { e.preventDefault(); e.stopImmediatePropagation(); lenis.scrollTo(target, { offset: -70, duration: 1.1 }); }
      }
    }, true);
  }

  function dashPrep(p) { var len = p.getTotalLength ? p.getTotalLength() : 0; p.style.strokeDasharray = len; return len; }

  /* Shield draw curves, shared by the desktop (scroll-scrubbed) and mobile
     (fixed-duration) branches so both read identically.

          progress │ outline │ tick │ readout
          ─────────┼─────────┼──────┼────────
                0% │      0% │   0% │      0%
               40% │     40% │  20% │     45%
               70% │     70% │  60% │     78%
               85% │     85% │  80% │     89%
              100% │    100% │ 100% │    100%

     The outline is linear, so it needs no map. The tick trails it early and
     catches up; the readout runs a little ahead of both. All land together. */
  var TICK_CURVE = [[0, 0], [0.40, 0.20], [0.70, 0.60], [0.85, 0.80], [1, 1]];
  var READOUT    = [[0, 0], [0.40, 0.45], [0.70, 0.78], [0.85, 0.89], [1, 1]];

  // straight-line interpolation between the points above
  function curve(map, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    for (var i = 1; i < map.length; i++) {
      if (x <= map[i][0]) {
        var a = map[i - 1], b = map[i];
        return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0]));
      }
    }
    return 1;
  }

  /* ============================================================
     1 · SHIELD PROTOCOL (home only)
     ============================================================ */
  if (story) {
    mm.add("(min-width: 768px)", function () {
      var outline = story.querySelector(".shield-path");
      var check = story.querySelector(".shield-check");
      var svg = story.querySelector(".shield-svg");
      var integ = story.querySelector("[data-integrity]");
      var lines = gsap.utils.toArray(storyLines);

      var outLen = dashPrep(outline);
      var chkLen = check ? dashPrep(check) : 0;
      gsap.set(outline, { strokeDashoffset: outLen });
      if (check) gsap.set(check, { strokeDashoffset: chkLen });
      gsap.set(lines, { autoAlpha: 0, y: 26 });

      /* Outline, tick and readout all run across the full timeline so nothing
         sits still while the rest moves. The outline tracks progress linearly;
         the tick trails it early on and catches up; the readout runs slightly
         ahead of both. All three land on 100% together.

              progress │ outline │ tick │ readout
              ─────────┼─────────┼──────┼────────
                    0% │      0% │   0% │      0%
                   40% │     40% │  20% │     45%
                   70% │     70% │  60% │     78%
                   85% │     85% │  80% │     89%
                  100% │    100% │ 100% │    100%                                */
      var TOTAL = 8;   // timeline length the scrub maps onto

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: story, start: "top top", end: "+=2600", scrub: 1,
          pin: true, anticipatePin: 1, invalidateOnRefresh: true
        }
      });
      tl.to(outline, { strokeDashoffset: 0, duration: TOTAL }, 0);
      if (check) {
        tl.to(check, {
          strokeDashoffset: 0, duration: TOTAL,
          ease: function (p) { return curve(TICK_CURVE, p); }
        }, 0);
      }
      lines.forEach(function (ln, i) { tl.to(ln, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" }, 0.8 + i * 1.2); });

      /* Read the timeline, not the scroll position. Under scrub:1 the drawing
         lags the scroll by design, so driving the number off scroll progress
         would put it ahead of the graphic it is supposed to describe. */
      tl.eventCallback("onUpdate", function () {
        if (integ) integ.textContent = Math.round(curve(READOUT, tl.progress()) * 100) + "%";
      });

      ScrollTrigger.create({
        trigger: story, start: "top top", end: "+=2600",
        onUpdate: function (self) {
          var g = Math.max(0, (self.progress - 0.8) / 0.2);
          svg.style.filter = "drop-shadow(0 0 " + (g * 30) + "px rgba(57,208,255," + (g * 0.5) + "))";
        }
      });

      return function () {
        gsap.set([outline, check].filter(Boolean), { strokeDashoffset: 0 });
        gsap.set(lines, { autoAlpha: 1, y: 0 });
        svg.style.filter = ""; if (integ) integ.textContent = "100%";
      };
    });

    mm.add("(max-width: 767px)", function () {
      var outline = story.querySelector(".shield-path");
      var check = story.querySelector(".shield-check");
      var integ = story.querySelector("[data-integrity]");
      var lines = gsap.utils.toArray(storyLines);
      var outLen = dashPrep(outline);
      var chkLen = check ? dashPrep(check) : 0;
      gsap.set(outline, { strokeDashoffset: outLen });
      if (check) gsap.set(check, { strokeDashoffset: chkLen });
      gsap.set(lines, { autoAlpha: 0, y: 20 });

      ScrollTrigger.create({
        trigger: story.querySelector(".shield-svg"), start: "top 82%", once: true,
        onEnter: function () {
          // Same shape as desktop, played out over a fixed duration instead of
          // scroll: outline, tick and counter all run together and finish together.
          var DUR = 1.8;
          gsap.to(outline, { strokeDashoffset: 0, duration: DUR, ease: "none" });
          if (check) {
            gsap.to(check, {
              strokeDashoffset: 0, duration: DUR,
              ease: function (p) { return curve(TICK_CURVE, p); }
            });
          }
          if (integ) {
            var o = { v: 0 };
            gsap.to(o, {
              v: 1, duration: DUR, ease: "none",
              onUpdate: function () {
                integ.textContent = Math.round(curve(READOUT, o.v) * 100) + "%";
              }
            });
          }
        }
      });
      ScrollTrigger.batch(lines, { start: "top 90%", once: true, onEnter: function (b) { gsap.to(b, { autoAlpha: 1, y: 0, stagger: 0.14, duration: 0.6, ease: "power2.out" }); } });
      return function () { gsap.set([outline, check].filter(Boolean), { strokeDashoffset: 0 }); gsap.set(lines, { autoAlpha: 1, y: 0 }); if (integ) integ.textContent = "100%"; };
    });
  }

  /* ============================================================
     2 · HORIZONTAL FADE-RAIL  [data-fx="rail"]
     Desktop: pin the rail and translate its track sideways, with
     edge fades (CSS) and cards lifting as they reach centre.
     Mobile: the track is a normal stacked grid (no pin).
     ============================================================ */
  gsap.utils.toArray("[data-fx='rail']").forEach(function (rail) {
    var track = rail.querySelector(".rail-track");
    if (!track) return;

    mm.add("(min-width: 768px)", function () {
      var cards = gsap.utils.toArray(track.children);
      if (!cards.length) return;
      // the strip the track slides inside (falls back to the rail itself)
      var box = rail.querySelector(".rail-viewport") || rail;

      // Pad the track by half the strip minus half a card, so the FIRST card
      // starts centred on screen and the LAST card finishes centred - rather
      // than both sitting flush against the edges.
      function centrePad() {
        var cardW = cards[0].getBoundingClientRect().width;
        var p = (box.clientWidth - cardW) / 2;
        return p > 0 ? p : 0;
      }
      function applyPad() {
        var p = centrePad() + "px";
        track.style.paddingLeft = p;
        track.style.paddingRight = p;
      }
      // travel = exactly the distance from first-card-centred to last-card-centred
      function dist() {
        applyPad();
        var d = track.scrollWidth - box.clientWidth;
        return d > 0 ? d : 0;
      }

      applyPad();
      if (dist() <= 0) return;

      var horiz = gsap.to(track, {
        x: function () { return -dist(); },
        ease: "none",
        scrollTrigger: {
          trigger: rail, start: "top top",
          end: function () { return "+=" + dist(); },
          scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true
        }
      });

      // each card eases up + brightens as it crosses the viewport centre
      cards.forEach(function (card) {
        gsap.fromTo(card,
          { y: 40, autoAlpha: 0.35 },
          { y: 0, autoAlpha: 1, ease: "none",
            scrollTrigger: { trigger: card, containerAnimation: horiz, start: "left 90%", end: "left 50%", scrub: true } });
      });

      return function () {
        gsap.set(track, { x: 0 });
        track.style.paddingLeft = "";
        track.style.paddingRight = "";
        gsap.set(cards, { y: 0, autoAlpha: 1 });
      };
    });
  });

  /* ============================================================
     3 · SCAN-LINE  [data-fx="scanline"] with a .scanline-bar child
     A gradient line fills left→right as the section scrolls through -
     a "process scan" indicator (used on service pages' approach steps).
     ============================================================ */
  gsap.utils.toArray("[data-fx='scanline']").forEach(function (section) {
    var bar = section.querySelector(".scanline-bar");
    if (!bar) return;
    gsap.fromTo(bar, { scaleX: 0 }, {
      scaleX: 1, ease: "none",
      scrollTrigger: { trigger: section, start: "top 75%", end: "bottom 60%", scrub: 1 }
    });
  });

  /* ============================================================
     4 · MEDIA PARALLAX  [data-fx="parallax"]
     Gentle vertical drift on an image as it passes through view.
     ============================================================ */
  gsap.utils.toArray("[data-fx='parallax']").forEach(function (media) {
    // constant 1.15 scale gives overflow room so the ±8% drift never shows a gap
    gsap.fromTo(media, { yPercent: -8, scale: 1.15 }, {
      yPercent: 8, scale: 1.15, ease: "none",
      scrollTrigger: { trigger: media.parentElement || media, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* ============================================================
     5 · PROSE REVEAL  [data-fx="prose"]
     Reveal long-form children (headings, paragraphs, lists) as they
     enter - richer than a single block fade. Baseline: fully visible.
     ============================================================ */
  gsap.utils.toArray("[data-fx='prose']").forEach(function (prose) {
    var kids = gsap.utils.toArray(prose.children);
    gsap.set(kids, { autoAlpha: 0, y: 22 });
    ScrollTrigger.batch(kids, {
      start: "top 90%",
      onEnter: function (b) { gsap.to(b, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.6, ease: "power2.out" }); },
      once: true
    });
  });

  /* ============================================================
     6 · SPLIT SLIDE  [data-fx="split"]
     Children alternate in from left / right with a fade (Contact).
     ============================================================ */
  gsap.utils.toArray("[data-fx='split']").forEach(function (group) {
    var kids = gsap.utils.toArray(group.children);
    kids.forEach(function (k, i) { gsap.set(k, { autoAlpha: 0, x: i % 2 ? 56 : -56 }); });
    ScrollTrigger.batch(kids, {
      start: "top 86%", once: true,
      onEnter: function (b) { gsap.to(b, { autoAlpha: 1, x: 0, stagger: 0.1, duration: 0.7, ease: "power3.out" }); }
    });
  });

  /* ============================================================
     7 · WORD REVEAL  [data-fx="words"]
     Splits a plain-text heading into words that rise from a mask
     (About identity headline).
     ============================================================ */
  gsap.utils.toArray("[data-fx='words']").forEach(function (el) {
    var text = el.textContent;
    el.setAttribute("aria-label", text);
    el.innerHTML = text.split(/(\s+)/).map(function (w) {
      return /\S/.test(w) ? '<span class="w"><span>' + w + "</span></span>" : w;
    }).join("");
    var inner = el.querySelectorAll(".w > span");
    gsap.set(inner, { yPercent: 120 });
    ScrollTrigger.create({
      trigger: el, start: "top 85%", once: true,
      onEnter: function () { gsap.to(inner, { yPercent: 0, duration: 0.7, ease: "power3.out", stagger: 0.05 }); }
    });
  });

  /* ============================================================
     8 · DRIFT  [data-fx="drift"]
     Gentle scroll-linked vertical parallax on a single element,
     no scaling (error-page code numerals).
     ============================================================ */
  gsap.utils.toArray("[data-fx='drift']").forEach(function (el) {
    gsap.fromTo(el, { yPercent: -6 }, {
      yPercent: 6, ease: "none",
      scrollTrigger: { trigger: el.parentElement || el, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* ---------- generic rise for any [data-motion='rise'] ---------- */
  gsap.utils.toArray("[data-motion='rise']").forEach(function (el) {
    gsap.from(el, { autoAlpha: 0, y: 40, duration: 0.9, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 85%" } });
  });

  // keep ScrollTrigger honest after fonts/images shift layout
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
