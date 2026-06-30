const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { getWatermarkTransformation, applyWatermarkToSvgUrl } = require('../src/utils/watermark-service')

const uploadRoot = path.join(__dirname, '..', 'public', 'uploads')
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true })
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml'
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.svg']

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`), false)
  }
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
    params: (req, file) => {
      const isSvg = file.mimetype === 'image/svg+xml'
      return {
        folder: 'dkgpro',
        resource_type: isSvg ? 'raw' : 'image',
        format: isSvg ? 'svg' : undefined,
        allowed_formats: isSvg ? undefined : ['jpg', 'jpeg', 'png', 'webp'],
        transformation: isSvg ? [] : getWatermarkTransformation()
      }
    }
  })
  console.log('[multer] Using Cloudinary storage')
} else {
  storage = diskStorage
  console.warn(
    '[multer] CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET not all set — using local disk storage (public/uploads). Set Cloudinary env vars for production uploads.'
  )
}

const upload = multer({ storage, fileFilter })

/**
 * Upload instance WITHOUT watermark — used for review images and additional-category banners.
 */
let noWatermarkStorage

if (hasCloudinary) {
  const cloudinary = require('cloudinary').v2
  const { CloudinaryStorage } = require('multer-storage-cloudinary')

  noWatermarkStorage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      const isSvg = file.mimetype === 'image/svg+xml'
      return {
        folder: 'dkgpro',
        resource_type: isSvg ? 'raw' : 'image',
        format: isSvg ? 'svg' : undefined,
        allowed_formats: isSvg ? undefined : ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [] // no watermark
      }
    }
  })
} else {
  noWatermarkStorage = diskStorage
}

const uploadNoWatermark = multer({ storage: noWatermarkStorage, fileFilter })

/**
 * Public URL or path to persist (Cloudinary secure_url vs /uploads/... for disk).
 */
function getStoredFileUrl(file) {
  if (!file) return undefined
  const p = file.path
  if (p && (p.startsWith('http://') || p.startsWith('https://'))) {
    // apply watermark URL transformation for SVGs
    if (file.mimetype === 'image/svg+xml' || (file.originalname && file.originalname.toLowerCase().endsWith('.svg'))) {
      return applyWatermarkToSvgUrl(p)
    }
    return p
  }
  if (file.filename) {
    return `/uploads/${file.filename}`
  }
  return p
}

upload.getStoredFileUrl = getStoredFileUrl
uploadNoWatermark.getStoredFileUrl = getStoredFileUrl

module.exports = upload
module.exports.uploadNoWatermark = uploadNoWatermark