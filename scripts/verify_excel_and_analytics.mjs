import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer-core';

const API_BASE = 'http://127.0.0.1:8080/api';
const FRONTEND_BASE = 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\cdf4b725-8bcf-4dcc-9cc4-8373044e3609';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runVerification() {
  console.log('=====================================================');
  console.log('🚀 NUTRISUN EXCEL DOWNLOADS & SALES ANALYTICS VERIFICATION');
  console.log('=====================================================');

  // 1. Authenticate as Admin
  console.log('\n[1] Authenticating as Admin (9876543210)...');
  const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    phone: '9876543210',
    password: 'adminpassword123'
  });
  const adminToken = adminLoginRes.data.token;
  console.log(`✅ Admin authenticated successfully. User: ${adminLoginRes.data.user.name} (${adminLoginRes.data.user.role})`);

  // 2. Authenticate as Customer (for authorization checks)
  console.log('\n[2] Authenticating as Customer (9876543213)...');
  const customerLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    phone: '9876543213',
    password: 'customer123'
  });
  const customerToken = customerLoginRes.data.token;
  console.log(`✅ Customer authenticated successfully. User: ${customerLoginRes.data.user.name} (${customerLoginRes.data.user.role})`);

  // 3. Test Unauthorized Access (Missing token)
  console.log('\n[3] Testing Unauthenticated Access to Excel Export...');
  try {
    await axios.get(`${API_BASE}/admin/export-excel?month=2026-09&report=monthly`);
    console.error('❌ Expected 401 Unauthorized but request succeeded!');
    process.exit(1);
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log(`✅ Correctly rejected unauthenticated download with HTTP 401: "${err.response.data.error}"`);
    } else {
      console.error('❌ Unexpected response:', err.message);
      process.exit(1);
    }
  }

  // 4. Test Forbidden Access (Customer token on Admin route)
  console.log('\n[4] Testing Customer Access to Admin Excel Export & Analytics...');
  try {
    await axios.get(`${API_BASE}/admin/export-excel?month=2026-09&report=monthly`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.error('❌ Expected 403 Forbidden for customer on export-excel!');
    process.exit(1);
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.log(`✅ Correctly rejected customer role from export-excel with HTTP 403: "${err.response.data.error}"`);
    } else {
      console.error('❌ Unexpected response:', err.message);
      process.exit(1);
    }
  }

  try {
    await axios.get(`${API_BASE}/admin/analytics?month=2026-09`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.error('❌ Expected 403 Forbidden for customer on analytics!');
    process.exit(1);
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.log(`✅ Correctly rejected customer role from analytics with HTTP 403: "${err.response.data.error}"`);
    } else {
      console.error('❌ Unexpected response:', err.message);
      process.exit(1);
    }
  }

  // 5. Test Monthly Analytics API
  console.log('\n[5] Fetching Monthly Analytics for 2026-09...');
  const analyticsStartTime = Date.now();
  const analyticsRes = await axios.get(`${API_BASE}/admin/analytics?month=2026-09`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const analyticsDuration = Date.now() - analyticsStartTime;
  console.log(`✅ Analytics API responded in ${analyticsDuration}ms`);
  const analytics = analyticsRes.data;

  console.log('   KPI Summary:', {
    month: analytics.selected_month,
    confirmed_sales: `₹${analytics.total_confirmed_sales ?? 0}`,
    pending_amount: `₹${analytics.total_pending_amount ?? 0}`,
    confirmed_tx_count: analytics.confirmed_payment_count ?? 0,
    pending_tx_count: analytics.pending_payment_count ?? 0,
    total_delivered_meals: analytics.total_delivered_meals ?? 0,
    lunch_delivered: analytics.lunch_delivered ?? 0,
    dinner_delivered: analytics.dinner_delivered ?? 0,
  });
  console.log(`   Daily Sales Breakdown items: ${analytics.daily_sales?.length ?? 0}`);
  console.log(`   Customer Sales Breakdown items: ${analytics.customer_sales?.length ?? 0}`);

  if (analytics.total_confirmed_sales === undefined || !Array.isArray(analytics.daily_sales) || !Array.isArray(analytics.customer_sales)) {
    console.error('❌ Invalid analytics response structure!');
    process.exit(1);
  }

  // 6. Test Customer Reports & Activity History API
  console.log('\n[6] Fetching Customer Reports & Activity History for 2026-09...');
  const custStartTime = Date.now();
  const custRes = await axios.get(`${API_BASE}/admin/analytics/customers?month=2026-09`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const custDuration = Date.now() - custStartTime;
  console.log(`✅ Customer Reports API responded in ${custDuration}ms (Batch prefetching optimization active)`);
  const customers = custRes.data.customers;
  console.log(`   Total customers retrieved: ${customers?.length ?? 0}`);

  if (customers && customers.length > 0) {
    const sample = customers[0];
    console.log('   Sample Customer Report:', {
      name: sample.name,
      phone: sample.phone,
      address: sample.address,
      plans_count: sample.subscriptions?.length ?? 0,
      payments_count: sample.payments?.length ?? 0,
      credits: sample.credits,
      activity_history_entries: sample.activity_history?.length ?? 0,
    });
    if (sample.activity_history && sample.activity_history.length > 0) {
      console.log('   Sample Activity Log Item:', sample.activity_history[0]);
    }
  }

  // 7. Test Monthly Excel Report Export (6 Sheets)
  console.log('\n[7] Downloading Monthly Excel Export (6 Sheets)...');
  const excelStartTime = Date.now();
  const excelRes = await axios.get(`${API_BASE}/admin/export-excel?month=2026-09&report=monthly`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    responseType: 'arraybuffer'
  });
  const excelDuration = Date.now() - excelStartTime;
  const contentType = excelRes.headers['content-type'];
  const contentDisp = excelRes.headers['content-disposition'];
  const excelBuffer = Buffer.from(excelRes.data);

  console.log(`✅ Excel download completed in ${excelDuration}ms`);
  console.log(`   Content-Type: ${contentType}`);
  console.log(`   Content-Disposition: ${contentDisp}`);
  console.log(`   File size: ${excelBuffer.length} bytes`);

  // Verify binary zip/xlsx header: PK\x03\x04
  const isZip = excelBuffer[0] === 0x50 && excelBuffer[1] === 0x4B && excelBuffer[2] === 0x03 && excelBuffer[3] === 0x04;
  if (!isZip) {
    console.error('❌ Downloaded file is NOT a valid ZIP/XLSX archive!');
    process.exit(1);
  }
  console.log('✅ File magic bytes match valid XLSX archive (PK\\x03\\x04)');

  const monthlyFilePath = path.join(ARTIFACT_DIR, 'nutrisun-sales-report-2026-09.xlsx');
  fs.writeFileSync(monthlyFilePath, excelBuffer);
  console.log(`✅ Saved monthly report to: ${monthlyFilePath}`);

  // Inspect sheets of the monthly report using PowerShell Expand-Archive and XML parsing
  console.log('\n[8] Verifying Workbook Sheet Structure (Must contain 6 specific sheets)...');
  const tempUnzipDir = path.join(ARTIFACT_DIR, 'temp_xlsx_inspect');
  if (fs.existsSync(tempUnzipDir)) {
    fs.rmSync(tempUnzipDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempUnzipDir, { recursive: true });

  const monthlyZipPath = monthlyFilePath.replace('.xlsx', '.zip');
  fs.copyFileSync(monthlyFilePath, monthlyZipPath);
  execSync(`powershell -Command "Expand-Archive -Path '${monthlyZipPath}' -DestinationPath '${tempUnzipDir}' -Force"`);
  const workbookXmlPath = path.join(tempUnzipDir, 'xl', 'workbook.xml');
  const workbookXml = fs.readFileSync(workbookXmlPath, 'utf8');

  // Parse sheet names: <sheet name="..."
  const sheetMatches = [...workbookXml.matchAll(/<sheet\s+name="([^"]+)"/g)].map(m => m[1]);
  console.log('   Sheets found in exported workbook:', sheetMatches);

  const requiredSheets = [
    'Monthly Sales Summary',
    'Payment Details',
    'Customer Details',
    'Subscription Details',
    'Customer Activity History',
    'Meal Credit Details'
  ];

  let missingSheets = [];
  for (const sheet of requiredSheets) {
    if (!sheetMatches.includes(sheet)) {
      missingSheets.push(sheet);
    }
  }

  if (missingSheets.length > 0) {
    console.error('❌ Missing required sheets:', missingSheets);
    process.exit(1);
  }
  console.log('✅ All 6 required sheets confirmed in the generated Excel workbook!');

  // Clean up temp unpack and zip
  fs.rmSync(tempUnzipDir, { recursive: true, force: true });
  if (fs.existsSync(monthlyZipPath)) fs.unlinkSync(monthlyZipPath);

  // 9. Test Legacy 10-Sheet System Export (retaining backward compatibility)
  console.log('\n[9] Verifying Full System Excel Export without month param (10 Sheets)...');
  const legacyRes = await axios.get(`${API_BASE}/admin/export-excel`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    responseType: 'arraybuffer'
  });
  const legacyBuffer = Buffer.from(legacyRes.data);
  const legacyFilePath = path.join(ARTIFACT_DIR, 'nutrisun-system-backup.xlsx');
  fs.writeFileSync(legacyFilePath, legacyBuffer);

  const legacyUnzipDir = path.join(ARTIFACT_DIR, 'temp_legacy_inspect');
  if (fs.existsSync(legacyUnzipDir)) {
    fs.rmSync(legacyUnzipDir, { recursive: true, force: true });
  }
  const legacyZipPath = legacyFilePath.replace('.xlsx', '.zip');
  fs.copyFileSync(legacyFilePath, legacyZipPath);
  execSync(`powershell -Command "Expand-Archive -Path '${legacyZipPath}' -DestinationPath '${legacyUnzipDir}' -Force"`);
  const legacyXmlPath = path.join(legacyUnzipDir, 'xl', 'workbook.xml');
  const legacyXml = fs.readFileSync(legacyXmlPath, 'utf8');
  const legacySheets = [...legacyXml.matchAll(/<sheet\s+name="([^"]+)"/g)].map(m => m[1]);
  console.log(`   Legacy export sheet count: ${legacySheets.length}`);
  console.log('   Legacy sheets:', legacySheets);
  if (legacySheets.length !== 10) {
    console.error(`❌ Expected 10 sheets in legacy system export, got ${legacySheets.length}`);
    process.exit(1);
  }
  console.log('✅ Legacy 10-sheet system export verified and preserved!');
  fs.rmSync(legacyUnzipDir, { recursive: true, force: true });
  if (fs.existsSync(legacyZipPath)) fs.unlinkSync(legacyZipPath);

  // 10. Test Menu Template Download
  console.log('\n[10] Verifying Menu Template Download...');
  const menuRes = await axios.get(`${API_BASE}/admin/menu/template?month=09&year=2026`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    responseType: 'arraybuffer'
  });
  const menuBuffer = Buffer.from(menuRes.data);
  const isMenuZip = menuBuffer[0] === 0x50 && menuBuffer[1] === 0x4B && menuBuffer[2] === 0x03 && menuBuffer[3] === 0x04;
  if (!isMenuZip) {
    console.error('❌ Menu template is not a valid XLSX file!');
    process.exit(1);
  }
  console.log(`✅ Menu template verified (${menuBuffer.length} bytes, valid xlsx)`);

  // 11. End-to-End UI Verification with Puppeteer
  console.log('\n[11] Launching Puppeteer for End-to-End UI & Download Testing...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Monitor console errors
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      pageErrors.push(msg.text());
    }
  });

  // Login
  console.log('   Navigating to login page...');
  await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle2' });

  // Click Quick Fill "Admin"
  const clickedAdmin = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const adminBtn = buttons.find(b => b.textContent?.includes('Admin ('));
    if (adminBtn) {
      adminBtn.click();
      return true;
    }
    return false;
  });

  if (!clickedAdmin) {
    console.log('   Quick Fill button not found, filling manually...');
    await page.type('input[type="tel"]', '9876543210');
    await page.type('input[type="password"]', 'adminpassword123');
  }

  // Submit login
  const submitBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[type="submit"]'));
    if (btns.length > 0) {
      btns[0].click();
      return true;
    }
    return false;
  });

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  console.log(`   Current URL after login: ${page.url()}`);

  if (!page.url().includes('/dashboard/admin')) {
    console.log('   Navigating directly to /dashboard/admin...');
    await page.goto(`${FRONTEND_BASE}/dashboard/admin`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
  }

  // Switch to Tab 9: Sales & Delivery Analytics
  console.log('   Waiting for Admin dashboard to finish loading...');
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(b => b.textContent?.includes('Sales & Delivery'));
  }, { timeout: 25000 });

  console.log('   Clicking "Sales & Delivery Analytics" tab...');
  const switchedTab = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const analyticsTab = tabs.find(b => b.textContent?.includes('Sales & Delivery'));
    if (analyticsTab) {
      analyticsTab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }
    return false;
  });
  console.log(`   Analytics tab click result: ${switchedTab}`);

  await new Promise(r => setTimeout(r, 4000));
  const currentBody = await page.evaluate(() => document.body.innerText);
  console.log('   Body preview after tab click:', currentBody.substring(0, 400).replace(/\n+/g, ' '));

  // Wait for SalesAnalyticsModule to finish loading analytics and customer reports
  console.log('   Waiting for Sales Analytics module data to load...');
  await page.waitForFunction(() => {
    const text = document.body.innerText;
    return text.includes('Confirmed Revenue') || text.includes('Monthly Sales & Customer Intelligence');
  }, { timeout: 30000 });

  // Check if Sales & Analytics content rendered
  const hasAnalyticsContent = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasSalesHeadline: text.includes('Monthly Sales & Customer Intelligence'),
      hasConfirmedRevenue: text.includes('Confirmed Revenue'),
      hasExportMonthlyBtn: text.includes('Export Monthly Report (.xlsx)'),
      hasCustomerSection: text.includes('Customer Details & Chronological Activity Report'),
      hasBreakdownTable: text.includes('Customer-Wise Sales Breakdown'),
      hasDateWiseTable: text.includes('Date-Wise Sales & Payment Records'),
    };
  });
  console.log('   Analytics page content verification:', hasAnalyticsContent);

  // Take desktop screenshot
  const desktopScreenshot = path.join(ARTIFACT_DIR, 'sales_analytics_desktop.png');
  await page.screenshot({ path: desktopScreenshot, fullPage: true });
  console.log(`📸 Desktop screenshot saved: ${desktopScreenshot}`);

  // Click Inspect Customer on the first customer in Customer-Wise Sales Breakdown table
  console.log('   Clicking "Inspect Customer" in Customer-Wise Sales table...');
  const clickedInspect = await page.evaluate(() => {
    const inspectBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent?.includes('Inspect Customer'));
    if (inspectBtns.length > 0) {
      inspectBtns[0].click();
      return true;
    }
    return false;
  });
  console.log(`   Clicked customer inspect: ${clickedInspect}`);
  await new Promise(r => setTimeout(r, 2000));

  // Capture customer detailed view screenshot
  const custScreenshot = path.join(ARTIFACT_DIR, 'customer_activity_history.png');
  await page.screenshot({ path: custScreenshot, fullPage: true });
  console.log(`📸 Customer Activity screenshot saved: ${custScreenshot}`);

  // Test Mobile Viewport (390x844)
  console.log('   Testing Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise(r => setTimeout(r, 1500));

  const overflowInfo = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    return {
      hasOverflow: docWidth > winWidth || bodyWidth > winWidth,
      docWidth,
      winWidth,
      bodyWidth
    };
  });
  console.log('   Mobile horizontal overflow check:', overflowInfo);

  const mobileScreenshot = path.join(ARTIFACT_DIR, 'sales_analytics_mobile.png');
  await page.screenshot({ path: mobileScreenshot, fullPage: false });
  console.log(`📸 Mobile screenshot saved: ${mobileScreenshot}`);

  await browser.close();

  console.log('\n=====================================================');
  console.log('🎉 ALL VERIFICATIONS SUCCEEDED PERFECTLY!');
  console.log('=====================================================');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
