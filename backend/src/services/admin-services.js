const Admin = require('../models/admin-model')
const RefreshToken = require('../models/refresh-token-model')
const OTP = require('../models/otp-model')
const jwt = require('jsonwebtoken')
const { generateOTP } = require('../utils/otp-generator')
const { sendOTP } = require('../utils/email-service')
const { sendSMSOTP } = require('../utils/sms-service')

const generateAdminTokens = async (adminId) => {
  const accessToken = jwt.sign(
    { adminId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '15m' }
  )

  const refreshTokenValue = require('crypto').randomBytes(64).toString('hex')
  const refreshToken = new RefreshToken({
    token: refreshTokenValue,
    userId: adminId,
    userType: 'Admin',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  })

  await refreshToken.save()
  return { accessToken, refreshToken: refreshTokenValue }
}

const sendAdminOTP = async (adminData) => {
  const { email } = adminData

  const existingAdmin = await Admin.findOne({ email })
  if (existingAdmin) {
    throw new Error('Admin already exists')
  }

  const otp = generateOTP()
  await OTP.findOneAndDelete({ email, userType: 'Admin' })
  await new OTP({ email, otp, userType: 'Admin' }).save()
  await sendOTP(email, otp, 'Admin')

  return { message: 'OTP sent to email' }
}

const verifyAdminOTP = async (adminData) => {
  const { fullName, email, password, otp } = adminData

  const otpRecord = await OTP.findOne({ email, userType: 'Admin' })

  if (!otpRecord) {
    throw new Error('OTP not found')
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.findOneAndDelete({ email, userType: 'Admin' })
    throw new Error('OTP expired')
  }

  if (otpRecord.otp !== otp.toString()) {
    throw new Error('Invalid OTP')
  }

  const admin = new Admin({ fullName, email, password })
  await admin.save()
  await OTP.findOneAndDelete({ email, userType: 'Admin' })

  return { message: 'Admin registration submitted. Awaiting super admin approval.' }
}

