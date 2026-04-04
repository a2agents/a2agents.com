const { chromium } = require('playwright');
const path = require('path');

const WIDTH = 1440;
const HEIGHT = 900;
const PORT = 3099;
const URL = `http://localhost:${PORT}`;
const OUT_DIR = __dirname;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Full page screenshot
  await page.screenshot({ path: path.join(OUT_DIR, 'full-page.png'), fullPage: true });
  console.log('Saved full-page.png');

  // Get total scroll height
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const screens = Math.ceil(totalHeight / HEIGHT);

  // One screenshot per viewport-height scroll
  for (let i = 0; i < screens; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), i * HEIGHT);
    await page.waitForTimeout(300);
    const name = `screen-${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, name) });
    console.log(`Saved ${name} (scroll ${i * HEIGHT}px)`);
  }

  await browser.close();
  console.log(`\nDone: ${screens} screens + 1 full-page`);
}

main().catch((e) => { console.error(e); process.exit(1); });
