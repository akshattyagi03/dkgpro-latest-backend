/**
 * Inserts 5 low-price test products (₹1) for checkout / booking flow testing.
 *
 * Note: Razorpay requires amount > 0, so products use ₹1 (not ₹0).
 *
 * Prerequisites:
 *   - MONGODB_URI in .env
 *   - Category tree (npm run seed:categories)
 *   - Addon catalog (npm run seed:addons)
 *   - An Admin user, or SEED_DUMMY_ADMIN_EMAIL + SEED_DUMMY_ADMIN_PASSWORD
 *
 * Run: npm run seed:test-products
 */
require('dotenv').config()
const mongoose = require('mongoose')

const Product = require('./src/models/product-model')
const Admin = require('./src/models/admin-model')
const Addon = require('./src/models/addon-model')
const MainCategory = require('./src/models/main-category-model')
const SubCategory = require('./src/models/sub-category-model')
const ThirdCategory = require('./src/models/third-category-model')
const { placeholderImage } = require('./src/utils/catalogSeedProductCopy')

const TEST_TAG = 'seed-test-product'

const RECOMMENDED_ADDON_NAMES = [
  'Alphabet Foil Balloon Set',
  'Personalized Text Balloons',
  'Shape Foil Balloon Pack',
  'Birthday Cake Add-on',
  'Cake Topper',
  'Birthday Candles',
]

const ENGAGEMENT_ADDON_NAMES = [
  'Party Games Pack',
  'Photo Booth Props Set',
]

const TEST_PRODUCTS = [
  {
    name: '[TEST] Birthday Balloon Decor — ₹1',
    description:
      'Seed test product for checkout. Simple balloon decor setup for testing cart, payment, and booking status.',
    price: 1,
    discountedPrice: null,
  },
  {
    name: '[TEST] Kids Theme Setup — ₹1',
    description:
      'Seed test product for kids party theme decoration. Use for end-to-end order and booking tests.',
    price: 1,
    discountedPrice: null,
  },
  {
    name: '[TEST] Anniversary Candlelight — ₹1',
    description:
      'Seed test product for anniversary decor. Priced at ₹1 for Razorpay test payments.',
    price: 1,
    discountedPrice: null,
  },
  {
    name: '[TEST] Festival Lights Pack — ₹1 sale',
    description:
      'Seed test product with list price and ₹1 discounted price to test discount checkout.',
    price: 4999,
    discountedPrice: 1,
  },
  {
    name: '[TEST] Corporate Desk Decor — ₹1',
    description:
      'Seed test product for corporate / small setup orders. Safe for repeated payment testing.',
    price: 1,
    discountedPrice: null,
  },
]

async function getOrCreateAdmin() {
  let admin = await Admin.findOne().sort({ createdAt: 1 })
  if (admin) return admin

  const email = process.env.SEED_DUMMY_ADMIN_EMAIL
  const password = process.env.SEED_DUMMY_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error(
      'No Admin user found. Create one in the app, or set SEED_DUMMY_ADMIN_EMAIL and SEED_DUMMY_ADMIN_PASSWORD in .env.'
    )
  }

  admin = await Admin.create({
    fullName: 'Seed Admin',
    email,
    password,
    isApproved: true,
  })
  console.log('Created seed admin:', email)
  return admin
}

async function pickCategoryTriples(limit) {
  const thirds = await ThirdCategory.find().sort({ createdAt: 1 }).limit(limit).lean()
  if (thirds.length === 0) {
    throw new Error('No third categories found. Run npm run seed:categories first.')
  }

  const triples = []
  for (const third of thirds) {
    const sub = await SubCategory.findById(third.subCategory).lean()
    if (!sub) continue
    const main = await MainCategory.findById(sub.mainCategory).lean()
    if (!main) continue
    triples.push({ main, sub, third })
    if (triples.length >= limit) break
  }

  if (triples.length === 0) {
    throw new Error('Could not resolve main/sub/third category chain.')
  }

  return triples
}

