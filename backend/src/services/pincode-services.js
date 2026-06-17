/**
 * pincodeService.js
 *
 * Resolves an Indian pincode to a { city, district, state } tuple and checks
 * it against a product's serviceableAreas array.
 *
 * Resolution strategy (in order):
 *   1. In-memory LRU cache
 *   2. Local fallback map  ← handles pincodes the India Post API drops
 *   3. India Post API      ← with retry + exponential backoff
 *
 * Non-serviceable pincodes return null; only hard errors (bad format,
 * non-transient HTTP failures) throw.
 */

'use strict';

const citiesData = require('../utils/cities-districts.json');

// ---------------------------------------------------------------------------
// 1. Constants
// ---------------------------------------------------------------------------

const INDIA_POST_API = 'https://api.postalpincode.in/pincode';
const PINCODE_REGEX  = /^\d{6}$/;
const CACHE_MAX_SIZE = 500;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS  = 300;  // 300 ms → 600 ms
const FETCH_TIMEOUT  = 5000; // 5 s per attempt

/**
 * Explicit alias overrides.
 * Key  : any known spelling variant (normalized before lookup)
 * Value: canonical city name as it appears in cities-districts.json
 *
 * buildCityIndex() auto-registers every name in the JSON; only add entries
 * here for spellings the JSON does not cover.
 */
const EXPLICIT_ALIASES = {
  // Gurugram / Gurgaon
  gurugram:              'Gurgaon',
  gurgaon:               'Gurgaon',

  // Noida cluster
  'gautam buddha nagar': 'Noida',
  'gautam budh nagar':   'Noida',
  'gautam buddh nagar':  'Noida',
  'noida':               'Noida',
  'greater noida':       'Noida',

  // Delhi — all sub-districts resolve to Delhi
  'new delhi':           'Delhi',
  'north delhi':         'Delhi',
  'south delhi':         'Delhi',
  'east delhi':          'Delhi',
  'west delhi':          'Delhi',
  'central delhi':       'Delhi',
  'north east delhi':    'Delhi',
  'north west delhi':    'Delhi',
  'south west delhi':    'Delhi',
  'south east delhi':    'Delhi',
  'shahdara':              'Delhi',

  // Bangalore / Bengaluru
  'bangalore':             'Bangalore',
  'bengaluru':             'Bangalore',
  'bengaluru urban':     'Bangalore',
  'bengaluru rural':     'Bangalore',

  // Common alternates / legacy names
  'bombay':                'Mumbai',
  'calcutta':              'Kolkata',
  'madras':                'Chennai',
  'hyderabad deccan':    'Hyderabad',
};

/**
 * Local pincode fallback map.
 *
 * Add pincodes here that the India Post API drops intermittently.
 * These are resolved immediately without hitting the network, so they
 * also serve as a fast path for your highest-traffic serviceable pincodes.
 *
 * Format: '<pincode>': { city, district, state }
 * All values must use canonical city names (matching EXPLICIT_ALIASES / JSON).
 *
 * HOW TO GROW THIS LIST:
 *   When a user reports a "not serviceable" error for a pincode you know is
 *   valid, add it here. You can also bulk-seed it from your orders database:
 *   any pincode that has ever successfully resolved is safe to add.
 */
