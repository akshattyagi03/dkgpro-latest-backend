const MainCategory = require('../models/main-category-model')
const SubCategory = require('../models/sub-category-model')
const ThirdCategory = require('../models/third-category-model')
const HeroBanner = require('../models/hero-banner-model')
const {
  CORPORATE_MAIN_CATEGORY_NAME,
  DEFAULT_HERO,
  DEFAULT_BOOKING,
  DEFAULT_STATS,
  slugifyName,
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
  if (!subs.length) return []

  const subById = Object.fromEntries(subs.map((s) => [String(s._id), s]))
  const subIds = subs.map((s) => s._id)
  const thirds = await ThirdCategory.find({ subCategory: { $in: subIds } })
    .sort({ name: 1 })
    .lean()

  return thirds.map((third) => {
    const sub = subById[String(third.subCategory)]
    const subSlug = sub ? slugifyName(sub.name) : ''
    const image = resolveImageUrl(third.bannerImage)
    return {
      id: String(third._id),
      name: third.name,
      image: image || null,
      href: `/categories/${mainSlug}/${subSlug}/${slugifyName(third.name)}`,
      kind: 'third',
    }
  })
}

/**
 * Gallery tabs = sub-categories under Corporate Events.
 * Each tab's tiles = third-categories (banner images from admin).
 */
async function buildGallery(mainDoc, mainSlug) {
  const subs = await SubCategory.find({ mainCategory: mainDoc._id }).sort({ name: 1 }).lean()
  if (!subs.length) {
    return { heading: 'Our Gallery', tabs: [] }
  }

  const subIds = subs.map((s) => s._id)
  const thirds = await ThirdCategory.find({ subCategory: { $in: subIds } })
    .sort({ name: 1 })
    .lean()

  const thirdsBySubId = new Map()
  for (const third of thirds) {
    const key = String(third.subCategory)
    if (!thirdsBySubId.has(key)) thirdsBySubId.set(key, [])
    thirdsBySubId.get(key).push(third)
  }

  const tabs = subs
    .map((sub) => {
      const subSlug = slugifyName(sub.name)
      const subThirds = thirdsBySubId.get(String(sub._id)) || []
      const items = subThirds.map((third) => ({
        id: String(third._id),
        name: third.name,
        image: resolveImageUrl(third.bannerImage),
        href: `/categories/${mainSlug}/${subSlug}/${slugifyName(third.name)}`,
      }))

      return {
        id: String(sub._id),
        slug: subSlug,
        name: sub.name,
        items,
      }
    })
    .filter((tab) => tab.items.length > 0)

  return { heading: 'Our Gallery', tabs }
}

/** Hero = active CMS banner with placement `corporate_hero` only (no stock image fallback). */
async function buildHero() {
  const banners = await bannersForPlacement('corporate_hero')
  const banner = banners[0]
  if (!banner) {
    return {
      title: DEFAULT_HERO.title,
      subtitle: DEFAULT_HERO.subtitle,
      image: null,
    }
  }

  const image = resolveImageUrl(banner.image)
  return {
    title: banner.title?.trim() || DEFAULT_HERO.title,
    subtitle: DEFAULT_HERO.subtitle,
    image: isUsableGalleryUrl(image) ? image : null,
  }
}

/**
 * Gifting carousel = all third-level categories under "Corporate Gifting".
 * image is null when no banner — guest shows a name placeholder card (same as category pages).
 */
async function buildGifting(mainDoc, mainSlug) {
  const giftingSub = await SubCategory.findOne({
    mainCategory: mainDoc._id,
    name: { $regex: /^corporate\s*gifting$/i },
  }).lean()

  if (!giftingSub) return []

  const subSlug = slugifyName(giftingSub.name)
  const thirds = await ThirdCategory.find({ subCategory: giftingSub._id })
    .sort({ name: 1 })
    .lean()

  return thirds.map((third) => {
    const image = resolveImageUrl(third.bannerImage)
    return {
      id: String(third._id),
      image: isUsableGalleryUrl(image) ? image : null,
      title: third.name,
      href: `/categories/${mainSlug}/${subSlug}/${slugifyName(third.name)}`,
    }
  })
}

