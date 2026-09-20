// NutriSun 10-Minute Sustained Multi-User Load Test (25 Concurrent Users)
// Samples active database connections during load, tracks per-minute p95 latency,
// calculates pool WaitCount / WaitDuration deltas, and logs memory/goroutine telemetry.

import fs from 'fs';
import path from 'path';

const API_BASE = 'http://127.0.0.1:8080/api';
const DURATION_MINUTES = 10;
const DURATION_MS = DURATION_MINUTES * 60 * 1000;
const CONCURRENT_USERS = 25;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = (min = 150, max = 350) => sleep(Math.floor(Math.random() * (max - min + 1)) + min);

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const start = performance.now();
  let status = 0;
  let data = null;
  let ok = false;
  let errorMsg = null;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    status = res.status;
    ok = res.ok;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  } catch (err) {
    errorMsg = err.message;
  }

  const durationMs = performance.now() - start;
  return { ok, status, data, durationMs, errorMsg };
}

function calcPercentiles(latencies) {
  if (!latencies || latencies.length === 0) return { min: 0, max: 0, median: 0, p95: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = Math.round(sorted[0]);
  const max = Math.round(sorted[sorted.length - 1]);
  const avg = Math.round(sorted.reduce((sum, v) => sum + v, 0) / sorted.length);
  const median = Math.round(sorted[Math.floor(sorted.length * 0.5)]);
  const p95 = Math.round(sorted[Math.floor(sorted.length * 0.95)]);
  return { min, max, median, p95, avg };
}

async function getAdminToken() {
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: '9876543210', password: 'adminpassword123' })
  });
  if (!res.ok) throw new Error('Failed to login admin for telemetry: ' + JSON.stringify(res.data));
  return res.data.token;
}

async function getSystemTelemetry(adminToken) {
  const res = await apiRequest('/admin/db-stats', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  if (!res.ok) return null;
  return res.data;
}

async function prepareUsers(count = 25) {
  console.log(`[Setup] Preparing ${count} isolated test accounts (9800000001 - 98000000${count})...`);
  const users = [];
  for (let i = 1; i <= count; i++) {
    const phone = `98000${String(i).padStart(5, '0')}`;
    const password = 'testpass123';
    let login = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    });
    if (!login.ok) {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: `TestUser_${i}`,
          phone,
          password,
          delivery_address: `Plot ${i}, Sector 14, Test Valley, 110001`,
          email: `testuser${i}@example.com`
        })
      });
      login = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password })
      });
    }
    if (login.ok && login.data.token) {
      users.push({ id: login.data.user.id, phone, token: login.data.token });
    }
  }
  console.log(`[Setup] Ready: ${users.length} isolated accounts.`);
  return users;
}

