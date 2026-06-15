/**
 * Attach Customize Your Booking add-ons to every balloon decoration product.
 *
 * Matches guest rule: main category contains "decor" AND
 * (sub-category OR third-category name contains "balloon").
 *
 * Prerequisites:
 *   - MONGODB_URI in .env
 *   - npm run seed:addons
 *
 * Run: npm run seed:balloon-addons
 */
require('dotenv').config()
const mongoose = require('mongoose')

const Product = require('./src/models/product-model')
const Addon = require('./src/models/addon-model')
const MainCategory = require('./src/models/main-category-model')
require('./src/models/sub-category-model')
require('./src/models/third-category-model')

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

function isBalloonDecorationProduct(product) {
  const main = (product.mainCategory?.name ?? '').toLowerCase()
  const sub = (product.subCategory?.name ?? '').toLowerCase()
  const third = (product.thirdCategory?.name ?? '').toLowerCase()
  if (!main.includes('decor')) return false
  return sub.includes('balloon') || third.includes('balloon')
}

async function findAddonsInOrder(names) {
  const found = await Addon.find({ name: { $in: names } }).lean()
  const byName = new Map(found.map((a) => [a.name, a]))
  return names.map((name) => byName.get(name)).filter(Boolean)
}

async function buildCustomizationSections() {
  const recommendedAddons = await findAddonsInOrder(RECOMMENDED_ADDON_NAMES)
  const engagementAddons = await findAddonsInOrder(ENGAGEMENT_ADDON_NAMES)

  if (!recommendedAddons.length && !engagementAddons.length) {
    throw new Error('No add-ons in database. Run `npm run seed:addons` first.')
  }

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
  ].filter((section) => section.addons.length > 0)
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set (check .env)')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const decorMainIds = await MainCategory.find({ name: /decor/i }).distinct('_id')
  if (!decorMainIds.length) {
    throw new Error('No Decorations main category found. Run npm run seed:categories first.')
  }

  const customizationSections = await buildCustomizationSections()
  const recommendedCount =
    customizationSections.find((s) => s.name === 'Recommended')?.addons?.length ?? 0
  const engagementCount =
    customizationSections.find((s) => s.name === 'Engagement Activity')?.addons?.length ?? 0

  const candidates = await Product.find({ mainCategory: { $in: decorMainIds } })
    .populate('mainCategory subCategory thirdCategory')
    .select('_id name subCategory thirdCategory customizationSections')

  const balloonProducts = candidates.filter(isBalloonDecorationProduct)

  if (!balloonProducts.length) {
    console.warn('No balloon decoration products found under Decorations.')
    await mongoose.disconnect()
    return
  }

  let updated = 0
  for (const product of balloonProducts) {
    await Product.findByIdAndUpdate(product._id, { customizationSections })
    updated += 1
  }

  console.log(
    `\n✅ Linked add-ons on ${updated} balloon decoration product(s).`
  )
  console.log(
    `   Recommended (${recommendedCount}) + Engagement Activity (${engagementCount})`
  )
  console.log('\nSample products updated:')
  balloonProducts.slice(0, 5).forEach((p) => {
    const sub = p.subCategory?.name ?? '—'
    const third = p.thirdCategory?.name ?? '—'
    console.log(`   - ${p.name}`)
    console.log(`     ${sub} → ${third}`)
  })
  if (balloonProducts.length > 5) {
    console.log(`   … and ${balloonProducts.length - 5} more`)
  }

  await mongoose.disconnect()
  console.log('\nDone.')
}

seed().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