const loginAdmin = async (adminData, res) => {
  const { email, password } = adminData
  const admin = await Admin.findOne({ email })
  if (!admin || !(await admin.comparePassword(password))) {
    throw new Error('Invalid credentials')
  }
  if (!admin.isApproved) {
    throw new Error('Admin account pending approval from super admin')
  }

  const { accessToken, refreshToken } = await generateAdminTokens(admin._id)

  res.cookie('adminAccessToken', accessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
  res.cookie('adminRefreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })

  return { admin: { id: admin._id, fullName: admin.fullName, email } }
}

const addProducts = async (productData, adminId) => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const Addon = require('../models/addon-model')
  const { addWatermarkToImages } = require('../utils/watermark-service')

  const {
    name,
    description,
    price,
    mainCategory,
    subCategory,
    thirdCategory,
    additionalCategories,
    customizationSections,
    isFeatured,
    tier,
    images,
    serviceableAreas,
    cancellationPolicy,
    tags,
    inclusions,
    experiences,
    keyHighlights
  } = productData

  const mainCat = await MainCategory.findOne({ name: mainCategory })
  if (!mainCat) throw new Error(`Main category '${mainCategory}' not found`)

  const subCat = await SubCategory.findOne({
    name: subCategory,
    mainCategory: mainCat._id
  })
  if (!subCat) throw new Error(`Sub category '${subCategory}' not found`)

  const thirdCat = await ThirdCategory.findOne({
    name: thirdCategory,
    subCategory: subCat._id
  })
  if (!thirdCat) throw new Error(`Third category '${thirdCategory}' not found`)

  const additionalCatIds = []
  if (additionalCategories?.length) {
    for (const addCatName of additionalCategories) {
      const addCat = await AdditionalCategory.findOne({ name: addCatName })
      if (!addCat) throw new Error(`Additional category '${addCatName}' not found`)
      additionalCatIds.push(addCat._id)
    }
  }

  const watermarkedImages = await addWatermarkToImages(images || [])

  const builtSections = []

  if (customizationSections?.length) {
    for (const section of customizationSections) {
      const addonEntries = []

      if (section.addons?.length) {
        for (const addonItem of section.addons) {
          const addon = await Addon.findOne({ name: addonItem.name })
          if (!addon) throw new Error(`Addon '${addonItem.name}' not found`)

          addonEntries.push({
            addon: addon._id,
            isDefault: addonItem.isDefault || false
          })
        }
      }

      // ✅ Remove duplicate addons
      const uniqueAddons = Array.from(
        new Map(addonEntries.map(a => [a.addon.toString(), a])).values()
      )

      builtSections.push({
        name: section.name,
        priority: section.priority || 0,
        addons: uniqueAddons
      })
    }
  }

  // ✅ Create product
  const product = new Product({
    name,
    description,
    price,
    mainCategory: mainCat._id,
    subCategory: subCat._id,
    thirdCategory: thirdCat._id,
    additionalCategories: additionalCatIds,
    customizationSections: builtSections,
    isFeatured: isFeatured || false,
    tier: tier || 'standard',
    images: watermarkedImages,
    addedBy: adminId,
    serviceableAreas: serviceableAreas || [],
    cancellationPolicy: cancellationPolicy || undefined,
    tags: tags || [],

    // ✅ ADD THESE
    inclusions: inclusions || [],
    experiences: experiences || [],
    keyHighlights: keyHighlights || []
  })

  await product.save()
  return product
}

const createBlog = async (blogData, adminId) => {
  const Blog = require('../models/blog-model')
  const { title, content, tags, published } = blogData

  const blog = new Blog({
    title,
    content,
    author: adminId,
    tags: tags || [],
    published: published || false
  })

  await blog.save()
  return blog
}

const getProducts = async (adminId) => {
  const Product = require('../models/product-model')
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  const Addons = require('../models/addon-model')
  const products = await Product.find({ addedBy: adminId })
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate('customizationSections.addons.addon')
  return products
}

const getCategories = async () => {
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')

  const categories = await MainCategory.find()

  const categoriesWithSubs = await Promise.all(categories.map(async (mainCat) => {
    const subCategories = await SubCategory.find({ mainCategory: mainCat._id })

    const subCategoriesWithThird = await Promise.all(subCategories.map(async (subCat) => {
      const thirdCategories = await ThirdCategory.find({ subCategory: subCat._id })
      return {
        ...subCat.toObject(),
        thirdCategories
      }
    }))

    return {
      ...mainCat.toObject(),
      subCategories: subCategoriesWithThird
    }
  }))

  return categoriesWithSubs
}

const getCategoryTree = async () => {
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')

  const mainCategories = await MainCategory.find()

  const categoryTree = await Promise.all(mainCategories.map(async (mainCat) => {
    const subCategories = await SubCategory.find({ mainCategory: mainCat._id })

    const subCategoriesWithChildren = await Promise.all(subCategories.map(async (subCat) => {
      const thirdCategories = await ThirdCategory.find({ subCategory: subCat._id })

      const thirdCategoriesWithChildren = await Promise.all(thirdCategories.map(async (thirdCat) => {
        const additionalCategories = await AdditionalCategory.find({
          parentCategory: thirdCat._id,
          parentModel: 'ThirdCategory'
        })

        const buildAdditionalTree = async (categories) => {
          return await Promise.all(categories.map(async (cat) => {
            const children = await AdditionalCategory.find({
              parentCategory: cat._id,
              parentModel: 'AdditionalCategory'
            })
            return {
              ...cat.toObject(),
              children: children.length > 0 ? await buildAdditionalTree(children) : []
            }
          }))
        }

        return {
          ...thirdCat.toObject(),
          additionalCategories: await buildAdditionalTree(additionalCategories)
        }
      }))

      return {
        ...subCat.toObject(),
        thirdCategories: thirdCategoriesWithChildren
      }
    }))

    return {
      ...mainCat.toObject(),
      subCategories: subCategoriesWithChildren
    }
  }))

  return categoryTree
}

const addMainCategory = async (categoryData) => {
  const MainCategory = require('../models/main-category-model')
  const { name } = categoryData
  const category = new MainCategory({ name })
  await category.save()
  return category
}

const addAdditionalCategory = async (data) => {
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')

  const { name, description, parentName, parentModel } = data

  if (!['ThirdCategory', 'AdditionalCategory'].includes(parentModel)) {
    throw new Error('Invalid parent model')
  }

  let parent
  let parentId
  let level

  // 🔹 Find parent by name
  if (parentModel === 'ThirdCategory') {
    parent = await ThirdCategory.findOne({ name: parentName })
    if (!parent) throw new Error(`ThirdCategory '${parentName}' not found`)

    parentId = parent._id
    level = 4
  }

  if (parentModel === 'AdditionalCategory') {
    parent = await AdditionalCategory.findOne({ name: parentName })
    if (!parent) throw new Error(`AdditionalCategory '${parentName}' not found`)

    parentId = parent._id
    level = parent.level + 1
  }

  // 🔹 Prevent duplicates (IMPORTANT: include parentModel)
  const existing = await AdditionalCategory.findOne({
    name,
    parentCategory: parentId,
    parentModel
  })

  if (existing) return existing

  // 🔹 Create category
  const newCategory = await AdditionalCategory.create({
    name,
    description,
    parentCategory: parentId,
    parentModel,
    level
  })

  return newCategory
}

const addSubCategory = async (categoryData) => {
  const SubCategory = require('../models/sub-category-model')
  const MainCategory = require('../models/main-category-model')

  const { name, description, mainCategory } = categoryData

  // Find main category
  const mainCat = await MainCategory.findOne({ name: mainCategory })
  if (!mainCat) {
    throw new Error(`Main category '${mainCategory}' not found`)
  }

  // Optional: prevent duplicates under same main category
  const existing = await SubCategory.findOne({
    name,
    mainCategory: mainCat._id
  })
  if (existing) {
    throw new Error(`Sub category '${name}' already exists`)
  }

  // Create subcategory
  const subCategoryDoc = await SubCategory.create({
    name,
    description,
    mainCategory: mainCat._id
  })

  return subCategoryDoc
}

const addThirdCategory = async (categoryData) => {
  const ThirdCategory = require('../models/third-category-model')
  const SubCategory = require('../models/sub-category-model')

  const { name, description, subCategory } = categoryData

  // Find subcategory
  const subCat = await SubCategory.findOne({ name: subCategory })
  if (!subCat) {
    throw new Error(`Sub category '${subCategory}' not found`)
  }

  // Optional: prevent duplicates under same subcategory
  const existing = await ThirdCategory.findOne({
    name,
    subCategory: subCat._id
  })
  if (existing) {
    throw new Error(`Third category '${name}' already exists`)
  }

  // Create third category
  const thirdCategoryDoc = await ThirdCategory.create({
    name,
    description,
    subCategory: subCat._id
  })

  return thirdCategoryDoc
}

const createCategoryHierarchy = async (categoryData, retries = 3) => {
  const mongoose = require('mongoose')

  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')

  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    const { mainCategory, subCategory, thirdCategory, additionalCategories } = categoryData

    let mainCat = await MainCategory.findOne({ name: mainCategory.name }).session(session)
    if (!mainCat) {
      mainCat = (await MainCategory.create([mainCategory], { session }))[0]
    }

    let subCat = await SubCategory.findOne({
      name: subCategory.name,
      mainCategory: mainCat._id
    }).session(session)

    if (!subCat) {
      subCat = (await SubCategory.create([{
        ...subCategory,
        mainCategory: mainCat._id
      }], { session }))[0]
    }

    let thirdCat = await ThirdCategory.findOne({
      name: thirdCategory.name,
      subCategory: subCat._id
    }).session(session)

    if (!thirdCat) {
      thirdCat = (await ThirdCategory.create([{
        ...thirdCategory,
        subCategory: subCat._id
      }], { session }))[0]
    }

    const additionalCats = []

    if (additionalCategories?.length) {
      let parentCategory = thirdCat._id
      let parentModel = 'ThirdCategory'

      for (let i = 0; i < additionalCategories.length; i++) {
        const addCatData = additionalCategories[i]

        let addCat = await AdditionalCategory.findOne({
          name: addCatData.name,
          parentCategory,
          parentModel,
          level: 4 + i
        }).session(session)

        if (!addCat) {
          addCat = (await AdditionalCategory.create([{
            ...addCatData,
            parentCategory,
            parentModel,
            level: 4 + i
          }], { session }))[0]
        }

        additionalCats.push(addCat)
        parentCategory = addCat._id
        parentModel = 'AdditionalCategory'
      }
    }

    await session.commitTransaction()
    session.endSession()

    return {
      mainCategory: mainCat,
      subCategory: subCat,
      thirdCategory: thirdCat,
      additionalCategories: additionalCats
    }

  } catch (error) {
    await session.abortTransaction()
    session.endSession()

    // 🔥 Retry logic
    if (
      retries > 0 &&
      (
        error.errorLabels?.includes('TransientTransactionError') ||
        error.message.includes('Please retry your operation')
      )
    ) {
      console.log('Retrying transaction...', retries)
      return createCategoryHierarchy(categoryData, retries - 1)
    }

    throw error
  }
}

