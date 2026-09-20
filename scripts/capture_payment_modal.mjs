import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\c8a169a0-6dac-454c-b905-6d3c2ba6bed8\\screenshots';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 1. Customer flow
  await page.setViewport({ width: 390, height: 844 });
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
  await page.waitForFunction(() => window.location.pathname.startsWith('/dashboard'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  // Click on "View QR & Submit Payment Proof" button on the pending subscription card
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const viewQrBtn = btns.find(b => b.textContent.includes('View QR & Submit Payment Proof') || b.textContent.includes('View Payment Details'));
    if (viewQrBtn) {
      viewQrBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  // Mobile screenshot of Customer QR Payment modal
  await page.screenshot({ path: `${SCREENSHOT_DIR}/customer_payment_qr_modal_mobile_390.png` });
  console.log('✓ Captured customer payment QR modal mobile_390');

  // Desktop screenshot of Customer QR Payment modal
  await page.setViewport({ width: 1280, height: 900 });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/customer_payment_qr_modal_desktop_1280.png` });
  console.log('✓ Captured customer payment QR modal desktop_1280');

  // Test Copy UPI ID click
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const copyBtn = btns.find(b => b.textContent.includes('Copy UPI ID'));
    if (copyBtn) copyBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: `${SCREENSHOT_DIR}/customer_payment_qr_copied_desktop_1280.png` });
  console.log('✓ Captured customer copy UPI ID state');

  // 2. Admin Review flow
  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 390, height: 844 });
  await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await adminPage.evaluate(() => localStorage.clear());
  await adminPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await adminPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const adminPreset = btns.find(b => b.textContent.includes('Executive Admin'));
    if (adminPreset) adminPreset.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForFunction(() => window.location.pathname.startsWith('/dashboard/admin'), { timeout: 10000 });
  await new Promise(r => setTimeout(r, 1200));

  // Open first Review & Verify modal
  await adminPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const reviewBtn = btns.find(b => b.textContent.includes('Review Proof') || b.textContent.includes('Review & Verify') || b.textContent.includes('Review Payment'));
    if (reviewBtn) reviewBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Mobile screenshot of Admin Review Payment modal
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/admin_review_payment_modal_mobile_390.png` });
  console.log('✓ Captured admin review modal mobile_390');

  // Desktop screenshot of Admin Review Payment modal
  await adminPage.setViewport({ width: 1280, height: 900 });
  await new Promise(r => setTimeout(r, 800));
  await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/admin_review_payment_modal_desktop_1280.png` });
  console.log('✓ Captured admin review modal desktop_1280');

  await browser.close();
}

main().catch(console.error);
