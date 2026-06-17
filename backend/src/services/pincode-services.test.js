'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

const {
  checkPincode,
  isPincodeServiceableForProduct,
  __test: { cityEntryMatches, districtEntryMatches, PINCODE_LOCALITY },
} = require('./pincode-services');

/** Matches catalog products: Mumbai + Delhi NCR with hyper-local districts */
const HYPER_LOCAL_PRODUCT = {
  serviceableAreas: [
    { city: 'Mumbai', districts: ['Bandra West', 'Juhu', 'Andheri East'] },
    { city: 'Delhi NCR', districts: ['Gurgaon Sector 29', 'Noida Sector 18'] },
  ],
};

describe('pincode-services — hyper-local product areas', () => {
  describe('isPincodeServiceableForProduct', () => {
    it('accepts Bandra West pincode for Mumbai product', async () => {
      const resolved = await checkPincode('400050');
      assert.equal(resolved.locality, 'Bandra West');
      assert.equal(isPincodeServiceableForProduct(resolved, HYPER_LOCAL_PRODUCT), true);
    });

    it('accepts Juhu pincode for Mumbai product', async () => {
      const resolved = await checkPincode('400049');
      assert.equal(isPincodeServiceableForProduct(resolved, HYPER_LOCAL_PRODUCT), true);
    });

    it('accepts Andheri East pincode for Mumbai product', async () => {
      const resolved = await checkPincode('400069');
      assert.equal(isPincodeServiceableForProduct(resolved, HYPER_LOCAL_PRODUCT), true);
    });

    it('rejects other Mumbai pincodes outside listed neighborhoods', async () => {
      const resolved = await checkPincode('400076');
      assert.equal(isPincodeServiceableForProduct(resolved, HYPER_LOCAL_PRODUCT), false);
    });

    it('accepts Gurgaon Sector 29 pincode for Delhi NCR product', async () => {
      const resolved = await checkPincode('122001');
      assert.equal(resolved.locality, 'Sector 29');
      assert.equal(isPincodeServiceableForProduct(resolved, HYPER_LOCAL_PRODUCT), true);
    });

    it('accepts Noida Sector 18 pincode for Delhi NCR product', async () => {
      const resolved = await checkPincode('201301');
      assert.equal(resolved.locality, 'Sector 18');
      assert.equal(isPincodeServiceableForProduct(resolved, HYPER_LOCAL_PRODUCT), true);
    });

    it('rejects Delhi pincode when only Gurgaon/Noida sectors are listed', async () => {
      const resolved = await checkPincode('110001');
      assert.equal(isPincodeServiceableForProduct(resolved, HYPER_LOCAL_PRODUCT), false);
    });

    it('rejects Gurgaon pincode outside Sector 29 when only that sector is listed', async () => {
      const resolved = await checkPincode('122101');
      assert.equal(isPincodeServiceableForProduct(resolved, HYPER_LOCAL_PRODUCT), false);
    });
  });

  describe('districtEntryMatches', () => {
    it('matches Gurgaon Sector 29 entry using city + locality', () => {
      assert.equal(
        districtEntryMatches(
          { city: 'Gurgaon', district: 'Gurugram', locality: 'Sector 29' },
          'Gurgaon Sector 29'
        ),
        true
      );
    });

    it('matches Bandra West entry from locality', () => {
      assert.equal(
        districtEntryMatches(
          { city: 'Mumbai', district: 'Mumbai Suburban', locality: 'Bandra West' },
          'Bandra West'
        ),
        true
      );
    });
  });
});

