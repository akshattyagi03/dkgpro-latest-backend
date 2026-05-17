/** Default copy and stats for GET /users/corporate-page (overridable later via CMS). */
const CORPORATE_MAIN_CATEGORY_NAME = 'Corporate Events'

const DEFAULT_HERO = {
  title: 'Corporate Event Planning',
  subtitle:
    'Professional planning for conferences, launches, team celebrations, and office experiences — tailored end to end by DKG Pro.',
  image:
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1920&h=720&fit=crop',
}

const DEFAULT_STATS = {
  heading: 'Successfully Completed 1000+ Projects',
  items: [
    { value: '100+', target: 100, suffix: '+', label: 'Clients' },
    { value: '200+', target: 200, suffix: '+', label: 'Events' },
    { value: '400+', target: 400, suffix: '+', label: 'Exhibitions' },
    { value: '600+', target: 600, suffix: '+', label: 'Product Launches' },
  ],
}

/** Curated Unsplash pool — stable picks for category cards when no banner is set. */
const CELEBRATE_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=600&fit=crop',
  'https://images.unsplash.com/photo-1556761175-5973dc0e32e7?w=600&h=600&fit=crop',
]

const GALLERY_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&h=1000&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&h=600&q=80',
  'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&h=1000&q=80',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&h=600&q=80',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&h=600&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&h=1000&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&h=600&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=600&q=80',
  'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&h=600&q=80',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&h=600&q=80',
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&h=600&q=80',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&h=600&q=80',
]

function galleryImage(photoId, w = 480, h = 520) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=80`
}

/** Bento slot order: L-top, ML-top, center, MR-top, R-top, L-bottom, ML-bottom, MR-bottom, R-bottom */
function galleryBentoSet(centerId, ...sideIds) {
  const sides = sideIds.length >= 8 ? sideIds : [...sideIds, ...GALLERY_IMAGE_POOL]
  return [
    galleryImage(sides[0]),
    galleryImage(sides[1]),
    galleryImage(centerId, 640, 1080),
    galleryImage(sides[2]),
    galleryImage(sides[3]),
    galleryImage(sides[4]),
    galleryImage(sides[5]),
    galleryImage(sides[6]),
    galleryImage(sides[7]),
  ]
}

/** Gallery filter tabs — matches corporate page design. */
const GALLERY_FILTERS = [
  'IPL Decoration',
  "Valentine's Day",
  'Independence & Republic Day',
  'Christmas',
  'Diwali',
  'Holi',
  'Exhibitions',
]

/** Nine images per filter tab (bento grid uses first 9) — verified Unsplash IDs only. */
const GALLERY_IMAGES_BY_FILTER = {
  'IPL Decoration': galleryBentoSet(
    'photo-1511795409834-ef04bbd61622',
    'photo-1519167758481-83f550bb49b3',
    'photo-1492684223066-81342ee5ff30',
    'photo-1464366400600-7168b8af9bc3',
    'photo-1558618666-fcd25c85cd64',
    'photo-1540575467063-178a50c2df87',
    'photo-1527529482837-4698179dc6ce',
    'photo-1505373877841-8d25f7d46678',
    'photo-1475721027785-f74eccf877e2'
  ),
  "Valentine's Day": galleryBentoSet(
    'photo-1516589178581-6cd7833ae3b2',
    'photo-1511795409834-ef04bbd61622',
    'photo-1492684223066-81342ee5ff30',
    'photo-1527529482837-4698179dc6ce',
    'photo-1519167758481-83f550bb49b3',
    'photo-1464366400600-7168b8af9bc3',
    'photo-1558618666-fcd25c85cd64',
    'photo-1606046604972-77cc76aee944',
    'photo-1556761175-b413da4baf72'
  ),
  'Independence & Republic Day': galleryBentoSet(
    'photo-1533174072545-7a4b6ad7a6c3',
    'photo-1511578314322-379afb476865',
    'photo-1540575467063-178a50c2df87',
    'photo-1505373877841-8d25f7d46678',
    'photo-1475721027785-f74eccf877e2',
    'photo-1560472354-b33ff0c44a43',
    'photo-1556761175-b413da4baf72',
    'photo-1492684223066-81342ee5ff30',
    'photo-1519167758481-83f550bb49b3'
  ),
  Christmas: galleryBentoSet(
    'photo-1482517967863-00e15c9b44be',
    'photo-1606046604972-77cc76aee944',
    'photo-1511795409834-ef04bbd61622',
    'photo-1527529482837-4698179dc6ce',
    'photo-1519167758481-83f550bb49b3',
    'photo-1464366400600-7168b8af9bc3',
    'photo-1558618666-fcd25c85cd64',
    'photo-1492684223066-81342ee5ff30',
    'photo-1540575467063-178a50c2df87'
  ),
  Diwali: galleryBentoSet(
    'photo-1606046604972-77cc76aee944',
    'photo-1558618666-fcd25c85cd64',
    'photo-1492684223066-81342ee5ff30',
    'photo-1519167758481-83f550bb49b3',
    'photo-1527529482837-4698179dc6ce',
    'photo-1511795409834-ef04bbd61622',
    'photo-1464366400600-7168b8af9bc3',
    'photo-1505373877841-8d25f7d46678',
    'photo-1540575467063-178a50c2df87'
  ),
  Holi: galleryBentoSet(
    'photo-1527529482837-4698179dc6ce',
    'photo-1529636798458-92182e662485',
    'photo-1583847268964-b28dc8f51f92',
    'photo-1492684223066-81342ee5ff30',
    'photo-1511795409834-ef04bbd61622',
    'photo-1464366400600-7168b8af9bc3',
    'photo-1558618666-fcd25c85cd64',
    'photo-1519167758481-83f550bb49b3',
    'photo-1540575467063-178a50c2df87'
  ),
  Exhibitions: galleryBentoSet(
    'photo-1511578314322-379afb476865',
    'photo-1540575467063-178a50c2df87',
    'photo-1505373877841-8d25f7d46678',
    'photo-1475721027785-f74eccf877e2',
    'photo-1560472354-b33ff0c44a43',
    'photo-1556761175-b413da4baf72',
    'photo-1521737711867-e3b97375f902',
    'photo-1600880292203-757bb62b4baf',
    'photo-1552664730-d307ca884978'
  ),
}

const GALLERY_BENTO_SLOTS = 9

const MAX_CELEBRATE_CARDS = 12

function slugifyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
}

function pickImage(pool, seed) {
  const s = String(seed || '0')
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash + s.charCodeAt(i) * (i + 1)) % pool.length
  return pool[hash] || pool[0]
}

module.exports = {
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
}
