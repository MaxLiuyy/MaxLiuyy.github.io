// Cloud Call Latency: every call starts at t = 0 and its bar grows in real time, slowed down SLOW times, phase by
// phase. Hover a segment for its time. Drawn by .obsidian/plugins/blog-publish/charts.js.
// Server side from the post: ViT 0.015 s, prefill 0.25 s, action 40 tok / 200 tok/s (text) or 0.003 s (expert)
var f = C.figure(760, 462, "Cloud call latency per phase, for text action output and with an action expert");
var SLOW = 5;  // the slowest call (0.71 s) then takes 3.6 s
var phases = [["Network", "g1", "on-g1"], ["ViT", "g2", "on-g1"], ["Prefill", "g4", "on-g3"], ["Action output", "g3", "on-g3"]];
var networks = [["Local, 100 Mbps", 0.04], ["Local, 20 Mbps", 0.09], ["Cross-border, 20 Mbps", 0.24]];
var groups = [["Text action output", 0.2, 118], ["With action expert", 0.003, 270]];
var x0 = 200, x1 = 736, top = 98, axis = 398;
function px(seconds) { return x0 + seconds / 0.8 * (x1 - x0); }
function at(seconds) { return C.START + seconds * SLOW; }  // when a call reaches `seconds`
function fmt(seconds) { return (Math.round(seconds * 100 + 1e-6) / 100).toFixed(2); }  // 0.505 -> 0.51, as in the post

f.crop(40);  // the title is the caption in the note
f.legend(phases.map(function (p) { return [p[0], p[1]]; }));
for (var i = 0; i <= 8; i++) {
  f.line(px(i / 10), top, px(i / 10), axis);
  f.text(px(i / 10), axis + 20, (i / 10).toFixed(1) + " s", { font: "mono", size: 11, color: "muted", anchor: "middle" });
}
f.line(x0, axis, x1, axis, { color: "ink", width: 1.2 });
f.text(px(0.5), top - 8, "2 Hz (0.5 s)", { size: 11.5, color: "muted", anchor: "middle" });
f.text((x0 + x1) / 2, axis + 46, "Latency per cloud call", { size: 12, color: "muted", anchor: "middle" });

groups.forEach(function (group) {
  f.text(24, group[2], group[0], { font: "bold", size: 13.5 });
  networks.forEach(function (network, row) {
    var cy = group[2] + 24 + row * 40, elapsed = 0;
    var times = [network[1], 0.015, 0.25, group[1]];
    f.text(x0 - 12, cy + 4.5, network[0], { size: 12.5, anchor: "end" });
    phases.forEach(function (phase, k) {
      var seconds = times[k], left = px(elapsed), width = Math.max(px(seconds) - x0 - 1, 1);
      var bar = f.grow(f.rect(left, cy - 13, width, 26, { fill: phase[1] }), at(elapsed), seconds * SLOW);
      f.tip(bar, group[0] + ", " + network[0], phases.map(function (p, j) { return [p[0], times[j].toFixed(3) + " s"]; })
        .concat([["Total", fmt(times.reduce(function (a, b) { return a + b; }, 0)) + " s"]]));
      if (width > 34) {
        f.fade(f.text(left + width / 2, cy + 4, seconds.toFixed(2), { font: "mono", size: 11, color: phase[2], anchor: "middle" }),
          at(elapsed + seconds));
      }
      elapsed += seconds;
    });
    f.fade(f.text(px(elapsed) + 10, cy + 4.5, fmt(elapsed) + " s", { size: 12.5 }), at(elapsed));
  });
});
// The 2 Hz line goes over the bars, so the calls that miss it stand out
f.line(px(0.5), top, px(0.5), axis, { color: "muted", width: 1.2, dash: "4 3" }).style.pointerEvents = "none";
