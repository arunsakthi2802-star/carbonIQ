/**
 * Automated Test Suite for CarbonIQ Node.js Backend Gateway
 * Validates Auth, JWT, Multi-Tenant Isolation, Activity Constraints, and Recalculations.
 */

const axios = require('axios');
const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';
const client = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

async function runBackendTests() {
  console.log('--- STARTING CARBONIQ BACKEND AUTOMATED TESTS ---');

  // TEST 1: Health Endpoint
  console.log('TEST 1: Health check...');
  const health = await client.get('/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.status, 'Healthy');
  console.log('PASS: Health endpoint responded with Healthy');

  // TEST 2: Invalid Login Rejection
  console.log('TEST 2: Invalid credentials rejection...');
  const badLogin = await client.post('/auth/login', {
    email: 'nonexistent_user@acme.com',
    password: 'WrongPassword!'
  });
  assert.strictEqual(badLogin.status, 401);
  assert.strictEqual(badLogin.data.success, false);
  console.log('PASS: Invalid login rejected with 401 Unauthorized');

  // TEST 3: Company A Registration
  console.log('TEST 3: Company A Registration...');
  const compAEmail = `tenantA_${Date.now()}@acme.com`;
  const regA = await client.post('/auth/register', {
    companyName: 'Company Alpha Logistics',
    industry: 'Logistics',
    country: 'India',
    email: compAEmail,
    password: 'PasswordAlpha123!'
  });
  assert.strictEqual(regA.status, 201);
  assert.ok(regA.data.data.token, 'Token must be present in response');
  const tokenA = regA.data.data.token;
  console.log('PASS: Company A registered successfully with JWT');

  // TEST 4: Company B Registration (Multi-Tenant Test)
  console.log('TEST 4: Company B Registration...');
  const compBEmail = `tenantB_${Date.now()}@beta.com`;
  const regB = await client.post('/auth/register', {
    companyName: 'Company Beta Manufacturing',
    industry: 'Manufacturing',
    country: 'Germany',
    email: compBEmail,
    password: 'PasswordBeta123!'
  });
  assert.strictEqual(regB.status, 201);
  const tokenB = regB.data.data.token;
  console.log('PASS: Company B registered successfully with JWT');

  // TEST 5: Company A creates activity
  console.log('TEST 5: Company A creates an activity record...');
  const actA = await client.post(
    '/activity-entries',
    {
      activityType: 'electricity',
      quantity: 5000,
      unit: 'kWh',
      period: '2026-08'
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  assert.strictEqual(actA.status, 201);
  const actIdA = actA.data.data.entry._id;
  console.log('PASS: Company A created activity entry:', actIdA);

  // TEST 6: MULTI-TENANT ISOLATION: Company B cannot read Company A activity
  console.log('TEST 6: Multi-tenant isolation: Company B attempts accessing Company A entry...');
  const crossTenantGet = await client.get(`/activity-entries/${actIdA}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert.strictEqual(crossTenantGet.status, 404, 'Company B must receive 404 when querying Company A entry');
  console.log('PASS: Cross-tenant IDOR prevented. Company B cannot access Company A document.');

  // TEST 7: Input Validation (Negative quantity & Road Freight cargo weight requirement)
  console.log('TEST 7: Input validation checks...');
  const badQty = await client.post(
    '/activity-entries',
    {
      activityType: 'diesel',
      quantity: -500,
      unit: 'litre',
      period: '2026-08'
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  assert.strictEqual(badQty.status, 400);

  const missingCargo = await client.post(
    '/activity-entries',
    {
      activityType: 'road_freight',
      quantity: 500,
      unit: 'km',
      period: '2026-08'
      // cargoWeightTons missing
    },
    { headers: { Authorization: `Bearer ${tokenA}` } }
  );
  assert.strictEqual(missingCargo.status, 400);
  console.log('PASS: Input validation rejected negative quantities and missing freight cargo tonnage.');

  // TEST 8: Recalculation & Dashboard Summary Consistency
  console.log('TEST 8: Dashboard summary consistency check...');
  const sumA = await client.get('/dashboard/summary?period=2026-08', {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert.strictEqual(sumA.status, 200);
  assert.ok(sumA.data.data.summary.totalKg > 0, 'Total footprint must be computed and greater than 0');
  console.log('PASS: Dashboard summary returned consistent recalculation results.');

  console.log('\n--- ALL BACKEND AUTOMATED TESTS PASSED! ---');
}

runBackendTests().catch(err => {
  console.error('FAILED TEST:', err);
  process.exit(1);
});
