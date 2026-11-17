/* Blog charts: draws the animated figures of blog posts, the same code in Obsidian and on the website.
   A figure is a chart file (assets/<name>.chart.js next to the post) embedded in the note as

     ```chart
     assets/<name>.chart.js|700
     ```

   Obsidian: the blog-publish plugin renders that code block with this file. Website: publishing turns it into
   <figure class="blog-chart" data-src=… data-width=…> and copies this file to assets/js/blog-charts.js, which
   mounts every such figure. A chart file is the body of a function of C: it calls C.figure(width, height, label)
   once and draws with the returned figure. Rules for look and motion: ~/.claude/blog-charts/README.md.
   The figure plays once when 30% of it is on screen, waits on its first frame while off screen, and replays when
   it comes back. Colors follow the page's own light / dark theme. */
(function () {
  "use strict";
  if (window.BlogCharts) return;

  // Motion shared by every figure, so they all move at the same pace (README.md, "Motion")
  var MOTION = { START: 0.3, FADE: 0.3, POP: 0.4, DRAW: 0.5, STAGGER: 0.15, RUN: 4 };
  var EASE_OUT = "cubic-bezier(0, 0, 0.2, 1)";
  var SVG = "http://www.w3.org/2000/svg";
  var FONTS = {
    serif: { family: '"Noto Serif", "Noto Serif SC", Georgia, serif', weight: 400 },
    bold: { family: '"Noto Serif", "Noto Serif SC", Georgia, serif', weight: 700 },
    mono: { family: '"IBM Plex Mono", Menlo, monospace', weight: 400 },
  };
  // Grayscale, light and dark (the dark set matches the site's dark theme: #121212 background, #ccc9c3 text).
  // g1-g4 run from faint to strong in both; on-g1 is text on g1 / g2, on-g3 text on g3 / g4.
  var PALETTE = {
    bg: ["#ffffff", "#121212"], ink: ["#3d4247", "#ccc9c3"], muted: ["#7a7f85", "#8f9398"],
    grid: ["#e3e3e3", "#2a2c2e"], panel: ["#f4f5f6", "#1b1c1e"], faint: ["#c4c8cc", "#3a3d40"],
    g1: ["#d7dadd", "#36393c"], g2: ["#a9aeb3", "#575b60"], g3: ["#6b7177", "#8e9399"], g4: ["#3d4247", "#c4c7cb"],
    "on-g1": ["#3d4247", "#ccc9c3"], "on-g3": ["#ffffff", "#121212"],
  };

  function vars(i) {
    return Object.keys(PALETTE).map(function (k) { return "--bc-" + k + ": " + PALETTE[k][i] + ";"; }).join(" ");
  }
  // Obsidian marks its dark theme with body.theme-dark, the website with html[data-theme="dark"]
  var STYLE = [
    ".blog-chart {" + vars(0) + " position: relative; margin: 1.5em auto; max-width: 100%}",
    ".theme-dark .blog-chart, html[data-theme=\"dark\"] .blog-chart {" + vars(1) + "}",
    ".blog-chart svg {display: block; width: 100%; height: auto; overflow: visible}",
    ".blog-chart [data-tip] {cursor: default; outline: none}",
    ".blog-chart text {pointer-events: none}",
    ".blog-chart__tip {position: absolute; z-index: 5; pointer-events: none; padding: 6px 9px; border-radius: 6px;" +
      " background: var(--bc-bg); color: var(--bc-ink); border: 1px solid var(--bc-grid);" +
      " box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12); font: 12.5px/1.5 " + FONTS.serif.family + "; white-space: nowrap}",
    ".blog-chart__tip b {display: block; font-weight: 700; margin-bottom: 2px}",
    ".blog-chart__tip span {display: flex; gap: 14px; justify-content: space-between}",
    ".blog-chart__tip i {font-style: normal; font-family: " + FONTS.mono.family + "; font-size: 11.5px}",
    ".blog-chart__error {color: var(--bc-muted); font: 12px " + FONTS.mono.family + "; white-space: pre-wrap}",
  ].join("\n");

  function injectStyle(doc) {
    var style = doc.getElementById("blog-charts-style");
    if (!style) {
      style = doc.createElement("style");
      style.id = "blog-charts-style";
      doc.head.appendChild(style);
    }
    style.textContent = STYLE;
  }

  var canvas = null;
  function measure(text, font, size) {
    canvas = canvas || document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    ctx.font = FONTS[font].weight + " " + size + "px " + FONTS[font].family;
    return ctx.measureText(text).width;
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------- Figure: drawing ---------- */

  function Figure(root, width, height, label) {
    this.root = root;
    this.width = width;
    this.height = height;
    this.steps = [];  // [node, keyframes, start, length, easing]
    this.svg = this.el("svg", { viewBox: "0 0 " + width + " " + height, role: "img", "aria-label": label || "" }, root);
  }
  var F = Figure.prototype;

  F.el = function (tag, attrs, parent) {
    var node = document.createElementNS(SVG, tag);
    for (var k in attrs) if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    (parent || this.svg).appendChild(node);
    return node;
  };
  F.group = function (parent) { return this.el("g", {}, parent); };

  // o: font (serif | bold | mono), size, color, anchor (start | middle | end), parent, rotate
  F.text = function (x, y, s, o) {
    o = o || {};
    var font = FONTS[o.font || "serif"];
    var node = this.el("text", {
      x: x, y: y, "text-anchor": o.anchor || "start", "font-size": o.size || 12, "font-weight": font.weight,
      transform: o.rotate ? "rotate(" + o.rotate + " " + x + " " + y + ")" : null,
    }, o.parent);
    node.style.fontFamily = font.family;
    node.style.fill = "var(--bc-" + (o.color || "ink") + ")";
    node.textContent = s;
    return node;
  };
  // o: fill, stroke, strokeWidth, rx, parent
  F.rect = function (x, y, w, h, o) {
    o = o || {};
    var node = this.el("rect", { x: x, y: y, width: Math.max(w, 0), height: h, rx: o.rx }, o.parent);
    node.style.fill = o.fill ? "var(--bc-" + o.fill + ")" : "none";
    if (o.stroke) {
      node.style.stroke = "var(--bc-" + o.stroke + ")";
      node.style.strokeWidth = o.strokeWidth || 1.2;
    }
    return node;
  };
  // o: color, width, dash, parent
  F.line = function (x1, y1, x2, y2, o) {
    o = o || {};
    var node = this.el("line", { x1: x1, y1: y1, x2: x2, y2: y2 }, o.parent);
    node.style.stroke = "var(--bc-" + (o.color || "grid") + ")";
    node.style.strokeWidth = o.width || 1;
    if (o.dash) node.style.strokeDasharray = o.dash;
    return node;
  };
  F.path = function (d, o) {
    o = o || {};
    var node = this.el("path", { d: d }, o.parent);
    node.style.fill = "var(--bc-" + (o.fill || "ink") + ")";
    return node;
  };

  F.title = function (s) { return this.text(24, 34, s, { font: "bold", size: 17 }); };
  // Cuts `top` units off the top of the figure, e.g. the room of a title that moved to the caption
  F.crop = function (top) {
    this.svg.setAttribute("viewBox", "0 " + top + " " + this.width + " " + (this.height - top));
  };
  // Swatches with labels in one row under the title; items are [label, color]
  F.legend = function (items, x, y) {
    x = x == null ? 24 : x;
    y = y == null ? 58 : y;
    for (var i = 0; i < items.length; i++) {
      this.rect(x, y - 6, 12, 12, { fill: items[i][1] });
      this.text(x + 18, y + 4.5, items[i][0], { size: 12.5 });
      x += 18 + measure(items[i][0], "serif", 12.5) + 28;
    }
  };

  /* ---------- Figure: motion ---------- */

  F.step = function (node, keyframes, start, length, easing) {
    this.steps.push([node, keyframes, start, length, easing || EASE_OUT]);
    return node;
  };
  F.fade = function (node, start, length) {
    return this.step(node, [{ opacity: 0 }, { opacity: 1 }], start, length || MOTION.FADE);
  };
  // scaleX from the left edge; linear for bars that stand for time or add up in parts
  F.grow = function (node, start, length, linear) {
    node.style.transformBox = "fill-box";
    node.style.transformOrigin = "left center";
    return this.step(node, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], start, length,
      linear === false ? EASE_OUT : "linear");
  };
  // Scales in from the center with a small overshoot
  F.pop = function (node, start) {
    node.style.transformBox = "fill-box";
    node.style.transformOrigin = "center";
    return this.step(node, [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1.4)", offset: 0.45 },
      { opacity: 1, transform: "scale(1)" }], start, MOTION.POP);
  };
  // Draws a line or path along its length
  F.draw = function (node, start, length) {
    node.setAttribute("pathLength", 1);
    node.style.strokeDasharray = "1 1";
    return this.step(node, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], start, length || MOTION.DRAW);
  };

  /* ---------- Figure: hover ---------- */

  // A tooltip with a bold title and rows [label, value] on hover and keyboard focus
  F.tip = function (node, title, rows) {
    var fig = this;
    node.setAttribute("data-tip", "");
    node.setAttribute("tabindex", "0");
    node.addEventListener("pointerenter", function (ev) { fig.showTip(title, rows, ev.clientX, ev.clientY); });
    node.addEventListener("pointermove", function (ev) { fig.placeTip(ev.clientX, ev.clientY); });
    node.addEventListener("pointerleave", function () { fig.hideTip(); });
    node.addEventListener("focus", function () {
      var r = node.getBoundingClientRect();
      fig.showTip(title, rows, r.right, r.top);
    });
    node.addEventListener("blur", function () { fig.hideTip(); });
    return node;
  };
  F.showTip = function (title, rows, x, y) {
    if (!this.tipEl) {
      this.tipEl = document.createElement("div");
      this.tipEl.className = "blog-chart__tip";
      this.root.appendChild(this.tipEl);
    }
    var tip = this.tipEl;
    tip.textContent = "";
    var b = document.createElement("b");
    b.textContent = title;
    tip.appendChild(b);
    (rows || []).forEach(function (row) {
      var span = document.createElement("span");
      span.appendChild(document.createTextNode(row[0]));
      var value = document.createElement("i");
      value.textContent = row[1];
      span.appendChild(value);
      tip.appendChild(span);
    });
    tip.style.display = "block";
    this.placeTip(x, y);
  };
  F.placeTip = function (x, y) {
    if (!this.tipEl || this.tipEl.style.display === "none") return;
    var box = this.root.getBoundingClientRect(), tip = this.tipEl;
    var left = x - box.left + 14, top = y - box.top + 14;
    if (left + tip.offsetWidth > box.width) left = x - box.left - tip.offsetWidth - 14;
    tip.style.left = Math.max(0, left) + "px";
    tip.style.top = top + "px";
  };
  F.hideTip = function () { if (this.tipEl) this.tipEl.style.display = "none"; };

  /* ---------- Playback ---------- */

  // Builds the animations paused on their first frame; the drawn attributes are the last frame, so a figure
  // without animations (reduced motion, no Web Animations) shows the finished chart
  F.start = function () {
    var fig = this;
    var end = this.steps.reduce(function (m, s) { return Math.max(m, s[2] + s[3]); }, 0);
    if (end && (end < 3 || end > 5) && window.console) {
      console.warn("blog-charts: figure runs " + end.toFixed(1) + " s, aim for about " + MOTION.RUN + " s");
    }
    if (reducedMotion() || !this.svg.animate || !("IntersectionObserver" in window)) return;
    this.animations = this.steps.map(function (s) {
      var a = s[0].animate(s[1], { delay: s[2] * 1000, duration: s[3] * 1000, easing: s[4], fill: "backwards" });
      a.pause();
      return a;
    });
    this.playing = false;
    this.observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.intersectionRatio >= 0.3 && !fig.playing) {
          fig.playing = true;
          fig.animations.forEach(function (a) { a.currentTime = 0; a.play(); });
        } else if (!entry.isIntersecting && fig.playing) {
          fig.playing = false;
          fig.animations.forEach(function (a) { a.pause(); a.currentTime = 0; });
        }
      });
    }, { threshold: [0, 0.3] });
    this.observer.observe(this.root);
  };
  F.destroy = function () {
    if (this.observer) this.observer.disconnect();
    (this.animations || []).forEach(function (a) { a.cancel(); });
  };

  // Draws the chart file `source` into root (a block element), once the page's fonts are ready.
  // Returns a promise of { destroy }.
  function mount(root, source, options) {
    options = options || {};
    injectStyle(root.ownerDocument);
    root.classList.add("blog-chart");
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return ready.then(function () {
      var figure = null;
      var C = Object.assign({
        figure: function (width, height, label) {
          root.textContent = "";
          root.style.width = (options.width || width) + "px";
          figure = new Figure(root, width, height, label);
          return figure;
        },
      }, MOTION);
      try {
        new Function("C", source)(C);
        if (!figure) throw new Error("the chart file did not call C.figure()");
        figure.start();
      } catch (error) {
        root.textContent = "";
        var message = document.createElement("div");
        message.className = "blog-chart__error";
        message.textContent = "Chart failed: " + (error && error.message ? error.message : error);
        root.appendChild(message);
        if (window.console) console.error(error);
      }
      return { destroy: function () { if (figure) figure.destroy(); } };
    });
  }

  window.BlogCharts = { mount: mount, MOTION: MOTION };

  // Website: mount every <figure class="blog-chart" data-src=…>, or <div class="blog-chart" data-src=…> inside a
  // captioned <figure class="blog-figure">
  function mountPage() {
    document.querySelectorAll(".blog-chart[data-src]").forEach(function (fig) {
      fetch(fig.getAttribute("data-src"))
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(function (source) { return mount(fig, source, { width: Number(fig.getAttribute("data-width")) || 0 }); })
        .catch(function (error) { if (window.console) console.error(error); });
    });
  }
  if (!window.app || !window.app.vault) {  // not inside Obsidian
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountPage);
    else mountPage();
  }
})();
