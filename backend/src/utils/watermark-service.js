const addWatermarkToImages = async (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) {
    return []
  }
  
  const watermarkedImages = imageUrls.map(imageUrl => {
    return `${imageUrl}?watermark=DKGPro&opacity=0.3&position=bottom-right`
  })
  
  return watermarkedImages
}

module.exports = { addWatermarkToImages }