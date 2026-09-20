
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\c8a169a0-6dac-454c-b905-6d3c2ba6bed8\\screenshots';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  // Login as Alice
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Alice (Customer)'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.startsWith('/dashboard'), { timeout: 10000 }).catch(() => { });
  await new Promise(r => setTimeout(r, 2000));

  // Switch to Tab 2: "Meal Schedule & Skip Requests"
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const tab2 = tabs.find(b => b.textContent.includes('Meal Schedule & Skip'));
    if (tab2) tab2.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click first Skip button
  const openedSkip = await page.evaluate(() => {
    const skipBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Skip');
    if (skipBtns.length > 0) {
      skipBtns[0].click();
      return true;
    }
    return false;
  });

  if (openedSkip) {
    await new Promise(r => setTimeout(r, 800));
    const skipPath = path.join(SCREENSHOT_DIR, 'customer_skip_modal_mobile_390.png');
    await page.screenshot({ path: skipPath, fullPage: false });
    console.log(`Saved skip modal: ${skipPath}`);

    // Close modal
    await page.evaluate(() => {
      const keepBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Keep Meal'));
      if (keepBtn) keepBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));
  }

  // Switch to Tab 3: "Available Plans (Buy)"
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const tab3 = tabs.find(b => b.textContent.includes('Available Plans'));
    if (tab3) tab3.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click "Buy Plan" on first plan
  const openedBuy = await page.evaluate(() => {
    const buyBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Select Plan & Pay') || b.textContent.includes('Buy'));
    if (buyBtns.length > 0) {
      buyBtns[0].click();
      return true;
    }
    return false;
  });

  if (openedBuy) {
    await new Promise(r => setTimeout(r, 1500));
    const buyPath = path.join(SCREENSHOT_DIR, 'customer_payment_qr_modal_mobile_390.png');
    await page.screenshot({ path: buyPath, fullPage: false });
    console.log(`Saved payment QR modal: ${buyPath}`);
  }

  await browser.close();
}

main().catch(err => {
  console.error('Error in capture_skip_modal:', err);
  process.exit(1);
});
