/** Fixed service pages linked from product-detail ServicesBanner. */

const SERVICE_KEYS = ['photography', 'catering', 'games', 'effects']

const SERVICE_META = {
  photography: {
    slug: 'photography',
    label: 'Photography',
    defaultTitle: 'Photography',
    defaultSubtitle:
      'Capture every moment with professional photography packages tailored for your celebration.',
  },
  catering: {
    slug: 'catering-service',
    label: 'Catering Service',
    defaultTitle: 'Catering Service',
    defaultSubtitle:
      'Delicious menus and seamless service for parties, corporate events, and celebrations of every size.',
  },
  games: {
    slug: 'games-and-activities',
    label: 'Games & Activities',
    defaultTitle: 'Games & Activities',
    defaultSubtitle:
      'Keep guests entertained with curated games and activity experiences for all ages.',
  },
  effects: {
    slug: 'special-effects',
    label: 'Special Effects',
    defaultTitle: 'Special Effects',
    defaultSubtitle:
      'Elevate the atmosphere with stunning special effects — fog, lights, cold sparkles, and more.',
  },
}

function isValidServiceKey(key) {
  return SERVICE_KEYS.includes(String(key || '').trim())
}

function resolveServiceKeyFromSlug(slug) {
  const s = String(slug || '')
    .trim()
    .toLowerCase()
  for (const key of SERVICE_KEYS) {
    if (SERVICE_META[key].slug === s || key === s) return key
  }
  return null
}

module.exports = {
  SERVICE_KEYS,
  SERVICE_META,
  isValidServiceKey,
  resolveServiceKeyFromSlug,
}
