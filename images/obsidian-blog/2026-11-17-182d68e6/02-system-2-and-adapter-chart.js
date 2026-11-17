// Cloud System 2 + On-device Adapter: the cloud first, then the command going down, the adapter and the robot, and
// last the feedback going up; each step starts when the one before it lands. Drawn by
// .obsidian/plugins/blog-publish/charts.js.
var f = C.figure(760, 497, "LLM System 2 in the cloud sends eef poses to an on-device adapter for following and safety");
var s = 760 / 110;  // laid out in 110 × 72 units with y up
function X(x) { return x * s; }
function Y(y) { return (72 - y) * s; }

function region(x, y, w, h, label, start) {
  var g = f.group();
  f.rect(X(x), Y(y + h), w * s, h * s, { fill: "panel", rx: 11, parent: g });
  f.text(X(x + 1.8), Y(y + h - 2.2) + 3.5, label, { font: "mono", size: 11, color: "muted", parent: g });
  f.fade(g, start);
}
// lines are [y, text, font, size], centered on the box
function box(x, y, w, h, lines, start, fill, strokeWidth) {
  var g = f.group();
  f.rect(X(x), Y(y + h), w * s, h * s, { fill: fill || "bg", stroke: "ink", strokeWidth: strokeWidth || 1.2, rx: 8, parent: g });
  lines.forEach(function (l) {
    f.text(X(x + w / 2), Y(l[0]) + l[3] * 0.36, l[1], { font: l[2], size: l[3], anchor: "middle", parent: g });
  });
  f.fade(g, start);
}
// A vertical arrow that draws itself, then shows its head
function arrow(x, from, to, start, length) {
  var head = to > from ? 9 : -9;
  f.draw(f.line(x, from, x, to - head, { color: "ink", width: 1.4 }), start, length);
  f.fade(f.path("M" + (x - 4.5) + " " + (to - head) + " L" + (x + 4.5) + " " + (to - head) + " L" + x + " " + to + " Z"),
    start + length - 0.05, 0.1);
}

f.crop(40);  // the title is the caption in the note
var t = C.START;
region(3.5, 44, 103, 20, "CLOUD", t);
t += C.FADE;
box(30, 47, 50, 12.5, [[55.8, "LLM System 2", "bold", 14],
  [51.2, "understands instructions, translates them into eef pose", "serif", 11.5]], t);
t += C.FADE;
arrow(X(48), Y(47), Y(36.5), t, C.DRAW);
t += C.DRAW;
f.fade(f.text(X(46.5), Y(41.8) + 4, "eef pose, 200–400 ms", { size: 12, anchor: "end" }), t);
region(3.5, 3, 103, 34, "ON-DEVICE", t);
t += C.FADE;
box(8, 13, 94, 19.5, [[29.6, "Adapter", "bold", 14]], t);
t += C.FADE;
box(11, 15.5, 42, 12, [[24.6, "Following", "bold", 12.5],
  [21.2, "fast response to tactile in contact-rich tasks", "serif", 11],
  [18.4, "vision & motor feedback, (almost) no planning", "serif", 11]], t, "panel", 0.9);
box(57, 15.5, 42, 12, [[24.6, "Safety", "bold", 12.5],
  [21.2, "when the network drops: finish at a minimum,", "serif", 11],
  [18.4, "or go to safe mode (e.g. put the knife down)", "serif", 11]], t + C.STAGGER, "panel", 0.9);
t += C.STAGGER + C.FADE;
arrow(X(55), Y(13), Y(9.3), t, C.DRAW * 0.6);  // a short arrow, drawn at the same speed
t += C.DRAW * 0.6;
f.fade(f.text(X(55), Y(7.5) + 4, "robot arms & grippers", { font: "mono", size: 11, color: "muted", anchor: "middle" }), t);
t += C.FADE;
arrow(X(62), Y(36.5), Y(47), t, C.DRAW);
f.fade(f.text(X(63.5), Y(41.8) + 4, "cameras + robot state", { size: 12 }), t + C.DRAW);
