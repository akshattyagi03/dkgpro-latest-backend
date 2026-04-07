const multer = require('multer')
const path = require('path')
const fs = require('fs')

const uploadRoot = path.join(__dirname, '..', 'public', 'uploads')
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true })
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`)
  }
})

const hasCloudinary =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET

let storage

if (hasCloudinary) {
  const cloudinary = require('cloudinary').v2
  const { CloudinaryStorage } = require('multer-storage-cloudinary')

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  })

  storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
      folder: 'dkgpro',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    })
  })
  console.log('[multer] Using Cloudinary storage')
} else {
  storage = diskStorage
  console.warn(
    '[multer] CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET not all set — using local disk storage (public/uploads). Set Cloudinary env vars for production uploads.'
  )
}

const upload = multer({ storage })

/**
 * Public URL or path to persist (Cloudinary secure_url vs /uploads/... for disk).
 */
function getStoredFileUrl(file) {
  if (!file) return undefined
  const p = file.path
  if (p && (p.startsWith('http://') || p.startsWith('https://'))) {
    return p
  }
  if (file.filename) {
    return `/uploads/${file.filename}`
  }
  return p
}

upload.getStoredFileUrl = getStoredFileUrl

module.exports = upload
