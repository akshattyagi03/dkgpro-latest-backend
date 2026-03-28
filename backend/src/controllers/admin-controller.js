const { 
  sendAdminOTP, 
  verifyAdminOTP, 
  sendAdminPasswordResetOTP,
  resetAdminPassword,
  sendAdminPhoneOTP,
  verifyAdminPhoneLogin,
  loginAdmin, 
  addProducts, 
  createBlog, 
  getProducts, 
  getCategories, 
  getCategoryTree,
  addMainCategory, 
  addSubCategory, 
  addThirdCategory, 
  createCategoryHierarchy,
  addAddon,
  createCustomizationSection,
  getCustomizationSections,
  toggleProductFeatured,
  toggleProductTier,
  addVenue,
  getVenues,
  getBlogs, 
  editBlog, 
  deleteBlog,
  logoutAdmin,
  addAdditionalCategory
} = require('../services/admin-services')

const sendOTP = async (req, res) => {
  try {
    const result = await sendAdminOTP(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const verifyOTP = async (req, res) => {
  try {
    const result = await verifyAdminOTP(req.body)
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
    if (error.message === 'Unauthorized access') {
      return res.status(403).json({ message: error.message })
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message })
    }
    res.status(400).json({ message: error.message })
  }
}

const removeBlog = async (req, res) => {
  try {
    await deleteBlog(req.params.blogId, req.admin._id)
    res.status(200).json({ message: 'Blog deleted successfully' })
  } catch (error) {
    if (error.message === 'Unauthorized access') {
      return res.status(403).json({ message: error.message })
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message })
    }
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

const createCategoryTree = async (req, res) => {
  try {
    const result = await createCategoryHierarchy(req.body)
    res.status(201).json({ message: 'Category hierarchy created successfully', result })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createVenue = async (req, res) => {
  try {
    const venue = await addVenue(req.body, req.admin._id)
    res.status(201).json({ message: 'Venue added successfully', venue })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getAllVenues = async (req, res) => {
  try {
    const venues = await getVenues()
    res.status(200).json({ venues })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getCategoryTreeView = async (req, res) => {
  try {
    const categoryTree = await getCategoryTree()
    res.status(200).json({ categoryTree })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createAddon = async (req, res) => {
  try {
    const addon = await addAddon(req.body)
    res.status(201).json({ message: 'Addon created successfully', addon })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createCustomizationSectionController = async (req, res) => {
  try {
    const section = await createCustomizationSection(req.body)
    res.status(201).json({ message: 'Customization section created successfully', section })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const sendResetOTP = async (req, res) => {
  try {
    const result = await sendAdminPasswordResetOTP(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createAdditionalCategory = async (req, res) => {
  try {
    const { name, description, parentName, parentModel } = req.body

    if (!name || !parentName || !parentModel) {
      return res.status(400).json({
        success: false,
        message: 'name, parentName and parentModel are required'
      })
    }

    if (!['ThirdCategory', 'AdditionalCategory'].includes(parentModel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parentModel'
      })
    }

    const category = await addAdditionalCategory({
      name,
      description,
      parentName,
      parentModel
    })

    return res.status(201).json({
      success: true,
      message: 'Additional category created successfully',
      data: category
    })

  } catch (error) {
    console.error(error)

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Category already exists under this parent'
      })
    }

    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
}


const verifyResetPassword = async (req, res) => {
  try {
    const result = await resetAdminPassword(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const toggleFeatured = async (req, res) => {
  try {
    const product = await toggleProductFeatured(req.params.productId, req.admin._id, req.body)
    res.status(200).json({ message: 'Product featured status updated', product })
  } catch (error) {
    if (error.message === 'Unauthorized access') {
      return res.status(403).json({ message: error.message })
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message })
    }
    res.status(400).json({ message: error.message })
  }
}

const toggleTier = async (req, res) => {
  try {
    const product = await toggleProductTier(req.params.productId, req.admin._id, req.body)
    res.status(200).json({ message: 'Product tier updated', product })
  } catch (error) {
    if (error.message === 'Unauthorized access') {
      return res.status(403).json({ message: error.message })
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message })
    }
    res.status(400).json({ message: error.message })
  }
}

const getAllCustomizationSections = async (req, res) => {
  try {
    const sections = await getCustomizationSections()
    res.status(200).json({ customizationSections: sections })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const sendPhoneOTP = async (req, res) => {
  try {
    const result = await sendAdminPhoneOTP(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const verifyPhoneLogin = async (req, res) => {
  try {
    const result = await verifyAdminPhoneLogin(req.body, res)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

module.exports = {
  sendOTP,
  verifyOTP,
  sendResetOTP,
  verifyResetPassword,
  sendPhoneOTP,
  verifyPhoneLogin,
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
  createCustomizationSection: createCustomizationSectionController,
  getAllCustomizationSections,
  toggleFeatured,
  toggleTier,
  createVenue,
  getAllVenues,
  createNewBlog,
  getAdminBlogs,
  updateBlog,
  removeBlog,
  logout,
  createAdditionalCategory
}