/* ============================================================
   VANTIXIA - interaction engine
   Canvas data-stream flow field · scroll reveals · terminal typing ·
   counters · nav · scroll progress · contact form (EmailJS)
   No dependencies.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ambient data-stream flow field ----------
     Particles ride a slowly-shifting flow field (drawn as red->cyan
     streaks). The cursor parts and swirls the stream; clicks send a
     ripple that pushes particles outward. Grid stays visible (no trails). */
  var canvas = document.getElementById("net-bg");
  if (canvas) {
    window.__bgMode = "flowfield";
    var ctx = canvas.getContext("2d");
    var particles = [];
    var ripples = [];
    var mouse = { x: -9999, y: -9999 };
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var TAU = Math.PI * 2;
    var RAD = 155, RAD2 = RAD * RAD;
    var time = 0;
    var running = false;

    var makeParticle = function () {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        speed: Math.random() * 1.1 + 0.5,
        packet: Math.random() < 0.09
      };
    };

    var sizeCanvas = function () {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var target = Math.min(W > 820 ? 460 : 210, Math.floor((W * H) / 4200));
      while (particles.length < target) particles.push(makeParticle());
      particles.length = target;
    };

    // cheap layered-sine "noise" -> a smoothly varying flow angle
    var flowAngle = function (x, y, t) {
      return (Math.sin(x * 0.0016 + t * 0.0003) +
              Math.cos(y * 0.0019 - t * 0.00025) +
              Math.sin((x + y) * 0.0011 + t * 0.0004)) * 1.5;
    };

    var tint = function (x) {
      var t = x < 0 ? 0 : x > W ? 1 : x / W;
      return [
        Math.round(255 - t * (255 - 57)),
        Math.round(59 + t * (208 - 59)),
        Math.round(87 + t * (255 - 87))
      ];
    };

    var draw = function () {
      ctx.clearRect(0, 0, W, H);
      time += 16;
      var i, p, ang, vx, vy, dx, dy, d2, d, f, c;

      // advance ripples
      for (i = ripples.length - 1; i >= 0; i--) {
        var rp = ripples[i];
        rp.r += 7;
        rp.alpha = 0.5 * (1 - rp.r / rp.max);
        if (rp.r >= rp.max || rp.alpha <= 0.02) { ripples.splice(i, 1); continue; }
        ctx.strokeStyle = "rgba(57,208,255," + rp.alpha + ")";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, TAU);
        ctx.stroke();
      }

      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        ang = flowAngle(p.x, p.y, time);
        vx = Math.cos(ang) * p.speed;
        vy = Math.sin(ang) * p.speed;

        // cursor: part + swirl
        dx = p.x - mouse.x; dy = p.y - mouse.y; d2 = dx * dx + dy * dy;
        if (d2 < RAD2) {
          d = Math.sqrt(d2) || 1; f = 1 - d / RAD;
          vx += (dx / d) * f * 3.4 + (-dy / d) * f * 1.7;
          vy += (dy / d) * f * 3.4 + (dx / d) * f * 1.7;
        }

        // ripple push
        for (var k = 0; k < ripples.length; k++) {
          var r2 = ripples[k];
          dx = p.x - r2.x; dy = p.y - r2.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (Math.abs(d - r2.r) < 26) {
            f = r2.alpha * 5;
            vx += (dx / d) * f; vy += (dy / d) * f;
          }
        }

        c = tint(p.x);
        if (p.packet) {
          ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0.85)";
          ctx.lineWidth = 1.6;
        } else {
          ctx.strokeStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0.4)";
          ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.moveTo(p.x - vx * 4, p.y - vy * 4);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        if (p.packet) {
          ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0.95)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.7, 0, TAU);
          ctx.fill();
        }

        p.x += vx; p.y += vy;
        if (p.x < -12) p.x = W + 12; else if (p.x > W + 12) p.x = -12;
        if (p.y < -12) p.y = H + 12; else if (p.y > H + 12) p.y = -12;
      }
    };

    var loop = function () { if (!running) return; draw(); requestAnimationFrame(loop); };

    var staticFrame = function () {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i], c = tint(p.x);
        ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0.4)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.packet ? 1.7 : 1, 0, TAU);
        ctx.fill();
      }
    };

    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener("pointerleave", function () { mouse.x = -9999; mouse.y = -9999; });
    window.addEventListener("click", function (e) {
      if (reduceMotion) return;
      ripples.push({ x: e.clientX, y: e.clientY, r: 0, max: Math.min(W, H) * 0.55, alpha: 0.5 });
      if (ripples.length > 4) ripples.shift();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { running = false; }
      else if (!reduceMotion && !running) { running = true; loop(); }
    });

    if (reduceMotion) {
      staticFrame();
    } else {
      running = true;
      loop();
    }
  }

  /* ---------- scroll progress + header + back-to-top + parallax ---------- */
  var progress = document.querySelector(".scan-progress span");
  var head = document.getElementById("siteHead");
  var backTop = document.querySelector(".back-top");
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var ticking = false;

  var applyParallax = function () {
    if (reduceMotion) return;
    for (var i = 0; i < parallaxEls.length; i++) {
      var el = parallaxEls[i];
      var speed = parseFloat(el.getAttribute("data-parallax")) || 0.1;
      var rect = el.parentElement.getBoundingClientRect();
      var mid = rect.top + rect.height / 2 - window.innerHeight / 2;
      el.style.transform = "translate3d(0," + (-mid * speed).toFixed(1) + "px,0)";
    }
  };

  var onScroll = function () {
    var st = window.scrollY || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (max > 0 ? (st / max) * 100 : 0) + "%";
    if (head) head.classList.toggle("scrolled", st > 30);
    if (backTop) backTop.classList.toggle("show", st > 500);
    if (parallaxEls.length && !ticking) {
      ticking = true;
      requestAnimationFrame(function () { applyParallax(); ticking = false; });
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ---------- card spotlight (mouse-follow glow) ---------- */
  document.addEventListener("pointermove", function (e) {
    var card = e.target && e.target.closest ? e.target.closest(".hud-card") : null;
    if (card) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    }
  }, { passive: true });

  /* ---------- FAQ accordion (exclusive open) ---------- */
  var faqGroups = document.querySelectorAll(".faq");
  faqGroups.forEach(function (group) {
    group.addEventListener("toggle", function (e) {
      var item = e.target;
      if (item.tagName === "DETAILS" && item.open) {
        group.querySelectorAll("details[open]").forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    }, true);
  });

  if (backTop) {
    backTop.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var body = document.body;
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".site-nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && body.classList.contains("nav-open")) {
        body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---------- active nav link ---------- */
  var path = location.pathname.replace(/\/index\.html$/, "/");
  document.querySelectorAll(".site-nav a.nav-link").forEach(function (a) {
    var href = a.getAttribute("href");
    if (!href) return;
    var norm = href.replace(/\/index\.html$/, "/");
    var isHome = norm === "/";
    if ((isHome && (path === "/" || path === "/index.html")) ||
        (!isHome && path.indexOf(norm.replace(/\/$/, "")) === 0)) {
      a.classList.add("active");
    }
  });

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("revealed"); });
    } else {
      // threshold 0 so very tall blocks (e.g. long articles) still trigger
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0, rootMargin: "0px 0px -60px 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- animated counters ----------
     The real value is hard-coded in the HTML, so it is correct with JS off,
     with the CDN blocked, or if this observer never fires. The animation
     only ever counts up to that same value. */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length) {
    var runCounter = function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      if (isNaN(target)) return;                 // leave the static text alone
      if (reduceMotion) { el.textContent = target; return; }
      var start = null;
      var dur = 1400;
      var tick = function (ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            cio.unobserve(entry.target);
          }
        });
      }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- terminal typing ---------- */
  var termBody = document.getElementById("term-body");
  if (termBody) {
    var LINES = [
      ["", "$ ./vantixia --engage --target=your-perimeter"],
      ["ln-cyan", "[*] initializing VANTIXIA protocol v3.1 ..."],
      ["ln-ok", "[+] recon        : attack surface mapped"],
      ["ln-ok", "[+] scan         : automated sweep complete"],
      ["ln-warn", "[!] exploit      : 3 vectors validated manually"],
      ["ln-red", "[!] critical     : privilege escalation confirmed"],
      ["ln-ok", "[+] report       : every finding manually validated"],
      ["ln-ok", "[+] retest       : all findings remediated"],
      ["ln-cyan", "[✓] STATUS - PERIMETER HARDENED. SHIELD UP."]
    ];
    var renderAll = function () {
      termBody.innerHTML = LINES.map(function (l) {
        return '<span class="' + l[0] + '">' + l[1] + "</span>";
      }).join("\n") + ' <span class="term-caret"></span>';
    };
    if (reduceMotion) {
      renderAll();
    } else {
      var li = 0, ci = 0, out = "";
      var typeStep = function () {
        if (li >= LINES.length) {
          termBody.innerHTML = out + ' <span class="term-caret"></span>';
          return;
        }
        var line = LINES[li];
        if (ci === 0) out += '<span class="' + line[0] + '">';
        if (ci < line[1].length) {
          out += line[1]
            .charAt(ci)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;");
          ci++;
          termBody.innerHTML = out + '</span><span class="term-caret"></span>';
          setTimeout(typeStep, 14 + Math.random() * 24);
        } else {
          out += "</span>\n";
          li++; ci = 0;
          termBody.innerHTML = out + '<span class="term-caret"></span>';
          setTimeout(typeStep, li === 1 ? 420 : 190);
        }
      };
      var startTyping = function () { setTimeout(typeStep, 600); };
      if ("IntersectionObserver" in window) {
        var tio = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) {
            startTyping();
            tio.disconnect();
          }
        }, { threshold: 0.3 });
        tio.observe(termBody);
      } else {
        startTyping();
      }
    }
  }

  /* ---------- blog category filter ---------- */
  var filterBar = document.querySelector(".blog-filter");
  if (filterBar) {
    var chips = Array.prototype.slice.call(filterBar.querySelectorAll(".chip"));
    var cards = Array.prototype.slice.call(document.querySelectorAll(".post-card"));
    var countEl = document.getElementById("blog-count");
    var applyFilter = function (cat) {
      var shown = 0;
      cards.forEach(function (card) {
        var match = cat === "all" || card.getAttribute("data-cat") === cat;
        card.classList.toggle("is-hidden", !match);
        if (match) shown++;
      });
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", c.getAttribute("data-cat") === cat ? "true" : "false");
      });
      if (countEl) countEl.innerHTML = "Showing <b>" + shown + "</b> dispatch" + (shown === 1 ? "" : "es");
      try {
        history.replaceState(null, "", cat === "all" ? location.pathname : location.pathname + "#" + cat);
      } catch (e) { /* ignore */ }
    };
    chips.forEach(function (c) {
      c.addEventListener("click", function () { applyFilter(c.getAttribute("data-cat")); });
    });
    var initial = (location.hash || "").replace("#", "");
    var valid = chips.some(function (c) { return c.getAttribute("data-cat") === initial; });
    applyFilter(valid ? initial : "all");
  }

  /* ---------- footer year ---------- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- email capture / sample-report request (EmailJS) ----------
     There is only one EmailJS template, so these reuse it and identify
     themselves in the message body. Each signup lands as an email. */
  var captures = document.querySelectorAll("[data-mailcapture]");
  if (captures.length && window.emailjs) {
    emailjs.init("Abmv_rFKaV1wgG-zJ");
    Array.prototype.forEach.call(captures, function (cap) {
      var input = cap.querySelector("input[type=email]");
      var btn = cap.querySelector("button[type=submit]");
      var out = cap.querySelector(".mc-status");
      var kind = cap.getAttribute("data-mailcapture") || "subscribe";
      var say = function (txt, bad) {
        if (!out) return;
        out.classList.toggle("err", !!bad);
        out.textContent = txt;
      };
      cap.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!cap.checkValidity()) { cap.reportValidity(); return; }
        say("> transmitting ...");
        if (btn) btn.disabled = true;
        var nameEl = cap.querySelector("input[name=name]");
        emailjs
          .send("service_webiste", "template_o8eqp0f", {
            name: nameEl && nameEl.value ? nameEl.value : "(not given)",
            email: input.value,
            message:
              "--- " + kind.toUpperCase() + " ---\n" +
              "Source page: " + location.pathname
          })
          .then(
            function () {
              say(kind === "sample-report"
                ? "> received. the report is on its way to your inbox."
                : "> subscribed. new research lands in your inbox.");
              cap.reset();
              if (btn) btn.disabled = false;
            },
            function (err) {
              console.error(err);
              say("> failed. email us directly: rajnish@cyberxield.in", true);
              if (btn) btn.disabled = false;
            }
          );
      });
    });
  }

  /* ---------- contact form (EmailJS) ---------- */
  var form = document.getElementById("contact-form");
  if (form && window.emailjs) {
    emailjs.init("Abmv_rFKaV1wgG-zJ");
    var statusEl = document.getElementById("form-status");
    var submitBtn = form.querySelector("button[type=submit]");

    /* The homepage links here as /contact/?request=sample-report. Say so in the
       free-text box rather than silently dropping the intent. */
    if (/[?&]request=sample-report(&|$)/.test(location.search)) {
      var msgBox = document.getElementById("message");
      if (msgBox && !msgBox.value) {
        msgBox.value = "I would like to see a sample report.";
      }
    }

    /* The EmailJS template only has {{name}}, {{email}} and {{message}}, so the
       scoping answers are folded into the message body. If the template ever
       gains its own fields, send them separately and drop this. */
    var SCOPE_FIELDS = [
      ["company", "Company"],
      ["role", "Role"],
      ["target", "Wants tested"],
      ["aitype", "AI type"],
      ["tools", "Tools the AI can invoke"],
      ["deadline", "Deadline driver"],
      ["eu", "Serves EU users"],
      ["budget", "Budget range"]
    ];

    var buildMessage = function (freeText) {
      var lines = [];
      SCOPE_FIELDS.forEach(function (f) {
        var el = document.getElementById(f[0]);
        var val = el && el.value ? el.value.trim() : "";
        if (val) lines.push(f[1] + ": " + val);
      });
      var parts = [];
      if (lines.length) parts.push("--- SCOPING ---\n" + lines.join("\n"));
      if (freeText) parts.push("--- NOTES ---\n" + freeText);
      return parts.join("\n\n") || "(no details supplied)";
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("name");
      var email = document.getElementById("email");
      var message = document.getElementById("message");
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (statusEl) {
        statusEl.classList.remove("err");
        statusEl.textContent = "> transmitting encrypted payload ...";
      }
      if (submitBtn) submitBtn.disabled = true;
      emailjs
        .send("service_webiste", "template_o8eqp0f", {
          name: name.value,
          email: email.value,
          message: buildMessage(message ? message.value.trim() : "")
        })
        .then(
          function () {
            if (statusEl) statusEl.textContent = "> message delivered. we respond within 24 hours.";
            form.reset();
            if (submitBtn) submitBtn.disabled = false;
          },
          function (err) {
            console.error(err);
            if (statusEl) {
              statusEl.classList.add("err");
              statusEl.textContent = "> transmission failed. email us directly: rajnish@cyberxield.in";
            }
            if (submitBtn) submitBtn.disabled = false;
          }
        );
    });
  }
})();
