/**
 * Seeds main → sub → third categories from structured data (no fixed ObjectIds).
 * Uses the same Mongoose models as the API (MainCategory, SubCategory, ThirdCategory).
 *
 * Run: npm run seed:categories
 * Optional sample data: npm run seed:dummy (after categories). Both: npm run seed:all
 * Requires MONGODB_URI in .env
 *
 * This clears existing rows in those three collections before insert. Existing
 * products or other documents that reference old category _ids will need a data fix.
 */
require('dotenv').config()
const path = require('path')
const fs = require('fs')
const mongoose = require('mongoose')

const MainCategory = require('./src/models/main-category-model')
const SubCategory = require('./src/models/sub-category-model')
const ThirdCategory = require('./src/models/third-category-model')

const dataPath = path.join(__dirname, 'src', 'utils', 'fullCategoryHierarchy.json')
const hierarchy = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set (check .env)')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  await ThirdCategory.deleteMany({})
  await SubCategory.deleteMany({})
  await MainCategory.deleteMany({})

  let mainCount = 0
  let subCount = 0
  let thirdCount = 0

  for (const cat of hierarchy) {
    const createdMain = await MainCategory.create({ name: cat.name })
    mainCount += 1

    for (const sub of cat.subs) {
      const createdSub = await SubCategory.create({
        name: sub.name,
        mainCategory: createdMain._id
      })
      subCount += 1

      const thirdDocs = sub.items.map((item) => ({
        name: item,
        subCategory: createdSub._id
      }))

      if (thirdDocs.length) {
        await ThirdCategory.insertMany(thirdDocs)
        thirdCount += thirdDocs.length
      }
    }
  }

  console.log(`Main categories: ${mainCount}`)
  console.log(`Subcategories: ${subCount}`)
  console.log(`Third categories: ${thirdCount}`)

  await mongoose.disconnect()
  console.log('Full category hierarchy seeded.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
