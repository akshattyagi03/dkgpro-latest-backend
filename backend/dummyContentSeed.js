/**
 * Inserts catalog-style sample data for local/demo use:
 *   - 6–8 products per third category (realistic names/copy; `catalogSeed` for cleanup only, stripped in API JSON)
 *   - 6–8 additional products per subcategory (round-robin third refs; same copy quality)
 *   - Two blogs and two venues (editorial / venue prose, no [SEED] in customer-facing titles)
 *
 * Product fields align with dkg_admin `ProductModal` / POST /admins/addproducts (FormModals.tsx).
 *
 * Prerequisites:
 *   - MONGODB_URI in .env
 *   - Category tree (npm run seed:categories)
 *   - An Admin user, or SEED_DUMMY_ADMIN_EMAIL + SEED_DUMMY_ADMIN_PASSWORD
 *
 * Run: npm run seed:dummy
 */
require('dotenv').config()
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const mongoose = require('mongoose')

const Product = require('./src/models/product-model')
const Blog = require('./src/models/blog-model')
const Venue = require('./src/models/venue-model')
const Admin = require('./src/models/admin-model')
const MainCategory = require('./src/models/main-category-model')
const SubCategory = require('./src/models/sub-category-model')
const ThirdCategory = require('./src/models/third-category-model')
const { buildCatalogSeedProductDoc, placeholderImage } = require('./src/utils/catalogSeedProductCopy')

const BLOG_SLUGS = ['catalog-seed-celebration-playbook', 'catalog-seed-gift-playbook']
const LEGACY_BLOG_SLUGS = [
  'seed-dummy-planning-memorable-celebrations',
  'seed-dummy-gift-ideas-they-will-love'
]

const VENUE_NAMES = ['The Skyline Rooftop — Lower Parel, Mumbai', 'Grand MG Residency Banquet — Bengaluru']
const LEGACY_VENUE_NAMES = ['[SEED] Rooftop Garden Lounge', '[SEED] Boutique Banquet Hall']

const hierarchyPath = path.join(__dirname, 'src', 'utils', 'fullCategoryHierarchy.json')

function countInRange(min, max, salt) {
  const span = max - min + 1
  const b = crypto.createHash('md5').update(String(salt)).digest()
  return min + (b[0] % span)
}

async function getOrCreateAdmin() {
  let admin = await Admin.findOne().sort({ createdAt: 1 })
  if (admin) return admin

  const email = process.env.SEED_DUMMY_ADMIN_EMAIL
  const password = process.env.SEED_DUMMY_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error(
      'No Admin user in the database. Create one in the app, or set SEED_DUMMY_ADMIN_EMAIL and SEED_DUMMY_ADMIN_PASSWORD in .env to let this script create a seed admin.'
    )
  }

  admin = await Admin.create({
    fullName: 'Seed Admin',
    email,
    password,
    isApproved: true
  })
  console.log('Created seed admin:', email)
  return admin
}

