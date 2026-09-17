const ServicePage = require('../models/service-page-model')
const Product = require('../models/product-model')
const {
  SERVICE_KEYS,
  SERVICE_META,
  isValidServiceKey,
  resolveServiceKeyFromSlug,
} = require('../utils/servicePageConfig')

function resolveImageUrl(raw) {
  if (!raw || !String(raw).trim()) return null
  const s = String(raw).trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  const base = process.env.API_PUBLIC_URL || process.env.BACKEND_URL || ''
  if (!base) return s.startsWith('/') ? s : `/${s}`
  return `${base.replace(/\/$/, '')}/${s.replace(/^\//, '')}`
}

function normalizeKey(input) {
  const raw = String(input || '').trim()
  if (isValidServiceKey(raw)) return raw
  return resolveServiceKeyFromSlug(raw)
}

function servicePageTag(serviceKey) {
  return `service-page-${serviceKey}`
}

async function ensurePage(serviceKey) {
  let page = await ServicePage.findOne({ serviceKey })
  if (page) return page
  const meta = SERVICE_META[serviceKey]
  page = await ServicePage.create({
    serviceKey,
    title: meta.defaultTitle,
    subtitle: meta.defaultSubtitle,
    heroImage: null,
    items: [],
  })
  return page
}

function serializeProductCard(product) {
  const id = String(product._id)
  const image =
    Array.isArray(product.images) && product.images.length
      ? resolveImageUrl(product.images[0])
      : null
  return {
    id,
    name: product.name,
    description: product.description || '',
    price: product.price,
    discountedPrice: product.discountedPrice ?? null,
    image,
    href: `/product/${encodeURIComponent(id)}`,
    tier: product.tier === 'premium' ? 'premium' : 'standard',
    isFeatured: product.isFeatured === true,
    createdAt: product.createdAt || null,
    averageRating: product.averageRating || 0,
    numReviews: product.numReviews || 0,
  }
}

async function loadTaggedProducts(serviceKey) {
  const products = await Product.find({ tags: servicePageTag(serviceKey) })
    .sort({ isFeatured: -1, createdAt: 1 })
    .limit(24)
    .lean()
  return products.map(serializeProductCard)
}