const getBlogs = async (adminId) => {
  const Blog = require('../models/blog-model')
  const blogs = await Blog.find({ author: adminId }).populate('author')
  return blogs
}

const editBlog = async (blogId, adminId, updateData) => {
  const Blog = require('../models/blog-model')

  const existingBlog = await Blog.findById(blogId)
  if (!existingBlog) {
    throw new Error('Blog not found')
  }

  if (existingBlog.author.toString() !== adminId.toString()) {
    throw new Error('Unauthorized access')
  }

  const blog = await Blog.findByIdAndUpdate(
    blogId,
    updateData,
    { new: true }
  )

  return blog
}

const deleteBlog = async (blogId, adminId) => {
  const Blog = require('../models/blog-model')

  const existingBlog = await Blog.findById(blogId)
  if (!existingBlog) {
    throw new Error('Blog not found')
  }

  if (existingBlog.author.toString() !== adminId.toString()) {
    throw new Error('Unauthorized access')
  }

  const blog = await Blog.findByIdAndDelete(blogId)
  return blog
}

const refreshAdminAccessToken = async (refreshTokenValue) => {
  const refreshToken = await RefreshToken.findOne({
    token: refreshTokenValue,
    userType: 'Admin',
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  })

  if (!refreshToken) {
    throw new Error('Invalid or expired refresh token')
  }

  const accessToken = jwt.sign(
    { adminId: refreshToken.userId },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '15m' }
  )

  return { accessToken }
}

