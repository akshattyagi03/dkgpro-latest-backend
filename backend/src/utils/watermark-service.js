/**
 * Returns Cloudinary transformation params that overlay a DKGPro watermark.
 * Used in multer-config.js so every uploaded image gets watermarked automatically.
 * SVGs are excluded since Cloudinary treats them as raw files.
 */
const getWatermarkTransformation = () => [
  {
    overlay: {
      font_family: 'Arial',
      font_size: 28,
      font_weight: 'bold',
      text: 'DKGPro'
    },
    gravity: 'south_east',
    x: 15,
    y: 15,
    opacity: 40,
    color: '#FFFFFF'
  },
  {
    quality: 'auto',
    fetch_format: 'auto'
  }
]

/**
 * For SVGs uploaded as resource_type:raw, Cloudinary storage transformations
 * don't apply. Instead we generate a watermarked delivery URL using cloudinary.url()
 * which applies the overlay on-the-fly when the image is served.
 */
const applyWatermarkToSvgUrl = (uploadedUrl) => {
  if (!uploadedUrl) return uploadedUrl
  const cloudinary = require('cloudinary').v2

  // extract public_id from the uploaded URL
  // e.g. https://res.cloudinary.com/cloud/raw/upload/v123/dkgpro/filename.svg
  const match = uploadedUrl.match(/\/(?:raw|image)\/upload\/(?:v\d+\/)?(.+)$/)
  if (!match) return uploadedUrl

  const publicId = match[1].replace(/\.[^/.]+$/, '') // strip extension

  return cloudinary.url(publicId, {
    resource_type: 'image',
    format: 'png', // render SVG as PNG so overlay works
    transformation: [
      {
        overlay: {
          font_family: 'Arial',
          font_size: 28,
          font_weight: 'bold',
          text: 'DKGPro'
        },
        gravity: 'south_east',
        x: 15,
        y: 15,
        opacity: 40,
        color: '#FFFFFF'
      }
    ]
  })
}

/**
 * Legacy helper kept for backward compatibility.
 * Now that watermarking happens at Cloudinary upload time via multer-config,
 * this simply returns the URLs as-is.
 */
const addWatermarkToImages = async (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) return []
  return imageUrls
}

module.exports = { addWatermarkToImages, getWatermarkTransformation, applyWatermarkToSvgUrl }
