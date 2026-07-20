/**
 * Seeds the four product-detail service pages (Photography, Catering,
 * Games & Activities, Special Effects) with:
 *   - ServicePage CMS hero + package cards
 *   - Real Product documents (tagged for the guest service-page API)
 *   - Category chain: Event Services › {service} › Packages
 *
 * Prerequisites:
 *   - MONGODB_URI in .env
 *   - An Admin user, or SEED_DUMMY_ADMIN_EMAIL + SEED_DUMMY_ADMIN_PASSWORD
 *
 * Run: npm run seed:service-pages
 */
require('dotenv').config()
const mongoose = require('mongoose')

const Product = require('./src/models/product-model')
const Admin = require('./src/models/admin-model')
const MainCategory = require('./src/models/main-category-model')
const SubCategory = require('./src/models/sub-category-model')
const ThirdCategory = require('./src/models/third-category-model')
const ServicePage = require('./src/models/service-page-model')
const { SERVICE_KEYS, SERVICE_META } = require('./src/utils/servicePageConfig')
const {
  buildCatalogSeedProductDoc,
  placeholderImage,
} = require('./src/utils/catalogSeedProductCopy')

const SEED_TAG = 'seed-service-page'
const MAIN_NAME = 'Event Services'
const THIRD_NAME = 'Packages'

/** Per-service package product names (become catalog products + page cards). */
const SERVICE_PRODUCTS = {
  photography: [
    {
      name: 'Candid Wedding Photography',
      description: 'Full-day candid coverage with edited highlights and an online gallery.',
      price: 24999,
    },
    {
      name: 'Birthday Photo Session',
      description: '2-hour birthday shoot with props, basic retouching, and 50 edited photos.',
      price: 7999,
    },
    {
      name: 'Corporate Event Coverage',
      description: 'Conference and launch photography with same-day selects for social media.',
      price: 18999,
    },
    {
      name: 'Couple Pre-Wedding Shoot',
      description: 'Outdoor couple session with two locations and a curated album preview.',
      price: 14999,
    },
  ],
  catering: [
    {
      name: 'Live Counter Party Menu',
      description: 'Live chaat, pasta, and dessert counters for 50 guests with service staff.',
      price: 34999,
    },
    {
      name: 'Corporate Lunch Box Pack',
      description: 'Assorted vegetarian and non-veg lunch boxes with beverages for office events.',
      price: 12999,
    },
    {
      name: 'High Tea Celebration Spread',
      description: 'Finger food, cakes, and tea/coffee service for intimate gatherings.',
      price: 9999,
    },
    {
      name: 'BBQ & Grill Evening Setup',
      description: 'Outdoor grill station with salads and soft drinks for evening parties.',
      price: 27999,
    },
  ],
  games: [
    {
      name: 'Kids Soft Play Zone',
      description: 'Inflatable soft play corner with attendant for kids birthday parties.',
      price: 8999,
    },
    {
      name: 'Adult Party Games Host',
      description: 'Hosted ice-breakers and team games for corporate and private parties.',
      price: 11999,
    },
    {
      name: 'Photo Booth Props Pack',
      description: 'Themed props, backdrop, and attendant for 3 hours of guest photos.',
      price: 5999,
    },
    {
      name: 'VR Gaming Experience',
      description: 'Two VR stations with curated games for teen and adult celebrations.',
      price: 15999,
    },
  ],
  effects: [
    {
      name: 'Cold Spark Entrance',
      description: 'Safe cold-spark fountain pair for grand entrances and cake moments.',
      price: 6999,
    },
    {
      name: 'Fog & Laser Atmosphere Pack',
      description: 'Low fog machine with laser accents for dance floors and reveals.',
      price: 9999,
    },
    {
      name: 'Confetti Cannon Moment',
      description: 'Confetti blast cue for the big reveal — timed with your run of show.',
      price: 4499,
    },
    {
      name: 'LED Wall Backdrop',
      description: 'Modular LED backdrop for stage branding and photo moments.',
      price: 22999,
    },
  ],
}

