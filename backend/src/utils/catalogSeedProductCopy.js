/**
 * Realistic product copy for catalog seed scripts, aligned with dkg_admin ProductModal
 * (FormModals.tsx): product info, MRP / sale price, tier, featured, categories, images,
 * tags, inclusions, experiences, keyHighlights, serviceable areas, location, setup,
 * team size, advance booking, cancellation policy, optional YouTube link.
 *
 * Names and descriptions are written like vendor-facing catalog text (no [SEED] prefix).
 */
const crypto = require('crypto')

const DEFAULT_CANCELLATION =
  'Free cancellation up to 24 hours before the event. Partial refund may apply thereafter.'

const THIRD_LINE_LABELS = [
  'Signature package',
  'Deluxe experience',
  'Essentials bundle',
  'Premium evening slot',
  'Celebration Plus',
  'Full-service option',
  'Weekend special',
  'Curated classic'
]

const SERVICE_AREA_ROTATIONS = [
  { city: 'Mumbai', districts: ['Bandra West', 'Juhu', 'Andheri East'] },
  { city: 'Mumbai', districts: ['Powai', 'Goregaon'] },
  { city: 'Bengaluru', districts: ['Indiranagar', 'Koramangala', 'Whitefield'] },
  { city: 'Bengaluru', districts: ['HSR Layout', 'Electronic City'] },
  { city: 'Hyderabad', districts: ['Jubilee Hills', 'Banjara Hills'] },
  { city: 'Delhi NCR', districts: ['Gurgaon Sector 29', 'Noida Sector 18'] },
  { city: 'Pune', districts: ['Koregaon Park', 'Baner'] }
]

const INCLUSION_POOL = [
  'Dedicated celebration coordinator on the day',
  'Standard decor and setup teardown included',
  'Vendor coordination (cake, flowers, AV) where applicable',
  'Digital planning checklist shared after booking',
  'Backup weather plan for outdoor elements',
  'Basic photography corner (15 minutes) where venue allows',
  'Welcome beverage or mocktail tray on arrival',
  'Personalized message card / small signage',
  'Two rounds of menu or decor revisions before final lock',
  'On-site supervisor for the full service window'
]

const EXPERIENCE_POOL = [
  'Run-of-show aligned to your milestone (birthday, anniversary, proposal, etc.)',
  'Calm arrival flow for guests with clear wayfinding',
  'Music playlist template you can customize or bring your own',
  'Optional add-ons available after booking (balloons, cake upgrade, extra hour)',
  'Post-event feedback loop to tune future bookings',
  'Allergen-friendly meal notes passed to kitchen partners',
  'Soft lighting pack for indoor setups where permitted',
  'Short surprise reveal choreography planned with you in advance'
]

const HIGHLIGHT_POOL = [
  'Hand-picked execution partners with prior DKG-style delivery standards',
  'Transparent slotting: you see setup buffer and guest-facing start time',
  'City-wise serviceability matched to your pincode at checkout',
  'Upgrade path to premium tier for larger guest counts or branded touches',
  'Single invoice for bundled inclusions (no surprise vendor charges)',
  'Quality checklist signed off before we mark the job complete'
]

function h32(...parts) {
  return crypto.createHash('md5').update(parts.join('\u0001')).digest('hex').slice(0, 16)
}

function pickFromPool(pool, salt, count, offset = 0) {
  const h = crypto.createHash('md5').update(salt).digest()
  const out = []
  const n = pool.length
  for (let i = 0; i < count; i++) {
    out.push(pool[(h[(i + offset) % h.length] + i) % n])
  }
  return out
}

function toTitlePhrase(s) {
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .split(/[\s/]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function placeholderImage(seed) {
  const safe = String(seed).replace(/[^a-zA-Z0-9]/g, '').slice(0, 40) || 'x'
  return `https://picsum.photos/seed/${safe}/1200/800`
}

function buildImages(mainName, subName, itemName, seedKind, variantNum, variantTotal, index) {
  const base = h32(mainName, subName, itemName, seedKind, String(variantNum), String(variantTotal), String(index))
  const nImg = 2 + (index % 2)
  const urls = []
  for (let i = 0; i < nImg; i++) {
    urls.push(placeholderImage(`${base}img${i}`))
  }
  return urls
}

function buildTags(mainName, subName, itemName, seedKind) {
  const base = [mainName, subName, itemName].join(' ')
  const extra = pickFromPool(
    ['premium-ready', 'verified-partners', 'home-and-venue', 'same-week-slots', 'metro-delivery'],
    h32(base, seedKind),
    2,
    1
  )
  const cityTag = SERVICE_AREA_ROTATIONS[indexFromHash(h32(base), SERVICE_AREA_ROTATIONS.length)].city
  const tags = [
    mainName.split(/\s+/)[0],
    ...itemName.split(/\s+/).slice(0, 2).map((t) => t.replace(/[^a-zA-Z]/g, '')).filter(Boolean),
    ...extra,
    cityTag
  ]
  return [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))].slice(0, 8)
}

function indexFromHash(hash, mod) {
  const v = parseInt(hash.slice(0, 8), 16)
  return Number.isFinite(v) ? v % mod : 0
}