const logoutAdmin = async (refreshTokenValue) => {
  if (refreshTokenValue) {
    await RefreshToken.findOneAndUpdate(
      { token: refreshTokenValue, userType: 'Admin' },
      { isRevoked: true }
    )
  }
}

const addVenue = async (venueData, adminId) => {
  const Venue = require('../models/venue-model')
  const {
    name, location, images, description, capacity,
    startingPrice, typesOfVenues, accessibilityFeatures,
    facilities, restrictions, otherInformation, supportedEvents
  } = venueData

  const venue = new Venue({
    name,
    location,
    images: images || [],
    description,
    capacity,
    startingPrice,
    typesOfVenues: typesOfVenues || [],
    accessibilityFeatures: accessibilityFeatures || [],
    facilities: facilities || [],
    restrictions: restrictions || [],
    otherInformation,
    supportedEvents: supportedEvents || []
  })

  await venue.save()
  return venue
}

const getVenues = async () => {
  const Venue = require('../models/venue-model')
  const venues = await Venue.find()
  return venues
}

const addAddon = async (addonData) => {
  const Addon = require('../models/addon-model')
  const { name, description, price, image, category, tags, customFields } = addonData

  const addon = new Addon({ name, description, price, image, category, tags: tags || [], customFields: customFields || [] })
  await addon.save()
  return addon
}


const sendAdminPasswordResetOTP = async (adminData) => {
  const { email } = adminData

  const admin = await Admin.findOne({ email })
  if (!admin) {
    throw new Error('Admin not found')
  }

  const otp = generateOTP()
  await OTP.findOneAndDelete({ email, userType: 'AdminPasswordReset' })
  await new OTP({ email, otp, userType: 'AdminPasswordReset' }).save()
  await sendOTP(email, otp, 'Admin Password Reset')

  return { message: 'Password reset OTP sent to email' }
}