describe('pincode-services — general', () => {
  const TEST_PRODUCT = {
    serviceableAreas: [
      { city: 'Mumbai', districts: ['Andheri', 'Bandra', 'Juhu'] },
      { city: 'Bengaluru', districts: ['Indiranagar', 'Koramangala'] },
      { city: 'Delhi NCR', districts: ['Delhi', 'Gurgaon', 'Noida', 'Faridabad', 'Ghaziabad'] },
    ],
  };

  describe('PINCODE_FALLBACK map', () => {
    const cases = [
      ['122001', 'Gurgaon', 'fallback'],
      ['110001', 'Delhi', 'fallback'],
      ['201301', 'Noida', 'fallback'],
      ['400076', 'Mumbai', 'fallback'],
      ['560001', 'Bangalore', 'fallback'],
    ];

    for (const [pincode, expectedCity, matchedBy] of cases) {
      it(`resolves ${pincode} from local map`, async () => {
        const result = await checkPincode(pincode);
        assert.ok(result, `expected result for ${pincode}`);
        assert.equal(result.city, expectedCity);
        assert.equal(result.matchedBy, matchedBy);
        assert.equal(result.pincode, pincode);
      });
    }
  });

  describe('isPincodeServiceableForProduct', () => {
    it('treats Gurgaon pincode as serviceable for broad Delhi NCR product', async () => {
      const resolved = await checkPincode('122001');
      assert.equal(isPincodeServiceableForProduct(resolved, TEST_PRODUCT), true);
    });

    it('treats Central Delhi pincode as serviceable when Delhi is listed', async () => {
      const resolved = await checkPincode('110001');
      assert.equal(isPincodeServiceableForProduct(resolved, TEST_PRODUCT), true);
    });

    it('treats Bengaluru pincode as serviceable via Bangalore alias when city has no district list enforcement hit', async () => {
      const product = {
        serviceableAreas: [{ city: 'Bengaluru', districts: [] }],
      };
      const resolved = await checkPincode('560001');
      assert.equal(isPincodeServiceableForProduct(resolved, product), true);
    });

    it('rejects pincode outside configured cities', async () => {
      const resolved = {
        city: 'Kolkata',
        district: 'Kolkata',
        state: 'West Bengal',
        pincode: '700001',
        matchedBy: 'District',
      };
      assert.equal(isPincodeServiceableForProduct(resolved, TEST_PRODUCT), false);
    });

    it('allows any pincode when product has no serviceableAreas', () => {
      const resolved = { city: 'Kolkata', district: 'Kolkata', pincode: '700001' };
      assert.equal(isPincodeServiceableForProduct(resolved, { serviceableAreas: [] }), true);
    });
  });

  describe('cityEntryMatches', () => {
    it('matches Delhi NCR bucket to Gurgaon', () => {
      assert.equal(cityEntryMatches({ city: 'Gurgaon' }, 'Delhi NCR'), true);
    });

    it('matches Bengaluru product city to Bangalore resolved city', () => {
      assert.equal(cityEntryMatches({ city: 'Bangalore' }, 'Bengaluru'), true);
    });
  });

  describe('PINCODE_LOCALITY', () => {
    it('maps known hyper-local pincodes', () => {
      assert.equal(PINCODE_LOCALITY['400050'], 'Bandra West');
      assert.equal(PINCODE_LOCALITY['122001'], 'Sector 29');
      assert.equal(PINCODE_LOCALITY['201301'], 'Sector 18');
    });
  });

  describe('India Post API fallback', () => {
    const originalFetch = global.fetch;

    after(() => {
      global.fetch = originalFetch;
    });

    it('uses API when pincode is not in local map', async () => {
      global.fetch = async () => ({
        ok: true,
        async json() {
          return [
            {
              Status: 'Success',
              PostOffice: [
                {
                  Name: 'Test PO',
                  District: 'Pune',
                  State: 'Maharashtra',
                  Division: 'Pune',
                },
              ],
            },
          ];
        },
      });

      const result = await checkPincode('411001');
      assert.ok(result);
      assert.equal(result.pincode, '411001');
      assert.equal(result.matchedBy, 'District');
    });

    it('returns null when API retries are exhausted', async () => {
      global.fetch = async () => {
        const err = new Error('network down');
        err.transient = true;
        throw err;
      };

      const result = await checkPincode('411002');
      assert.equal(result, null);
    });
  });

  describe('validation', () => {
    it('rejects invalid pincode format', async () => {
      await assert.rejects(() => checkPincode('12'), /Invalid pincode format/);
    });
  });
});
