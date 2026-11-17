// Cost per Robot: the per-call bar adds up part by part, then the monthly need fills the Pro 200 plans one after
// another. Hover a part or a plan for its numbers. Drawn by .obsidian/plugins/blog-publish/charts.js.
// From the post: 2,000 cached prefix tokens × 25, 1,080 image + 100 text tokens × 250, 40 output tokens × 1,250
// credit per million; 57,600 calls a day for 30 days; a Pro 200 plan holds about 140K credits
var f = C.figure(760, 340, "Credits per cloud call by part, and the monthly need against Pro 200 plans");
var parts = [["Cached prefix", 0.05, "g1", "on-g1", "2,000 tokens × 25"], ["Images", 0.27, "g4", "on-g3", "1,080 tokens × 250"],
  ["Text", 0.025, "g2", "on-g1", "100 tokens × 250"], ["Output", 0.05, "g3", "on-g3", "40 tokens × 1,250"]];
var x0 = 60, x1 = 720, axis = 176, PER_CREDIT = 5;  // the 0.395 credit bar adds up in 2 s
function px(credit) { return x0 + credit / 0.46 * (x1 - x0); }
function pm(thousands) { return x0 + thousands / 760 * (x1 - x0); }

f.crop(40);  // the title is the caption in the note
f.legend(parts.map(function (p) { return [p[0], p[2]]; }));
[0, 0.1, 0.2, 0.3, 0.4].forEach(function (tick) {
  f.line(px(tick), 104, px(tick), axis);
  f.text(px(tick), axis + 20, String(tick), { font: "mono", size: 11, color: "muted", anchor: "middle" });
});
f.line(x0, axis, x1, axis, { color: "ink", width: 1.2 });
f.text((x0 + x1) / 2, axis + 46, "Credits per call", { size: 12, color: "muted", anchor: "middle" });

var total = 0, t = C.START;
parts.forEach(function (p) {
  var left = px(total), width = px(p[1]) - x0 - 1, length = p[1] * PER_CREDIT;
  var bar = f.grow(f.rect(left, 122, width, 36, { fill: p[2] }), t, length);
  f.tip(bar, p[0], [["Credits", String(p[1])], ["Share", Math.round(p[1] / 0.395 * 100) + "%"], ["From", p[4]]]);
  if (p[1] >= 0.04) f.fade(f.text(left + width / 2, 144, String(p[1]), { font: "mono", size: 11, color: p[3], anchor: "middle" }), t + length);
  if (p[0] === "Images") f.fade(f.text(left + width / 2, 114, "68%", { size: 12, color: "muted", anchor: "middle" }), t + length);
  total += p[1];
  t += length;
});
f.fade(f.text(px(total) + 8, 144.5, "0.395 credit", { size: 12.5 }), t);

f.fade(f.text(x0, 262, "Monthly need: 0.395 × 57,600 × 30 ≈ 683K credits", { size: 12.5 }), t);
var plans = f.group();
for (var i = 0; i < 5; i++) {
  var plan = f.rect(pm(i * 140), 282, pm(140) - x0, 24, { fill: "bg", stroke: "ink", strokeWidth: 1.1, parent: plans });
  f.tip(plan, "Pro 200 #" + (i + 1), [["Credits", "140K"], ["Price", "$200 / month"],
    ["Used", Math.round(Math.min(Math.max(683 - i * 140, 0), 140) / 140 * 100) + "%"]]);
  f.text(pm(i * 140 + 70), 326, "Pro 200 #" + (i + 1), { size: 11.5, color: "muted", anchor: "middle", parent: plans });
}
f.fade(plans, t);
t += C.FADE;
var fill = f.grow(f.rect(x0 + 1, 288, pm(683) - x0 - 1, 12, { fill: "g4" }), t, 1.2);
fill.style.pointerEvents = "none";  // the plans under it carry the hover
t += 1.2;
f.fade(f.text(pm(700) + 8, 298.5, "683K", { font: "mono", size: 11.5 }), t);
f.fade(f.text(x1, 262, "5 × $200 ≈ $1,000 / month", { font: "bold", size: 12.5, anchor: "end" }), t + C.STAGGER);
