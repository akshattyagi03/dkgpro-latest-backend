/**
 * Multer / Cloudinary may pass non-Error objects to next(err), which Express
 * stringifies as "[object Object]" in the default HTML error page.
 */
function formatUploadError(err) {
  if (!err) return 'File upload failed'
  if (typeof err === 'string') return err
  if (err instanceof Error && err.message) return err.message
  if (typeof err.message === 'string' && err.message) return err.message
  if (err.error && typeof err.error.message === 'string') return err.error.message
  if (err.http_code && err.message) return String(err.message)
  try {
    return JSON.stringify(err)
  } catch {
    return 'File upload failed'
  }
}

/** Wraps multer middleware so upload errors return JSON { message } instead of 500 HTML. */
function wrapUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: formatUploadError(err) })
      }
      next()
    })
  }
}

module.exports = { wrapUpload, formatUploadError }