const resetAdminPassword = async (adminData) => {
  const { email, otp, newPassword } = adminData

  if (!newPassword) {
    throw new Error('New password is required')
  }

  const otpRecord = await OTP.findOne({ email, userType: 'AdminPasswordReset' })

  if (!otpRecord) {
    throw new Error('OTP not found')
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.findOneAndDelete({ email, userType: 'AdminPasswordReset' })
    throw new Error('OTP expired')
  }

  if (otpRecord.otp !== otp.toString()) {
    throw new Error('Invalid OTP')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await Admin.findOneAndUpdate(
    { email },
    { password: hashedPassword }
  )
  await OTP.findOneAndDelete({ email, userType: 'AdminPasswordReset' })

  return { message: 'Password reset successfully' }
}

const toggleProductFeatured = async (productId, adminId, featuredData) => {
  const Product = require('../models/product-model')
  const { isFeatured } = featuredData

  const existingProduct = await Product.findById(productId)
  if (!existingProduct) {
    throw new Error('Product not found')
  }

  if (existingProduct.addedBy.toString() !== adminId.toString()) {
    throw new Error('Unauthorized access')
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { isFeatured },
    { new: true }
  )

  return product
}

const toggleProductTier = async (productId, adminId, tierData) => {
  const Product = require('../models/product-model')
  const { tier } = tierData

  if (!['standard', 'premium'].includes(tier)) {
    throw new Error('Invalid tier. Must be either standard or premium')
  }

  const existingProduct = await Product.findById(productId)
  if (!existingProduct) {
    throw new Error('Product not found')
  }

  if (existingProduct.addedBy.toString() !== adminId.toString()) {
    throw new Error('Unauthorized access')
  }

  const product = await Product.findByIdAndUpdate(
    productId,
    { tier },
    { new: true }
  )

  return product
}

const getCustomizationSections = async () => {
  const CustomizationSection = require('../models/customization-section-model')
  const sections = await CustomizationSection.find()
    .populate('subSections.addons')
  return sections
}

const sendAdminPhoneOTP = async (userData) => {
  let { phoneNumber } = userData

  if (!phoneNumber.startsWith('+91')) {
    phoneNumber = `+91${phoneNumber}`
  }

  const otp = generateOTP()
  await OTP.findOneAndDelete({ phoneNumber, userType: 'AdminPhoneLogin' })
  await new OTP({ phoneNumber, otp, userType: 'AdminPhoneLogin' }).save()
  await sendSMSOTP(phoneNumber, otp)

  return { message: 'OTP sent to phone' }
}

const verifyAdminPhoneLogin = async (userData, res) => {
  let { phoneNumber, otp, fullName, email, password } = userData

  if (!phoneNumber.startsWith('+91')) {
    phoneNumber = `+91${phoneNumber}`
  }

  const otpRecord = await OTP.findOne({ phoneNumber, userType: 'AdminPhoneLogin' })

  if (!otpRecord) {
    throw new Error('OTP not found')
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.findOneAndDelete({ phoneNumber, userType: 'AdminPhoneLogin' })
    throw new Error('OTP expired')
  }

  if (otpRecord.otp !== otp.toString()) {
    throw new Error('Invalid OTP')
  }

  let admin = await Admin.findOne({ phoneNumber })

  if (!admin) {
    if (!fullName || !email || !password) {
      throw new Error('Full name, email and password required for new admin')
    }
    admin = new Admin({
      fullName,
      email,
      phoneNumber
    })
    admin.password = password
    await admin.save()

    await OTP.findOneAndDelete({ phoneNumber, userType: 'AdminPhoneLogin' })
    return { message: 'Admin registration submitted. Awaiting super admin approval.' }
  }

  if (!admin.isApproved) {
    throw new Error('Admin account pending approval from super admin')
  }

  await OTP.findOneAndDelete({ phoneNumber, userType: 'AdminPhoneLogin' })

  const { accessToken, refreshToken } = await generateAdminTokens(admin._id)

  res.cookie('adminAccessToken', accessToken, { httpOnly: true, secure: false, maxAge: 15 * 60 * 1000 })
  res.cookie('adminRefreshToken', refreshToken, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 })

  return { admin: { id: admin._id, fullName: admin.fullName, email: admin.email, phoneNumber: admin.phoneNumber } }
}

module.exports = {
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
  getCustomizationSections,
  toggleProductFeatured,
  toggleProductTier,
  addVenue,
  getVenues,
  getBlogs,
  editBlog,
  deleteBlog,
  refreshAdminAccessToken,
  logoutAdmin,
  addAdditionalCategory
}