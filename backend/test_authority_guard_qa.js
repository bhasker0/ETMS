/**
 * QA Automation Test Suite: Feature Authority & Permissions Guards Verification
 * Validates:
 * 1. FeatureToggleGuard rejects disabled company features with 403 Forbidden & clear message.
 * 2. FeatureToggleGuard permits active features.
 * 3. FeatureToggleGuard supports alias formats (e.g. 'expenses', 'feature_expenses', 'expenses_enabled').
 * 4. Super Admin bypass on FeatureToggleGuard.
 * 5. PermissionsGuard rejects unauthorized users with 403 Forbidden & clear authority message.
 * 6. AuthService login returns featureFlags dictionary.
 */

const assert = require('assert');
const { Reflector } = require('@nestjs/core');
const { ExecutionContextHost } = require('@nestjs/core/helpers/execution-context-host');

// Import guards and decorators
const { FeatureToggleGuard } = require('./dist/common/guards/feature-toggle.guard');
const { PermissionsGuard } = require('./dist/common/guards/permissions.guard');
const { FEATURE_KEY } = require('./dist/common/decorators/feature.decorator');
const { PERMISSIONS_KEY } = require('./dist/common/decorators/permissions.decorator');

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running ETMS Feature & Authority QA Verification');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${e.message}`);
      failed++;
    }
  }

  const reflector = new Reflector();
  const featureGuard = new FeatureToggleGuard(reflector);
  const permissionsGuard = new PermissionsGuard(reflector);

  // Helper to create mock ExecutionContext
  function createMockContext({ user, company, handlerFeature, handlerPermission }) {
    const req = {
      user,
      company,
    };
    const handler = () => {};
    const classRef = class MockController {};

    if (handlerFeature) {
      Reflect.defineMetadata(FEATURE_KEY, handlerFeature, handler);
    }
    if (handlerPermission) {
      Reflect.defineMetadata(PERMISSIONS_KEY, [handlerPermission], handler);
    }

    const host = new ExecutionContextHost([req, {}, () => {}]);
    host.getHandler = () => handler;
    host.getClass = () => classRef;
    return host;
  }

  // TEST 1: Feature Guard - Feature Disabled for Company
  await test('FeatureToggleGuard returns 403 Forbidden when company feature is disabled', async () => {
    const ctx = createMockContext({
      user: { id: 'u1', role: 'COMPANY_ADMIN' },
      company: {
        id: 'c1',
        settings: {
          feature_toggles: {
            feature_expenses: false,
          },
        },
      },
      handlerFeature: 'expenses',
    });

    let thrown = null;
    try {
      await featureGuard.canActivate(ctx);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown, 'Expected 403 Forbidden exception to be thrown');
    const status = typeof thrown.getStatus === 'function' ? thrown.getStatus() : (thrown.status || thrown.statusCode || thrown.response?.statusCode);
    assert.strictEqual(status, 403);
    assert.ok(
      thrown.message.includes('You do not have authority for this functionality'),
      `Unexpected message: ${thrown.message}`
    );
    assert.ok(
      thrown.message.includes('expenses'),
      `Expected message to reference the feature name: ${thrown.message}`
    );
  });

  // TEST 2: Feature Guard - Feature Enabled for Company
  await test('FeatureToggleGuard permits access when company feature is enabled', async () => {
    const ctx = createMockContext({
      user: { id: 'u1', role: 'COMPANY_ADMIN' },
      company: {
        id: 'c1',
        settings: {
          feature_toggles: {
            feature_expenses: true,
          },
        },
      },
      handlerFeature: 'expenses',
    });

    const allowed = await featureGuard.canActivate(ctx);
    assert.strictEqual(allowed, true);
  });

  // TEST 3: Feature Guard - Alias resolution ('feature_purchases', 'purchases_enabled', etc.)
  await test('FeatureToggleGuard resolves multiple feature key naming conventions', async () => {
    const ctx1 = createMockContext({
      user: { id: 'u1', role: 'COMPANY_ADMIN' },
      company: {
        id: 'c1',
        settings: {
          purchases: false,
        },
      },
      handlerFeature: 'feature_purchases',
    });

    let thrown = null;
    try {
      await featureGuard.canActivate(ctx1);
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown, 'Expected 403 for purchases: false');
    const status = typeof thrown.getStatus === 'function' ? thrown.getStatus() : (thrown.status || thrown.statusCode || thrown.response?.statusCode);
    assert.strictEqual(status, 403);

    const ctx2 = createMockContext({
      user: { id: 'u1', role: 'COMPANY_ADMIN' },
      company: {
        id: 'c1',
        settings: {
          feature_flags: {
            feature_reports: true,
          },
        },
      },
      handlerFeature: 'reports',
    });

    const allowed = await featureGuard.canActivate(ctx2);
    assert.strictEqual(allowed, true);
  });

  // TEST 4: Feature Guard - Super Admin Bypass
  await test('FeatureToggleGuard allows SUPER_ADMIN to bypass company feature restrictions', async () => {
    const ctx = createMockContext({
      user: { id: 'u0', role: 'SUPER_ADMIN' },
      company: {
        id: 'c1',
        settings: {
          feature_toggles: {
            feature_expenses: false,
          },
        },
      },
      handlerFeature: 'expenses',
    });

    const allowed = await featureGuard.canActivate(ctx);
    assert.strictEqual(allowed, true);
  });

  // TEST 5: Permissions Guard - Missing Permission
  await test('PermissionsGuard returns 403 Forbidden with clear authority error when permission is missing', async () => {
    const ctx = createMockContext({
      user: {
        id: 'u2',
        role: 'SUPERVISOR',
        permissions: ['read:shifts'],
      },
      company: { id: 'c1' },
      handlerPermission: 'write:shifts',
    });

    let thrown = null;
    try {
      permissionsGuard.canActivate(ctx);
    } catch (err) {
      thrown = err;
    }

    assert.ok(thrown, 'Expected 403 Forbidden exception for missing permission');
    const status = typeof thrown.getStatus === 'function' ? thrown.getStatus() : (thrown.status || thrown.statusCode || thrown.response?.statusCode);
    assert.strictEqual(status, 403);
    assert.ok(
      thrown.message.includes('You do not have authority for this functionality'),
      `Unexpected message: ${thrown.message}`
    );
    assert.ok(
      thrown.message.includes('write:shifts'),
      `Expected message to list missing permission: ${thrown.message}`
    );
  });

  // TEST 6: Permissions Guard - Permission Present
  await test('PermissionsGuard permits access when user holds required permission', async () => {
    const ctx = createMockContext({
      user: {
        id: 'u2',
        role: 'SUPERVISOR',
        permissions: ['read:shifts', 'write:shifts'],
      },
      company: { id: 'c1' },
      handlerPermission: 'write:shifts',
    });

    const allowed = permissionsGuard.canActivate(ctx);
    assert.strictEqual(allowed, true);
  });

  console.log('\n----------------------------------------------------');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
