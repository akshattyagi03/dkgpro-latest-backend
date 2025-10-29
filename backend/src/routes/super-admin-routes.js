const express = require('express')
const {
  sendOTP,
  verifyOTP,
  sendResetOTP,
  verifyResetPassword,
  login,
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  getProducts,
  updateProduct,
  removeProduct,
  getVenues,
  editVenue,
  deleteVenue,
  logout
} = require('../controllers/super-admin-controller')
const { isSuperAdmin } = require('../middleware/auth')
const router = express.Router()

router.post('/send-otp', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Super admin creation only allowed in development environment' })
  }
  sendOTP(req, res)
})

router.post('/verify-otp', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Super admin creation only allowed in development environment' })
  }
  verifyOTP(req, res)
})

router.post('/forgot-password', sendResetOTP)
router.post('/reset-password', verifyResetPassword)

router.post('/login', login)
router.get("/pending-admins", isSuperAdmin, getPendingAdminRequests)
router.post("/approve-admin/:adminId", isSuperAdmin, approveAdminRequest)
router.post("/reject-admin/:adminId", isSuperAdmin, rejectAdminRequest)
router.get("/products", isSuperAdmin, getProducts)
router.put("/edit-product/:productId", isSuperAdmin, updateProduct)
router.delete("/delete-product/:productId", isSuperAdmin, removeProduct)
router.get("/venues", isSuperAdmin, getVenues)
router.put("/edit-venue/:venueId", isSuperAdmin, editVenue)
router.delete("/delete-venue/:venueId", isSuperAdmin, deleteVenue)
router.get("/logout", isSuperAdmin, logout)

module.exports = router