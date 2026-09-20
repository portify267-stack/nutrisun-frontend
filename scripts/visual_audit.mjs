import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\c8a169a0-6dac-454c-b905-6d3c2ba6bed8\\screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile_360', width: 360, height: 780 },
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'mobile_430', width: 430, height: 932 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'tablet_1024', width: 1024, height: 768 },
  { name: 'desktop_1280', width: 1280, height: 800 },
  { name: 'desktop_1440', width: 1440, height: 900 },
];

async function checkHorizontalOverflow(page) {
  return await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    return {
      hasOverflow: docWidth > winWidth || bodyWidth > winWidth,
      scrollWidth: Math.max(docWidth, bodyWidth),
      innerWidth: winWidth,
    };
  });
}

async function runAudit() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const report = [];

  // Helper for login
  async function performLogin(roleName, targetUrl) {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 500));

    await page.evaluate((role) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes(role));
      if (btn) btn.click();
    }, roleName);

    await new Promise(r => setTimeout(r, 300));
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    if (targetUrl) {
      await page.goto(targetUrl, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // 1. Audit Public Pages: Home, Login, Register
  console.log('\n--- Auditing Public Pages ---');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    
    // Home
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
    const homeOverflow = await checkHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `home_${vp.name}.png`), fullPage: false });
    report.push({ page: 'Home', viewport: vp.name, overflow: homeOverflow });

    // Login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    const loginOverflow = await checkHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `login_${vp.name}.png`), fullPage: false });
    report.push({ page: 'Login', viewport: vp.name, overflow: loginOverflow });

    // Register
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
    const regOverflow = await checkHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `register_${vp.name}.png`), fullPage: false });
    report.push({ page: 'Register', viewport: vp.name, overflow: regOverflow });
  }

  // 2. Audit Customer Dashboard
  console.log('\n--- Auditing Customer Dashboard ---');
  await performLogin('Alice (Customer)', 'http://localhost:3000/dashboard/customer');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/dashboard/customer', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    
    // Dismiss instructions onboarding if present
    await page.evaluate(() => {
      const acceptBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Accept') || b.textContent.includes('Understand'));
      if (acceptBtn) acceptBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const custOverflow = await checkHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `customer_dashboard_${vp.name}.png`), fullPage: false });
    report.push({ page: 'Customer Dashboard', viewport: vp.name, overflow: custOverflow });
  }

  // 3. Audit Admin Dashboard
  console.log('\n--- Auditing Admin Dashboard ---');
  await performLogin('Executive Admin', 'http://localhost:3000/dashboard/admin');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/dashboard/admin', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const adminOverflow = await checkHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `admin_dashboard_${vp.name}.png`), fullPage: false });
    report.push({ page: 'Admin Dashboard', viewport: vp.name, overflow: adminOverflow });
  }

  // 4. Audit Chef Dashboard
  console.log('\n--- Auditing Chef Dashboard ---');
  await performLogin('Mario (Chef)', 'http://localhost:3000/dashboard/chef');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/dashboard/chef', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const chefOverflow = await checkHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `chef_dashboard_${vp.name}.png`), fullPage: false });
    report.push({ page: 'Chef Dashboard', viewport: vp.name, overflow: chefOverflow });
  }

  // 5. Audit Delivery Dashboard
  console.log('\n--- Auditing Delivery Dashboard ---');
  await performLogin('Dave (Rider)', 'http://localhost:3000/dashboard/delivery');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/dashboard/delivery', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const delivOverflow = await checkHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `delivery_dashboard_${vp.name}.png`), fullPage: false });
    report.push({ page: 'Delivery Dashboard', viewport: vp.name, overflow: delivOverflow });
  }

  // 6. Audit Monthly Menu Page
  console.log('\n--- Auditing Menu Page ---');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/dashboard/menu', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const menuOverflow = await checkHorizontalOverflow(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `menu_page_${vp.name}.png`), fullPage: false });
    report.push({ page: 'Menu Page', viewport: vp.name, overflow: menuOverflow });
  }

  await browser.close();

  console.log('\n=== AUDIT SUMMARY RESULTS ===');
  let hasErrors = false;
  for (const item of report) {
    const status = item.overflow.hasOverflow ? `OVERFLOW (Width: ${item.overflow.scrollWidth}px vs ${item.overflow.innerWidth}px)` : 'PASS';
    if (item.overflow.hasOverflow) hasErrors = true;
    console.log(`[${status}] ${item.page} @ ${item.viewport}`);
  }

  console.log('\nOverall status:', hasErrors ? 'SOME PAGES HAVE OVERFLOW' : 'ALL PAGES PASS RESPONSIVENESS CHECKS WITH ZERO OVERFLOW');
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
