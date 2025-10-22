const express = require('express')
const {
  register,
  login,
  getHome,
  addProduct,
  getAdminProducts,
  getAllCategories,
  createMainCategory,
  createSubCategory,
  createThirdCategory,
  createNewBlog,
  getAdminBlogs,
  updateBlog,
  removeBlog,
  logout
} = require('../controllers/admin-controller')
const { isAdmin } = require('../middleware/auth')
const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.get("/home", isAdmin, getHome)
router.post("/addproducts", isAdmin, addProduct)
router.get("/products", isAdmin, getAdminProducts)
router.get("/categories", isAdmin, getAllCategories)
router.post("/addcategory", isAdmin, createMainCategory)
router.post("/addsubcategory", isAdmin, createSubCategory)
router.post("/addthirdcategory", isAdmin, createThirdCategory)
router.post("/create-blog", isAdmin, createNewBlog)
router.get("/blogs", isAdmin, getAdminBlogs)
router.put("/edit-blog/:blogId", isAdmin, updateBlog)
router.delete("/delete-blog/:blogId", isAdmin, removeBlog)
router.get("/logout", isAdmin, logout)

module.exports = router