require('dotenv').config()
const mongoose = require('mongoose')

const mainCategories = require('./src/utils/mainCategories.json')
const subCategories = require('./src/utils/subCategories.json')
const thirdCategories = require('./src/utils/thirdSubCategories.json')

const MainCategory = require('./src/models/main-category-model')
const SubCategory = require('./src/models/sub-category-model')
const ThirdCategory = require('./src/models/third-category-model')

const toObjectId = (val) => {
  if (!val) return undefined
  if (typeof val === 'string') return new mongoose.Types.ObjectId(val)
  if (val.$oid) return new mongoose.Types.ObjectId(val.$oid)
  return val
}

const toDate = (val) => {
  if (!val) return undefined
  if (val.$date) return new Date(val.$date)
  return new Date(val)
}

const transformMain = (doc) => ({
  _id: toObjectId(doc._id),
  name: doc.name,
  bannerImage: doc.bannerImage || null,
  createdAt: toDate(doc.createdAt),
  updatedAt: toDate(doc.updatedAt),
  __v: doc.__v || 0
})

const transformSub = (doc) => ({
  _id: toObjectId(doc._id),
  name: doc.name,
  mainCategory: toObjectId(doc.mainCategory),
  bannerImage: doc.bannerImage || null,
  createdAt: toDate(doc.createdAt),
  updatedAt: toDate(doc.updatedAt),
  __v: doc.__v || 0
})

const transformThird = (doc) => ({
  _id: toObjectId(doc._id),
  name: doc.name,
  subCategory: toObjectId(doc.subCategory),
  bannerImage: doc.bannerImage || null,
  createdAt: toDate(doc.createdAt),
  updatedAt: toDate(doc.updatedAt),
  __v: doc.__v || 0
})

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  // Insert main categories
  const mainResult = await MainCategory.insertMany(mainCategories.map(transformMain), { ordered: false }).catch(e => {
    if (e.code === 11000) { console.log('Some main categories already exist, skipping duplicates') }
    else throw e
  })
  console.log(`Main categories inserted: ${mainResult?.length ?? 0}`)

  // Insert sub categories
  const subResult = await SubCategory.insertMany(subCategories.map(transformSub), { ordered: false }).catch(e => {
    if (e.code === 11000) { console.log('Some sub categories already exist, skipping duplicates') }
    else throw e
  })
  console.log(`Sub categories inserted: ${subResult?.length ?? 0}`)

  // Insert third categories
  const thirdResult = await ThirdCategory.insertMany(thirdCategories.map(transformThird), { ordered: false }).catch(e => {
    if (e.code === 11000) { console.log('Some third categories already exist, skipping duplicates') }
    else throw e
  })
  console.log(`Third categories inserted: ${thirdResult?.length ?? 0}`)

  await mongoose.disconnect()
  console.log('Done!')
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
