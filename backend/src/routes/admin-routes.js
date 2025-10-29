const express = require('express')
const {
  sendOTP,
  verifyOTP,
  sendResetOTP,
  verifyResetPassword,
  login,
  getHome,
  addProduct,
  getAdminProducts,
  getAllCategories,
  getCategoryTreeView,
  createMainCategory,
  createSubCategory,
  createThirdCategory,
  createCategoryTree,
  createAddon,
  createCustomizationSection,
  createVenue,
  getAllVenues,
  createNewBlog,
  getAdminBlogs,
  updateBlog,
  removeBlog,
  logout
} = require('../controllers/admin-controller')
const { isAdmin } = require('../middleware/auth')
const router = express.Router()

router.post('/send-otp', sendOTP)
router.post('/verify-otp', verifyOTP)
router.post('/forgot-password', sendResetOTP)
router.post('/reset-password', verifyResetPassword)
router.post('/login', login)
router.get("/home", isAdmin, getHome)
router.post("/addproducts", isAdmin, addProduct)
router.get("/products", isAdmin, getAdminProducts)
router.get("/categories", isAdmin, getAllCategories)
router.get("/category-tree", isAdmin, getCategoryTreeView)
router.post("/addcategory", isAdmin, createMainCategory)
router.post("/addsubcategory", isAdmin, createSubCategory)
router.post("/addthirdcategory", isAdmin, createThirdCategory)
router.post("/create-category-tree", isAdmin, createCategoryTree)
router.post("/add-addon", isAdmin, createAddon)
router.post("/add-customization-section", isAdmin, createCustomizationSection)
router.post("/add-venue", isAdmin, createVenue)
router.get("/venues", isAdmin, getAllVenues)
router.post("/create-blog", isAdmin, createNewBlog)
router.get("/blogs", isAdmin, getAdminBlogs)
router.put("/edit-blog/:blogId", isAdmin, updateBlog)
router.delete("/delete-blog/:blogId", isAdmin, removeBlog)
router.get("/logout", isAdmin, logout)

module.exports = router