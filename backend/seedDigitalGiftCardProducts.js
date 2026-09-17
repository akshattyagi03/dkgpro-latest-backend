/**
 * Upsert a few Digital Gift Card catalog products for testing
 * (baby name, which birthday, foam-board size on the product page).
 *
 * Ensures Gifts › DIGITAL GIFTS › Digital Gift Card exists first.
 *
 *   node seedDigitalGiftCardProducts.js
 *   npm run seed:digital-gift-card-products
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
require('dotenv').config({ path: path.join(__dirname, 'src/.env') })
const mongoose = require('mongoose')

const Admin = require('./src/models/admin-model')
const Product = require('./src/models/product-model')
const MainCategory = require('./src/models/main-category-model')
const SubCategory = require('./src/models/sub-category-model')
const ThirdCategory = require('./src/models/third-category-model')

const MAIN_NAMES = ['Gifts', 'GIFTS']
const SUB_NAMES = ['DIGITAL GIFTS', 'Digital Gifts']
const THIRD_NAME = 'Digital Gift Card'
const SEED_TAG = 'seed:digital-gift-card'

const GIFT_CARD_SELECTION = {
  enabled: true,
  babyNameLabel: 'Baby Name',
  birthdayLabel: 'Which Birthday It Is',
  sizeLabel: 'Select Size',
  inheritFromCategory: true,
  sizes: [
    { label: '1x1.5 Ft. (2mm Foam Board)', price: 1299 },
    { label: '2x1.5 Ft. (3mm Foam Board)', price: 1999 },
    { label: '2x3 Ft. (3mm Foam Board)', price: 2499 },
  ],
}

const SERVICEABLE_AREAS = [
  { city: 'Delhi NCR', districts: ['Gurgaon', 'Noida', 'Delhi'] },
  { city: 'Mumbai', districts: ['Bandra', 'Andheri', 'Juhu'] },
  { city: 'Bangalore', districts: ['Indiranagar', 'Koramangala'] },
  { city: 'Hyderabad', districts: ['Jubilee Hills', 'Banjara Hills'] },
  { city: 'Pune', districts: ['Koregaon Park', 'Baner'] },
  { city: 'Chennai', districts: ['Adyar', 'T Nagar'] },
  { city: 'Kolkata', districts: ['Salt Lake', 'Park Street'] },
  { city: 'Jaipur', districts: ['Malviya Nagar'] },
  { city: 'Ahmedabad', districts: ['Satellite'] },
  { city: 'Lucknow', districts: ['Gomti Nagar'] },
  { city: 'Chandigarh', districts: ['Sector 17'] },
  { city: 'Indore', districts: ['Vijay Nagar'] },
  { city: 'Kanpur', districts: ['Civil Lines'] },
  { city: 'Jammu', districts: ['Gandhi Nagar'] },
]

const PRODUCTS = [
  {
    name: 'Personalized Baby Birthday Gift Card',
    price: 1299,
    discountedPrice: null,
    tier: 'standard',
    isFeatured: true,
    images: [
      'https://picsum.photos/seed/dkgGiftCardBabyBoard/1200/800',
      'https://picsum.photos/seed/dkgGiftCardBabyBoard2/1200/800',
    ],
    description: [
      'A personalized foam-board gift card for a baby birthday. Enter the baby name, which birthday it is, and pick a board size at checkout.',
      '',
      'Use this listing to test the Digital Gift Card form: Baby Name, Which Birthday It Is, and size pills (1x1.5 Ft / 2x1.5 Ft / 2x3 Ft).',
    ].join('\n'),
  },
  {
    name: 'Custom Name Foam Board Gift Card',
    price: 1299,
    discountedPrice: null,
    tier: 'standard',
    isFeatured: false,
    images: [
      'https://picsum.photos/seed/dkgGiftCardNameBoard/1200/800',
      'https://picsum.photos/seed/dkgGiftCardNameBoard2/1200/800',
    ],
    description: [
      'Printed name board gift card on foam board. Guests type the baby name and milestone birthday, then choose the board size.',
      '',
      'Second test SKU for the Digital Gift Card personalization flow.',
    ].join('\n'),
  },
  {
    name: 'Premium Milestone Birthday Gift Board',
    price: 1299,
    discountedPrice: null,
    tier: 'premium',
    isFeatured: false,
    images: [
      'https://picsum.photos/seed/dkgGiftCardPremiumBoard/1200/800',
      'https://picsum.photos/seed/dkgGiftCardPremiumBoard2/1200/800',
    ],
    description: [
      'Premium milestone gift board with larger print options. Same guest inputs as other Digital Gift Card products: baby name, birthday, and foam-board size.',
      '',
      'Premium-tier test SKU so admin order detail and invoices can be checked with a higher package price.',
    ].join('\n'),
  },
]

const SHARED_COPY = {
  inclusions: [
    'Personalized print with the baby name you enter',
    'Foam board in the size selected at booking',
    'Digital proof shared before print (on request)',
    'Packed for gifting / party display',
  ],
  exclusions: [
    'Easel or stand not included unless added as an add-on',
    'Same-day printing in all cities is not guaranteed',
  ],
  experiences: [
    'Enter baby name and which birthday it is on the product page',
    'Pick 1x1.5 Ft, 2x1.5 Ft, or 2x3 Ft foam board',
    'Details are sent to the team with your booking',
  ],
  keyHighlights: [
    'Required Baby Name and birthday fields on the product page',
    'Three foam-board size options',
    'Same checkout and admin order flow as other bookings',
  ],
  cancellationPolicy:
    'Free cancellation up to 24 hours before the event. Partial refund may apply thereafter.',
  setupDuration: 'Print and dispatch as per selected date',
  teamSize: '1–2',
  advanceBooking: '24–48 hours',
  location: 'Shipped / delivered in listed service cities',
}

async function findOrCreateMain() {
  let main = await MainCategory.findOne({
    $or: MAIN_NAMES.map((name) => ({ name })),
  })
  if (!main) {
    main = await MainCategory.create({ name: 'Gifts' })
    console.log(`Created main category: ${main.name}`)
  }
  return main
}

async function findOrCreateSub(main) {
  let sub = await SubCategory.findOne({
    mainCategory: main._id,
    name: { $in: SUB_NAMES },
  })
  if (!sub) {
    sub = await SubCategory.create({
      name: 'DIGITAL GIFTS',
      mainCategory: main._id,
    })
    console.log(`Created sub category: ${sub.name}`)
  }
  return sub
}

async function findOrCreateThird(sub) {
  let third = await ThirdCategory.findOne({
    subCategory: sub._id,
    name: THIRD_NAME,
  })
  if (!third) {
    third = await ThirdCategory.create({
      name: THIRD_NAME,
      subCategory: sub._id,
      giftCardSelection: GIFT_CARD_SELECTION,
    })
    console.log(`Created third category: ${THIRD_NAME}`)
    return third
  }

  third.giftCardSelection = GIFT_CARD_SELECTION
  await third.save()
  return third
}

async function resolveAddedBy() {
  let admin = await Admin.findOne({ isApproved: true }).select('_id email')
  if (!admin) admin = await Admin.findOne().select('_id email')
  if (admin) return admin._id

  const existing = await Product.findOne({ addedBy: { $exists: true, $ne: null } })
    .select('addedBy')
    .lean()
  if (existing?.addedBy) return existing.addedBy

  throw new Error(
    'No Admin found to set addedBy. Create or approve a vendor admin, then re-run this seed.'
  )
}

async function upsertProduct({ spec, main, sub, third, adminId }) {
  const payload = {
    name: spec.name,
    description: spec.description,
    price: spec.price,
    discountedPrice: spec.discountedPrice,
    mainCategory: main._id,
    subCategory: sub._id,
    thirdCategory: third._id,
    images: spec.images,
    addedBy: adminId,
    serviceableAreas: SERVICEABLE_AREAS,
    isFeatured: spec.isFeatured,
    tier: spec.tier,
    tags: ['Digital Gift Card', 'Birthday', 'Foam Board', SEED_TAG],
    giftCardSelection: GIFT_CARD_SELECTION,
    catalogSeed: true,
    ...SHARED_COPY,
  }

  const existing = await Product.findOne({
    name: spec.name,
    thirdCategory: third._id,
  })

  if (existing) {
    Object.assign(existing, payload)
    await existing.save()
    console.log(`Updated: ${spec.name} (${existing._id})`)
    return existing
  }

  const created = await Product.create(payload)
  console.log(`Created: ${spec.name} (${created._id})`)
  return created
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set')
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const main = await findOrCreateMain()
  const sub = await findOrCreateSub(main)
  const third = await findOrCreateThird(sub)
  const adminId = await resolveAddedBy()

  console.log(`Category: ${main.name} › ${sub.name} › ${third.name}`)

  const saved = []
  for (const spec of PRODUCTS) {
    saved.push(await upsertProduct({ spec, main, sub, third, adminId }))
  }

  console.log('\nGuest listing: /categories/gifts/digital-gifts/digital-gift-card')
  for (const product of saved) {
    console.log(`  /product/${product._id}  —  ${product.name}`)
  }

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
