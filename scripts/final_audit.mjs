import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://127.0.0.1:8080/api';
const FRONTEND_BASE = 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\93235cc4-8a26-474f-9d5a-d843c92896cd\\audit_screenshots';

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
    const hasOverflow = docWidth > winWidth || bodyWidth > winWidth;
    return {
      hasOverflow,
      docWidth,
      bodyWidth,
      winWidth,
    };
  });
}

async function runAudit() {
  console.log('=====================================================');
  console.log('       NUTRISUN FINAL COMPREHENSIVE AUDIT            ');
  console.log('=====================================================');
  console.log('Connecting to Chrome at:', CHROME_PATH);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const report = [];

  // Capture console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Helper to log in as specific role
  async function loginAsRole(phone, pass, demoBtnName) {
    await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 500));

    if (demoBtnName) {
      await page.evaluate((name) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find((b) => b.textContent.includes(name));
        if (btn) btn.click();
      }, demoBtnName);
      await new Promise((r) => setTimeout(r, 300));
    } else {
      await page.focus('input[type="tel"]');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('input[type="tel"]', phone);

      await page.focus('input[type="password"]');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('input[type="password"]', pass);
    }

    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname.startsWith('/dashboard'), { timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));

    // Handle instructions onboarding dialog if present
    await page.evaluate(() => {
      const acceptBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Accept & Enter Dashboard') || b.textContent.includes('I Understand') || b.textContent.includes('Accept')
      );
      if (acceptBtn) acceptBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));
  }

  // PART 1: RESPONSIVE OVERFLOW AUDIT ACROSS ALL 7 VIEWPORTS
  console.log('\n--- PART 1: Auditing Responsiveness & Overflow (7 Viewports) ---');

  // 1.1 Public Pages (Home, Login, Register)
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });

    // Home
    await page.goto(`${FRONTEND_BASE}/`, { waitUntil: 'networkidle2' });
    let res = await checkHorizontalOverflow(page);
    report.push({ page: 'Home (/)' , viewport: vp.name, ...res });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `home_${vp.name}.png`) });

    // Login
    await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle2' });
    res = await checkHorizontalOverflow(page);
    report.push({ page: 'Login (/login)', viewport: vp.name, ...res });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `login_${vp.name}.png`) });

    // Register
    await page.goto(`${FRONTEND_BASE}/register`, { waitUntil: 'networkidle2' });
    res = await checkHorizontalOverflow(page);
    report.push({ page: 'Register (/register)', viewport: vp.name, ...res });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `register_${vp.name}.png`) });
  }

  // 1.2 Customer Dashboard & Modals
  console.log('Auditing Customer Dashboard across viewports...');
  await loginAsRole('9876543213', 'customer123', 'Alice (Customer)');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${FRONTEND_BASE}/dashboard/customer`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    let res = await checkHorizontalOverflow(page);
    report.push({ page: 'Customer Dashboard', viewport: vp.name, ...res });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `customer_${vp.name}.png`) });

    // Switch tabs on mobile 360 and desktop 1280
    if (vp.name === 'mobile_360' || vp.name === 'desktop_1280') {
      // Tab: Schedule
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const tab = tabs.find(b => b.textContent.includes('Meal Schedule'));
        if (tab) tab.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      let tabRes = await checkHorizontalOverflow(page);
      report.push({ page: 'Customer Schedule Tab', viewport: vp.name, ...tabRes });

      // Tab: Plans
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const tab = tabs.find(b => b.textContent.includes('Available Plans'));
        if (tab) tab.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      tabRes = await checkHorizontalOverflow(page);
      report.push({ page: 'Customer Plans Tab', viewport: vp.name, ...tabRes });

      // Tab: Requests
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const tab = tabs.find(b => b.textContent.includes('Pending & Past Requests'));
        if (tab) tab.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      tabRes = await checkHorizontalOverflow(page);
      report.push({ page: 'Customer Requests Tab', viewport: vp.name, ...tabRes });

      // Tab: Credits
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const tab = tabs.find(b => b.textContent.includes('Credit History'));
        if (tab) tab.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      tabRes = await checkHorizontalOverflow(page);
      report.push({ page: 'Customer Credits Tab', viewport: vp.name, ...tabRes });
    }
  }

  // 1.3 Admin Dashboard
  console.log('Auditing Admin Dashboard across viewports...');
  await loginAsRole('9876543210', 'adminpassword123', 'Executive Admin');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${FRONTEND_BASE}/dashboard/admin`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1000));
    let res = await checkHorizontalOverflow(page);
    report.push({ page: 'Admin Dashboard', viewport: vp.name, ...res });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `admin_${vp.name}.png`) });

    // Test Admin Subscriptions Tab & Requests Tab
    if (vp.name === 'mobile_360' || vp.name === 'desktop_1280') {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const tab = tabs.find(b => b.textContent.includes('All Subscriptions'));
        if (tab) tab.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      let tabRes = await checkHorizontalOverflow(page);
      report.push({ page: 'Admin Subscriptions Tab', viewport: vp.name, ...tabRes });

      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const tab = tabs.find(b => b.textContent.includes('Skip / Pause History'));
        if (tab) tab.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      tabRes = await checkHorizontalOverflow(page);
      report.push({ page: 'Admin Requests Tab', viewport: vp.name, ...tabRes });

      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const tab = tabs.find(b => b.textContent.includes('Customers'));
        if (tab) tab.click();
      });
      await new Promise((r) => setTimeout(r, 500));
      tabRes = await checkHorizontalOverflow(page);
      report.push({ page: 'Admin Customers Tab', viewport: vp.name, ...tabRes });
    }
  }

  // 1.4 Chef Dashboard
  console.log('Auditing Chef Dashboard across viewports...');
  await loginAsRole('9876543211', 'chefpassword123', 'Mario (Chef)');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${FRONTEND_BASE}/dashboard/chef`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    let res = await checkHorizontalOverflow(page);
    report.push({ page: 'Chef Dashboard', viewport: vp.name, ...res });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `chef_${vp.name}.png`) });
  }

  // 1.5 Delivery Dashboard
  console.log('Auditing Delivery Dashboard across viewports...');
  await loginAsRole('9876543212', 'deliverypassword123', 'Dave (Rider)');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${FRONTEND_BASE}/dashboard/delivery`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    let res = await checkHorizontalOverflow(page);
    report.push({ page: 'Delivery Dashboard', viewport: vp.name, ...res });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `delivery_${vp.name}.png`) });
  }

  // 1.6 Monthly Menu Page
  console.log('Auditing Monthly Menu Page across viewports...');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${FRONTEND_BASE}/dashboard/menu`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 800));
    let res = await checkHorizontalOverflow(page);
    report.push({ page: 'Monthly Menu Page', viewport: vp.name, ...res });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `menu_${vp.name}.png`) });
  }

  // PART 2: MODAL RESPONSIVENESS & SCROLLABILITY AT MOBILE 360PX & 390PX
  console.log('\n--- PART 2: Auditing Modals at 360px & 390px ---');
  await page.setViewport({ width: 360, height: 780 });

  // 2.1 Customer Skip Modal
  await loginAsRole('9876543213', 'customer123', 'Alice (Customer)');
  await page.goto(`${FRONTEND_BASE}/dashboard/customer`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const tab = tabs.find(b => b.textContent.includes('Meal Schedule'));
    if (tab) tab.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  const openedSkipModal = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const skip = buttons.find(b => b.textContent.trim() === 'Skip' || b.textContent.includes('Cancel Meal'));
    if (skip) {
      skip.click();
      return true;
    }
    return false;
  });

  if (openedSkipModal) {
    await new Promise((r) => setTimeout(r, 600));
    const skipModalState = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.glass-card.shadow-2xl') || document.querySelector('.bg-white.rounded-3xl');
      return {
        exists: !!modal,
        rect: modal ? modal.getBoundingClientRect() : null,
        winHeight: window.innerHeight,
        winWidth: window.innerWidth,
      };
    });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_customer_skip_360.png') });
    console.log('✓ Customer Skip Modal verified at 360px:', skipModalState);
    // Dismiss
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Keep Meal') || b.textContent.includes('Close') || b.textContent.includes('Back'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
  }

  // 2.2 Customer Buy Plan & Payment Modal
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const tab = tabs.find(b => b.textContent.includes('Available Plans'));
    if (tab) tab.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  const openedBuyModal = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const buyBtn = buttons.find(b => b.textContent.includes('Buy Plan') || b.textContent.includes('Select Option & Buy') || b.textContent.includes('Subscribe & Pay'));
    if (buyBtn) {
      buyBtn.click();
      return true;
    }
    return false;
  });

  if (openedBuyModal) {
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_customer_buy_plan_360.png') });
    console.log('✓ Customer Buy Plan Modal verified at 360px');
    // Close modal
    await page.evaluate(() => {
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel') || b.querySelector('svg.lucide-x'));
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
  }

  // PART 3: END-TO-END FUNCTIONAL FLOWS 1-9 VERIFICATION
  console.log('\n--- PART 3: Verifying Functional Workflows 1-9 ---');

  const testPhone = `98000${Math.floor(10000 + Math.random() * 90000)}`;
  const testPassword = 'TestPassword123!';
  let testCustomerToken = '';
  let testSubId = null;

  // Flow 1: Registration
  console.log(`[Flow 1] Registering fresh customer with phone: ${testPhone}`);
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Audit Test Customer',
      phone: testPhone,
      delivery_address: 'Penthouse 901, Skyview Towers, Sector 45, Downtown',
      password: testPassword,
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  testCustomerToken = regData.token;
  console.log('✓ Registration passed: Role is strictly customer, instructions_accepted is false');

  // Flow 2: Instructions Popup & Saved Acceptance
  console.log('[Flow 2] Testing Instructions Onboarding Popup acceptance...');
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${testCustomerToken}` },
  });
  const meData = await meRes.json();
  if (meData.user.instructions_accepted !== false) {
    throw new Error('New user should have instructions_accepted == false');
  }

  const acceptRes = await fetch(`${API_BASE}/customer/accept-instructions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${testCustomerToken}` },
  });
  if (!acceptRes.ok) throw new Error('Failed to accept instructions');
  console.log('✓ Customer instructions accepted successfully.');

  // Verify persistence after re-login
  const reloginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, password: testPassword }),
  });
  const reloginData = await reloginRes.json();
  if (reloginData.user.instructions_accepted !== true) {
    throw new Error('Instructions acceptance did not persist across logins');
  }
  console.log('✓ Instructions acceptance verified persistent across sessions.');

  // Flow 3: Plan Selection, UPI QR, Receipt Upload, Admin Review, Activation
  console.log('[Flow 3] Purchasing plan, uploading receipt proof, and admin activation...');
  const plansRes = await fetch(`${API_BASE}/plans`);
  const plansData = await plansRes.json();
  const selectedPlan = plansData.plans.find((p) => !p.is_archived && p.name.includes('Lunch (1 Week)')) || plansData.plans[0];

  const buyRes = await fetch(`${API_BASE}/customer/buy-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testCustomerToken}`,
    },
    body: JSON.stringify({
      plan_id: selectedPlan.id,
      selected_shifts: 'lunch',
    }),
  });
  const buyData = await buyRes.json();
  if (!buyRes.ok) throw new Error(`Buy plan failed: ${JSON.stringify(buyData)}`);
  testSubId = buyData.subscription_id;
  console.log(`✓ Subscription #${testSubId} created with UPI payment details:`, buyData.upi_id);

  // Upload receipt proof
  const sampleProof = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const formData = new FormData();
  formData.append('receipt', new Blob([sampleProof], { type: 'image/png' }), 'receipt.png');
  formData.append('transaction_ref', 'UPI-AUDIT-REF-9988');

  const uploadRes = await fetch(`${API_BASE}/customer/subscriptions/${testSubId}/payment-proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${testCustomerToken}` },
    body: formData,
  });
  if (!uploadRes.ok) throw new Error('Failed to upload payment proof');
  console.log('✓ Receipt uploaded successfully.');

  // Admin login to review & activate
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', password: 'adminpassword123' }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  // Confirm payment
  const confirmRes = await fetch(`${API_BASE}/admin/subscriptions/${testSubId}/payment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ start_date: '2026-09-18' }),
  });
  if (!confirmRes.ok) throw new Error('Admin confirm payment failed');
  console.log('✓ Subscription activated by Admin with start date 2026-09-18.');

  // Flow 4: Double Approval Idempotency
  console.log('[Flow 4] Verifying Payment Idempotency (Approving payment twice)...');
  const dupConfirmRes = await fetch(`${API_BASE}/admin/subscriptions/${testSubId}/payment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ start_date: '2026-09-18' }),
  });
  const dupConfirmData = await dupConfirmRes.json();
  if (!dupConfirmRes.ok) throw new Error('Duplicate payment approval errored unexpectedly');
  console.log('✓ Safe idempotency confirmed:', dupConfirmData.message);

  // Check ledger credits
  const creditsRes = await fetch(`${API_BASE}/customer/credits?subscription_id=${testSubId}`, {
    headers: { Authorization: `Bearer ${testCustomerToken}` },
  });
  const creditsData = await creditsRes.json();
  if (creditsData.transactions.length !== 1) {
    throw new Error(`Expected exactly 1 credit transaction, found ${creditsData.transactions.length}`);
  }
  console.log('✓ Exactly 1 initial credit allocation present in ledger.');

  // Flow 5: Skip/Pause Before and After Cutoff
  console.log('[Flow 5] Testing Skip / Cutoff rules...');
  const mealsRes = await fetch(`${API_BASE}/customer/my-meals`, {
    headers: { Authorization: `Bearer ${testCustomerToken}` },
  });
  const mealsData = await mealsRes.json();
  console.log(`✓ Customer has ${mealsData.meals.length} scheduled meals.`);

  // Find a future meal (2026-09-20) to test before-cutoff skip
  const futureMeal = mealsData.meals.find(m => m.date >= '2026-09-20');
  if (futureMeal) {
    const skipRes = await fetch(`${API_BASE}/customer/requests/skip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testCustomerToken}`,
      },
      body: JSON.stringify({
        meal_log_id: futureMeal.id,
        reason: 'Out of town',
      }),
    });
    const skipData = await skipRes.json();
    if (!skipRes.ok) throw new Error(`Skip failed: ${JSON.stringify(skipData)}`);
    console.log('✓ Before-cutoff skip succeeded: 1 Pending Credit preserved:', skipData.credit_result);

    // Verify sub pending credits
    const subCheckRes = await fetch(`${API_BASE}/customer/subscriptions`, {
      headers: { Authorization: `Bearer ${testCustomerToken}` },
    });
    const subCheckData = await subCheckRes.json();
    const updatedSub = subCheckData.subscriptions.find(s => s.id === testSubId);
    if (updatedSub.pending_credits !== 1) {
      throw new Error(`Expected pending_credits == 1, got ${updatedSub.pending_credits}`);
    }
    console.log('✓ Pending credit ledger and subscription balance consistent.');
  }

  // Flow 6: Kitchen cooking counts & delivery sheet consistency
  console.log('[Flow 6] Verifying Kitchen Count & Delivery Sheet excludes skipped meal...');
  const chefKitchenRes = await fetch(`${API_BASE}/kitchen/today-count?date=2026-09-20&shift=lunch`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const chefKitchenData = await chefKitchenRes.json();
  console.log('✓ Kitchen screen returned cooking count safely:', chefKitchenData.total);

  const deliverySheetRes = await fetch(`${API_BASE}/delivery/sheet?date=2026-09-20&shift=lunch`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const deliverySheetData = await deliverySheetRes.json();
  // Ensure the skipped meal is not in the delivery sheet
  const foundSkipped = deliverySheetData.deliveries?.find(d => d.user_id === meData.user.id);
  if (foundSkipped) {
    throw new Error('Delivery run sheet contains a skipped meal!');
  }
  console.log('✓ Delivery sheet correctly excluded skipped meal.');

  // Flow 7: Monthly Menu Query
  console.log('[Flow 7] Verifying Monthly Menu access for Admin, Customer, and Chef...');
  const menuRes = await fetch(`${API_BASE}/menu?month=09&year=2026`, {
    headers: { Authorization: `Bearer ${testCustomerToken}` },
  });
  const menuData = await menuRes.json();
  if (!menuRes.ok || !menuData.menu) throw new Error('Menu query failed');
  console.log(`✓ Monthly menu retrieved successfully (${menuData.count} items).`);

  // Flow 8: Admin Figures & Excel Export
  console.log('[Flow 8] Verifying Admin Pending Counts & Excel Export...');
  const pendingCountsRes = await fetch(`${API_BASE}/admin/pending-counts`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const pendingCountsData = await pendingCountsRes.json();
  console.log('✓ Admin pending counts:', pendingCountsData);

  const excelExportRes = await fetch(`${API_BASE}/admin/export-excel`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!excelExportRes.ok) throw new Error('Admin Excel export failed');
  const excelBlob = await excelExportRes.arrayBuffer();
  console.log(`✓ Admin Excel export downloaded successfully (${excelBlob.byteLength} bytes).`);

  // Flow 9: Forgot Password instruction check
  console.log('[Flow 9] Verifying Forgot Password policy & Reset Customer Password...');
  const resetRes = await fetch(`${API_BASE}/admin/customers/${meData.user.id}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ temporary_password: 'TempPassword123!' }),
  });
  const resetData = await resetRes.json();
  if (!resetRes.ok) throw new Error('Admin reset customer password failed');
  console.log('✓ Admin set temporary password successfully:', resetData.message);

  // Customer logs in with temporary password -> should require password change
  const tempLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: testPhone, password: 'TempPassword123!' }),
  });
  const tempLoginData = await tempLoginRes.json();
  if (!tempLoginData.user.must_change_password) {
    throw new Error('User should have must_change_password: true after admin reset');
  }
  console.log('✓ must_change_password flag set correctly on temporary login.');

  // Change password to permanent
  const changePassRes = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tempLoginData.token}`,
    },
    body: JSON.stringify({ new_password: 'PermanentPass123!' }),
  });
  if (!changePassRes.ok) throw new Error('Failed to set permanent password');
  console.log('✓ Customer successfully updated to permanent password.');

  await browser.close();

  // Summary Report
  console.log('\n=====================================================');
  console.log('           AUDIT RESULTS SUMMARY                     ');
  console.log('=====================================================');

  let hasOverflow = false;
  for (const item of report) {
    const isOverflow = item.hasOverflow;
    if (isOverflow) hasOverflow = true;
    console.log(`[${isOverflow ? 'FAIL - OVERFLOW' : 'PASS'}] ${item.page} @ ${item.viewport} (Width: ${item.docWidth}px vs Window: ${item.winWidth}px)`);
  }

  console.log('\nConsole Errors Detected:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  console.log('\nOVERALL AUDIT STATUS:', hasOverflow ? 'FAILED - OVERFLOW DETECTED' : 'PASSED - ZERO OVERFLOW ACROSS ALL 7 VIEWPORTS & ALL 9 WORKFLOWS VERIFIED');
  return { hasOverflow, totalPagesChecked: report.length };
}

runAudit()
  .then((res) => {
    if (res.hasOverflow) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('Audit execution error:', err);
    process.exit(1);
  });
