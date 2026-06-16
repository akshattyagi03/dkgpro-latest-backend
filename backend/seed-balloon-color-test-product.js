/**
 * One balloon decoration test product with:
 *   - Admin color presets (Choose Balloon Colors on PDP)
 *   - Recommended + Engagement add-ons (same as catalog balloon products)
 *   - ₹1 price for Razorpay checkout testing
 *
 * Mirrors structure of product 6a08fbc5e10feb7e9f1b17f6 (Balloon Arch · Deluxe).
 *
 * Prerequisites:
 *   - MONGODB_URI in .env
 *   - npm run seed:categories
 *   - npm run seed:addons
 *
 * Run: npm run seed:balloon-color-product
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

const SEED_TAG = 'seed-balloon-color-test-product'
const PRODUCT_NAME = '[TEST] Balloon Bliss Setup — colors + add-ons'

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

const BALLOON_COLOR_PRESETS = [
  'Gold',
  'Silver',
  'Rose Gold',
  'Red',
  'Blue',
  'Pink',
  'White',
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

async function resolveBalloonArchCategories() {
  const main = await MainCategory.findOne({ name: /decor/i }).lean()
  if (!main) throw new Error('Decorations main category not found. Run npm run seed:categories.')

  const sub = await SubCategory.findOne({
    mainCategory: main._id,
    name: /balloon/i,
  }).lean()
  if (!sub) throw new Error('BALLOON DECORATIONS sub-category not found.')

  let third = await ThirdCategory.findOne({
    subCategory: sub._id,
    name: /balloon arch/i,
  }).lean()
  if (!third) {
    third = await ThirdCategory.findOne({ subCategory: sub._id }).sort({ createdAt: 1 }).lean()
  }
  if (!third) throw new Error('No third category under balloon decorations.')

  return { main, sub, third }
}

async function findAddonsInOrder(names) {
  const found = await Addon.find({ name: { $in: names } }).lean()
  const byName = new Map(found.map((a) => [a.name, a]))
  const missing = names.filter((n) => !byName.has(n))
  if (missing.length) {
    throw new Error(`Missing add-ons: ${missing.join(', ')}. Run npm run seed:addons first.`)
  }
  return names.map((name) => byName.get(name))
}

async function buildCustomizationSections() {
  const recommendedAddons = await findAddonsInOrder(RECOMMENDED_ADDON_NAMES)
  const engagementAddons = await findAddonsInOrder(ENGAGEMENT_ADDON_NAMES)

  return [
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
  ]
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set (check .env)')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const admin = await getOrCreateAdmin()
  const { main, sub, third } = await resolveBalloonArchCategories()
  const customizationSections = await buildCustomizationSections()

  const oldIds = await Product.find({ tags: SEED_TAG }).distinct('_id')
  if (oldIds.length) {
    await Admin.updateMany({ products: { $in: oldIds } }, { $pullAll: { products: oldIds } })
    await Product.deleteMany({ _id: { $in: oldIds } })
    console.log(`Removed ${oldIds.length} previous seed test product(s).`)
  }

  const product = await Product.create({
    name: PRODUCT_NAME,
    description:
      'Seed test product for balloon color picker, customize booking add-ons, cart, and order flow. ' +
      'Decorations › Balloon Arch with all recommended and engagement extras.',
    price: 1,
    discountedPrice: null,
    mainCategory: main._id,
    subCategory: sub._id,
    thirdCategory: third._id,
    images: [
      placeholderImage('balloon-bliss-test-a'),
      placeholderImage('balloon-bliss-test-b'),
      placeholderImage('balloon-bliss-test-c'),
    ],
    addedBy: admin._id,
    serviceableAreas: [
      { city: 'Mumbai', districts: ['Andheri', 'Bandra', 'Juhu'] },
      { city: 'Bengaluru', districts: ['Indiranagar', 'Koramangala'] },
      { city: 'Delhi NCR', districts: ['Gurgaon', 'Noida'] },
    ],
    isFeatured: true,
    tier: 'standard',
    location: 'Mumbai · Bengaluru · Delhi NCR',
    setupDuration: '90 minutes',
    teamSize: '2–3 staff',
    advanceBooking: '24 hours',
    cancellationPolicy:
      'Free cancellation up to 24 hours before the event. Partial refund may apply thereafter.',
    inclusions: [
      'Balloon arch styling and installation',
      'Coordinated color theme on request',
      'Setup and teardown included',
    ],
    experiences: [
      'Instagram-ready balloon backdrop',
      'Kid-friendly safe materials',
      'On-site coordinator',
    ],
    keyHighlights: [
      'Test product — ₹1 checkout',
      'Choose Balloon Colors on product page',
      'Full add-on customize booking',
    ],
    tags: [SEED_TAG, 'test', 'balloon', 'checkout'],
    catalogSeed: true,
    customizationSections,
    balloonColorSelection: {
      enabled: true,
      defaultOptionLabel: 'Same as image',
      defaultOptionDescription: 'Default colors shown in the photo',
      allowCustom: true,
      customOptionLabel: 'Custom',
      inheritFromCategory: false,
      presets: BALLOON_COLOR_PRESETS.map((label) => ({ label })),
    },
  })

  await Admin.findByIdAndUpdate(admin._id, {
    $addToSet: { products: product._id },
  })

  const slug = product.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  console.log('\n✅ Created balloon test product')
  console.log(`   Name:    ${product.name}`)
  console.log(`   ID:      ${product._id}`)
  console.log(`   Price:   ₹${product.price}`)
  console.log(`   Path:    ${main.name} › ${sub.name} › ${third.name}`)
  console.log(`   Colors:  ${BALLOON_COLOR_PRESETS.join(', ')}`)
  console.log(
    `   Add-ons: Recommended (${RECOMMENDED_ADDON_NAMES.length}) + Engagement (${ENGAGEMENT_ADDON_NAMES.length})`
  )
  console.log(`\n   Guest URL: /product/${slug}`)
  console.log(`   (or use product id: /product/${product._id})`)

  await mongoose.disconnect()
  console.log('\nDone.')
}

seed().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
