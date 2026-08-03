// Shots of the VIP surfaces: the shop card, the warehouse bulk bar, the
// command-post dialog and the training card — before and after the pass.
// Shares the session-cookie recipe with scripts/shot-overlays.mjs.
//
// DEV ONLY, and it WRITES: to shoot both states it sets `vipSince` on the
// oldest empire in whatever database `.env`/`.env.local` point at. Run it
// against a local database, never a live one.
//
//   node scripts/shot-vip.mjs /tmp/vip        → the free player's view
//   node scripts/shot-vip.mjs /tmp/vip vip    → the pass holder's view
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import puppeteer from "puppeteer-core";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const prisma = new PrismaClient();
const OUT = process.argv[2] ?? "/tmp/vip";
const WANT_VIP = process.argv[3] === "vip";
fs.mkdirSync(OUT, { recursive: true });

const empire = await prisma.empire.findFirstOrThrow({
  where: { user: { is: {} } },
  select: { id: true, user: { select: { id: true, tokenVersion: true } } },
  orderBy: { createdAt: "asc" },
});
await prisma.empire.update({
  where: { id: empire.id },
  data: { vipSince: WANT_VIP ? new Date() : null },
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

const CASES = [
  { id: "diamonds", url: "/game/diamonds" },
  { id: "storage", url: "/game/storage" },
  { id: "army", url: "/game/army" },
  { id: "command", url: "/game/base", open: "מפקדה" },
];

const VIEWPORTS = [
  { width: 1440, height: 1100 },
  { width: 390, height: 844 },
];

for (const vp of VIEWPORTS) {
  for (const c of CASES) {
    const page = await browser.newPage();
    await page.setViewport({ ...vp, deviceScaleFactor: 2 });
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
    // The dev overlay and any live toast sit exactly where the controls are.
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await new Promise((r) => setTimeout(r, 900));

    if (c.open) {
      const clicked = await page.evaluate((text) => {
        const el = [...document.querySelectorAll("button")].find((b) =>
          b.textContent?.includes(text)
        );
        if (!el) return false;
        el.click();
        return true;
      }, c.open);
      if (!clicked) console.log(`  ! could not open "${c.open}"`);
      await new Promise((r) => setTimeout(r, 700));
    }

    const name = `${c.id}-${WANT_VIP ? "vip" : "free"}-${vp.width}.png`;
    await page.screenshot({ path: `${OUT}/${name}`, fullPage: !c.open });
    console.log(`  ✓ ${name}`);
    await page.close();
  }
}

await browser.close();
await prisma.$disconnect();
