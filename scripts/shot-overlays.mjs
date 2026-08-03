// Overlay audit: opens every dialog/modal/takeover in the game on a phone
// viewport and checks the thing zero-overflow testing cannot see — whether its
// bottom edge is actually reachable. See scripts/shot-drawer.mjs for the
// session-cookie recipe this shares.
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import puppeteer from "puppeteer-core";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const prisma = new PrismaClient();
const OUT = process.argv[2] ?? "/tmp/overlays";
fs.mkdirSync(OUT, { recursive: true });

const empire = await prisma.empire.findFirst({
  where: { user: { is: {} } },
  select: { name: true, user: { select: { id: true, tokenVersion: true } } },
  orderBy: { createdAt: "asc" },
});
const token = await new SignJWT({ sub: empire.user.id, ver: empire.user.tokenVersion })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode(process.env.AUTH_SECRET));

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox"],
});

/** Each case: where to go, and what to click (by visible text) to open it. */
const CASES = [
  { id: "navdrawer", url: "/game/base", openSelector: "button[aria-label='פתיחת תפריט']" },
  { id: "wheel", url: "/game/base", open: "סובב" },
  { id: "seasonpass", url: "/game/base", open: "דרך התהילה" },
  { id: "minigame", url: "/game/base", open: "פריצת הכספת" },
  { id: "chat", url: "/game/base", openSelector: ".chat-launcher" },
  {
    id: "paperdoll",
    url: "/game/hero",
    openSelector: "[data-slot], .paperdoll-slot, button[aria-label*='חפץ']",
  },
  { id: "buy", url: "/game/diamonds/buy", open: "רכישה מיידית" },
];

// The two phone widths the mobile contract is held to. 320 is where things
// break first; 844-tall is where a `vh`-sized overlay looks fine and is not.
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
];

let failures = 0;

for (const vp of VIEWPORTS) {
 const label = `${vp.width}x${vp.height}`;
 console.log(`\n── ${label} ──`);
 for (const c of CASES) {
  const page = await browser.newPage();
  await page.setViewport({ ...vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  await cdp.send("Network.setCookie", {
    name: "kraldor_session",
    value: token,
    domain: "localhost",
    path: "/",
  });
  await page.goto(`http://localhost:3000${c.url}`, { waitUntil: "networkidle2" });
  await page.addStyleTag({
    content: "nextjs-portal,#nextjs-portal{display:none!important}",
  });
  // Clear toasts parked over the corners.
  await page.evaluate(() => {
    document
      .querySelectorAll("button[aria-label*='סגור'], button[aria-label*='סגירה']")
      .forEach((b) => b.click());
  });
  await new Promise((r) => setTimeout(r, 400));

  const opened = await page.evaluate((c) => {
    const all = [...document.querySelectorAll("button, a[role='button'], [role='button']")];
    const hit = c.open
      ? all.find((b) => b.textContent?.includes(c.open))
      : document.querySelector(c.openSelector);
    if (!hit) return false;
    hit.click();
    return true;
  }, c);
  if (!opened) {
    console.log(`${c.id.padEnd(12)} SKIP — trigger not on the page`);
    await page.close();
    continue;
  }
  await new Promise((r) => setTimeout(r, 900));

  const report = await page.evaluate(() => {
    const vh = window.innerHeight;
    // Every overlay in this game is either a role=dialog, a portaled fixed
    // wrapper, or one of the two named takeovers.
    const nodes = [
      ...document.querySelectorAll(
        "[role='dialog'], [role='alertdialog'], .mgt, .hh-takeover, .chat-panel, aside.nav-drawer"
      ),
      // Anything off to the side is closed, not broken.
    ].filter((n) => {
      const r = n.getBoundingClientRect();
      return r.height > 0 && r.left < window.innerWidth - 4;
    });
    return nodes.map((n) => {
      const r = n.getBoundingClientRect();
      // The deepest scroller inside it, if any.
      const scrollers = [n, ...n.querySelectorAll("*")].filter((e) => {
        const cs = getComputedStyle(e);
        return /auto|scroll/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2;
      });
      // An overlay taller than the viewport is fine as long as SOMETHING can
      // bring its bottom into view — some of these (the wheel) put the scroller
      // on the fixed wrapper above the card rather than on the card itself.
      let scrollableAncestor = null;
      for (let p = n.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/auto|scroll/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 2) {
          scrollableAncestor = p.className.toString().split(" ").slice(0, 2).join(".");
          break;
        }
      }
      const spills = r.bottom > vh + 1 || r.top < -1;
      return {
        tag: n.tagName.toLowerCase() + "." + (n.className.toString().split(" ")[0] || ""),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        vh,
        scrollableAncestor,
        overflowsViewport: spills && !scrollableAncestor,
        scrollers: scrollers.map((e) => ({
          cls: e.className.toString().split(" ").slice(0, 2).join("."),
          overscroll: getComputedStyle(e).overscrollBehaviorY,
          hidden: Math.round(e.scrollHeight - e.clientHeight),
          bottomOnScreen: Math.round(e.getBoundingClientRect().bottom) <= vh + 1,
        })),
      };
    });
  });

  // The two ways an overlay strands its own content on a phone: the box itself
  // runs off the viewport, or a scroller inside it does.
  const bad = report.filter(
    (r) => r.overflowsViewport || r.scrollers.some((s) => !s.bottomOnScreen)
  );
  failures += bad.length;
  console.log(
    `${c.id.padEnd(12)} ${bad.length ? "❌ UNREACHABLE" : "✅"} ${JSON.stringify(report)}`
  );
  await page.screenshot({ path: path.join(OUT, `${c.id}-${label}.png`) });
  await page.close();
 }
}

await browser.close();
await prisma.$disconnect();
console.log("\nshots in", OUT);
console.log(failures ? `❌ ${failures} overlay(s) with unreachable content` : "✅ all overlays reachable");
process.exit(failures ? 1 : 0);
