const MainCategory = require('../models/main-category-model')
const SubCategory = require('../models/sub-category-model')
const ThirdCategory = require('../models/third-category-model')
const HeroBanner = require('../models/hero-banner-model')
const {
  CORPORATE_MAIN_CATEGORY_NAME,
  DEFAULT_HERO,
  DEFAULT_STATS,
  CELEBRATE_IMAGE_POOL,
  GALLERY_IMAGE_POOL,
  GALLERY_FILTERS,
  GALLERY_IMAGES_BY_FILTER,
  GALLERY_BENTO_SLOTS,
  MAX_CELEBRATE_CARDS,
  slugifyName,
  pickImage,
} = require('../utils/corporatePageConfig')

function resolveImageUrl(raw) {
  if (!raw || !String(raw).trim()) return null
  const s = String(raw).trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  const base = process.env.API_PUBLIC_URL || process.env.BACKEND_URL || ''
  if (!base) return null
  return `${base.replace(/\/$/, '')}/${s.replace(/^\//, '')}`
}

function isUsableGalleryUrl(url) {
  if (!url || !String(url).trim()) return false
  return /^https?:\/\//i.test(String(url).trim())
}

async function bannersForPlacement(placement) {
  return HeroBanner.find({ placement, isActive: { $ne: false } })
    .sort({ sortOrder: 1, createdAt: -1 })
    .populate({ path: 'thirdCategory', populate: { path: 'subCategory', populate: 'mainCategory' } })
    .populate({ path: 'subCategory', populate: 'mainCategory' })
    .lean()
}

function bannerHref(banner, mainSlug) {
  const tc = banner.thirdCategory
  if (tc && typeof tc === 'object' && tc.name) {
    const sub = tc.subCategory
    const subName = typeof sub === 'object' && sub?.name ? sub.name : null
    if (subName) {
      return `/categories/${mainSlug}/${slugifyName(subName)}/${slugifyName(tc.name)}`
    }
  }
  const sc = banner.subCategory
  if (sc && typeof sc === 'object' && sc.name) {
    return `/categories/${mainSlug}/${slugifyName(sc.name)}`
  }
  return `/categories/${mainSlug}`
}

async function buildCelebrateCards(mainDoc) {
  const mainSlug = slugifyName(mainDoc.name)
  const subs = await SubCategory.find({ mainCategory: mainDoc._id }).sort({ name: 1 }).lean()
  const items = []

  for (const sub of subs) {
    if (items.length >= MAX_CELEBRATE_CARDS) break
    const subSlug = slugifyName(sub.name)
    items.push({
      id: String(sub._id),
      name: sub.name,
      image: resolveImageUrl(sub.bannerImage) || pickImage(CELEBRATE_IMAGE_POOL, sub.name),
      href: `/categories/${mainSlug}/${subSlug}`,
      kind: 'sub',
    })
  }

  for (const sub of subs) {
    if (items.length >= MAX_CELEBRATE_CARDS) break
    const thirds = await ThirdCategory.find({ subCategory: sub._id }).sort({ name: 1 }).lean()
    const subSlug = slugifyName(sub.name)
    for (const third of thirds) {
      if (items.length >= MAX_CELEBRATE_CARDS) break
      items.push({
        id: String(third._id),
        name: third.name,
        image: resolveImageUrl(third.bannerImage) || pickImage(CELEBRATE_IMAGE_POOL, third.name),
        href: `/categories/${mainSlug}/${subSlug}/${slugifyName(third.name)}`,
        kind: 'third',
      })
    }
  }

  return items
}

function matchGalleryFilter(title) {
  if (!title) return null
  const t = String(title).trim()
  return GALLERY_FILTERS.find((f) => f.toLowerCase() === t.toLowerCase()) || null
}

async function buildGallery(mainDoc, mainSlug) {
  const items = []
  const cmsByFilter = Object.fromEntries(GALLERY_FILTERS.map((f) => [f, []]))

  const banners = await bannersForPlacement('corporate_gallery')
  for (const b of banners) {
    const filter = matchGalleryFilter(b.title) || GALLERY_FILTERS[0]
    const resolved = resolveImageUrl(b.image)
    if (!isUsableGalleryUrl(resolved)) continue
    cmsByFilter[filter].push({
      id: String(b._id),
      image: resolved,
      label: b.title || filter,
      filter,
      tags: [filter],
      href: bannerHref(b, mainSlug),
    })
  }

  for (const filter of GALLERY_FILTERS) {
    const urls = GALLERY_IMAGES_BY_FILTER[filter] || GALLERY_IMAGE_POOL
    const cms = cmsByFilter[filter] || []
    for (let slot = 0; slot < GALLERY_BENTO_SLOTS; slot++) {
      const cmsItem = cms[slot]
      const fallbackUrl = urls[slot % urls.length]
      const cmsUrl = cmsItem && isUsableGalleryUrl(cmsItem.image) ? cmsItem.image : null
      items.push({
        id: cmsItem?.id || `gallery-${slugifyName(filter)}-${slot}`,
        image: cmsUrl || fallbackUrl,
        label: cmsItem?.label || filter,
        filter,
        tags: [filter],
        href: cmsItem?.href || `/categories/${mainSlug}`,
      })
    }
  }

  return items
}

