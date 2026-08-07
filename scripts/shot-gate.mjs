// Shots of the animated front door (שער קראלדור) — the login and registration
// screens with their besieged-capital backdrop.
//
//   node scripts/shot-gate.mjs /tmp/gate
//
// READ ONLY: these routes need no session, so unlike shot-profile.mjs this
// touches no database at all.
//
// Two things this has to do that a naive screenshot does not:
//   - ask for `prefers-reduced-motion: no-preference`, because headless Chrome
//     answers `reduce` by default and would photograph a still scene;
//   - FREEZE the animations at a chosen offset. The shot itself takes a few
//     hundred milliseconds, so a 22-second flash or a 9-second sheen is absent
//     from every frame you sample by luck. Stepping a negative animation-delay
//     is the only way to see them.
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const OUT = process.argv[2] ?? "/tmp/gate";
const BASE = process.env.BASE ?? "http://localhost:3000";
fs.mkdirSync(OUT, { recursive: true });

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/**
 * Stop the clock before the page has one. Injected at document-start so that
 * every animation is paused at t=0 the instant it is created — see freeze().
 */
const HOLD = `*, *::before, *::after { animation-play-state: paused !important }`;

/**
 * Pin every animation on the page to exactly `t` seconds into its own timeline.
 *
 * Two things this does that the obvious version does not, and both were
 * learned the hard way:
 *
 *  - It does NOT inject `animation-delay: -Ns`. A negative delay is measured
 *    from when the animation *started*, so injecting it after load photographs
 *    `elapsed + N`, not `N`, and the frame drifts run to run. The tagline was
 *    "missing" from a shot that had simply landed past its own fade-out.
 *  - It needs HOLD in place from the very first frame. Chrome *removes* a
 *    finished non-filling animation from `getAnimations()`, so every entrance
 *    animation (all of which are `backwards`, i.e. non-filling at the end) is
 *    already gone by the time a loaded page is asked for its animations — and
 *    the opening frame can never be rewound to. Paused from t=0, nothing ever
 *    finishes and the whole set stays addressable.
 */
const freeze = (page, t) =>
  page.evaluate((seconds) => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = seconds * 1000;
    }
  }, t);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-color-profile=srgb"],
});

const shots = [
  { path: "/login", name: "login", w: 1440, h: 900 },
  { path: "/login", name: "login-phone", w: 390, h: 844 },
  { path: "/register", name: "register", w: 1440, h: 1100 },
];

for (const s of shots) {
  const page = await browser.newPage();
  await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  // At document-start there may be no <html> yet, so this cannot simply
  // appendChild and hope — it waits for the root element and then injects.
  await page.evaluateOnNewDocument((css) => {
    const inject = () => {
      const style = document.createElement("style");
      style.id = "shot-hold";
      style.textContent = css;
      (document.head ?? document.documentElement).appendChild(style);
    };
    if (document.documentElement) inject();
    else {
      new MutationObserver((_, obs) => {
        if (document.documentElement) {
          inject();
          obs.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    }
  }, HOLD);
  await page.goto(BASE + s.path, { waitUntil: "networkidle0" });
  const held = await page.evaluate(() => ({
    hold: !!document.getElementById("shot-hold"),
    animations: document.getAnimations().length,
  }));
  console.log(s.name, "→", page.url(), JSON.stringify(held));
  if (!held.hold || held.animations === 0) {
    throw new Error(
      "the hold style never landed — every frame below would be a lie"
    );
  }

  // ASCENDING, always. Chrome drops a finished non-filling animation from
  // getAnimations(), so the moment you freeze at 3s every entrance animation is
  // gone and can never be rewound to — a later freeze(0.45) silently
  // photographs the settled page again. Walk the timeline forwards only.
  //
  //   0.42  the horizon flash firing (22s cycle) and the city still rising
  //   0.45  the wordmark half-assembled
  //   2.6   the sheen crossing the panel (9s cycle)
  //   3.0   settled: entrances done, every loop mid-cycle
  const frames =
    s.name === "login"
      ? [["-flash", 0.42], ["-opening", 0.45], ["-sheen", 2.6], ["", 3]]
      : [["", 3]];
  for (const [suffix, t] of frames) {
    await freeze(page, t);
    await page.screenshot({ path: `${OUT}/${s.name}${suffix}.png` });
  }
  await page.close();
}

// And the contract everybody forgets: the same screen with motion refused.
const still = await browser.newPage();
await still.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await still.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "reduce" },
]);
await still.goto(BASE + "/login", { waitUntil: "networkidle0" });
await still.screenshot({ path: `${OUT}/login-reduced.png` });

await browser.close();
console.log("wrote", fs.readdirSync(OUT).join(", "), "to", OUT);
