'use strict'

const citiesData = require('./cities-districts.json')

const EXTRA_ALIASES = {
  'delhi ncr': [
    'delhi',
    'new delhi',
    'ncr',
    'delhi ncr',
    'greater noida',
    'greater noida west',
    'noida extension',
    'gurugram',
    'gautam buddha nagar',
    'gautam budh nagar',
    'gautam buddh nagar',
  ],
  bangalore: ['bengaluru', 'bengaluru urban', 'bengaluru rural'],
  mumbai: ['bombay'],
  kolkata: ['calcutta'],
  chennai: ['madras'],
}

const STATE_GROUPS = [
  {
    label: 'Uttar Pradesh',
    keys: ['uttar pradesh', 'uttarpradesh'],
    terms: [
      'uttar pradesh',
      'noida',
      'greater noida',
      'greater noida west',
      'ghaziabad',
      'lucknow',
      'kanpur',
      'noida extension',
      'gautam buddha nagar',
    ],
  },
  {
    label: 'Haryana',
    keys: ['haryana'],
    terms: ['haryana', 'gurgaon', 'gurugram', 'faridabad', 'chandigarh'],
  },
]

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isAcrossIndiaCity(city) {
  return /^across\s*india$/.test(normalize(city))
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function uniqueNormalized(values) {
  const out = []
  const seen = new Set()
  for (const value of values) {
    const n = normalize(value)
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

function buildGroups() {
  const groups = []

  for (const city of citiesData.cities || []) {
    const terms = [city.name]
    if (Array.isArray(city.subCities)) {
      for (const sub of city.subCities) {
        terms.push(sub.name)
        if (Array.isArray(sub.districts)) terms.push(...sub.districts)
      }
    }
    if (Array.isArray(city.districts)) terms.push(...city.districts)
    const extras = EXTRA_ALIASES[normalize(city.name)] || []
    terms.push(...extras)

    const normalizedTerms = uniqueNormalized(terms)
    const keys = uniqueNormalized([city.name, ...(city.subCities || []).map((s) => s.name), ...extras])

    groups.push({
      label: city.name,
      keys,
      terms: normalizedTerms,
    })
  }

  groups.push(...STATE_GROUPS)
  return groups
}

const GROUPS = buildGroups()

function findCityGroup(city) {
  const n = normalize(city)
  if (!n || isAcrossIndiaCity(n)) return null
  const byKey = GROUPS.find((g) => g.keys.includes(n))
  if (byKey) return byKey
  const byTerm = GROUPS.filter((g) => g.terms.includes(n)).sort(
    (a, b) => b.terms.length - a.terms.length
  )
  return byTerm[0] || null
}

function cityMatchTerms(city) {
  const n = normalize(city)
  if (!n || isAcrossIndiaCity(n)) return []
  const group = findCityGroup(n)
  return group ? group.terms : [n]
}

function inferServiceCityLabel(text) {
  const n = normalize(text)
  if (!n) return ''
  const group = findCityGroup(n) || GROUPS.find((g) => g.terms.some((term) => n.includes(term)))
  return group && !STATE_GROUPS.some((s) => s.label === group.label) ? group.label : ''
}

function canonicalizeServiceCity(city, fallbackText) {
  const fromCity = inferServiceCityLabel(city)
  if (fromCity) return fromCity
  return inferServiceCityLabel(fallbackText)
}

function regexClause(field, term) {
  return { [field]: { $regex: escapeRegex(term), $options: 'i' } }
}

function buildMongoCityFilter(fields, city) {
  const terms = cityMatchTerms(city)
  if (!terms.length) return {}
  const list = Array.isArray(fields) ? fields : [fields]
  const or = []
  for (const field of list) {
    for (const term of terms) {
      or.push(regexClause(field, term))
    }
  }
  if (!or.length) return {}
  return or.length === 1 ? or[0] : { $or: or }
}

function buildProductCityFilter(city) {
  return buildMongoCityFilter(['serviceableAreas.city', 'location'], city)
}

function buildVenueCityFilter(city) {
  return buildMongoCityFilter(['location.city', 'location.address'], city)
}

function buildBlogCityFilter(city) {
  const terms = cityMatchTerms(city)
  if (!terms.length) return {}
  return {
    $or: [
      { cities: { $exists: false } },
      { cities: { $size: 0 } },
      ...terms.map((term) => ({
        cities: { $elemMatch: { $regex: escapeRegex(term), $options: 'i' } },
      })),
    ],
  }
}

module.exports = {
  normalize,
  isAcrossIndiaCity,
  cityMatchTerms,
  inferServiceCityLabel,
  canonicalizeServiceCity,
  buildMongoCityFilter,
  buildProductCityFilter,
  buildVenueCityFilter,
  buildBlogCityFilter,
}
