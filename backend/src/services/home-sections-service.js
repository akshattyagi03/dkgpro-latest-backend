/**
 * Home page product rows — merged defaults + optional DB overrides per slug.
 * Resolve rules match real Main / Sub / Third category names in Mongo (slugified).
 */
const mongoose = require('mongoose')

const DEFAULT_SECTIONS = [
  {
    slug: 'balloon-ring',
    title: 'Balloon Ring Decoration',
    subtitle:
      'we are thrilled to offer a range of exceptional decoration services tailored to elevate your space.',
    exploreHref: '/categories/decorations/balloon-decorations',
    sortOrder: 10,
    resolve: { kind: 'subByUrlSegment', segment: 'balloon-decorations', mainSegment: 'decorations' }
  },
  {
    slug: 'wedding-decoration',
    title: 'Wedding Decoration',
    subtitle:
      'we are thrilled to offer a range of exceptional decoration services tailored to elevate your space.',
    exploreHref: '/categories/decorations/theme-decorations',
    sortOrder: 20,
    resolve: { kind: 'subByUrlSegment', segment: 'theme-decorations', mainSegment: 'decorations' }
  },
  {
    slug: 'bridal-entry-decoration',
    title: 'Bridal Entry Decoration',
    subtitle:
      'we are thrilled to offer a range of exceptional decoration services tailored to elevate your space.',
    exploreHref: '/categories/decorations/room-decorations',
    sortOrder: 30,
    resolve: { kind: 'subByUrlSegment', segment: 'room-decorations', mainSegment: 'decorations' }
  },
  {
    slug: 'bachelors-party-decoration',
    title: "Bachelor's Party Decoration",
    subtitle:
      'we are thrilled to offer a range of exceptional decoration services tailored to elevate your space.',
    exploreHref: '/categories/occasions/birthday',
    sortOrder: 40,
    resolve: { kind: 'subByUrlSegment', segment: 'birthday', mainSegment: 'occasions' }
  },
  {
    slug: 'anniversary',
    title: 'Anniversary Decoration Surprises',
    subtitle:
      'we are thrilled to offer a range of exceptional decoration services tailored to elevate your space.',
    exploreHref: '/categories/occasions/anniversary',
    sortOrder: 50,
    resolve: { kind: 'subByUrlSegment', segment: 'anniversary', mainSegment: 'occasions' }
  },
  {
    slug: 'rooftop-decoration',
    title: 'Rooftop Decoration At Home',
    subtitle:
      'we are thrilled to offer a range of exceptional decoration services tailored to elevate your space.',
    exploreHref: '/categories/experiences/dining-experiences/rooftop-dining',
    sortOrder: 60,
    resolve: {
      kind: 'thirdByUrlSegment',
      segment: 'rooftop-dining',
      fallback: { kind: 'subByUrlSegment', segment: 'dining-experiences', mainSegment: 'experiences' }
    }
  }
]

function slugifyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
}

const populateProductDeep = (q) =>
  q
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({ path: 'customizationSections.addons.addon' })
    .populate('addedBy')

async function findThirdCategoryByUrlSegment(segment) {
  const ThirdCategory = require('../models/third-category-model')
  const target = String(segment).toLowerCase()
  const all = await ThirdCategory.find({}).select('name').lean()
  for (const tc of all) {
    if (slugifyName(tc.name) === target) {
      return ThirdCategory.findById(tc._id)
    }
  }
  return null
}

async function findMainCategoryByUrlSegment(segment) {
  const MainCategory = require('../models/main-category-model')
  const target = String(segment).toLowerCase()
  const all = await MainCategory.find({}).select('name').lean()
  for (const mc of all) {
    if (slugifyName(mc.name) === target) {
      return MainCategory.findById(mc._id)
    }
  }
  return null
}