function buildTestProductDoc(template, triple, adminId, index) {
  const { main, sub, third } = triple
  return {
    name: template.name,
    description: template.description,
    price: template.price,
    discountedPrice: template.discountedPrice,
    mainCategory: main._id,
    subCategory: sub._id,
    thirdCategory: third._id,
    images: [
      placeholderImage(`test-product-${index}`),
      placeholderImage(`test-product-${index}-b`),
    ],
    addedBy: adminId,
    serviceableAreas: [
      { city: 'Mumbai', districts: ['Andheri', 'Bandra'] },
      { city: 'Bengaluru', districts: ['Indiranagar', 'Koramangala'] },
      { city: 'Delhi', districts: ['South Delhi'] },
    ],
    isFeatured: index === 0,
    tier: 'standard',
    location: 'Mumbai · Bengaluru · Delhi',
    setupDuration: '60 minutes',
    teamSize: '2 staff',
    advanceBooking: '24 hours',
    cancellationPolicy: 'Free cancellation up to 24 hours before the event.',
    inclusions: [
      'Basic decor materials',
      'Setup and teardown',
      'On-site coordinator',
    ],
    experiences: [
      'Quick celebration setup',
      'Photo-friendly styling',
      'Family-friendly service',
    ],
    keyHighlights: [
      'Test product — ₹1 checkout',
      'Available in major cities',
      'Ideal for payment flow testing',
    ],
    tags: [TEST_TAG, 'test', 'checkout'],
    catalogSeed: true,
  }
}

async function findAddonsInOrder(names) {
  const found = await Addon.find({ name: { $in: names } }).lean()
  const byName = new Map(found.map((a) => [a.name, a]))
  return names.map((name) => byName.get(name)).filter(Boolean)
}

async function attachCustomizationSections(products) {
  const recommendedAddons = await findAddonsInOrder(RECOMMENDED_ADDON_NAMES)
  const engagementAddons = await findAddonsInOrder(ENGAGEMENT_ADDON_NAMES)

  if (!recommendedAddons.length && !engagementAddons.length) {
    console.warn('No addons found — run `npm run seed:addons` first.')
    return
  }

  const sections = [
    {
      name: 'Recommended',
      priority: 0,
      addons: recommendedAddons.map((addon) => ({ addon: addon._id })),
    },
    {
      name: 'Engagement Activity',
      priority: 1,
      addons: engagementAddons.map((addon) => ({ addon: addon._id })),
    },
  ].filter((section) => section.addons.length > 0)

  for (const product of products) {
    await Product.findByIdAndUpdate(product._id, { customizationSections: sections })
  }

  console.log(
    `Linked Recommended (${recommendedAddons.length}) + Engagement Activity (${engagementAddons.length}) on ${products.length} test product(s).`
  )
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set (check .env)')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const admin = await getOrCreateAdmin()

  const oldIds = await Product.find({ tags: TEST_TAG }).distinct('_id')
  if (oldIds.length) {
    await Admin.updateMany({ products: { $in: oldIds } }, { $pullAll: { products: oldIds } })
    await Product.deleteMany({ _id: { $in: oldIds } })
    console.log(`Removed ${oldIds.length} previous test product(s).`)
  }

  const triples = await pickCategoryTriples(TEST_PRODUCTS.length)
  const docs = TEST_PRODUCTS.map((template, index) => {
    const triple = triples[index % triples.length]
    return buildTestProductDoc(template, triple, admin._id, index)
  })

  const inserted = await Product.insertMany(docs, { ordered: true })

  await Admin.findByIdAndUpdate(admin._id, {
    $addToSet: { products: { $each: inserted.map((p) => p._id) } },
  })

  await attachCustomizationSections(inserted)

  console.log(`Inserted ${inserted.length} test products (₹1 checkout):`)
  inserted.forEach((p) => {
    const sale =
      p.discountedPrice != null && p.discountedPrice < p.price
        ? ` (list ₹${p.price}, pay ₹${p.discountedPrice})`
        : ` (₹${p.price})`
    console.log(`  - ${p.name}${sale}  id=${p._id}`)
  })

  await mongoose.disconnect()
  console.log('Test products seed finished.')
}

seed().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
