/** Default copy and stats for GET /users/corporate-page (overridable later via CMS). */
const CORPORATE_MAIN_CATEGORY_NAME = 'Corporate Events'

const DEFAULT_HERO = {
  title: 'Corporate Event Planning',
  subtitle:
    'Professional planning for conferences, launches, team celebrations, and office experiences — tailored end to end by DKG Pro.',
}

const DEFAULT_BOOKING = {
  brandLabel: 'DGK Pro',
  title: 'Making Every Corporate Event Memorable With DKG Pro',
  description:
    'At DKG Pro Event Management, we are your one-stop solution for all your corporate event needs. From product launches to team offsites, we handle every detail with precision and creativity so your brand shines at every occasion.',
  image:
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=900&fit=crop',
  cta: { label: 'Know More', href: '/contact' },
  form: {
    title: 'Book Your Event',
    submitLabel: 'BOOK NOW',
    fields: [
      {
        key: 'firstName',
        label: 'First name',
        placeholder: 'First name',
        type: 'text',
        required: true,
      },
      {
        key: 'email',
        label: 'Email',
        placeholder: 'Email',
        type: 'email',
        required: true,
      },
      {
        key: 'phone',
        label: 'Phone Number',
        placeholder: 'Phone Number',
        type: 'tel',
        required: true,
      },
      {
        key: 'company',
        label: 'Company',
        placeholder: 'Company',
        type: 'text',
        required: false,
      },
      {
        key: 'eventDetails',
        label: 'Event Details',
        placeholder: 'Event Details',
        type: 'textarea',
        required: false,
      },
    ],
  },
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
  DEFAULT_BOOKING,
  DEFAULT_STATS,
  CELEBRATE_IMAGE_POOL,
  slugifyName,
  pickImage,
}