function serializePage(page, products = []) {
  const meta = SERVICE_META[page.serviceKey]
  const title = (page.title && String(page.title).trim()) || meta.defaultTitle
  const subtitle =
    (page.subtitle && String(page.subtitle).trim()) || meta.defaultSubtitle

  const items = [...(page.items || [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => {
      const productId = item.product ? String(item.product) : null
      return {
        id: String(item._id),
        title: item.title,
        description: item.description || '',
        image: resolveImageUrl(item.image),
        sortOrder: item.sortOrder ?? 0,
        productId,
        href: productId ? `/product/${encodeURIComponent(productId)}` : null,
      }
    })

  return {
    serviceKey: page.serviceKey,
    slug: meta.slug,
    label: meta.label,
    hero: {
      title,
      subtitle,
      image: resolveImageUrl(page.heroImage),
    },
    items,
    products,
    isActive: page.isActive !== false,
    updatedAt: page.updatedAt,
  }
}

/** Guest: GET /users/service-page/:serviceKeyOrSlug */
async function getServicePage(serviceKeyOrSlug) {
  const serviceKey = normalizeKey(serviceKeyOrSlug)
  if (!serviceKey) throw new Error('Invalid service page')

  const page = await ensurePage(serviceKey)
  if (page.isActive === false) throw new Error('Service page is not available')
  const products = await loadTaggedProducts(serviceKey)
  return serializePage(page, products)
}

/** Admin: list all four pages (creates defaults if missing). */
async function listServicePages() {
  const pages = []
  for (const key of SERVICE_KEYS) {
    const page = await ensurePage(key)
    const products = await loadTaggedProducts(key)
    pages.push(serializePage(page, products))
  }
  return pages
}

/** Admin: get one page. */
async function getServicePageAdmin(serviceKeyOrSlug) {
  const serviceKey = normalizeKey(serviceKeyOrSlug)
  if (!serviceKey) throw new Error('Invalid service page')
  const page = await ensurePage(serviceKey)
  const products = await loadTaggedProducts(serviceKey)
  return serializePage(page, products)
}

/**
 * Admin: update hero fields.
 * body: { title?, subtitle?, isActive? }, heroImage optional file URL
 */
async function updateServicePage(serviceKeyOrSlug, body = {}, heroImageUrl) {
  const serviceKey = normalizeKey(serviceKeyOrSlug)
  if (!serviceKey) throw new Error('Invalid service page')

  const page = await ensurePage(serviceKey)

  if (body.title !== undefined) page.title = String(body.title || '').trim()
  if (body.subtitle !== undefined) page.subtitle = String(body.subtitle || '').trim()
  if (body.isActive !== undefined) {
    page.isActive = body.isActive === true || body.isActive === 'true'
  }
  if (heroImageUrl) page.heroImage = heroImageUrl

  await page.save()
  return serializePage(page, await loadTaggedProducts(serviceKey))
}

/** Admin: add gallery/package item with required image. */
async function addServicePageItem(serviceKeyOrSlug, body = {}, imageUrl) {
  const serviceKey = normalizeKey(serviceKeyOrSlug)
  if (!serviceKey) throw new Error('Invalid service page')
  if (!imageUrl) throw new Error('Item image is required')

  const title = String(body.title || '').trim()
  if (!title) throw new Error('Item title is required')

  const page = await ensurePage(serviceKey)
  const sortVal =
    body.sortOrder !== undefined && body.sortOrder !== null && String(body.sortOrder).trim() !== ''
      ? parseInt(String(body.sortOrder), 10)
      : page.items.length
  const sortOrder = Number.isFinite(sortVal) ? sortVal : page.items.length

  page.items.push({
    image: imageUrl,
    title,
    description: String(body.description || '').trim(),
    sortOrder,
  })
  await page.save()
  return serializePage(page, await loadTaggedProducts(serviceKey))
}

/** Admin: update an item (optional new image). */
async function updateServicePageItem(serviceKeyOrSlug, itemId, body = {}, imageUrl) {
  const serviceKey = normalizeKey(serviceKeyOrSlug)
  if (!serviceKey) throw new Error('Invalid service page')

  const page = await ensurePage(serviceKey)
  const item = page.items.id(itemId)
  if (!item) throw new Error('Item not found')

  if (body.title !== undefined) {
    const title = String(body.title || '').trim()
    if (!title) throw new Error('Item title is required')
    item.title = title
  }
  if (body.description !== undefined) {
    item.description = String(body.description || '').trim()
  }
  if (body.sortOrder !== undefined && body.sortOrder !== null && String(body.sortOrder).trim() !== '') {
    const sortVal = parseInt(String(body.sortOrder), 10)
    if (Number.isFinite(sortVal)) item.sortOrder = sortVal
  }
  if (imageUrl) item.image = imageUrl

  await page.save()
  return serializePage(page, await loadTaggedProducts(serviceKey))
}

/** Admin: delete an item. */
async function deleteServicePageItem(serviceKeyOrSlug, itemId) {
  const serviceKey = normalizeKey(serviceKeyOrSlug)
  if (!serviceKey) throw new Error('Invalid service page')

  const page = await ensurePage(serviceKey)
  const item = page.items.id(itemId)
  if (!item) throw new Error('Item not found')
  item.deleteOne()
  await page.save()
  return serializePage(page, await loadTaggedProducts(serviceKey))
}

module.exports = {
  getServicePage,
  listServicePages,
  getServicePageAdmin,
  updateServicePage,
  addServicePageItem,
  updateServicePageItem,
  deleteServicePageItem,
  SERVICE_KEYS,
  SERVICE_META,
}
