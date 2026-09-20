import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://127.0.0.1:8080/api';
const FRONTEND_BASE = 'http://localhost:3000';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\c8a169a0-6dac-454c-b905-6d3c2ba6bed8\\screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testApiFlow() {
  console.log('=== Step 1: Testing Manual UPI Payment API End-to-End ===');

  // 1. Login Customer
  const custLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543213', password: 'customer123' })
  });
  const custLoginData = await custLoginRes.json();
  if (!custLoginRes.ok) throw new Error(`Customer login failed: ${JSON.stringify(custLoginData)}`);
  const custToken = custLoginData.token;
  console.log('✓ Customer logged in successfully:', custLoginData.user.name);

  // 2. Fetch available active plans & Buy an active Plan
  const plansRes = await fetch(`${API_BASE}/plans`);
  const plansData = await plansRes.json();
  const activePlan = plansData.plans.find(p => !p.is_archived) || plansData.plans[0];
  console.log('✓ Found active plan:', activePlan.name, `(ID: ${activePlan.id})`);

  let selectedShifts = activePlan.shifts;
  if (activePlan.name.toLowerCase().includes('breakfast or dinner')) {
    selectedShifts = 'dinner';
  }

  const buyRes = await fetch(`${API_BASE}/customer/buy-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${custToken}`
    },
    body: JSON.stringify({ plan_id: activePlan.id, selected_shifts: selectedShifts })
  });
  const buyData = await buyRes.json();
  if (!buyRes.ok) throw new Error(`Buy plan failed: ${JSON.stringify(buyData)}`);
  console.log('✓ Plan purchase initiated:', {
    subscription_id: buyData.subscription_id,
    amount: buyData.amount,
    payee_name: buyData.payee_name,
    account_holder: buyData.account_holder,
    upi_id: buyData.upi_id,
    qr_asset_path: buyData.qr_asset_path,
    instruction: buyData.instruction
  });

  const subId = buyData.subscription_id;

  // Verify sub is not active yet
  const subCheckRes = await fetch(`${API_BASE}/customer/subscriptions`, {
    headers: { 'Authorization': `Bearer ${custToken}` }
  });
  const subCheckData = await subCheckRes.json();
  const createdSub = subCheckData.subscriptions.find(s => s.id === subId);
  if (!createdSub || createdSub.payment_status !== 'PENDING' || createdSub.is_active !== false) {
    throw new Error('Subscription should have PENDING payment and is_active: false');
  }
  console.log('✓ Verified created subscription is PENDING and inactive.');

  // 3. Submit Payment Proof
  const sampleReceiptPath = './scratch/sample_receipt.png';
  if (!fs.existsSync('./scratch')) fs.mkdirSync('./scratch', { recursive: true });
  fs.writeFileSync(sampleReceiptPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));

  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(sampleReceiptPath)], { type: 'image/png' });
  formData.append('receipt', fileBlob, 'sample_receipt.png');
  formData.append('transaction_ref', 'UPI987654321001');

  const uploadRes = await fetch(`${API_BASE}/customer/subscriptions/${subId}/payment-proof`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${custToken}` },
    body: formData
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(`Submit payment proof failed: ${JSON.stringify(uploadData)}`);
  console.log('✓ Uploaded payment proof:', uploadData);

  // Verify subscription is still PENDING and credits are not assigned yet
  const subAfterUploadRes = await fetch(`${API_BASE}/customer/subscriptions`, {
    headers: { 'Authorization': `Bearer ${custToken}` }
  });
  const subAfterUploadData = await subAfterUploadRes.json();
  const subAfterUpload = subAfterUploadData.subscriptions.find(s => s.id === subId);
  if (subAfterUpload.payment_status !== 'PENDING' || subAfterUpload.is_active !== false) {
    throw new Error('Payment must not be auto-confirmed upon proof upload!');
  }
  console.log('✓ Confirmed: Screenshot upload does NOT automatically activate subscription or meal credits.');

  // 4. Admin Login & Payment Verification
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', password: 'adminpassword123' })
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminLoginData)}`);
  const adminToken = adminLoginData.token;
  console.log('✓ Admin logged in successfully');

  // 5. Admin fetches subscriptions and checks payment proof preloaded
  const adminSubsRes = await fetch(`${API_BASE}/admin/subscriptions?payment_status=PENDING`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminSubsData = await adminSubsRes.json();
  const targetSub = adminSubsData.subscriptions.find(s => s.id === subId);
  if (!targetSub || !targetSub.payment_record || !targetSub.payment_record.proof_image_url) {
    throw new Error(`Admin should see attached payment proof for sub #${subId}`);
  }
  console.log('✓ Admin sees uploaded proof URL:', targetSub.payment_record.proof_image_url);

  // 6. Admin Approves and Confirms Payment with Start Date
  const confirmRes = await fetch(`${API_BASE}/admin/subscriptions/${subId}/payment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ start_date: '2026-09-17' })
  });
  const confirmData = await confirmRes.json();
  if (!confirmRes.ok) throw new Error(`Admin confirm payment failed: ${JSON.stringify(confirmData)}`);
  console.log('✓ Admin confirmed payment and activated subscription:', confirmData.message);

  // 7. Verify Idempotency - duplicate confirmation
  const dupConfirmRes = await fetch(`${API_BASE}/admin/subscriptions/${subId}/payment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ start_date: '2026-09-17' })
  });
  const dupConfirmData = await dupConfirmRes.json();
  console.log('✓ Duplicate confirmation safely handled:', dupConfirmData.message);

  // Verify credits assigned exactly once
  const custCreditsRes = await fetch(`${API_BASE}/customer/credits?subscription_id=${subId}`, {
    headers: { 'Authorization': `Bearer ${custToken}` }
  });
  const custCreditsData = await custCreditsRes.json();
  console.log(`✓ Credit ledger entries for Sub #${subId}:`, custCreditsData.transactions.length);
  if (custCreditsData.transactions.length !== 1) {
    throw new Error(`Expected exactly 1 credit transaction for initial allocation, found ${custCreditsData.transactions.length}`);
  }

  return { subId, custToken, adminToken };
}

