// Model Size vs. Training Data: models appear in release order while a month counter runs from the first release to
// the last. Hover a model for its numbers. Drawn by .obsidian/plugins/blog-publish/charts.js.
// Numbers from 00Inbox/VLA 与 WAM 参数量和训练数据汇总.md: params (B), embodied training data (robot + human
// manipulation, hours; web video used only to pretrain a video backbone is not counted), exact (false = lower bound
// or inferred), label offset [dx, dy] (dy up), release month
var POINTS = [
  ["π0", "VLA", 3.3, 10000, false, [-8, -3], "2024-10"],
  ["Helix", "VLA", 7.08, 500, true, [6, 4], "2025-02"],
  ["V-JEPA 2-AC", "WAM", 1.2, 230, false, [6, -11], "2025-06"],
  ["Genie Envisioner", "WAM", 2.16, 2967, true, [6, -10], "2025-08"],
  ["Galaxea G0", "VLA", 3.0, 1700, false, [6, -10], "2025-09"],
  ["GigaBrain-0", "VLA", 3.5, 1182, false, [-8, -3], "2025-10"],
  ["mimic-video", "WAM", 2.0, 200, false, [6, -10], "2025-12"],
  ["LingBot-VLA", "VLA", 4.0, 20000, false, [7, -3], "2026-01"],
  ["Being-H0.5", "VLA", 2.0, 30000, false, [7, -3], "2026-01"],
  ["RDT2", "VLA", 7.4, 10000, false, [6, 4], "2026-02"],
  ["DreamZero", "WAM", 14.0, 500, true, [6, 4], "2026-02"],
  ["Fast-WAM", "WAM", 6.0, 60, true, [6, 4], "2026-03"],
  ["GigaWorld-Policy", "WAM", 5.0, 11185, true, [-8, -3], "2026-03"],
  ["GR00T N1.7", "VLA", 3.0, 20000, false, [7, -3], "2026-04"],
  ["Being-H0.7", "WAM", 3.0, 215000, true, [7, -3], "2026-04"],
  ["Qwen-VLA", "VLA", 5.15, 13129, false, [7, -3], "2026-05"],
  ["Qwen-RobotManip", "VLA", 4.07, 13353, false, [-8, -3], "2026-06"],
  ["Xiaomi-Robotics-1 10B", "VLA", 10.5, 107200, false, [-8, 6], "2026-07"],
  ["Natura-1", "WAM", 50.0, 1000000, false, [-8, 6], "2026-10"],
];
var f = C.figure(760, 700, "Parameters against embodied training hours of VLA and WAM models, by release month");
var x0 = 70, x1 = 736, y0 = 92, y1 = 640, log = Math.log10;
function px(hours) { return x0 + (log(hours) - log(30)) / (log(3e6) - log(30)) * (x1 - x0); }
function py(params) { return y1 - (log(params) - log(0.9)) / (log(70) - log(0.9)) * (y1 - y0); }
function month(date) { return Number(date.slice(0, 4)) * 12 + Number(date.slice(5)) - 1; }
var first = month(POINTS[0][6]), last = month(POINTS[POINTS.length - 1][6]);
function at(m) { return C.START + (m - first) * C.STAGGER; }  // 24 months in 3.6 s
function hours(h) { return h >= 1e6 ? h / 1e6 + "M h" : h >= 1e3 ? Math.round(h / 100) / 10 + "K h" : h + " h"; }

function marker(kind, exact, x, y) {
  var o = { fill: exact ? "ink" : "bg", stroke: "ink", strokeWidth: 1.4 };
  if (kind === "WAM") return f.rect(x - 4.4, y - 4.4, 8.8, 8.8, o);
  var dot = f.el("circle", { cx: x, cy: y, r: 4.8 });
  dot.style.fill = "var(--bc-" + o.fill + ")";
  dot.style.stroke = "var(--bc-ink)";
  dot.style.strokeWidth = 1.4;
  return dot;
}

f.crop(40);  // the title is the caption in the note
[["VLA", true, "VLA", 24], ["WAM", true, "WAM", 92], ["VLA", false, "Hollow: approximate (lower bound or inferred)", 166]]
  .forEach(function (item) {
    marker(item[0], item[1], item[3] + 5, 59);
    f.text(item[3] + 15, 63.5, item[2], { size: 12.5 });
  });
[1, 2, 3, 5, 7, 10, 14, 20, 30, 50].forEach(function (params) {
  f.line(x0, py(params), x1, py(params));
  f.text(x0 - 8, py(params) + 4, params + "B", { font: "mono", size: 11, color: "muted", anchor: "end" });
});
[100, 1e3, 1e4, 1e5, 1e6].forEach(function (h) {
  f.line(px(h), y0, px(h), y1);
  f.text(px(h), y1 + 20, hours(h), { font: "mono", size: 11, color: "muted", anchor: "middle" });
});
f.line(x0 - 30, y1, x1, y1, { color: "ink", width: 1.2 });
f.text((x0 + x1) / 2, y1 + 48, "Embodied training data (robot + human manipulation, hours)", { size: 12, color: "muted", anchor: "middle" });
f.text(16, (y0 + y1) / 2, "Parameters", { size: 12, color: "muted", anchor: "middle", rotate: -90 });

// Month counter in the empty top-left corner: each month shows from its own time to the next one's; only the last
// stays once the figure has played
for (var m = first; m <= last; m++) {
  var label = f.text(x0 + 14, y0 + 40, Math.floor(m / 12) + "-" + String(m % 12 + 1).padStart(2, "0"),
    { font: "mono", size: 30, color: "faint" });
  var end = m < last ? at(m + 1) : at(m) + 0.01, on = at(m) / end;
  if (m < last) label.style.opacity = 0;
  f.step(label, [{ opacity: 0 }, { opacity: 0, offset: on }, { opacity: 1, offset: on }, { opacity: 1 }], 0, end, "linear");
}

POINTS.forEach(function (p) {
  var x = px(p[3]), y = py(p[2]), t = at(month(p[6])), dx = p[5][0], dy = p[5][1];
  var mark = f.pop(marker(p[1], p[4], x, y), t);
  f.tip(mark, p[0], [["Type", p[1]], ["Parameters", p[2] + "B"], ["Training data", hours(p[3])],
    ["Released", p[6]], ["Numbers", p[4] ? "as published" : "approximate"]]);
  // Offsets are in points from the first matplotlib version, scaled up with the larger type
  f.fade(f.text(x + dx * 1.2, y - dy * 1.2 + (dy === -3 ? 4 : 0), p[0], { size: 12.5, anchor: dx < 0 ? "end" : "start" }),
    t + C.POP / 2);
});
