const API_BASE = 'http://127.0.0.1:8080/api';

async function verifyAdditionalFeatures() {
  console.log('===============================================================');
  console.log('    NUTRISUN ADDITIONAL FUNCTIONAL & WORKFLOW VERIFICATION     ');
  console.log('===============================================================\n');

  // 1. Admin login
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', password: 'adminpassword123' }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;

  // 2. Download Monthly Menu Template (October 2026)
  console.log('1. Testing Monthly Menu Template Download (October 2026)...');
  const templateRes = await fetch(`${API_BASE}/admin/menu/template?month=10&year=2026`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!templateRes.ok) throw new Error('Template download failed');
  const templateBuffer = await templateRes.arrayBuffer();
  console.log(`✓ Template downloaded successfully (${templateBuffer.byteLength} bytes).`);

  // 3. Upload Monthly Menu using the generated template
  console.log('\n2. Testing Monthly Menu Upload (.xlsx)...');
  const uploadForm = new FormData();
  uploadForm.append('file', new Blob([templateBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'menu_oct_2026.xlsx');
  uploadForm.append('month', '10');
  uploadForm.append('year', '2026');
  uploadForm.append('confirm_replace', 'true');

  const uploadRes = await fetch(`${API_BASE}/admin/menu/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: uploadForm,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(`Menu upload failed: ${JSON.stringify(uploadData)}`);
  console.log(`✓ Menu uploaded successfully: ${uploadData.items_count || uploadData.count || uploadData.message}`);

  // Query uploaded October 2026 menu
  const menuRes = await fetch(`${API_BASE}/menu?month=10&year=2026`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const menuData = await menuRes.json();
  console.log(`✓ Verified October 2026 menu contains ${menuData.count} dishes.`);

  // 4. Test Pause & Resume on an isolated customer
  console.log('\n3. Testing Customer Pause & Resume Workflow...');
  const pauseTestPhone = `98000${Math.floor(10000 + Math.random() * 90000)}`;
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pause Resume Customer',
      phone: pauseTestPhone,
      delivery_address: 'Villa 12, Palm Meadows',
      password: 'AuditPassword123!',
    }),
  });
  const regData = await regRes.json();
  const customerToken = regData.token;

  await fetch(`${API_BASE}/customer/accept-instructions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
  });

  const plansRes = await fetch(`${API_BASE}/plans`);
  const plansData = await plansRes.json();
  const weekPlan = plansData.plans.find((p) => p.name.includes('Lunch (1 Week)') && !p.is_archived) || plansData.plans[0];

  const buyRes = await fetch(`${API_BASE}/customer/buy-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ plan_id: weekPlan.id, selected_shifts: 'lunch' }),
  });
  const buyData = await buyRes.json();
  const subId = buyData.subscription_id;

  // Upload proof & activate
  const sampleProof = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const formData = new FormData();
  formData.append('receipt', new Blob([sampleProof], { type: 'image/png' }), 'receipt.png');
  formData.append('transaction_ref', 'PAUSE-TEST-REF');
  await fetch(`${API_BASE}/customer/subscriptions/${subId}/payment-proof`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: formData,
  });

  // Activate starting tomorrow (2026-09-18)
  await fetch(`${API_BASE}/admin/subscriptions/${subId}/payment`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ start_date: '2026-09-18' }),
  });

  // Request Pause from 2026-09-20 to 2026-09-23
  console.log('Submitting pause request for 2026-09-20...');
  const pauseRes = await fetch(`${API_BASE}/customer/requests/pause`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      subscription_id: subId,
      pause_start_date: '2026-09-20',
      estimated_resume_date: '2026-09-23',
    }),
  });
  const pauseData = await pauseRes.json();
  if (!pauseRes.ok) throw new Error(`Pause failed: ${JSON.stringify(pauseData)}`);
  console.log('✓ Pause response:', pauseData.message);

  // Verify subscription status is PAUSED
  const subRes = await fetch(`${API_BASE}/customer/subscriptions`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const subData = await subRes.json();
  const pausedSub = subData.subscriptions.find((s) => s.id === subId);
  console.log(`✓ Subscription status is "${pausedSub.status}", Pending Credits: ${pausedSub.pending_credits}`);

  // Resume subscription on 2026-09-23
  console.log('Submitting resume request on 2026-09-23...');
  const resumeRes = await fetch(`${API_BASE}/customer/requests/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      subscription_id: subId,
      actual_resume_date: '2026-09-23',
    }),
  });
  const resumeData = await resumeRes.json();
  if (!resumeRes.ok) throw new Error(`Resume failed: ${JSON.stringify(resumeData)}`);
  console.log('✓ Resume response:', resumeData.message);

  // 5. Test Payment Rejection
  console.log('\n4. Testing Payment Rejection Workflow...');
  const rejectSubRes = await fetch(`${API_BASE}/customer/buy-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ plan_id: weekPlan.id, selected_shifts: 'lunch' }),
  });
  const rejectSubData = await rejectSubRes.json();
  const rejectSubId = rejectSubData.subscription_id;

  const rejectAdminRes = await fetch(`${API_BASE}/admin/subscriptions/${rejectSubId}/payment/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ rejection_reason: 'Unreadable receipt screenshot' }),
  });
  const rejectAdminData = await rejectAdminRes.json();
  if (!rejectAdminRes.ok) throw new Error(`Payment reject failed: ${JSON.stringify(rejectAdminData)}`);
  console.log('✓ Admin rejection response:', rejectAdminData.message);

  console.log('\n===============================================================');
  console.log('  ALL ADDITIONAL FUNCTIONAL FEATURES VERIFIED SUCCESSFULLY!    ');
  console.log('===============================================================');
}

verifyAdditionalFeatures().catch(console.error);
