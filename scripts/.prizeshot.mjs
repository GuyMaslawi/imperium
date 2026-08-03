/**
 * Visual check for /game/prizes.
 *
 *   node scripts/.prizeshot.mjs desktop.png mobile.png
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const root = "/Users/guymaslawi/Documents/my_apps/kraldor";
const local = fs.readFileSync(path.join(root, ".env.local"), "utf8");
for (const line of local.split("\n")) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const prisma = new PrismaClient();
const [outDesktop = "prizes.png", outMobile = "prizes-mobile.png"] = process.argv.slice(2);

const empire = await prisma.empire.findFirst({
  where: { user: { is: {} }, isStaff: false },
  select: { id: true, name: true, user: { select: { id: true, tokenVersion: true } } },
  orderBy: { createdAt: "asc" },
});
if (!empire?.user) throw new Error("no empire with a user");

const token = await new SignJWT({ sub: empire.user.id, ver: empire.user.tokenVersion })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("2h")
  .sign(new TextEncoder().encode(process.env.AUTH_SECRET));

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
// Headless Chrome answers `reduce` by default — the scene would be correctly
// invisible in every frame without this.
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "no-preference" },
]);
await page.setViewport({ width: 1280, height: 1100, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
const cdp = await page.createCDPSession();
await cdp.send("Network.enable");
await cdp.send("Network.setCookie", {
  name: "kraldor_session",
  value: token,
  domain: "localhost",
  path: "/",
  httpOnly: true,
});

await page.goto("http://localhost:3000/game/prizes", { waitUntil: "networkidle0" });
console.log("landed on", page.url(), "| empire:", empire.name);

// Did the CSS actually ship? An appended block the dev server never rebuilt is
// invisible in exactly the way a cascade bug is.
const ruleCount = await page.evaluate(() => {
  let n = 0;
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) if (rule.cssText.includes(".prize-")) n++;
    } catch {}
  }
  return n;
});
console.log("prize- rules in the served CSS:", ruleCount);

// Clear whatever the game happens to be shouting about — a mini-game takeover
// and the alert toasts both sit over the page and have nothing to do with it.
await page.evaluate(() => {
  for (const el of document.querySelectorAll('[class*="mgt-"], .war-alert, .war-vignette')) {
    let node = el;
    while (node && node !== document.body) {
      if (getComputedStyle(node).position === "fixed") break;
      node = node.parentElement;
    }
    (node && node !== document.body ? node : el).remove();
  }
  document.body.style.overflow = "";
});

// Freeze the moving parts mid-pass so a screenshot can judge them.
await page.addStyleTag({
  content: `.prize-shine, .prize-medal, .prize-mote, .prize-spark, .prize-halo, .prize-gem {
    animation-delay: -0.9s !important; animation-play-state: paused !important; }`,
});
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: outDesktop, fullPage: true });
console.log("wrote", outDesktop);

await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2 });
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: outMobile, fullPage: true });
console.log("wrote", outMobile);

// Nothing may scroll the page sideways at 390 — see the mobile-layout rules.
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth
);
console.log("horizontal overflow at 390px:", overflow);

await browser.close();
await prisma.$disconnect();
