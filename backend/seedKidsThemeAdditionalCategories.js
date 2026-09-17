/**
 * Upsert Kid's Celebration additional categories (Girls / Boys → theme cards)
 * used by the guest home “Kid's Theme Decoration” marquee.
 *
 * Guest images live in dkg_guest/public/Additional-Categories and are applied
 * by src/data/kidsThemeDecorationSeed.ts — this script only creates the linked
 * category tree (bannerImage is cleared so old raw photos are not served).
 *
 *   node seedKidsThemeAdditionalCategories.js
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
require('dotenv').config({ path: path.join(__dirname, 'src/.env') })
const mongoose = require('mongoose')

const MainCategory = require('./src/models/main-category-model')
const SubCategory = require('./src/models/sub-category-model')
const ThirdCategory = require('./src/models/third-category-model')
const AdditionalCategory = require('./src/models/additional-category-model')

const MAIN_NAMES = ["Kid's Celebration", 'Kids Celebration']
const SUB_NAME = 'Requirement'
const THIRD_NAME = 'Decorations'

/** Keep in sync with dkg_guest/src/data/kidsThemeDecorationSeed.ts */
const THEMES = [
  { name: 'Pink Elephant', parentLabel: 'Girls' },
  { name: 'Fairies', parentLabel: 'Girls' },
  { name: 'Snow White', parentLabel: 'Girls' },
  { name: 'Mira Royal Detective', parentLabel: 'Girls' },
  { name: 'Boss Baby', parentLabel: 'Boys' },
  { name: 'Spider-Man', parentLabel: 'Boys' },
  { name: 'Airplane', parentLabel: 'Boys' },
  { name: 'Peppa Pig', parentLabel: 'Girls' },
  { name: 'Donuts', parentLabel: 'Girls' },
  { name: 'Dinosaur', parentLabel: 'Boys' },
  { name: 'Baby Shark', parentLabel: 'Girls' },
  { name: 'Cars', parentLabel: 'Boys' },
  { name: 'Mickey Mouse', parentLabel: 'Boys' },
  { name: 'Soccer', parentLabel: 'Boys' },
  { name: 'Harry Potter', parentLabel: 'Boys' },
  { name: 'Avengers', parentLabel: 'Boys' },
  { name: 'Teddy Bear', parentLabel: 'Girls' },
  { name: 'Space', parentLabel: 'Boys' },
  { name: 'Mermaid', parentLabel: 'Girls' },
  { name: 'Disney Friends', parentLabel: 'Girls' },
  { name: 'Tropical', parentLabel: 'Girls' },
  { name: 'Pokemon', parentLabel: 'Boys' },
  { name: 'Sonic', parentLabel: 'Boys' },
  { name: 'Doraemon', parentLabel: 'Boys' },
  { name: 'Frozen', parentLabel: 'Girls' },
  { name: 'Barbie', parentLabel: 'Girls' },
  { name: 'Disney Princess', parentLabel: 'Girls' },
  { name: 'Hot Air Balloon', parentLabel: 'Boys' },
  { name: 'Unicorn', parentLabel: 'Girls' },
  { name: 'Moana', parentLabel: 'Girls' },
  { name: 'Dora the Explorer', parentLabel: 'Girls' },
  { name: 'Cocomelon', parentLabel: 'Boys' },
  { name: 'Candy Land', parentLabel: 'Girls' },
  { name: "Butterbean's Cafe", parentLabel: 'Girls' },
  { name: 'Panda', parentLabel: 'Boys' },
  { name: 'Chipmunks', parentLabel: 'Boys' },
  { name: 'Fruits', parentLabel: 'Girls' },
  { name: 'Boss Baby Girl', parentLabel: 'Girls' },
  { name: 'Finding Nemo', parentLabel: 'Boys' },
  { name: 'Jungle Safari', parentLabel: 'Boys' },
  { name: 'Cocomelon Party', parentLabel: 'Boys' },
  { name: 'Construction', parentLabel: 'Boys' },
  { name: 'Boss Baby Team', parentLabel: 'Boys' },
  { name: 'Duckling', parentLabel: 'Girls' },
  { name: 'Baby Duck', parentLabel: 'Girls' },
  { name: 'Hello Kitty', parentLabel: 'Girls' },
  { name: 'Butterfly', parentLabel: 'Girls' },
  { name: 'Circus', parentLabel: 'Boys' },
  { name: 'Flamingo', parentLabel: 'Girls' },
  { name: 'Alice in Wonderland', parentLabel: 'Girls' },
  { name: 'Candy House', parentLabel: 'Girls' },
  { name: 'Paw Patrol', parentLabel: 'Boys' },
]

function kidsMainQuery() {
  return {
    $or: MAIN_NAMES.map((name) => ({ name })),
  }
}

async function findOrCreateMain() {
  let main = await MainCategory.findOne(kidsMainQuery())
  if (!main) {
    main = await MainCategory.create({ name: MAIN_NAMES[0] })
    console.log(`Created main category: ${main.name}`)
  }
  return main
}

async function findOrCreateSub(main) {
  let sub = await SubCategory.findOne({
    mainCategory: main._id,
    name: SUB_NAME,
  })
  if (!sub) {
    sub = await SubCategory.create({
      name: SUB_NAME,
      mainCategory: main._id,
    })
    console.log(`Created sub category: ${SUB_NAME}`)
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
    })
    console.log(`Created third category: ${THIRD_NAME}`)
  }
  return third
}

async function findOrCreateAdditional({ name, parentId, parentModel, level }) {
  let doc = await AdditionalCategory.findOne({
    name,
    parentCategory: parentId,
    parentModel,
  })
  if (!doc) {
    doc = await AdditionalCategory.create({
      name,
      parentCategory: parentId,
      parentModel,
      level,
      bannerImage: null,
    })
    console.log(`Created additional category (${level}): ${name}`)
    return doc
  }

  if (doc.bannerImage) {
    doc.bannerImage = null
    await doc.save()
    console.log(`Cleared bannerImage on: ${name}`)
  }
  return doc
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

  const girls = await findOrCreateAdditional({
    name: 'Girls',
    parentId: third._id,
    parentModel: 'ThirdCategory',
    level: 4,
  })
  const boys = await findOrCreateAdditional({
    name: 'Boys',
    parentId: third._id,
    parentModel: 'ThirdCategory',
    level: 4,
  })

  const parents = { Girls: girls, Boys: boys }
  let created = 0
  let updated = 0

  for (const theme of THEMES) {
    const parent = parents[theme.parentLabel]
    const before = await AdditionalCategory.findOne({
      name: theme.name,
      parentCategory: parent._id,
      parentModel: 'AdditionalCategory',
    })
    await findOrCreateAdditional({
      name: theme.name,
      parentId: parent._id,
      parentModel: 'AdditionalCategory',
      level: 5,
    })
    if (before) updated += 1
    else created += 1
  }

  console.log(
    `Done. Themes created: ${created}, already present: ${updated}. Parent: ${main.name} → ${SUB_NAME} → ${THIRD_NAME} → Girls/Boys`
  )
}

run()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {})
  })
