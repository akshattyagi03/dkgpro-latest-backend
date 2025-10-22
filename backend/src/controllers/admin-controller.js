const { 
  registerAdmin, 
  loginAdmin, 
  addProducts, 
  createBlog, 
  getProducts, 
  getCategories, 
  addMainCategory, 
  addSubCategory, 
  addThirdCategory, 
  getBlogs, 
  editBlog, 
  deleteBlog,
  logoutAdmin
} = require('../services/admin-services')

const register = async (req, res) => {
  try {
    const result = await registerAdmin(req.body, res)
    res.status(201).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const login = async (req, res) => {
  try {
    const result = await loginAdmin(req.body, res)
    res.json(result)
  } catch (error) {
    res.status(401).json({ message: error.message })
  }
}

const getHome = (req, res) => {
  res.status(200).json({admin: req.admin})
}

const addProduct = async (req, res) => {
  try {
    const product = await addProducts(req.body, req.admin._id)
    res.status(201).json({ message: 'Product added successfully', product })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getAdminProducts = async (req, res) => {
  try {
    const products = await getProducts(req.admin._id)
    res.status(200).json({ products })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getAllCategories = async (req, res) => {
  try {
    const categories = await getCategories()
    res.status(200).json({ categories })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createMainCategory = async (req, res) => {
  try {
    const category = await addMainCategory(req.body)
    res.status(201).json({ message: 'Main category added successfully', category })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createSubCategory = async (req, res) => {
  try {
    const subCategory = await addSubCategory(req.body)
    res.status(201).json({ message: 'Sub category added successfully', subCategory })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createThirdCategory = async (req, res) => {
  try {
    const thirdCategory = await addThirdCategory(req.body)
    res.status(201).json({ message: 'Third category added successfully', thirdCategory })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createNewBlog = async (req, res) => {
  try {
    const blog = await createBlog(req.body, req.admin._id)
    res.status(201).json({ message: 'Blog created successfully', blog })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getAdminBlogs = async (req, res) => {
  try {
    const blogs = await getBlogs(req.admin._id)
    res.status(200).json({blogs})
  } catch (error) {
    res.status(404).json({message: error.message})
  }
}

const updateBlog = async (req, res) => {
  try {
    const blog = await editBlog(req.params.blogId, req.admin._id, req.body)
    res.status(200).json({ message: 'Blog updated successfully', blog })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const removeBlog = async (req, res) => {
  try {
    await deleteBlog(req.params.blogId, req.admin._id)
    res.status(200).json({ message: 'Blog deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.adminRefreshToken
    await logoutAdmin(refreshToken)
    
    res.clearCookie('adminAccessToken')
    res.clearCookie('adminRefreshToken')
    res.status(200).json({message: "You are logged out."})
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
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
}