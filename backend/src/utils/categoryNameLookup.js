/**
 * Resolve category documents when the client sends title case or URL slugs
 * (e.g. "Digital Gifts" / "digital-gifts") but Mongo stores hierarchy names
 * (e.g. "DIGITAL GIFTS").
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function slugifyCategoryName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * @param {import('mongoose').Model} Model - MainCategory | SubCategory | ThirdCategory
 * @param {string} input - Display name or URL segment
 */
async function findCategoryByNameOrSlug(Model, input) {
  const trimmed = String(input || '').trim()
  if (!trimmed) return null

  const byName = await Model.findOne({
    name: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' },
  })
  if (byName) return byName

  const inputSlug = slugifyCategoryName(trimmed)
  if (!inputSlug) return null

  const all = await Model.find({}).select('name').lean()
  const match = all.find((row) => slugifyCategoryName(row.name) === inputSlug)
  if (!match) return null

  return Model.findById(match._id)
}

module.exports = {
  escapeRegex,
  slugifyCategoryName,
  findCategoryByNameOrSlug,
}