function buildBookingSection() {
  return {
    brandLabel: DEFAULT_BOOKING.brandLabel,
    title: DEFAULT_BOOKING.title,
    description: DEFAULT_BOOKING.description,
    image: DEFAULT_BOOKING.image,
    cta: DEFAULT_BOOKING.cta,
    form: DEFAULT_BOOKING.form,
  }
}

async function resolveBookingBannerImage() {
  const banners = await bannersForPlacement('corporate_booking')
  const banner = banners[0]
  return resolveImageUrl(banner?.image) || null
}

function contactPayloadFromBookingFields(fields) {
  if (!fields || typeof fields !== 'object') {
    throw new Error('Form data is required')
  }

  const firstName = String(fields.firstName || fields.name || '').trim()
  const lastName = String(fields.lastName || '').trim()
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
  const email = String(fields.email || '').trim().toLowerCase()
  const phoneRaw = String(fields.phone || '').replace(/\D/g, '')
  const phone = phoneRaw.length >= 10 ? phoneRaw.slice(-10) : phoneRaw

  if (!name) throw new Error('Name is required')
  if (!email) throw new Error('Email is required')
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new Error('Please use a valid 10-digit Indian mobile number')
  }

  const messageLines = []
  if (fields.company && String(fields.company).trim()) {
    messageLines.push(`Company: ${String(fields.company).trim()}`)
  }
  if (fields.eventDetails && String(fields.eventDetails).trim()) {
    messageLines.push(String(fields.eventDetails).trim())
  }

  const reserved = new Set([
    'firstName',
    'lastName',
    'name',
    'email',
    'phone',
    'company',
    'eventDetails',
  ])
  for (const [key, value] of Object.entries(fields)) {
    if (reserved.has(key)) continue
    const v = value != null ? String(value).trim() : ''
    if (v) messageLines.push(`${key}: ${v}`)
  }

  return {
    name,
    email,
    phone,
    serviceType: 'Corporate Event Booking',
    message: messageLines.join('\n\n') || 'Corporate event inquiry from /corporate-events',
  }
}

const submitCorporateBooking = async (fields) => {
  const { submitContact } = require('./user-services')
  const payload = contactPayloadFromBookingFields(fields)
  return submitContact(payload)
}

const getCorporatePage = async () => {
  const mainDoc = await MainCategory.findOne({
    name: { $regex: new RegExp(`^${CORPORATE_MAIN_CATEGORY_NAME}$`, 'i') },
  }).lean()

  const bookingBannerImage = await resolveBookingBannerImage()
  const bookingBase = buildBookingSection()
  const booking = {
    ...bookingBase,
    image: bookingBannerImage || bookingBase.image,
  }

  if (!mainDoc) {
    return {
      hero: { ...DEFAULT_HERO, image: null },
      booking,
      celebrate: {
        heading: 'We Help Celebrate',
        subtitle:
          'We are thrilled to offer a range of exceptional services and experienced professionals for your party.',
        items: [],
      },
      stats: DEFAULT_STATS,
      gallery: { heading: 'Our Gallery', tabs: [] },
      gifting: { heading: 'CORPORATE GIFTING', items: [] },
      mainCategorySlug: 'corporate-events',
    }
  }

  const mainSlug = slugifyName(mainDoc.name)
  const hero = await buildHero()

  const [celebrateItems, gallery, giftingItems] = await Promise.all([
    buildCelebrateCards(mainDoc),
    buildGallery(mainDoc, mainSlug),
    buildGifting(mainDoc, mainSlug),
  ])

  return {
    hero,
    booking,
    celebrate: {
      heading: 'We Help Celebrate',
      subtitle:
        'We are thrilled to offer a range of exceptional services and experienced professionals for your party.',
      items: celebrateItems,
    },
    stats: DEFAULT_STATS,
    gallery,
    gifting: {
      heading: 'CORPORATE GIFTING',
      items: giftingItems,
    },
    mainCategorySlug: mainSlug,
  }
}

module.exports = { getCorporatePage, submitCorporateBooking }
