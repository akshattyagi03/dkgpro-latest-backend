const applyDecay = (interest) => {
  const now = new Date()
  const last = new Date(interest.lastUpdated)

  const msPerDay = 1000 * 60 * 60 * 24
  const daysPassed = (now - last) / msPerDay

  const decayFactor = 0.9 // tweakable

  interest.score = interest.score * Math.pow(decayFactor, daysPassed)
  interest.lastUpdated = now
}

module.exports = applyDecay