async function removeOldDummy() {
  const legacyTagQuery = { tags: { $in: ['seed-dummy', 'seed-third-pack', 'seed-sub-bundle'] } }
  const seedProductQuery = { $or: [{ catalogSeed: true }, legacyTagQuery] }

  const oldProductIds = await Product.find(seedProductQuery).distinct('_id')
  if (oldProductIds.length) {
    await Admin.updateMany({ products: { $in: oldProductIds } }, { $pullAll: { products: oldProductIds } })
  }
  await Product.deleteMany(seedProductQuery)

  const allBlogSlugs = [...BLOG_SLUGS, ...LEGACY_BLOG_SLUGS]
  const oldBlogIds = await Blog.find({ slug: { $in: allBlogSlugs } }).distinct('_id')
  if (oldBlogIds.length) {
    await Admin.updateMany({ blogs: { $in: oldBlogIds } }, { $pullAll: { blogs: oldBlogIds } })
  }
  await Blog.deleteMany({ slug: { $in: allBlogSlugs } })

  await Venue.deleteMany({ name: { $in: [...VENUE_NAMES, ...LEGACY_VENUE_NAMES] } })
}

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set (check .env)')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const admin = await getOrCreateAdmin()
  await removeOldDummy()

  const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'))
  const mainByName = new Map((await MainCategory.find().lean()).map((m) => [m.name, m]))

  const productRows = []
  let index = 0
  let thirdPackCount = 0
  let subBundleCount = 0

  for (const main of hierarchy) {
    const mainDoc = mainByName.get(main.name)
    if (!mainDoc) {
      throw new Error(`Main category "${main.name}" not found. Run npm run seed:categories first.`)
    }

    const subsForMain = await SubCategory.find({ mainCategory: mainDoc._id }).lean()
    const subByName = new Map(subsForMain.map((s) => [s.name, s]))

    for (const sub of main.subs) {
      const subDoc = subByName.get(sub.name)
      if (!subDoc) {
        throw new Error(`Sub category "${sub.name}" under "${main.name}" not found.`)
      }

      const thirds = await ThirdCategory.find({ subCategory: subDoc._id }).lean()
      const thirdByName = new Map(thirds.map((t) => [t.name, t]))

      const thirdOrder = []
      for (const itemName of sub.items) {
        const t = thirdByName.get(itemName)
        if (!t) {
          throw new Error(`Third category "${itemName}" under "${sub.name}" not found.`)
        }
        thirdOrder.push(t)
      }

      for (const thirdDoc of thirdOrder) {
        const itemName = thirdDoc.name
        const nThird = countInRange(6, 8, `${main.name}|${sub.name}|${itemName}|third-pack`)
        thirdPackCount += nThird
        for (let v = 1; v <= nThird; v++) {
          productRows.push(
            buildCatalogSeedProductDoc({
              mainName: main.name,
              subName: sub.name,
              itemName,
              mainId: mainDoc._id,
              subId: subDoc._id,
              thirdId: thirdDoc._id,
              adminId: admin._id,
              index,
              seedKind: 'third',
              variantNum: v,
              variantTotal: nThird
            })
          )
          index += 1
        }
      }

      const nSub = countInRange(6, 8, `${main.name}|${sub.name}|sub-bundle`)
      subBundleCount += nSub
      for (let j = 1; j <= nSub; j++) {
        const pick = thirdOrder[(j - 1) % thirdOrder.length]
        productRows.push(
          buildCatalogSeedProductDoc({
            mainName: main.name,
            subName: sub.name,
            itemName: pick.name,
            mainId: mainDoc._id,
            subId: subDoc._id,
            thirdId: pick._id,
            adminId: admin._id,
            index,
            seedKind: 'sub',
            variantNum: j,
            variantTotal: nSub
          })
        )
        index += 1
      }
    }
  }

  const insertedProducts = await Product.insertMany(productRows, { ordered: true })

  const blogExcerpt =
    'Short, practical ideas you can use this week to make birthdays and anniversaries feel special without a huge budget.'
  const longContent = `
<h2>Start with the mood</h2>
<p>Lighting and music change everything. Even at home, string lights and a playlist beat an expensive venue with no atmosphere.</p>
<h2>Personal beats perfect</h2>
<p>A handwritten note, their favorite snack, or a slideshow of memories often lands better than a generic gift pile.</p>
<h2>Plan one hero moment</h2>
<p>Pick a single surprise—cake reveal, video from friends, or a small performance—instead of stacking ten half-baked ideas.</p>
<p>Repeat visits build trust; small consistent touches beat one-off extravagance.</p>
`.trim()

  const [blog1, blog2] = await Blog.create([
    {
      title: 'How to plan a celebration guests still talk about next year',
      slug: BLOG_SLUGS[0],
      excerpt: blogExcerpt.slice(0, 300),
      content: longContent,
      featuredImage: placeholderImage('dkgblogcelebration'),
      author: admin._id,
      category: 'Celebrations',
      tags: ['celebrations', 'planning', 'checklist'],
      published: true,
      publishedAt: new Date(),
      readingTime: 3,
      metaTitle: 'Celebration planning playbook',
      metaDescription: blogExcerpt.slice(0, 160)
    },
    {
      title: 'Gift ideas that feel personal (not last-minute generic)',
      slug: BLOG_SLUGS[1],
      excerpt:
        'From experience vouchers to personalized keepsakes, here is a simple framework for choosing gifts that feel thoughtful, not random.',
      content:
        longContent +
        '\n<h2>Experiences over clutter</h2><p>When in doubt, time together wins over another gadget.</p>',
      featuredImage: placeholderImage('dkgbloggifts'),
      author: admin._id,
      category: 'Gifts',
      tags: ['gifts', 'ideas', 'personalization'],
      published: true,
      publishedAt: new Date(),
      readingTime: 4,
      metaTitle: 'Thoughtful gift ideas',
      metaDescription: 'A short guide to picking gifts that feel personal and useful.'
    }
  ])

  const [venue1, venue2] = await Venue.create([
    {
      name: VENUE_NAMES[0],
      location: {
        address: 'Skyline Towers, Senapati Bapat Marg, Lower Parel, Mumbai 400013',
        lat: 18.9984,
        lng: 72.8277
      },
      images: [placeholderImage('dkgvenueskylinea'), placeholderImage('dkgvenueskylineb')],
      description:
        'Perched above the city with unobstructed western views, this rooftop is built for intimate dinners, proposals, and milestone toasts. ' +
        'Glass railings, warm wash lighting, and a flexible floor plan let you switch from seated service to a small dance pocket without a full room flip. ' +
        'In-house AV supports speeches and playlists; the events team handles rain contingency with an indoor holding lounge on the same floor.',
      capacity: { min: 10, max: 80 },
      startingPrice: 35000,
      typesOfVenues: ['Rooftop', 'Banquet'],
      accessibilityFeatures: ['Elevator access', 'Wheelchair-friendly washrooms'],
      facilities: ['Parking', 'AV system', 'Green room', 'Generator backup'],
      restrictions: ['Outdoor music curfew as per municipal norms', 'Pyrotechnics require prior written approval'],
      otherInformation: {
        inHouseDecor: true,
        advanceBookingWeeks: 3
      },
      supportedEvents: ['Anniversary dinner', 'Birthday party', 'Corporate mixer', 'Product launch'],
      ratings: { average: 4.6, count: 12 }
    },
    {
      name: VENUE_NAMES[1],
      location: {
        address: 'MG Road, Bengaluru 560001 (near Trinity Metro)',
        lat: 12.9716,
        lng: 77.5946
      },
      images: [placeholderImage('dkgvenuegrandmg')],
      description:
        'A column-free banquet hall with a built-in stage, warm cove lighting, and pre-wired sound for anchors and live bands. ' +
        'Bridal suites and groom holding rooms sit on the same level for quick cues. The kitchen pass supports plated service or live counters; ' +
        'valet and luggage assistance are bundled for weekend wedding blocks.',
      capacity: { min: 40, max: 200 },
      startingPrice: 55000,
      typesOfVenues: ['Banquet hall', 'Indoor'],
      accessibilityFeatures: ['Ramp at entrance', 'Accessible parking bays'],
      facilities: ['Stage', 'Catering kitchen', 'Valet', 'Bridal room'],
      restrictions: ['Outside caterers require kitchen walk-through 7 days prior'],
      otherInformation: {
        inHouseDecor: false,
        advanceBookingWeeks: 4
      },
      supportedEvents: ['Wedding reception', 'Annual day', 'Product launch', 'Award night'],
      ratings: { average: 4.3, count: 28 }
    }
  ])

  await Admin.findByIdAndUpdate(admin._id, {
    $addToSet: {
      products: { $each: insertedProducts.map((p) => p._id) },
      blogs: { $each: [blog1._id, blog2._id] }
    }
  })

  console.log(
    `Products seeded: ${insertedProducts.length} (${thirdPackCount} third-category listings, ${subBundleCount} sub-category bundles). catalogSeed hidden in API JSON.`
  )
  console.log('Blogs:', blog1.slug, blog2.slug)
  console.log('Venues:', venue1.name, '|', venue2.name)

  await mongoose.disconnect()
  console.log('Dummy content seed finished.')
}

seed().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