const PINCODE_FALLBACK = {
  // Gurugram
  '122001': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122002': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122003': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122004': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122005': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122006': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122007': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122008': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122009': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122010': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122011': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122015': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122016': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122017': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122018': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122022': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' }, 
  '122051': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122052': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122101': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122102': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122103': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122104': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122413': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122414': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },
  '122505': { city: 'Gurgaon', district: 'Gurugram', state: 'Haryana' },

  // Delhi
  '110001': { city: 'Delhi', district: 'Central Delhi',    state: 'Delhi' },
  '110002': { city: 'Delhi', district: 'Central Delhi',    state: 'Delhi' },
  '110003': { city: 'Delhi', district: 'South Delhi',      state: 'Delhi' },
  '110004': { city: 'Delhi', district: 'New Delhi',        state: 'Delhi' },
  '110005': { city: 'Delhi', district: 'Central Delhi',    state: 'Delhi' },
  '110006': { city: 'Delhi', district: 'Central Delhi',    state: 'Delhi' },
  '110007': { city: 'Delhi', district: 'Central Delhi',    state: 'Delhi' },
  '110008': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110009': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110010': { city: 'Delhi', district: 'South Delhi',      state: 'Delhi' },
  '110011': { city: 'Delhi', district: 'New Delhi',        state: 'Delhi' },
  '110012': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110013': { city: 'Delhi', district: 'South Delhi',      state: 'Delhi' },
  '110014': { city: 'Delhi', district: 'South Delhi',      state: 'Delhi' },
  '110015': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110016': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110017': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110018': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110019': { city: 'Delhi', district: 'South East Delhi', state: 'Delhi' },
  '110020': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110021': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110022': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110023': { city: 'Delhi', district: 'Central Delhi',    state: 'Delhi' },
  '110024': { city: 'Delhi', district: 'South East Delhi', state: 'Delhi' },
  '110025': { city: 'Delhi', district: 'South East Delhi', state: 'Delhi' },
  '110026': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110027': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110028': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110029': { city: 'Delhi', district: 'South Delhi',      state: 'Delhi' },
  '110030': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110031': { city: 'Delhi', district: 'North East Delhi', state: 'Delhi' },
  '110032': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110033': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110034': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110035': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110036': { city: 'Delhi', district: 'North Delhi',      state: 'Delhi' },
  '110037': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110038': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110039': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110040': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110041': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110042': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110043': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110044': { city: 'Delhi', district: 'South East Delhi', state: 'Delhi' },
  '110045': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110046': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110047': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110048': { city: 'Delhi', district: 'South East Delhi', state: 'Delhi' },
  '110049': { city: 'Delhi', district: 'South East Delhi', state: 'Delhi' },
  '110051': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110052': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110053': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110054': { city: 'Delhi', district: 'North Delhi',      state: 'Delhi' },
  '110055': { city: 'Delhi', district: 'Central Delhi',    state: 'Delhi' },
  '110056': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110057': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110058': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110059': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110060': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110061': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110062': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110063': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110064': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110065': { city: 'Delhi', district: 'South East Delhi', state: 'Delhi' },
  '110066': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110067': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110068': { city: 'Delhi', district: 'South Delhi',      state: 'Delhi' },
  '110069': { city: 'Delhi', district: 'South Delhi',      state: 'Delhi' },
  '110070': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110071': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110072': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110073': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110074': { city: 'Delhi', district: 'South Delhi',      state: 'Delhi' },
  '110075': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110076': { city: 'Delhi', district: 'South East Delhi', state: 'Delhi' },
  '110077': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110078': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110081': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110082': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110083': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110084': { city: 'Delhi', district: 'North East Delhi', state: 'Delhi' },
  '110085': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110086': { city: 'Delhi', district: 'West Delhi',       state: 'Delhi' },
  '110087': { city: 'Delhi', district: 'South West Delhi', state: 'Delhi' },
  '110088': { city: 'Delhi', district: 'North West Delhi', state: 'Delhi' },
  '110089': { city: 'Delhi', district: 'South East Delhi', state: 'Delhi' },
  '110090': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110091': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110092': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110093': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110094': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110095': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },
  '110096': { city: 'Delhi', district: 'East Delhi',       state: 'Delhi' },

  // Noida
  '201301': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201302': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201303': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201304': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201305': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201306': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201307': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201308': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201309': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201310': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201311': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201312': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201313': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201314': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201315': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201316': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201317': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201318': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },
  '201319': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh' },

  // Ghaziabad
  '201001': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201002': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201003': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201004': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201005': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201006': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201007': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201008': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201009': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201010': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201011': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201012': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201013': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201014': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201015': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201016': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201017': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201018': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201019': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201020': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201021': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },
  '201022': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh' },

  // Faridabad
  '121001': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121002': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121003': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121004': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121005': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121006': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121007': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121008': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121009': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121010': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121012': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121013': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121014': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121101': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },
  '121102': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana' },

  // Mumbai
  '400001': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400002': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400003': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400004': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400005': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400006': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400007': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400008': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400009': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400010': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400011': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400012': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400013': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400014': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400015': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400016': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400017': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400018': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400019': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400020': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400021': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400022': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400023': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400024': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400025': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400026': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400027': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400028': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400029': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400030': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400031': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400032': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400033': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400034': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400035': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400036': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400037': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400038': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400039': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400040': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400042': { city: 'Mumbai', district: 'Mumbai City',   state: 'Maharashtra' },
  '400043': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400049': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400050': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400051': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400052': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400053': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400054': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400055': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400056': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400057': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400058': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400059': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400060': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400061': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400062': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400063': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400064': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400065': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400066': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400067': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400068': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400069': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400070': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400071': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400072': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400074': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400075': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400076': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400077': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400078': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400079': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400080': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400081': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400082': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400083': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400084': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400085': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400086': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400087': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400088': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400089': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400090': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400091': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400092': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400093': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400094': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400095': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400096': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400097': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400098': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400099': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400101': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400102': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400103': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },
  '400104': { city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra' },

  // Bangalore
  '560001': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560002': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560003': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560004': { city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka' },
  '560005': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560006': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560007': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560008': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560009': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560010': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560011': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560012': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560013': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560014': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560015': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560016': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560017': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560018': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560019': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560020': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560021': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560022': { city: 'Bangalore', district: 'Bangalore Urban', state: 'Karnataka' },
  '560023': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560024': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560025': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560026': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560027': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560028': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560029': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560030': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560032': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560033': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560034': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560035': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560036': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560037': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560038': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560039': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560040': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560041': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560042': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560043': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560044': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560045': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560046': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560047': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560048': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560049': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560050': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560051': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560052': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560053': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560054': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560055': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560056': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560057': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560058': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560059': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560060': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560061': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560062': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560063': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560064': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560065': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560066': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560067': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560068': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560069': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560070': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560071': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560072': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560073': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560074': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560075': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560076': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560077': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560078': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560079': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560080': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560081': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560082': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560083': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560084': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560085': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560086': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560087': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560088': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560089': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560090': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560091': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560092': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560093': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560094': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560095': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560096': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560097': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560098': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560099': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
  '560100': { city: 'Bangalore', district: 'Bangalore',      state: 'Karnataka' },
};