async function buildGifting(mainDoc, mainSlug) {
  const items = []
  const seen = new Set()

  const pushItem = (entry) => {
    if (!entry?.id || seen.has(entry.id)) return
    seen.add(entry.id)
    items.push(entry)
  }

  const banners = await bannersForPlacement('corporate_gifting')
  for (const b of banners) {
    const resolved = resolveImageUrl(b.image)
    pushItem({
      id: String(b._id),
      image: isUsableGalleryUrl(resolved) ? resolved : pickImage(CELEBRATE_IMAGE_POOL, b._id),
      title: b.title || b.thirdCategory?.name || 'Corporate gifting',
      href: bannerHref(b, mainSlug),
    })
  }

  const subs = await SubCategory.find({ mainCategory: mainDoc._id }).sort({ name: 1 }).lean()
  for (const sub of subs) {
    const subSlug = slugifyName(sub.name)
    const subImg = resolveImageUrl(sub.bannerImage)
    pushItem({
      id: `sub-${sub._id}`,
      image: isUsableGalleryUrl(subImg) ? subImg : pickImage(CELEBRATE_IMAGE_POOL, sub.name),
      title: sub.name,
      href: `/categories/${mainSlug}/${subSlug}`,
    })

    const thirds = await ThirdCategory.find({ subCategory: sub._id }).sort({ name: 1 }).lean()
    for (const third of thirds) {
      const thirdImg = resolveImageUrl(third.bannerImage)
      pushItem({
        id: `third-${third._id}`,
        image: isUsableGalleryUrl(thirdImg) ? thirdImg : pickImage(CELEBRATE_IMAGE_POOL, third.name),
        title: third.name,
        href: `/categories/${mainSlug}/${subSlug}/${slugifyName(third.name)}`,
      })
    }
  }

  if (items.length === 0) {
    CELEBRATE_IMAGE_POOL.slice(0, 6).forEach((url, i) => {
      pushItem({
        id: `gifting-fb-${i}`,
        image: url,
        title: 'Corporate gifting',
        href: `/categories/${mainSlug}`,
      })
    })
  }

  return items
}

const getCorporatePage = async () => {
  const mainDoc = await MainCategory.findOne({
    name: { $regex: new RegExp(`^${CORPORATE_MAIN_CATEGORY_NAME}$`, 'i') },
  }).lean()

  if (!mainDoc) {
    return {
      hero: DEFAULT_HERO,
      celebrate: {
        heading: 'We Help Celebrate',
        subtitle:
          'We are thrilled to offer a range of exceptional services and experienced professionals for your party.',
        items: [],
      },
      stats: DEFAULT_STATS,
      gallery: { heading: 'Our Gallery', filters: GALLERY_FILTERS, items: [] },
      gifting: { heading: 'CORPORATE GIFTING', items: [] },
      mainCategorySlug: 'corporate-events',
    }
  }

  const mainSlug = slugifyName(mainDoc.name)
  const heroBanners = await bannersForPlacement('corporate_hero')
  const heroBanner = heroBanners[0]
  const hero = {
    title: heroBanner?.title?.trim() || DEFAULT_HERO.title,
    subtitle: DEFAULT_HERO.subtitle,
    image: resolveImageUrl(heroBanner?.image) || DEFAULT_HERO.image,
  }

  const [celebrateItems, galleryItems, giftingItems] = await Promise.all([
    buildCelebrateCards(mainDoc),
    buildGallery(mainDoc, mainSlug),
    buildGifting(mainDoc, mainSlug),
  ])

  return {
    hero,
    celebrate: {
      heading: 'We Help Celebrate',
      subtitle:
        'We are thrilled to offer a range of exceptional services and experienced professionals for your party.',
      items: celebrateItems,
    },
    stats: DEFAULT_STATS,
    gallery: {
      heading: 'Our Gallery',
      filters: GALLERY_FILTERS,
      items: galleryItems,
    },
    gifting: {
      heading: 'CORPORATE GIFTING',
      items: giftingItems,
    },
    mainCategorySlug: mainSlug,
  }
}

module.exports = { getCorporatePage }
