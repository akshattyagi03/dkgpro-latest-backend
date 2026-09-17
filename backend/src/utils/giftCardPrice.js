'use strict'

function parsePositivePrice(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function readSizes(cfg) {
  if (!cfg || !Array.isArray(cfg.sizes)) return []
  return cfg.sizes
    .map((row) => ({
      label: String(row?.label || '').trim(),
      price: parsePositivePrice(row?.price),
    }))
    .filter((row) => row.label)
}

/** Catalog unit price for the selected foam-board size, or null to use product price. */
function resolveGiftCardUnitPrice(product, giftCardChoice) {
  const sizeLabel = String(giftCardChoice?.size || '').trim()
  if (!sizeLabel || !product) return null

  const productCfg = product.giftCardSelection
  const third = product.thirdCategory
  const categoryCfg =
    third && typeof third === 'object' ? third.giftCardSelection : null

  let sizes = readSizes(productCfg)
  const inherit = productCfg?.inheritFromCategory !== false
  if (sizes.length === 0 && inherit) {
    sizes = readSizes(categoryCfg)
  }

  const match = sizes.find((row) => row.label === sizeLabel)
  return match?.price ?? null
}

module.exports = {
  parsePositivePrice,
  resolveGiftCardUnitPrice,
}
