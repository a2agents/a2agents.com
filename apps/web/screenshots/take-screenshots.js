const { chromium } = require('playwright');
const path = require('path');

const WIDTH = 1440;
const HEIGHT = 900;
const SCROLL_STEP = 120;
const SCROLL_DELAY = 60;
const PORT = 3099;
const URL = `http://localhost:${PORT}`;
const OUT_DIR = __dirname;

async function smoothScrollTo(page, targetY) {
  const currentY = await page.evaluate(() => window.scrollY);
  const distance = targetY - currentY;
  const steps = Math.ceil(Math.abs(distance) / SCROLL_STEP);
  const dir = distance > 0 ? 1 : -1;

  for (let i = 1; i <= steps; i++) {
    const y = i === steps ? targetY : currentY + dir * SCROLL_STEP * i;
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(SCROLL_DELAY);
  }
  await page.waitForTimeout(400);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Full-page screenshot: disable parallax so all elements are visible
  await page.evaluate(() => {
    // Force all elements to be fully visible
    document.querySelectorAll('*').forEach(el => {
      const s = getComputedStyle(el);
      if (parseFloat(s.opacity) < 1) {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.transition = 'none';
      }
    });
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT_DIR, 'full-page.png'), fullPage: true });
  console.log('Saved full-page.png');

  // Reload for scroll screenshots — need parallax active
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  // Get total scroll height
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const screens = Math.ceil(totalHeight / HEIGHT);

  for (let i = 0; i < screens; i++) {
    const targetY = i * HEIGHT;
    await smoothScrollTo(page, targetY);
    const name = `screen-${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, name) });
    console.log(`Saved ${name} (scroll ${targetY}px)`);
  }

  await browser.close();
  console.log(`\nDone: ${screens} screens + 1 full-page`);
}

main().catch((e) => { console.error(e); process.exit(1); });
