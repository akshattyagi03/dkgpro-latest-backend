/**
 * Align guest homepage CMS banners with the Wedding Special, Baby Milestone,
 * and Wedding Extra Special sections. Updates existing banners in-place and
 * deactivates leftovers in those placements only. Does not delete documents
 * or change the upload API.
 *
 *   node seedHomeSectionBanners.js
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
require('dotenv').config({ path: path.join(__dirname, 'src/.env') })
const mongoose = require('mongoose')

const HeroBanner = require('./src/models/hero-banner-model')
const SubCategory = require('./src/models/sub-category-model')
const ThirdCategory = require('./src/models/third-category-model')
const HomeProductSection = require('./src/models/home-product-section-model')

const IMAGES = {
  flower: 'https://picsum.photos/seed/278370e551effe49img0/1200/800',
  sfx: 'https://picsum.photos/seed/effects0ColdSparkEntrance/1200/800',
  catering: 'https://picsum.photos/seed/catering0LiveCounterPartyMenu/1200/800',
  photography: 'https://picsum.photos/seed/photography0CandidWeddingPhotography/1200/800',
  babyShower: 'https://res.cloudinary.com/del7qy5ad/image/upload/v1789134474/dkgpro/c2903au9sh3wnuasgfbi.jpg',
  welcomeBaby: 'https://res.cloudinary.com/del7qy5ad/image/upload/v1788978290/dkgpro/dbxnhb1mvccebspajm0x.jpg',
  nameCeremony: 'https://res.cloudinary.com/del7qy5ad/image/upload/v1786290406/dkgpro/qtdo8gfrmctjchv38g5w.jpg',
  annprashan: 'https://res.cloudinary.com/del7qy5ad/image/upload/v1786290045/dkgpro/mlxt6qvapetc6m9xjkdm.jpg',
  mundan: 'https://res.cloudinary.com/del7qy5ad/image/upload/v1788886197/dkgpro/kwycpvqxifbkayjw6iid.jpg',
  birthdayParty: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
  preWedding: 'https://picsum.photos/seed/photography3CouplePreWeddingShoot/1200/800',
  homeDecor: 'https://picsum.photos/seed/5d9b3eaf5fcc6085img0/1200/800',
  digitalGifts: 'https://picsum.photos/seed/a139fc5cb15e081bimg0/1200/800',
  digitalInvite: 'https://picsum.photos/seed/1d7b3a8e747b9403img0/1200/800',
  engagement: 'https://picsum.photos/seed/photography3CouplePreWeddingShoot/1200/800',
  mehendi: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
  haldi: 'https://picsum.photos/seed/278370e551effe49img0/1200/800',
  wedding: 'https://picsum.photos/seed/photography0CandidWeddingPhotography/1200/800',
}

const DESCRIPTIONS = {
  babyShower: 'Balloon walls, oh-baby foils, and fairy lights styled for a shower at your location.',
  welcomeBaby: 'Soft pastel welcome decor for the first day home — ready for photos at the door.',
  nameCeremony: 'Name-ceremony styling with florals and a photo corner for family blessings.',
  annprashan: 'First-rice ceremony decor that keeps the seating, table, and backdrop guest-ready.',
  mundan: 'Mundan setup with a calm seating area and a simple backdrop for the ritual and photos.',
}

const PRODUCT_SECTION_SUBTITLES = {
  'balloon-ring': 'Statement balloon rings and entrance pieces that hold up in person and in photographs.',
  'wedding-decoration': 'Stage, entrance, and venue styling for the wedding — booked as one coordinated setup.',
  'bridal-entry-decoration': 'Entrance and room setups that make the bridal walk the moment everyone remembers.',
  'bachelors-party-decoration': 'Bold party decor for bachelor and bachelorette nights at home or a booked venue.',
  anniversary: 'Anniversary room decor, dinners, and surprises planned around the two of you.',
  'rooftop-decoration': 'Rooftop setups at home for dinners, birthdays, and small celebrations under the sky.',
}

function norm(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleMatches(bannerTitle, aliases) {
  const a = norm(bannerTitle)
  if (!a) return false
  return (aliases || []).some((alias) => norm(alias) === a)
}

async function findSub(name) {
  return SubCategory.findOne({ name: new RegExp(`^${name}$`, 'i') })
}

async function findThird(name) {
  return ThirdCategory.findOne({ name: new RegExp(`^${name}$`, 'i') })
}

async function applySlot(banner, slot) {
  banner.title = slot.title == null ? null : slot.title
  banner.placement = slot.placement
  banner.sortOrder = slot.sortOrder
  banner.isActive = true
  if (slot.image) banner.image = slot.image
  if (slot.description !== undefined) {
    banner.description = slot.description == null ? null : slot.description
  }

  if (slot.thirdName) {
    const third = await findThird(slot.thirdName)
    if (third) {
      banner.thirdCategory = third._id
      banner.subCategory = null
    }
  } else if (slot.subName) {
    const sub = await findSub(slot.subName)
    if (sub) {
      banner.subCategory = sub._id
      banner.thirdCategory = null
    }
  }

  await banner.save()
}

function pickBanner(pool, slot, usedIds) {
  const unused = pool.filter((b) => !usedIds.has(String(b._id)))
  const aliases = slot.matchTitles || [slot.title].filter(Boolean)
  const byTitle = unused.find((b) => titleMatches(b.title, aliases))
  return byTitle || unused[0] || null
}

async function syncPlacement(placement, slots) {
  const existing = await HeroBanner.find({ placement }).sort({ sortOrder: 1, createdAt: -1 })
  const usedIds = new Set()

  for (const slot of slots) {
    const banner = pickBanner(existing, slot, usedIds)
    if (!banner) {
      console.warn(`No existing banner left for ${placement} / ${slot.title || 'hero'}`)
      continue
    }
    usedIds.add(String(banner._id))
    await applySlot(banner, slot)
    console.log(`Updated ${placement} #${slot.sortOrder} → ${slot.title || '(hero)'} (${banner._id})`)
  }

  let deactivated = 0
  for (const banner of existing) {
    if (usedIds.has(String(banner._id)) || banner.isActive === false) continue
    banner.isActive = false
    await banner.save()
    deactivated += 1
    console.log(`Deactivated leftover ${placement} ${banner._id} (${banner.title || 'untitled'})`)
  }

  return { updated: usedIds.size, deactivated }
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set')
  }

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB')

  const weddingSpecial = await syncPlacement('birthday_extra_special', [
    {
      title: 'Flower decoration',
      matchTitles: ['Flower decoration'],
      placement: 'birthday_extra_special',
      sortOrder: 0,
      image: IMAGES.flower,
      thirdName: 'Flower Bouquets',
    },
    {
      title: 'Special Effects SFX',
      matchTitles: ['Special Effects SFX', 'Special Effects'],
      placement: 'birthday_extra_special',
      sortOrder: 1,
      image: IMAGES.sfx,
      subName: 'Special Effects',
    },
    {
      title: 'Catering service',
      matchTitles: ['Catering service', 'Catering'],
      placement: 'birthday_extra_special',
      sortOrder: 2,
      image: IMAGES.catering,
      subName: 'Catering Service',
    },
    {
      title: 'Photography',
      matchTitles: ['Photography'],
      placement: 'birthday_extra_special',
      sortOrder: 3,
      image: IMAGES.photography,
      subName: 'Photography',
    },
  ])

  const babyLevel = await syncPlacement('birthday_level_up', [
    {
      title: null,
      matchTitles: ["Kid's birthday", 'Kids birthday'],
      placement: 'birthday_level_up',
      sortOrder: 0,
    },
    {
      title: 'Baby shower',
      matchTitles: ['Baby shower', 'Baby Shower'],
      placement: 'birthday_level_up',
      sortOrder: 1,
      image: IMAGES.babyShower,
      description: DESCRIPTIONS.babyShower,
      subName: 'KIDS CELEBRATIONS',
    },
    {
      title: 'Welcome baby',
      matchTitles: ['Welcome baby'],
      placement: 'birthday_level_up',
      sortOrder: 2,
      image: IMAGES.welcomeBaby,
      description: DESCRIPTIONS.welcomeBaby,
      thirdName: 'Baby welcome decoration',
    },
    {
      title: 'Name ceremony',
      matchTitles: ['Name ceremony'],
      placement: 'birthday_level_up',
      sortOrder: 3,
      image: IMAGES.nameCeremony,
      description: DESCRIPTIONS.nameCeremony,
      subName: 'KIDS CELEBRATIONS',
    },
    {
      title: 'Annprashan',
      matchTitles: ['Annprashan'],
      placement: 'birthday_level_up',
      sortOrder: 4,
      image: IMAGES.annprashan,
      description: DESCRIPTIONS.annprashan,
      subName: 'KIDS CELEBRATIONS',
    },
    {
      title: 'Mundan ceremony',
      matchTitles: ['Mundan ceremony', 'Mundan'],
      placement: 'birthday_level_up',
      sortOrder: 5,
      image: IMAGES.mundan,
      description: DESCRIPTIONS.mundan,
      subName: 'KIDS CELEBRATIONS',
    },
  ])

  const weddingExtra = await syncPlacement('wedding_extra', [
    {
      title: 'Engagement',
      matchTitles: ['Engagement', 'PreWedding', 'Pre Wedding'],
      placement: 'wedding_extra',
      sortOrder: 0,
      image: IMAGES.engagement,
    },
    {
      title: 'Mehendi',
      matchTitles: ['Mehendi', 'Mehandi'],
      placement: 'wedding_extra',
      sortOrder: 1,
      image: IMAGES.mehendi,
    },
    {
      title: 'Haldi',
      matchTitles: ['Haldi'],
      placement: 'wedding_extra',
      sortOrder: 2,
      image: IMAGES.haldi,
    },
    {
      title: 'Wedding',
      matchTitles: ['Wedding'],
      placement: 'wedding_extra',
      sortOrder: 3,
      image: IMAGES.wedding,
    },
  ])

  const occasion = await syncPlacement('occasion', [
    {
      title: 'Birthday party',
      matchTitles: ['Birthday party', 'Birthday Photography'],
      placement: 'occasion',
      sortOrder: 0,
      image: IMAGES.birthdayParty,
      subName: 'BIRTHDAY',
    },
    {
      title: 'Pre wedding shoot',
      matchTitles: ['Pre wedding shoot', 'Pre-Wedding Photography', 'Pre Wedding Photography'],
      placement: 'occasion',
      sortOrder: 1,
      image: IMAGES.preWedding,
      subName: 'Photography',
    },
    {
      title: 'Home decoration',
      matchTitles: ['Home decoration', 'Home Decoration'],
      placement: 'occasion',
      sortOrder: 2,
      image: IMAGES.homeDecor,
      subName: 'ROOM DECORATIONS',
    },
    {
      title: 'Digital gifts',
      matchTitles: ['Digital gifts', 'Gift Pack', 'Digital Gifts'],
      placement: 'occasion',
      sortOrder: 3,
      image: IMAGES.digitalGifts,
      subName: 'DIGITAL GIFTS',
    },
    {
      title: 'Digital invitation',
      matchTitles: ['Digital invitation', 'Housewarming', 'Digital Card'],
      placement: 'occasion',
      sortOrder: 4,
      image: IMAGES.digitalInvite,
      thirdName: 'Digital Card',
    },
  ])

  let productSections = 0
  for (const [slug, subtitle] of Object.entries(PRODUCT_SECTION_SUBTITLES)) {
    const row = await HomeProductSection.findOne({ slug })
    if (!row) continue
    if (row.subtitle && !/thrilled to offer/i.test(row.subtitle) && row.subtitle !== subtitle) {
      continue
    }
    row.subtitle = subtitle
    await row.save()
    productSections += 1
    console.log(`Updated product section subtitle: ${slug}`)
  }

  console.log('Done.', { weddingSpecial, babyLevel, weddingExtra, occasion, productSections })
}

run()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {})
  })