const HERO_IMAGES = {
  photography: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1600&h=900&fit=crop',
  catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=1600&h=900&fit=crop',
  games: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&h=900&fit=crop',
  effects: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&h=900&fit=crop',
}

function servicePageTag(serviceKey) {
  return `service-page-${serviceKey}`
}

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

async function ensureCategoryChain(serviceKey) {
  const meta = SERVICE_META[serviceKey]
  let main = await MainCategory.findOne({ name: MAIN_NAME })
  if (!main) {
    main = await MainCategory.create({ name: MAIN_NAME })
    console.log('Created main category:', MAIN_NAME)
  }

  let sub = await SubCategory.findOne({ name: meta.label, mainCategory: main._id })
  if (!sub) {
    sub = await SubCategory.create({
      name: meta.label,
      mainCategory: main._id,
      bannerImage: HERO_IMAGES[serviceKey],
    })
    console.log('Created sub category:', meta.label)
  }

  let third = await ThirdCategory.findOne({ name: THIRD_NAME, subCategory: sub._id })
  if (!third) {
    third = await ThirdCategory.create({
      name: THIRD_NAME,
      subCategory: sub._id,
      bannerImage: HERO_IMAGES[serviceKey],
    })
    console.log('Created third category:', meta.label, '›', THIRD_NAME)
  }

  return { main, sub, third }
}

async function removePreviousSeed() {
  const oldIds = await Product.find({ tags: SEED_TAG }).distinct('_id')
  if (oldIds.length) {
    await Admin.updateMany({ products: { $in: oldIds } }, { $pullAll: { products: oldIds } })
    await Product.deleteMany({ _id: { $in: oldIds } })
    console.log(`Removed ${oldIds.length} previous service-page seed product(s).`)
  }
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set (check .env)')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const admin = await getOrCreateAdmin()
  await removePreviousSeed()

  let productCount = 0

  for (const serviceKey of SERVICE_KEYS) {
    const meta = SERVICE_META[serviceKey]
    const packages = SERVICE_PRODUCTS[serviceKey] || []
    const { main, sub, third } = await ensureCategoryChain(serviceKey)
    const pageTag = servicePageTag(serviceKey)

    const createdProducts = []
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i]
      const base = buildCatalogSeedProductDoc({
        mainName: MAIN_NAME,
        subName: meta.label,
        itemName: pkg.name,
        mainId: main._id,
        subId: sub._id,
        thirdId: third._id,
        adminId: admin._id,
        index: i,
        seedKind: 'third',
        variantNum: i + 1,
        variantTotal: packages.length,
      })

      const image = placeholderImage(`${serviceKey}-${i}-${pkg.name}`)
      const doc = {
        ...base,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        discountedPrice: i % 2 === 0 ? Math.round(pkg.price * 0.9) : null,
        images: [image, placeholderImage(`${serviceKey}-${i}-b`)],
        tags: [...new Set([...(base.tags || []), SEED_TAG, pageTag, meta.label])],
        catalogSeed: true,
        isFeatured: i === 0,
      }

      const product = await Product.create(doc)
      createdProducts.push(product)
      productCount += 1
    }

    await Admin.findByIdAndUpdate(admin._id, {
      $addToSet: { products: { $each: createdProducts.map((p) => p._id) } },
    })

    const items = createdProducts.map((p, idx) => ({
      image: p.images?.[0] || placeholderImage(`${serviceKey}-item-${idx}`),
      title: p.name,
      description: p.description,
      sortOrder: idx,
      product: p._id,
    }))

    await ServicePage.findOneAndUpdate(
      { serviceKey },
      {
        serviceKey,
        title: meta.defaultTitle,
        subtitle: meta.defaultSubtitle,
        heroImage: HERO_IMAGES[serviceKey],
        items,
        isActive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    console.log(
      `Seeded ${meta.label}: ${createdProducts.length} products + ServicePage items`
    )
  }

  console.log(`Done. ${productCount} products across ${SERVICE_KEYS.length} service pages.`)
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