function buildDescriptionThird({ mainName, subName, itemName, variantNum, variantTotal }) {
  const subPhrase = toTitlePhrase(subName)
  return [
    `${itemName} is a popular choice within our ${subPhrase} line under ${mainName}. This is listing variant ${variantNum} of ${variantTotal}, with the same core promise and slightly different styling or duration presets so you can match budget and guest count.`,
    '',
    'What you can expect',
    '• On-ground coordinator for the agreed service window',
    '• Decor, catering, or experience partners briefed on your occasion type',
    '• Clear setup and handover times so the surprise lands on schedule',
    '',
    'Who this works well for',
    'Couples, families, and small groups celebrating milestones who want a polished plan without managing ten vendors themselves.',
    '',
    'Service areas',
    'We operate across major metros listed under Serviceable areas on this listing. Final feasibility is confirmed after you share the pincode at checkout.',
    '',
    `Cancellation policy: ${DEFAULT_CANCELLATION}`
  ].join('\n')
}

function buildDescriptionSub({ mainName, subName, itemName, variantNum, variantTotal }) {
  const subPhrase = toTitlePhrase(subName)
  return [
    `This ${subPhrase} bundle (package ${variantNum} of ${variantTotal}) is anchored on "${itemName}" as the hero experience, while still sitting under the same sub-category so guests browsing ${mainName} see a fuller set of options.`,
    '',
    'Why bundles exist',
    'Some celebrations need multiple touchpoints—decor plus dining, or cake plus photography. Bundles keep logistics in one coordinated thread instead of separate bookings.',
    '',
    'What we still need from you',
    'Preferred date, approximate guest count, any dietary or accessibility notes, and whether the venue is yours, ours, or a partner property.',
    '',
    `Cancellation policy: ${DEFAULT_CANCELLATION}`
  ].join('\n')
}

/**
 * @returns {object} Plain object for Product.insertMany / create (includes catalogSeed: true)
 */
function buildCatalogSeedProductDoc({
  mainName,
  subName,
  itemName,
  mainId,
  subId,
  thirdId,
  adminId,
  index,
  seedKind,
  variantNum,
  variantTotal
}) {
  const subPhrase = toTitlePhrase(subName)
  const lineLabel = THIRD_LINE_LABELS[(variantNum - 1) % THIRD_LINE_LABELS.length]

  let name
  if (seedKind === 'sub') {
    name = `${subPhrase} multi-experience bundle — ${itemName} focus (${variantNum} of ${variantTotal})`
  } else {
    name = `${itemName} · ${subPhrase} — ${lineLabel}`
  }

  const description =
    seedKind === 'sub'
      ? buildDescriptionSub({ mainName, subName, itemName, variantNum, variantTotal })
      : buildDescriptionThird({ mainName, subName, itemName, variantNum, variantTotal })

  const basePrice = 1999 + (index % 55) * 175
  const hasDiscount = index % 6 === 2 && basePrice > 2499
  const discountedPrice = hasDiscount ? Math.round(basePrice * 0.88 * 100) / 100 : null

  const areas = [
    SERVICE_AREA_ROTATIONS[indexFromHash(h32('a', name, String(index)), SERVICE_AREA_ROTATIONS.length)],
    SERVICE_AREA_ROTATIONS[indexFromHash(h32('b', name, String(index)), SERVICE_AREA_ROTATIONS.length)]
  ]
  const uniq = []
  const seen = new Set()
  for (const a of areas) {
    const k = a.city
    if (!seen.has(k)) {
      seen.add(k)
      uniq.push(a)
    }
  }

  const loc = uniq[0].city
  const salt = h32(mainName, subName, itemName, seedKind, String(variantNum))

  const doc = {
    name,
    description,
    price: basePrice,
    discountedPrice,
    mainCategory: mainId,
    subCategory: subId,
    thirdCategory: thirdId,
    images: buildImages(mainName, subName, itemName, seedKind, variantNum, variantTotal, index),
    addedBy: adminId,
    serviceableAreas: uniq,
    isFeatured: index % 23 === 0,
    tier: index % 9 === 0 ? 'premium' : 'standard',
    location: `${loc} · on-site within listed service areas`,
    setupDuration: seedKind === 'sub' ? '90–150 minutes' : '75–120 minutes',
    teamSize: seedKind === 'sub' ? '3–5 staff' : '2–4 staff',
    advanceBooking: index % 4 === 0 ? '48 hours' : '24–48 hours',
    cancellationPolicy: DEFAULT_CANCELLATION,
    inclusions: pickFromPool(INCLUSION_POOL, salt + 'i', 5, 0),
    experiences: pickFromPool(EXPERIENCE_POOL, salt + 'e', 4, 1),
    keyHighlights: pickFromPool(HIGHLIGHT_POOL, salt + 'k', 4, 2),
    tags: buildTags(mainName, subName, itemName, seedKind),
    catalogSeed: true
  }

  if (index % 11 === 3) {
    doc.youtubeVideoLink = 'https://www.youtube.com/watch?v=LXb3EKWsInQ'
  }

  return doc
}

module.exports = {
  buildCatalogSeedProductDoc,
  DEFAULT_CANCELLATION,
  placeholderImage
}