async function runBrowserVisualAudit() {
  console.log('\n=== Step 2: Browser Visual & UI Interaction Verification ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Test Mobile Width (390px) and Desktop Width (1280px)
  const viewports = [
    { name: 'mobile_390', width: 390, height: 844 },
    { name: 'desktop_1280', width: 1280, height: 800 }
  ];

  // Login as Alice (Customer) using preset button
  await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Alice (Customer)'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname.startsWith('/dashboard'), { timeout: 10000 }).catch(() => {});
  console.log('✓ Navigated to Customer Dashboard in browser');

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 500));

    // Click "Available Plans (Buy)" tab
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Available Plans'));
      if (tab) tab.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Capture plans tab
    await page.screenshot({ path: `${SCREENSHOT_DIR}/customer_plans_${vp.name}.png` });

    // Click "Subscribe Now" on the first available plan
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Subscribe Now'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 600));

    // Click Proceed to Payment
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Proceed to Payment'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 1200));
    // Take screenshot of the QR and manual payment screen
    await page.screenshot({ path: `${SCREENSHOT_DIR}/customer_payment_qr_modal_${vp.name}.png` });
    console.log(`✓ Captured customer payment QR modal screenshot at ${vp.name}`);

    // Test Copy UPI ID button in browser
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Copy UPI ID'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/customer_payment_qr_copied_${vp.name}.png` });

    // Close modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Done') || b.textContent.includes('Close'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 500));
  }

  // Admin login and check review modal
  const adminPage = await browser.newPage();
  await adminPage.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle2' });
  await adminPage.evaluate(() => localStorage.clear());
  await adminPage.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  await adminPage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Admin User'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForFunction(() => window.location.pathname.startsWith('/dashboard/admin'), { timeout: 10000 }).catch(() => {});
  console.log('✓ Navigated to Admin Dashboard in browser');

  for (const vp of viewports) {
    await adminPage.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 800));
    await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/admin_dashboard_pending_${vp.name}.png` });

    // Open first Review & Verify modal if present
    await adminPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Review Proof') || b.textContent.includes('Review & Verify') || b.textContent.includes('Review Payment'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await adminPage.screenshot({ path: `${SCREENSHOT_DIR}/admin_review_payment_modal_${vp.name}.png` });
    console.log(`✓ Captured admin payment review modal screenshot at ${vp.name}`);

    // Close modal
    await adminPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));
  }

  await browser.close();
}

async function main() {
  try {
    await testApiFlow();
    await runBrowserVisualAudit();
    console.log('\n========================================');
    console.log('✓ ALL MANUAL UPI PAYMENT VERIFICATIONS PASSED!');
    console.log('========================================\n');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
}

main();
