const express = require('express')
const {
  register,
  login,
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  getProducts,
  updateProduct,
  removeProduct,
  logout
} = require('../controllers/super-admin-controller')
const { isSuperAdmin } = require('../middleware/auth')
const router = express.Router()

router.post('/register', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Super admin creation only allowed in development environment' })
  }
  register(req, res)
})

router.post('/login', login)
router.get("/pending-admins", isSuperAdmin, getPendingAdminRequests)
router.post("/approve-admin/:adminId", isSuperAdmin, approveAdminRequest)
router.post("/reject-admin/:adminId", isSuperAdmin, rejectAdminRequest)
router.get("/products", isSuperAdmin, getProducts)
router.put("/edit-product/:productId", isSuperAdmin, updateProduct)
router.delete("/delete-product/:productId", isSuperAdmin, removeProduct)
router.get("/logout", isSuperAdmin, logout)

module.exports = router