async function main() {
  console.log('================================================================');
  console.log(` NutriSun 10-Minute Sustained Load Test (${CONCURRENT_USERS} Concurrent Users) `);
  console.log('================================================================\n');

  // Verify health check is minimal
  const healthRes = await apiRequest('/health');
  console.log('Public /api/health Response:', JSON.stringify(healthRes.data));

  // Verify /api/db-stats rejects unauthorized
  const unauthStats = await apiRequest('/db-stats');
  console.log('Unauthenticated /api/db-stats Response Status:', unauthStats.status);

  const adminToken = await getAdminToken();
  const initialTelemetry = await getSystemTelemetry(adminToken);
  console.log('Initial System Telemetry (Admin Only):', JSON.stringify(initialTelemetry, null, 2));

  const users = await prepareUsers(CONCURRENT_USERS);
  if (users.length < CONCURRENT_USERS) {
    console.error(`Only prepared ${users.length} users. Need ${CONCURRENT_USERS}. Aborting.`);
    process.exit(1);
  }

  const staff = {
    admin: adminToken,
    chef: (await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ phone: '9876543211', password: 'chefpassword123' }) })).data?.token,
    delivery: (await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ phone: '9876543212', password: 'deliverypassword123' }) })).data?.token
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const startTime = Date.now();
  const endTime = startTime + DURATION_MS;

  // Telemetry samples collected every 5s during active load
  const telemetrySamples = [];
  let isRunning = true;

  // Background Telemetry Sampler (samples ACTIVE load connections)
  const telemetryInterval = setInterval(async () => {
    if (!isRunning) return;
    try {
      const stats = await getSystemTelemetry(adminToken);
      if (stats) {
        telemetrySamples.push({
          timestamp: Date.now(),
          elapsedSec: Math.round((Date.now() - startTime) / 1000),
          inUse: stats.db?.in_use || 0,
          open: stats.db?.open_connections || 0,
          idle: stats.db?.idle || 0,
          waitCount: stats.db?.wait_count || 0,
          waitDurationMs: stats.db?.wait_duration_ms || 0,
          allocMb: stats.memory?.alloc_mb || 0,
          sysMb: stats.memory?.sys_mb || 0,
          goroutines: stats.goroutines || 0,
          numGc: stats.memory?.num_gc || 0
        });
      }
    } catch {
      // ignore sampler error
    }
  }, 5000);

  // Per-minute metric buckets
  const minuteBuckets = Array.from({ length: DURATION_MINUTES }, (_, i) => ({
    minute: i + 1,
    requests: [],
    errors: [],
    startWaitCount: 0,
    endWaitCount: 0,
    startWaitDuration: 0,
    endWaitDuration: 0
  }));

  // Helper to record a completed request
  function recordRequest(durationMs, ok, status, err) {
    const elapsed = Date.now() - startTime;
    const minIdx = Math.min(Math.floor(elapsed / 60000), DURATION_MINUTES - 1);
    minuteBuckets[minIdx].requests.push(durationMs);
    if (!ok || status >= 500) {
      minuteBuckets[minIdx].errors.push({ status, err });
    }
  }

  // Simulated Customer Worker
  async function runCustomerWorker(user, workerId) {
    while (Date.now() < endTime && isRunning) {
      // 1. Fetch subscriptions
      const subRes = await apiRequest('/customer/subscriptions', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      recordRequest(subRes.durationMs, subRes.ok, subRes.status, subRes.data);
      await jitter(150, 350);

      if (Date.now() >= endTime || !isRunning) break;

      // 2. Fetch credits & requests
      const [credRes, reqRes] = await Promise.all([
        apiRequest('/customer/credits', { headers: { Authorization: `Bearer ${user.token}` } }),
        apiRequest('/customer/requests', { headers: { Authorization: `Bearer ${user.token}` } })
      ]);
      recordRequest(credRes.durationMs, credRes.ok, credRes.status, credRes.data);
      recordRequest(reqRes.durationMs, reqRes.ok, reqRes.status, reqRes.data);
      await jitter(150, 350);

      if (Date.now() >= endTime || !isRunning) break;

      // 3. Fetch public plans & monthly menu
      const [plansRes, menuRes] = await Promise.all([
        apiRequest('/plans'),
        apiRequest('/menu', { headers: { Authorization: `Bearer ${user.token}` } })
      ]);
      recordRequest(plansRes.durationMs, plansRes.ok, plansRes.status, plansRes.data);
      recordRequest(menuRes.durationMs, menuRes.ok, menuRes.status, menuRes.data);
      await jitter(150, 350);

      if (Date.now() >= endTime || !isRunning) break;

      // 4. Fetch meal schedule
      const mealsRes = await apiRequest('/customer/my-meals?month=09&year=2026', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      recordRequest(mealsRes.durationMs, mealsRes.ok, mealsRes.status, mealsRes.data);
      await jitter(200, 450);
    }
  }

  // Simulated Staff Worker
  async function runStaffWorker() {
    while (Date.now() < endTime && isRunning) {
      if (staff.admin) {
        const [pendRes, subsRes, custRes, analRes] = await Promise.all([
          apiRequest('/admin/pending-counts', { headers: { Authorization: `Bearer ${staff.admin}` } }),
          apiRequest('/admin/subscriptions', { headers: { Authorization: `Bearer ${staff.admin}` } }),
          apiRequest('/admin/customers', { headers: { Authorization: `Bearer ${staff.admin}` } }),
          apiRequest('/admin/analytics', { headers: { Authorization: `Bearer ${staff.admin}` } })
        ]);
        recordRequest(pendRes.durationMs, pendRes.ok, pendRes.status, pendRes.data);
        recordRequest(subsRes.durationMs, subsRes.ok, subsRes.status, subsRes.data);
        recordRequest(custRes.durationMs, custRes.ok, custRes.status, custRes.data);
        recordRequest(analRes.durationMs, analRes.ok, analRes.status, analRes.data);
      }
      await jitter(200, 400);

      if (staff.chef) {
        const chefRes = await apiRequest(`/kitchen/today-count?date=${todayStr}`, {
          headers: { Authorization: `Bearer ${staff.chef}` }
        });
        recordRequest(chefRes.durationMs, chefRes.ok, chefRes.status, chefRes.data);
      }
      await jitter(200, 400);

      if (staff.delivery) {
        const delRes = await apiRequest(`/delivery/sheet?date=${todayStr}&meal_slot=dinner`, {
          headers: { Authorization: `Bearer ${staff.delivery}` }
        });
        recordRequest(delRes.durationMs, delRes.ok, delRes.status, delRes.data);
      }
      await jitter(300, 600);
    }
  }

  // Progress Logger Every 60s
  let currentMin = 0;
  let lastWaitCount = initialTelemetry?.db?.wait_count || 0;
  let lastWaitDuration = initialTelemetry?.db?.wait_duration_ms || 0;

  minuteBuckets[0].startWaitCount = lastWaitCount;
  minuteBuckets[0].startWaitDuration = lastWaitDuration;

  const progressInterval = setInterval(async () => {
    currentMin++;
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    const bucketIdx = Math.min(currentMin - 1, DURATION_MINUTES - 1);
    const bucket = minuteBuckets[bucketIdx];

    const currentStats = await getSystemTelemetry(adminToken);
    const currWaitCount = currentStats?.db?.wait_count || lastWaitCount;
    const currWaitDuration = currentStats?.db?.wait_duration_ms || lastWaitDuration;

    bucket.endWaitCount = currWaitCount;
    bucket.endWaitDuration = currWaitDuration;

    const deltaWaitCount = currWaitCount - lastWaitCount;
    const deltaWaitDuration = currWaitDuration - lastWaitDuration;

    lastWaitCount = currWaitCount;
    lastWaitDuration = currWaitDuration;

    if (currentMin < DURATION_MINUTES) {
      minuteBuckets[currentMin].startWaitCount = currWaitCount;
      minuteBuckets[currentMin].startWaitDuration = currWaitDuration;
    }

    const p = calcPercentiles(bucket.requests);
    const activeSamples = telemetrySamples.filter(s => s.elapsedSec >= (currentMin - 1) * 60 && s.elapsedSec <= currentMin * 60);
    const peakInUse = activeSamples.length > 0 ? Math.max(...activeSamples.map(s => s.inUse)) : (currentStats?.db?.in_use || 0);
    const latestMem = currentStats?.memory?.alloc_mb || 0;
    const latestGoroutines = currentStats?.goroutines || 0;

    console.log(`[Min ${String(currentMin).padStart(2, ' ')} / 10] Reqs: ${bucket.requests.length} | Throughput: ${(bucket.requests.length / 60).toFixed(1)} r/s | p50: ${p.median}ms | p95: ${p.p95}ms | Errors: ${bucket.errors.length} | Peak InUse: ${peakInUse} | ΔWaitCount: ${deltaWaitCount} | ΔWaitDur: ${deltaWaitDuration}ms | Mem: ${latestMem}MB | Grt: ${latestGoroutines}`);

    // Circuit Breaker: if errors > 20% in any minute, stop test to protect environment
    if (bucket.requests.length > 10 && (bucket.errors.length / bucket.requests.length) > 0.2) {
      console.error(`🚨 Circuit Breaker Triggered: High error rate (${bucket.errors.length}/${bucket.requests.length}) in minute ${currentMin}. Stopping test.`);
      isRunning = false;
    }
  }, 60000);

  console.log(`[Launch] Starting 25 customer workers + 1 staff worker for 10 minutes...`);
  const workerPromises = [
    ...users.map((user, idx) => runCustomerWorker(user, idx + 1)),
    runStaffWorker()
  ];

  await Promise.all(workerPromises);
  isRunning = false;
  clearInterval(telemetryInterval);
  clearInterval(progressInterval);

  const totalDurationSec = (Date.now() - startTime) / 1000;
  const finalTelemetry = await getSystemTelemetry(adminToken);

  console.log('\n================================================================');
  console.log('         10-MINUTE SUSTAINED LOAD TEST FINAL RESULTS            ');
  console.log('================================================================');
  console.log(`Total Duration: ${totalDurationSec.toFixed(1)}s (${(totalDurationSec / 60).toFixed(2)} min)`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}`);

  // Build per-minute summary table
  const summaryRows = minuteBuckets.map(b => {
    const p = calcPercentiles(b.requests);
    const activeSamples = telemetrySamples.filter(s => s.elapsedSec >= (b.minute - 1) * 60 && s.elapsedSec <= b.minute * 60);
    const peakInUse = activeSamples.length > 0 ? Math.max(...activeSamples.map(s => s.inUse)) : 0;
    const avgAllocMb = activeSamples.length > 0 ? (activeSamples.reduce((sum, s) => sum + s.allocMb, 0) / activeSamples.length).toFixed(1) : 'N/A';
    const maxGoroutines = activeSamples.length > 0 ? Math.max(...activeSamples.map(s => s.goroutines)) : 0;
    const deltaWaitCount = Math.max(0, b.endWaitCount - b.startWaitCount);
    const deltaWaitDuration = Math.max(0, b.endWaitDuration - b.startWaitDuration);

    return {
      Minute: `Min ${b.minute}`,
      Requests: b.requests.length,
      Throughput: `${(b.requests.length / 60).toFixed(1)} req/s`,
      p50: `${p.median} ms`,
      p95: `${p.p95} ms`,
      Errors: b.errors.length,
      PeakActiveInUse: peakInUse,
      DeltaWaitCount: deltaWaitCount,
      DeltaWaitDuration: `${deltaWaitDuration} ms`,
      AvgAllocMB: `${avgAllocMb} MB`,
      MaxGoroutines: maxGoroutines
    };
  });

  console.table(summaryRows);

  const allLatencies = minuteBuckets.flatMap(b => b.requests);
  const allErrors = minuteBuckets.flatMap(b => b.errors);
  const overallStats = calcPercentiles(allLatencies);

  console.log('\n--- Overall Sustained Run Totals ---');
  console.log(`Total Requests Processed: ${allLatencies.length}`);
  console.log(`Overall Sustained Throughput: ${(allLatencies.length / totalDurationSec).toFixed(2)} req/sec`);
  console.log(`Overall Median (p50) Latency: ${overallStats.median} ms`);
  console.log(`Overall 95th Percentile (p95) Latency: ${overallStats.p95} ms`);
  console.log(`Min Latency: ${overallStats.min} ms | Max Latency: ${overallStats.max} ms`);
  console.log(`Total Errors / 5xx / Timeouts: ${allErrors.length} (${((allErrors.length / allLatencies.length) * 100).toFixed(2)}%)`);
  console.log(`Final Pool Telemetry: Open=${finalTelemetry?.db?.open_connections}, InUse=${finalTelemetry?.db?.in_use}, Idle=${finalTelemetry?.db?.idle}, TotalWaitCount=${finalTelemetry?.db?.wait_count}, TotalWaitDurationMs=${finalTelemetry?.db?.wait_duration_ms}`);
  console.log(`Final Memory: Alloc=${finalTelemetry?.memory?.alloc_mb}MB, Sys=${finalTelemetry?.memory?.sys_mb}MB, Goroutines=${finalTelemetry?.goroutines}`);

  // Write JSON report
  const report = {
    test_type: '10-minute sustained load test',
    concurrent_users: CONCURRENT_USERS,
    duration_seconds: totalDurationSec,
    total_requests: allLatencies.length,
    overall_throughput_rps: Number((allLatencies.length / totalDurationSec).toFixed(2)),
    overall_p50_ms: overallStats.median,
    overall_p95_ms: overallStats.p95,
    min_latency_ms: overallStats.min,
    max_latency_ms: overallStats.max,
    total_errors: allErrors.length,
    per_minute_results: summaryRows,
    initial_telemetry: initialTelemetry,
    final_telemetry: finalTelemetry
  };

  fs.writeFileSync('scratch/sustained_load_results.json', JSON.stringify(report, null, 2));
  console.log('Results saved to scratch/sustained_load_results.json');
}

main().catch(err => {
  console.error('Fatal sustained load test error:', err);
  process.exit(1);
});
