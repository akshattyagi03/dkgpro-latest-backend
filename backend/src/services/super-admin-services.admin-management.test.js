'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  approveAdmin,
  rejectAdmin,
  setAdminActiveStatus,
  deleteAdminAccount,
} = require('./super-admin-services');

/**
 * These tests cover the ObjectId validation guard added as part of the admin-management feature.
 * This project has no DB-mocking/supertest setup (see pincode-services.test.js for the established
 * "test pure/fast-failing logic directly with node:test" convention), so the deeper DB-dependent
 * branches of these functions (not-found, already-enabled/disabled, dependent-record checks, happy
 * path) are not covered here — they require a live MongoDB connection to exercise safely.
 * This suite verifies the fast-fail validation path, which runs before any DB call.
 */

const INVALID_IDS = [undefined, null, '', 'not-an-object-id', '12345', '   '];

describe('super-admin-services — admin management ID validation', () => {
  describe('approveAdmin', () => {
    for (const invalidId of INVALID_IDS) {
      it(`rejects invalid admin ID: ${JSON.stringify(invalidId)}`, async () => {
        await assert.rejects(
          () => approveAdmin(invalidId, 'irrelevant-super-admin-id'),
          { message: 'Invalid admin ID' }
        );
      });
    }
  });

  describe('rejectAdmin', () => {
    for (const invalidId of INVALID_IDS) {
      it(`rejects invalid admin ID: ${JSON.stringify(invalidId)}`, async () => {
        await assert.rejects(() => rejectAdmin(invalidId), { message: 'Invalid admin ID' });
      });
    }
  });

  describe('setAdminActiveStatus', () => {
    for (const invalidId of INVALID_IDS) {
      it(`rejects invalid admin ID: ${JSON.stringify(invalidId)}`, async () => {
        await assert.rejects(() => setAdminActiveStatus(invalidId, true), {
          message: 'Invalid admin ID',
        });
      });
    }
  });

  describe('deleteAdminAccount', () => {
    for (const invalidId of INVALID_IDS) {
      it(`rejects invalid admin ID: ${JSON.stringify(invalidId)}`, async () => {
        await assert.rejects(() => deleteAdminAccount(invalidId), {
          message: 'Invalid admin ID',
        });
      });
    }
  });
});
