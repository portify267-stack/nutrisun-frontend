import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide/brain/c8a169a0-6dac-454c-b905-6d3c2ba6bed8/screenshots';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // 1. Customer Modal capture
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Alice (Customer)'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Find and click "View QR & Submit Payment Proof"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const qrBtn = btns.find(b => b.textContent.includes('View QR & Submit Payment Proof'));
    if (qrBtn) qrBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({ path: `${SCREENSHOT_DIR}/customer_payment_qr_modal_mobile_390.png` });
  console.log('✓ Captured customer payment QR modal mobile_390');

  await page.setViewport({ width: 1280, height: 900 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/customer_payment_qr_modal_desktop_1280.png` });
  console.log('✓ Captured customer payment QR modal desktop_1280');

  // 2. Admin Modal capture
  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 390, height: 844 });
  await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await adminPage.evaluate(() => localStorage.clear());
  await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await adminPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Executive Admin'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForNavigation({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Click Review & Confirm button
  await adminPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const revBtn = btns.find(b => b.textContent.includes('Review & Confirm') || b.textContent.includes('Review Proof'));
    if (revBtn) revBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/admin_review_payment_modal_mobile_390.png` });
  console.log('✓ Captured admin review modal mobile_390');

  await adminPage.setViewport({ width: 1280, height: 900 });
  await new Promise(r => setTimeout(r, 500));
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/admin_review_payment_modal_desktop_1280.png` });
  console.log('✓ Captured admin review modal desktop_1280');

  await browser.close();
}

main().catch(console.error);
