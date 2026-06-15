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
  searchAddons,
  createCustomizationSection,
  getCustomizationSections,
  toggleProductFeatured,
  toggleProductTier,
  addVenue,
  getVenues,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  getAdminAnalytics,
  getOrderForInvoice,
  sendInvoiceToCustomer,
  getAllUsers,
  getBlogs, 
  editBlog, 
  deleteBlog,
  logoutAdmin,
  addAdditionalCategory,
  addHeroBanner
} = require('../services/admin-services')

const { generateInvoicePDF } = require('../utils/email-service')
const {
  getCorporateBookings,
  updateCorporateBookingStatus,
} = require('../services/super-admin-services')

const multerUpload = require('../../configuration/multer-config')

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
    const fileUrls = req.files ? req.files.map(f => f.path) : []

    let urlPart = []
    if (req.body.imagesUrls != null && req.body.imagesUrls !== '') {
      try {
        urlPart = typeof req.body.imagesUrls === 'string' ? JSON.parse(req.body.imagesUrls) : req.body.imagesUrls
      } catch {
        urlPart = []
      }
    }
    if (!Array.isArray(urlPart)) urlPart = []

    let order = []
    if (req.body.imagesOrder != null && req.body.imagesOrder !== '') {
      try {
        order = typeof req.body.imagesOrder === 'string' ? JSON.parse(req.body.imagesOrder) : req.body.imagesOrder
      } catch {
        order = []
      }
    }
    if (!Array.isArray(order)) order = []

    let images
    if (order.length > 0) {
      images = order
        .map((tag) => {
          if (typeof tag !== 'string') return null
          if (tag.startsWith('f')) {
            const i = parseInt(tag.slice(1), 10)
            return Number.isFinite(i) && fileUrls[i] != null ? fileUrls[i] : null
          }
          if (tag.startsWith('u')) {
            const i = parseInt(tag.slice(1), 10)
            return Number.isFinite(i) && urlPart[i] != null ? urlPart[i] : null
          }
          return null
        })
        .filter(Boolean)
    } else if (fileUrls.length) {
      images = [...fileUrls, ...urlPart]
    } else if (req.body.images != null) {
      if (typeof req.body.images === 'string') {
        try {
          images = JSON.parse(req.body.images)
        } catch {
          images = []
        }
      } else if (Array.isArray(req.body.images)) {
        images = req.body.images
      } else {
        images = []
      }
    } else {
      images = []
    }

    const body = { ...req.body }
    delete body.imagesUrls
    delete body.imagesOrder
    delete body.images

    const parseField = (key) => { if (typeof body[key] === 'string') { try { body[key] = JSON.parse(body[key]) } catch { body[key] = [] } } }
    parseField('serviceableAreas')
    parseField('customizationSections')
    parseField('additionalCategories')
    parseField('inclusions')
    parseField('experiences')
    parseField('keyHighlights')
    parseField('tags')
    parseField('balloonColorSelection')
    if (body.discountedPrice != null && body.discountedPrice !== '') body.discountedPrice = Number(body.discountedPrice)

    const product = await addProducts({ ...body, images }, req.admin._id)
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
    const bannerImage = multerUpload.getStoredFileUrl(req.file)
    const subCategory = await addSubCategory({ ...req.body, bannerImage })
    res.status(201).json({ message: 'Sub category added successfully', subCategory })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createThirdCategory = async (req, res) => {
  try {
    const bannerImage = multerUpload.getStoredFileUrl(req.file)
    const thirdCategory = await addThirdCategory({ ...req.body, bannerImage })
    res.status(201).json({ message: 'Third category added successfully', thirdCategory })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const createNewBlog = async (req, res) => {
  try {
    const image = req.file ? multerUpload.getStoredFileUrl(req.file) : req.body.featuredImage
    const blog = await createBlog({ ...req.body, image }, req.admin._id)
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
    const image = req.file ? multerUpload.getStoredFileUrl(req.file) : undefined
    const updateData = image ? { ...req.body, image } : req.body
    const blog = await editBlog(req.params.blogId, req.admin._id, updateData)
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
    await createCategoryHierarchy(req.body)
    const categoryTree = await getCategoryTree()
    res.status(201).json({ message: 'Category hierarchy created successfully', categoryTree })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

/** Parse nested JSON / comma-lists from multipart fields for add-venue. */
function normalizeVenueMultipartBody(body) {
  const out = { ...body }
  const parseMaybeJson = (v) => {
    if (v == null || v === '') return undefined
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) return v
    if (typeof v !== 'string') return v
    try {
      return JSON.parse(v)
    } catch {
      return v
    }
  }

  let imagesFromBody = out.images
  if (typeof imagesFromBody === 'string') {
    try {
      imagesFromBody = JSON.parse(imagesFromBody)
    } catch {
      imagesFromBody = []
    }
  }
  if (!Array.isArray(imagesFromBody)) {
    imagesFromBody = imagesFromBody ? [imagesFromBody] : []
  }
  delete out.images

  out.location = parseMaybeJson(out.location)
  if (!out.location || typeof out.location !== 'object' || !out.location.address) {
    const addr = out.address
    if (addr) {
      out.location = {
        address: String(addr),
        lat: out.lat !== '' && out.lat != null ? Number(out.lat) : undefined,
        lng: out.lng !== '' && out.lng != null ? Number(out.lng) : undefined
      }
    }
  }

  out.capacity = parseMaybeJson(out.capacity)
  out.otherInformation = parseMaybeJson(out.otherInformation)

  const arrField = (key) => {
    const parsed = parseMaybeJson(out[key])
    if (Array.isArray(parsed)) {
      out[key] = parsed.map(String).filter(Boolean)
      return
    }
    if (typeof out[key] === 'string') {
      out[key] = out[key].split(',').map((s) => s.trim()).filter(Boolean)
      return
    }
    out[key] = []
  }

  arrField('typesOfVenues')
  arrField('facilities')
  arrField('accessibilityFeatures')
  arrField('restrictions')
  arrField('supportedEvents')

  if (out.startingPrice != null && out.startingPrice !== '') {
    out.startingPrice = Number(out.startingPrice)
  }

  delete out.address
  delete out.lat
  delete out.lng

  return { normalized: out, imagesFromBody }
}

const createVenue = async (req, res) => {
  try {
    const fileUrls = req.files?.length
      ? req.files.map((f) => multerUpload.getStoredFileUrl(f))
      : []
    const { normalized, imagesFromBody } = normalizeVenueMultipartBody(req.body)
    const images = fileUrls.length ? fileUrls : imagesFromBody
    const venue = await addVenue({ ...normalized, images }, req.admin._id)
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
    const image = req.file ? multerUpload.getStoredFileUrl(req.file) : req.body.image
    const addon = await addAddon({ ...req.body, image })
    res.status(201).json({ message: 'Addon created successfully', addon })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const searchAddonsController = async (req, res) => {
  try {
    const addons = await searchAddons(req.query.q)
    res.status(200).json({ addons })
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
      parentModel,
      bannerImage: multerUpload.getStoredFileUrl(req.file)
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

const addHeroBannerController = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Banner image is required' })
    const banner = await addHeroBanner({ ...req.body, image: req.file.path }, { adminId: req.admin._id })
    res.status(201).json({ message: 'Hero banner added successfully', banner })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getOrdersController = async (req, res) => {
  try {
    const result = await getAdminOrders(req.admin._id, req.query.page, req.query.limit)
    res.status(200).json(result)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const getOrderByIdController = async (req, res) => {
  try {
    const order = await getAdminOrderById(req.admin._id, req.params.orderId)
    res.status(200).json({ order })
  } catch (error) {
    const msg = error.message || 'Failed to load order'
    const code = msg === 'Order not found' ? 404 : 400
    res.status(code).json({ message: msg })
  }
}

const getAllUsersController = async (req, res) => {
  try {
    const result = await getAllUsers(req.query.page, req.query.limit)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateOrderStatusController = async (req, res) => {
  try {
    const order = await updateOrderStatus(req.params.orderId, req.body.status)
    res.status(200).json({ message: 'Order status updated', order })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const viewInvoiceController = async (req, res) => {
  try {
    const { generateInvoicePDF } = require('../utils/email-service')
    const order = await getOrderForInvoice(req.params.orderId, req.admin._id)
    const pdfBuffer = await generateInvoicePDF(order)
    const orderNumber = `ORD-${order._id.toString().slice(-6).toUpperCase()}`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${orderNumber}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    const status = error.message.startsWith('Unauthorized') ? 403 : 404
    res.status(status).json({ message: error.message })
  }
}

const downloadInvoiceController = async (req, res) => {
  try {
    const { generateInvoicePDF } = require('../utils/email-service')
    const order = await getOrderForInvoice(req.params.orderId, req.admin._id)
    const pdfBuffer = await generateInvoicePDF(order)
    const orderNumber = `ORD-${order._id.toString().slice(-6).toUpperCase()}`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${orderNumber}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    const status = error.message.startsWith('Unauthorized') ? 403 : 404
    res.status(status).json({ message: error.message })
  }
}

const getAnalyticsController = async (req, res) => {
  try {
    const analytics = await getAdminAnalytics(req.admin._id)
    res.status(200).json(analytics)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const invoiceErrorResponse = (res, error) => {
  const msg = error.message || 'Failed to process invoice'
  if (msg === 'Order not found') return res.status(404).json({ message: msg })
  if (msg.startsWith('Unauthorized')) return res.status(403).json({ message: msg })
  return res.status(400).json({ message: msg })
}

const viewInvoice = async (req, res) => {
  try {
    const order = await getOrderForInvoice(req.params.orderId, req.admin._id)
    const pdfBuffer = await generateInvoicePDF(order)
    const suffix = order._id.toString().slice(-6).toUpperCase()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="Invoice-ORD-${suffix}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    invoiceErrorResponse(res, error)
  }
}

const downloadInvoice = async (req, res) => {
  try {
    const order = await getOrderForInvoice(req.params.orderId, req.admin._id)
    const pdfBuffer = await generateInvoicePDF(order)
    const suffix = order._id.toString().slice(-6).toUpperCase()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-ORD-${suffix}.pdf"`)
    res.send(pdfBuffer)
  } catch (error) {
    invoiceErrorResponse(res, error)
  }
}

const sendInvoiceToCustomerController = async (req, res) => {
  try {
    const result = await sendInvoiceToCustomer(req.params.orderId, req.admin._id)
    res.status(200).json(result)
  } catch (error) {
    invoiceErrorResponse(res, error)
  }
}

const getCorporateBookingsController = async (req, res) => {
  try {
    const bookings = await getCorporateBookings()
    res.status(200).json({ bookings })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

const updateCorporateBookingStatusController = async (req, res) => {
  try {
    const { status } = req.body
    const booking = await updateCorporateBookingStatus(req.params.contactId, status)
    res.status(200).json({ message: 'Status updated', booking })
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
  searchAddons: searchAddonsController,
  getAllCustomizationSections,
  toggleFeatured,
  toggleTier,
  createVenue,
  getAllVenues,
  getOrders: getOrdersController,
  viewInvoice: viewInvoiceController,
  downloadInvoice: downloadInvoiceController,
  sendInvoiceToCustomer: sendInvoiceToCustomerController,
  getAllUsers: getAllUsersController,
  getOrderById: getOrderByIdController,
  updateOrderStatus: updateOrderStatusController,
  getAnalytics: getAnalyticsController,
  viewInvoice,
  downloadInvoice,
  sendInvoiceToCustomer: sendInvoiceToCustomerController,
  createNewBlog,
  getAdminBlogs,
  updateBlog,
  removeBlog,
  logout,
  createAdditionalCategory,
  addHeroBanner: addHeroBannerController,
  getCorporateBookings: getCorporateBookingsController,
  updateCorporateBookingStatus: updateCorporateBookingStatusController,
}