import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\c8a169a0-6dac-454c-b905-6d3c2ba6bed8\\screenshots';

const VIEWPORTS = [
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'desktop_1280', width: 1280, height: 800 },
];

async function captureRole(roleBtnText, roleName) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));

    // Click demo button
    await page.evaluate((text) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes(text));
      if (btn) btn.click();
    }, roleBtnText);

    await new Promise(r => setTimeout(r, 400));
    await page.click('button[type="submit"]');
    
    // Wait for URL to change to dashboard
    await page.waitForFunction(() => window.location.pathname.startsWith('/dashboard'), { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Wait until spinner is gone and content is loaded
    await page.waitForFunction(() => !document.querySelector('.animate-spin'), { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));

    // Handle instructions onboarding dialog if present
    await page.evaluate(() => {
      const acceptBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Accept') || b.textContent.includes('Understand'));
      if (acceptBtn) acceptBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const shotPath = path.join(SCREENSHOT_DIR, `${roleName}_${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Saved screenshot: ${shotPath}`);

    // If customer role, also capture Skip modal and Pause modal
    if (roleName === 'customer') {
      // Click Skip on first meal
      const hasSkip = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const skip = buttons.find(b => b.textContent.trim() === 'Skip' || b.textContent.includes('Cancel Meal'));
        if (skip) { skip.click(); return true; }
        return false;
      });
      if (hasSkip) {
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `customer_skip_modal_${vp.name}.png`), fullPage: false });
        // Close modal
        await page.evaluate(() => {
          const keepBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Keep Meal') || b.textContent.includes('Close'));
          if (keepBtn) keepBtn.click();
        });
        await new Promise(r => setTimeout(r, 500));
      }

      // Click Pause
      const hasPause = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const pause = buttons.find(b => b.textContent.includes('Pause Subscription') || b.textContent.includes('Pause'));
        if (pause) { pause.click(); return true; }
        return false;
      });
      if (hasPause) {
        await new Promise(r => setTimeout(r, 800));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `customer_pause_modal_${vp.name}.png`), fullPage: false });
        // Close modal
        await page.evaluate(() => {
          const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel'));
          if (cancelBtn) cancelBtn.click();
        });
      }
    }
  }

  await browser.close();
}

async function main() {
  console.log('Capturing Customer Dashboard...');
  await captureRole('Alice (Customer)', 'customer');
  console.log('Capturing Chef Dashboard...');
  await captureRole('Mario (Chef)', 'chef');
  console.log('Capturing Delivery Dashboard...');
  await captureRole('Dave (Rider)', 'delivery');
  console.log('Capturing Admin Dashboard...');
  await captureRole('Executive Admin', 'admin');
}

main().catch(err => {
  console.error('Error in capture_dashboards:', err);
  process.exit(1);
});