async function findSubCategoryByUrlSegment(segment, mainSegment = null) {
  const SubCategory = require('../models/sub-category-model')
  const target = String(segment).toLowerCase()

  let mainId = null
  if (mainSegment) {
    const mc = await findMainCategoryByUrlSegment(mainSegment)
    if (!mc) return null
    mainId = mc._id
  }

  const query = mainId ? { mainCategory: mainId } : {}
  const subs = await SubCategory.find(query).select('name').lean()
  for (const s of subs) {
    if (slugifyName(s.name) === target) {
      return SubCategory.findById(s._id)
    }
  }
  return null
}

function buildCityFilterForSections(city) {
  if (!city || typeof city !== 'string') return {}
  const trimmed = city.trim()
  if (!trimmed) return {}
  if (/^across[\s-]*india$/i.test(trimmed)) return {}
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return { 'serviceableAreas.city': { $regex: escaped, $options: 'i' } }
}

async function fetchProductsForResolve(resolve, limit = 4, city = '') {
  const Product = require('../models/product-model')
  if (!resolve || !resolve.kind) return []

  const cityFilter = buildCityFilterForSections(city)

  if (resolve.kind === 'thirdByUrlSegment') {
    const tc = await findThirdCategoryByUrlSegment(resolve.segment)
    if (!tc) {
      if (resolve.fallback) return fetchProductsForResolve(resolve.fallback, limit, city)
      return []
    }
    const q = Product.find({ thirdCategory: tc._id, ...cityFilter })
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(limit)
    return populateProductDeep(q).exec()
  }

  if (resolve.kind === 'subByUrlSegment') {
    const sub = await findSubCategoryByUrlSegment(resolve.segment, resolve.mainSegment)
    if (!sub) return []
    const q = Product.find({ subCategory: sub._id, ...cityFilter })
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(limit)
    return populateProductDeep(q).exec()
  }

  if (resolve.kind === 'mainByUrlSegment') {
    const mc = await findMainCategoryByUrlSegment(resolve.segment)
    if (!mc) return []
    const q = Product.find({ mainCategory: mc._id, ...cityFilter })
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(limit)
    return populateProductDeep(q).exec()
  }

  return []
}

async function fetchProductsByOrderedIds(ids, city = '') {
  const Product = require('../models/product-model')
  const unique = [...new Set(ids.map((id) => String(id)))].slice(0, 12)
  if (unique.length === 0) return []
  const objectIds = unique
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id))
  const cityFilter = buildCityFilterForSections(city)
  const docs = await populateProductDeep(
    Product.find({ _id: { $in: objectIds }, ...cityFilter })
  ).exec()
  const map = new Map(docs.map((p) => [String(p._id), p]))
  return unique.map((id) => map.get(String(id))).filter(Boolean)
}

/**
 * @returns {Promise<Array<{ slug: string, title: string, subtitle: string, exploreHref: string, sortOrder: number, products: object[] }>>}
 */
async function getMergedHomeProductSections(city = '') {
  const HomeProductSection = require('../models/home-product-section-model')

  let dbRows = []
  try {
    dbRows = await HomeProductSection.find({}).lean()
  } catch (e) {
    dbRows = []
  }

  const dbBySlug = Object.fromEntries(dbRows.map((r) => [r.slug, r]))

  const out = []
  for (const def of [...DEFAULT_SECTIONS].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const row = dbBySlug[def.slug]
    if (row && row.isActive === false) continue

    const title = (row && row.title) || def.title
    const subtitle = (row && row.subtitle) || def.subtitle
    const exploreHref = (row && row.exploreHref) || def.exploreHref
    const sortOrder = row && typeof row.sortOrder === 'number' ? row.sortOrder : def.sortOrder

    let products = []
    if (row && Array.isArray(row.productIds) && row.productIds.length > 0) {
      products = await fetchProductsByOrderedIds(row.productIds, city)
    } else {
      products = await fetchProductsForResolve(def.resolve, 4, city)
    }

    out.push({
      slug: def.slug,
      title,
      subtitle,
      exploreHref,
      sortOrder,
      products
    })
  }

  return out
}

module.exports = {
  getMergedHomeProductSections,
  DEFAULT_SECTIONS
}
