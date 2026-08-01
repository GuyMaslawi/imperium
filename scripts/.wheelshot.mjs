/**
 * Throwaway visual check for the wheel: opens /game/base, pops the wheel modal
 * and captures it idle, mid-spin and on the result.
 *
 *   node scripts/.wheelshot.mjs outprefix [width] [height]
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const local = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
for (const line of local.split("\n")) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const prisma = new PrismaClient();
const [out = "wheel", w = "760", h = "1000"] = process.argv.slice(2);

const empire = await prisma.empire.findFirst({
  where: { user: { is: {} } },
  select: { id: true, name: true, user: { select: { id: true, tokenVersion: true } } },
  orderBy: { createdAt: "asc" },
});
if (!empire?.user) throw new Error("no empire with a user");

// make sure there are spins to burn
await prisma.empire.update({ where: { id: empire.id }, data: { wheelSpins: 12 } }).catch((e) => {
  console.log("could not top up spins:", e.message);
});

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
page.on("console", (m) => { if (m.type() === "error") console.log("[console]", m.text().slice(0, 200)); });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 2 });
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
console.log("url:", page.url(), "| empire:", empire.name);
await new Promise((r) => setTimeout(r, 2000));

await page.evaluate(() => {
  for (const b of document.querySelectorAll("button")) {
    if (b.getAttribute("aria-label")?.startsWith("סגור") && b.closest(".fixed")) b.click();
  }
});

const opened = await page.evaluate(() => {
  const card = [...document.querySelectorAll("div")].find((d) =>
    d.textContent?.includes("גלגל המזל") && d.querySelector("button")
  );
  const btn = [...(card?.querySelectorAll("button") ?? [])].find((b) => b.textContent?.includes("סובב"));
  if (!btn) return false;
  btn.click();
  return true;
});
console.log("opened wheel:", opened);
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${out}-idle.png` });

// spin
await page.evaluate(() => {
  const modal = document.querySelector(".fixed.inset-0 .ornate-shell");
  const btn = [...modal.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith("סובב"));
  btn?.click();
});
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${out}-spin.png` });
await new Promise((r) => setTimeout(r, 4200));
await page.screenshot({ path: `${out}-result.png` });

// batch reveal
await page.evaluate(() => {
  const modal = document.querySelector(".fixed.inset-0 .ornate-shell");
  const btn = [...modal.querySelectorAll("button")].find((b) => b.textContent?.includes("סיבובים"));
  btn?.click();
});
await new Promise((r) => setTimeout(r, 8000));
await page.screenshot({ path: `${out}-batch.png` });

console.log("wrote", out + "-{idle,spin,result,batch}.png");
await browser.close();
await prisma.$disconnect();
