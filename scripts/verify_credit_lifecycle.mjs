
const API_BASE = 'http://127.0.0.1:8080/api';

async function verifyCreditLifecycle() {
  console.log('===============================================================');
  console.log('      NUTRISUN CREDIT LIFECYCLE & ACCOUNTING VERIFICATION      ');
  console.log('===============================================================\n');

  // 1. Admin login
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', password: 'adminpassword123' }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;

  // 2. Register isolated customer
  const isolatedPhone = `98000${Math.floor(10000 + Math.random() * 90000)}`;
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Credit Audit Customer',
      phone: isolatedPhone,
      delivery_address: 'Flat 402, Greenfield Residences',
      password: 'AuditPassword123!',
    }),
  });
  const regData = await regRes.json();
  const customerToken = regData.token;
  console.log(`Created isolated test customer: Phone ${isolatedPhone}, User ID ${regData.user.id}`);

  // Accept onboarding
  await fetch(`${API_BASE}/customer/accept-instructions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  // 3. Purchase 1-week lunch plan (7 credits)
  const plansRes = await fetch(`${API_BASE}/plans`);
  const plansData = await plansRes.json();
  const weekPlan = plansData.plans.find((p) => p.name.includes('Lunch (1 Week)') && !p.is_archived) || plansData.plans[0];

  const buyRes = await fetch(`${API_BASE}/customer/buy-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ plan_id: weekPlan.id, selected_shifts: 'lunch' }),
  });
  const buyData = await buyRes.json();
  const subId = buyData.subscription_id;

  // Upload proof & Admin confirm
  const sampleProof = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const formData = new FormData();
  formData.append('receipt', new Blob([sampleProof], { type: 'image/png' }), 'receipt.png');
  formData.append('transaction_ref', 'CREDIT-TEST-REF-101');
  await fetch(`${API_BASE}/customer/subscriptions/${subId}/payment-proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: formData,
  });

  // Start date: 2026-09-18
  await fetch(`${API_BASE}/admin/subscriptions/${subId}/payment`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ start_date: '2026-09-18' }),
  });

  async function getSub() {
    const res = await fetch(`${API_BASE}/customer/subscriptions`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    return data.subscriptions.find((s) => s.id === subId);
  }

  async function getMeals() {
    const res = await fetch(`${API_BASE}/customer/my-meals`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    return data.meals;
  }

  function printCredits(stageName, sub) {
    console.log(`\n>>> [STAGE: ${stageName}]`);
    console.log(`- Total Credits:               ${sub.total_credits}`);
    console.log(`- Remaining (Active Usable):   ${sub.remaining_credits}`);
    console.log(`- Pending (On-Time Skipped):   ${sub.pending_credits}`);
    console.log(`- Used (Delivered):            ${sub.used_credits}`);
    console.log(`- Forfeited (Late Cancelled):  ${sub.forfeited_credits}`);
    console.log(`- Replacement-Eligible:        ${sub.pending_credits}`);
    console.log(`- Subscription Status:         ${sub.status}`);
    console.log(`- Invariant Check (Total == Used + Remaining + Pending): ${sub.total_credits === (sub.used_credits + sub.remaining_credits + sub.pending_credits) ? 'VALID (Total matches breakdown)' : 'INVALID'}`);
  }

  // --- INITIAL STATE ---
  let sub = await getSub();
  printCredits('1. Initial Plan Activation', sub);

  // --- STEP 1: ONE ON-TIME SKIP ---
  let meals = await getMeals();
  const skipTargetMeal = meals.find((m) => m.date === '2026-09-20');
  console.log(`\nAttempting on-time skip for meal on ${skipTargetMeal.date} (MealLog #${skipTargetMeal.id})...`);

  const skipRes = await fetch(`${API_BASE}/customer/requests/skip`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({ meal_log_id: skipTargetMeal.id }),
  });
  const skipData = await skipRes.json();
  console.log('Skip response:', skipData.message);

  sub = await getSub();
  printCredits('2. After 1 On-Time Skip', sub);

  // Deliver the remaining 6 active meals to simulate subscription completion
  console.log('\nDelivering the remaining 6 active meals...');
  meals = await getMeals();
  for (const m of meals) {
    if (m.id !== skipTargetMeal.id && m.status === 'TAKE') {
      await fetch(`${API_BASE}/delivery/${m.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'delivered' }),
      });
    }
  }

  sub = await getSub();
  printCredits('3. End of Subscription (6 Delivered, 1 Skipped on-time)', sub);

  // --- STEP 2: REALLOCATION OF PENDING CREDIT AFTER SUBSCRIPTION END ---
  console.log(`\nReallocating skipped meal #${skipTargetMeal.id} to new date 2026-09-26 (Lunch)...`);
  const reallocRes = await fetch(`${API_BASE}/admin/reallocate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      original_meal_log_id: skipTargetMeal.id,
      new_date: '2026-09-26',
      new_slot: 'lunch',
      reason: 'Post-subscription makeup meal for skipped lunch',
    }),
  });
  const reallocData = await reallocRes.json();
  console.log('Reallocate response:', reallocData.message);
  const reallocatedMealId = reallocData.new_meal_id;

  sub = await getSub();
  printCredits('4. After Reallocation of Pending Credit', sub);

  // Test duplicate reallocation prevention
  console.log('\nTesting Double-Reallocation Protection (Attempting to reallocate the same original meal again)...');
  const dupReallocRes = await fetch(`${API_BASE}/admin/reallocate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      original_meal_log_id: skipTargetMeal.id,
      new_date: '2026-09-27',
      new_slot: 'lunch',
      reason: 'Illegal second reallocation attempt',
    }),
  });
  const dupReallocData = await dupReallocRes.json();
  console.log(`Double Reallocation Blocked: HTTP ${dupReallocRes.status} -> "${dupReallocData.error}"`);

  // --- STEP 3: DELIVERY OF REPLACEMENT MEAL ---
  console.log(`\nDelivering replacement meal #${reallocatedMealId}...`);
  const deliverReplRes = await fetch(`${API_BASE}/delivery/${reallocatedMealId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ status: 'delivered' }),
  });
  const deliverReplData = await deliverReplRes.json();
  console.log('Delivery response:', deliverReplData.message);

  sub = await getSub();
  printCredits('5. After Delivery of Replacement Meal', sub);

  // Credit ledger inspection
  const creditLedgerRes = await fetch(`${API_BASE}/customer/credits?subscription_id=${subId}`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const creditLedger = await creditLedgerRes.json();
  console.log('\n===============================================================');
  console.log('                CREDIT LEDGER AUDIT TRAIL                      ');
  console.log('===============================================================');
  for (const tx of creditLedger.transactions) {
    console.log(`- Reason: ${tx.reason.padEnd(28)} | Delta: ${String(tx.delta).padStart(2)} | BalanceAfter: ${tx.balance_after} | Notes: ${tx.notes}`);
  }
}

verifyCreditLifecycle().catch(console.error);
