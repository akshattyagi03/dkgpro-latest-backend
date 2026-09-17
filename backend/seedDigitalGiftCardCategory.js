/**
 * Upsert Gifts › DIGITAL GIFTS › Digital Gift Card so admins can upload
 * personalized gift-card products (baby name, birthday, foam-board size).
 *
 *   node seedDigitalGiftCardCategory.js
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
require('dotenv').config({ path: path.join(__dirname, 'src/.env') })
const mongoose = require('mongoose')

const MainCategory = require('./src/models/main-category-model')
const SubCategory = require('./src/models/sub-category-model')
const ThirdCategory = require('./src/models/third-category-model')

const MAIN_NAMES = ['Gifts', 'GIFTS']
const SUB_NAMES = ['DIGITAL GIFTS', 'Digital Gifts']
const THIRD_NAME = 'Digital Gift Card'

const DEFAULT_GIFT_CARD_SELECTION = {
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
      giftCardSelection: DEFAULT_GIFT_CARD_SELECTION,
    })
    console.log(`Created third category: ${THIRD_NAME}`)
    return third
  }

  if (!third.giftCardSelection || !third.giftCardSelection.sizes?.length) {
    third.giftCardSelection = DEFAULT_GIFT_CARD_SELECTION
    await third.save()
    console.log(`Set default gift-card sizes on: ${THIRD_NAME}`)
  } else {
    third.giftCardSelection = DEFAULT_GIFT_CARD_SELECTION
    await third.save()
    console.log(`Updated gift-card size prices on: ${THIRD_NAME}`)
  }
  return third
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

  console.log(
    `Ready: ${main.name} › ${sub.name} › ${third.name} (${third._id})`
  )
  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
