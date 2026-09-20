import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\c8a169a0-6dac-454c-b905-6d3c2ba6bed8\\screenshots\\modals';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runModalAudit() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Helper for login
  async function performLogin(phone, password) {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type="tel"]');
    await page.$eval('input[type="tel"]', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, phone);
    await page.$eval('input[type="password"]', (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, password);
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1500));
  }

  // 1. Mobile 390px - Customer Modals
  await page.setViewport({ width: 390, height: 844 });
  await performLogin('9876543210', 'pass123');
  await page.goto('http://localhost:3000/dashboard/customer', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Check if Skip modal opens
  const clickedSkip = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const skipBtn = buttons.find(b => b.textContent.includes('Skip') || b.textContent.includes('Cancel Meal'));
    if (skipBtn) {
      skipBtn.click();
      return true;
    }
    return false;
  });

  if (clickedSkip) {
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_skip_mobile_390.png') });
  }

  // Check Pause modal
  await page.goto('http://localhost:3000/dashboard/customer', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  const clickedPause = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const pauseBtn = buttons.find(b => b.textContent.includes('Pause Subscription') || b.textContent.includes('Pause'));
    if (pauseBtn) {
      pauseBtn.click();
      return true;
    }
    return false;
  });

  if (clickedPause) {
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_pause_mobile_390.png') });
  }

  // 2. Mobile 390px - Admin Modals
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await performLogin('9999999999', 'admin123');
  await page.goto('http://localhost:3000/dashboard/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  const clickedReview = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const revBtn = buttons.find(b => b.textContent.includes('Review Payment'));
    if (revBtn) {
      revBtn.click();
      return true;
    }
    return false;
  });

  if (clickedReview) {
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_admin_payment_review_mobile_390.png') });
  }

  await browser.close();
  console.log('SUCCESS: All modal audit screenshots captured successfully in:', SCREENSHOT_DIR);
}

runModalAudit().catch(err => {
  console.error('Modal audit error:', err);
  process.exit(1);
});