// ---------------------------------------------------------------------------
// 2. Normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes a location string for comparison:
 *   "Bengaluru (Urban)" → "bengaluru urban"
 *   "North-East Delhi"  → "north-east delhi"
 */
function normalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/['''"""()\[\]{}&]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "gautam budh nagar" → Set { "gautam", "budh", "nagar" } */
function tokenSet(normalizedStr) {
  return new Set(normalizedStr.split(' ').filter(Boolean));
}

/**
 * Returns true if every token of `needleNormalized` exists in `haystackTokens`.
 * Prevents single-word aliases from matching fields that merely contain that
 * word as part of a longer unrelated name.
 */
function tokensMatch(needleNormalized, haystackTokens) {
  for (const token of tokenSet(needleNormalized)) {
    if (!haystackTokens.has(token)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// 3. Module-level city index (built once at startup)
// ---------------------------------------------------------------------------

function buildCityIndex() {
  const aliasToCanonical = new Map();

  for (const cityEntry of citiesData.cities) {
    const canonical = cityEntry.name;
    aliasToCanonical.set(normalize(canonical), canonical);

    for (const district of (cityEntry.districts ?? [])) {
      aliasToCanonical.set(normalize(district), canonical);
    }

    for (const sub of (cityEntry.subCities ?? [])) {
      aliasToCanonical.set(normalize(sub.name), canonical);
      for (const district of (sub.districts ?? [])) {
        aliasToCanonical.set(normalize(district), canonical);
      }
    }
  }

  // Explicit overrides applied last — always win
  for (const [alias, canonical] of Object.entries(EXPLICIT_ALIASES)) {
    aliasToCanonical.set(normalize(alias), canonical);
    aliasToCanonical.set(normalize(canonical), canonical);
  }

  return { aliasToCanonical };
}

const { aliasToCanonical } = buildCityIndex();

// ---------------------------------------------------------------------------
// 4. In-memory LRU cache
// ---------------------------------------------------------------------------

class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this._map    = new Map();
  }

  get(key) {
    if (!this._map.has(key)) return undefined;
    const value = this._map.get(key);
    this._map.delete(key);
    this._map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, value);
    if (this._map.size > this.maxSize) {
      this._map.delete(this._map.keys().next().value);
    }
  }

  has(key) { return this._map.has(key); }
}

const pincodeCache = new LRUCache(CACHE_MAX_SIZE);

// ---------------------------------------------------------------------------
// 5. Matching logic
// ---------------------------------------------------------------------------

const MATCH_FIELDS = ['District', 'Division', 'Block', 'State', 'Name'];

function resolvePostOffice(postOffice) {
  for (const field of MATCH_FIELDS) {
    const raw = postOffice[field];
    if (!raw) continue;

    const normalizedField = normalize(raw);
    const fieldTokens     = tokenSet(normalizedField);

    // Fast path: exact alias match
    if (aliasToCanonical.has(normalizedField)) {
      return { canonical: aliasToCanonical.get(normalizedField), matchedBy: field };
    }

    // Token-subset scan: handles "Gautam Budh Nagar District" → "Noida"
    for (const [alias, canonical] of aliasToCanonical) {
      if (tokensMatch(alias, fieldTokens)) {
        return { canonical, matchedBy: field };
      }
    }
  }
  return null;
}

function matchPostOffices(postOffices) {
  for (const po of postOffices) {
    const result = resolvePostOffice(po);
    if (result) return { ...result, postOffice: po };
  }
  return null;
}

// ---------------------------------------------------------------------------
// 6. Retry helper
// ---------------------------------------------------------------------------

async function withRetry(fn, attempts = RETRY_ATTEMPTS, baseDelayMs = RETRY_BASE_MS) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!err.transient) throw err;
      if (i < attempts - 1) {
        await new Promise(res => setTimeout(res, baseDelayMs * 2 ** i));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// 7. India Post API fetch
// ---------------------------------------------------------------------------

async function fetchPostOffices(pincode) {
  return withRetry(async () => {
    let response;
    try {
      response = await fetch(`${INDIA_POST_API}/${pincode}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
    } catch (networkError) {
      const err = new Error(`Network error fetching pincode ${pincode}: ${networkError.message}`);
      err.transient = true;
      throw err;
    }

    if (!response.ok) {
      const err = new Error(`India Post API returned HTTP ${response.status} for pincode ${pincode}`);
      err.transient = response.status >= 500;
      throw err;
    }

    let data;
    try {
      data = await response.json();
    } catch {
      const err = new Error(`Invalid JSON from India Post API for pincode ${pincode}`);
      err.transient = true;
      throw err;
    }

    const record = data?.[0];
    if (!record) {
      const err = new Error(`Empty response body for pincode ${pincode}`);
      err.transient = true;
      throw err;
    }

    // Trust PostOffice data over Status — the API returns Status:"Error"
    // for valid pincodes when it is under load or having internal issues.
    const postOffices = record.PostOffice;
    if (Array.isArray(postOffices) && postOffices.length > 0) {
      return postOffices;
    }

    if (record.Status === 'Error') {
      const err = new Error(
        `India Post API returned Status:"Error" with no data for pincode ${pincode}`
      );
      err.transient = true;
      throw err;
    }

    throw new Error(`No post office data for pincode ${pincode} (Status: ${record.Status})`);
  });
}

// ---------------------------------------------------------------------------
// 8. Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PincodeResult
 * @property {string} city       Canonical city name  (e.g. "Gurgaon")
 * @property {string} district   Raw district string
 * @property {string} state      Raw state string
 * @property {string} pincode    The queried pincode
 * @property {string} matchedBy  Which field produced the match
 *                               ('fallback' when resolved from PINCODE_FALLBACK)
 */

/**
 * Resolves a pincode to a canonical city/district/state tuple.
 *
 * Resolution order:
 *   1. LRU cache
 *   2. PINCODE_FALLBACK  (instant, no network)
 *   3. India Post API    (with retry)
 *
 * Returns PincodeResult if resolved, null if not serviceable.
 * Throws only for malformed input or non-transient API errors.
 *
 * @param {string|number} pincode
 * @returns {Promise<PincodeResult|null>}
 */
async function checkPincode(pincode) {
  const pincodeStr = String(pincode).trim();
  if (!PINCODE_REGEX.test(pincodeStr)) {
    throw new Error(`Invalid pincode format: "${pincode}". Must be exactly 6 digits.`);
  }

  // 1. Cache
  if (pincodeCache.has(pincodeStr)) {
    return pincodeCache.get(pincodeStr);
  }

  // 2. Local fallback map — resolves instantly, no network needed
  if (PINCODE_FALLBACK[pincodeStr]) {
    const { city, district, state } = PINCODE_FALLBACK[pincodeStr];
    const result = { city, district, state, pincode: pincodeStr, matchedBy: 'fallback' };
    pincodeCache.set(pincodeStr, result);
    return result;
  }

  // 3. India Post API with retry
  let postOffices;
  try {
    postOffices = await fetchPostOffices(pincodeStr);
  } catch (err) {
    if (err.transient) {
      console.error(`[pincodeService] All retries exhausted for ${pincodeStr}:`, err.message);
      return null;
    }
    throw err;
  }

  const match = matchPostOffices(postOffices);
  if (!match) {
    pincodeCache.set(pincodeStr, null);
    return null;
  }

  const { canonical, matchedBy, postOffice } = match;
  const result = {
    city:      canonical,
    district:  postOffice.District || '',
    state:     postOffice.State    || '',
    pincode:   pincodeStr,
    matchedBy,
  };

  pincodeCache.set(pincodeStr, result);
  return result;
}

/**
 * Checks whether a resolved pincode is serviceable for a given product.
 *
 * Matches against product.serviceableAreas using the same normalization
 * as the city index — so "Gurgaon" in the pincode result matches "gurgaon",
 * "Gurugram", or any alias in serviceableAreas.city.
 *
 * Usage:
 *   const resolved = await checkPincode(pincode)
 *   if (!resolved) return res.json({ serviceable: false })
 *   const serviceable = isPincodeServiceableForProduct(resolved, product)
 *   return res.json({ serviceable, ...resolved })
 *
 * @param {PincodeResult}  resolved  - Result from checkPincode()
 * @param {Object}         product   - Mongoose Product document
 * @returns {boolean}
 */
function isPincodeServiceableForProduct(resolved, product) {
  if (!resolved || !Array.isArray(product.serviceableAreas)) return false;

  const resolvedCity     = normalize(resolved.city);
  const resolvedDistrict = normalize(resolved.district);

  for (const area of product.serviceableAreas) {
    const areaCity = normalize(area.city);

    // City match: direct OR via canonical alias
    const cityMatches =
      areaCity === resolvedCity ||
      aliasToCanonical.get(areaCity) === resolved.city ||
      aliasToCanonical.get(resolvedCity) === area.city;

    if (!cityMatches) continue;

    // If no districts are listed for this area, the whole city is serviceable
    if (!area.districts || area.districts.length === 0) return true;

    // If districts are listed, the resolved district must be in the list
    for (const d of area.districts) {
      if (normalize(d) === resolvedDistrict) return true;
    }
  }

  return false;
}

module.exports = { checkPincode, isPincodeServiceableForProduct };