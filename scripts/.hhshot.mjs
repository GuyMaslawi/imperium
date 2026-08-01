/**
 * Visual check for שעת הזהב: releases a window, then screenshots the takeover
 * and the banner.
 *
 *   node hhshot.mjs takeover.png banner.png
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
const [outTakeover = "takeover.png", outBanner = "banner.png"] = process.argv.slice(2);

const empire = await prisma.empire.findFirst({
  where: { user: { is: {} } },
  select: { id: true, name: true, user: { select: { id: true, tokenVersion: true } } },
  orderBy: { createdAt: "asc" },
});
if (!empire?.user) throw new Error("no empire with a user");

await prisma.miniGameEvent.updateMany({ data: { isActive: false } });
const now = new Date();
await prisma.happyHour.updateMany({
  where: { isActive: true },
  data: { isActive: false, endsAt: now, endedAt: now },
});
const event = await prisma.happyHour.create({
  data: {
    title: "Happy Hour",
    bonusPct: 100,
    isActive: true,
    durationMinutes: 60,
    startsAt: now,
    endsAt: new Date(now.getTime() + 3600_000),
  },
});
console.log("released", event.id);

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
await page.setViewport({ width: +(process.env.HH_W||1280), height: 900, deviceScaleFactor: 2 });
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

await page.goto("http://localhost:3000/game/base", { waitUntil: "networkidle0" });
await page.waitForSelector(".hh-takeover", { timeout: 30000 });
// Mid-animation: the number has landed, the chips have risen.
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: outTakeover });
console.log("wrote", outTakeover);

// Let the takeover retire, then shoot the banner it leaves behind.
await page.waitForFunction(() => !document.querySelector(".hh-takeover"), {
  timeout: 20000,
});
await new Promise((r) => setTimeout(r, 600));
const banner = await page.$(".hh-banner");
if (!banner) throw new Error("banner not found");
await banner.screenshot({ path: outBanner });
console.log("wrote", outBanner, "| empire:", empire.name);

await browser.close();
await prisma.$disconnect();
