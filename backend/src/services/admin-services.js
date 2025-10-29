const Admin = require('../models/admin-model')
const RefreshToken = require('../models/refresh-token-model')
const OTP = require('../models/otp-model')
const jwt = require('jsonwebtoken')
const { generateOTP } = require('../utils/otp-generator')
const { sendOTP } = require('../utils/email-service')

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
  const CustomizationSection = require('../models/customization-section-model')
  
  const { name, description, price, mainCategory, subCategory, thirdCategory, additionalCategories, customizationSections, keywords, images, serviceableAreas } = productData
  
  const mainCat = await MainCategory.findOne({ name: mainCategory })
  if (!mainCat) throw new Error(`Main category '${mainCategory}' not found`)
  
  const subCat = await SubCategory.findOne({ name: subCategory, mainCategory: mainCat._id })
  if (!subCat) throw new Error(`Sub category '${subCategory}' not found`)
  
  const thirdCat = await ThirdCategory.findOne({ name: thirdCategory, subCategory: subCat._id })
  if (!thirdCat) throw new Error(`Third category '${thirdCategory}' not found`)
  
  const additionalCatIds = []
  if (additionalCategories && additionalCategories.length > 0) {
    for (const addCatName of additionalCategories) {
      const addCat = await AdditionalCategory.findOne({ name: addCatName })
      if (!addCat) throw new Error(`Additional category '${addCatName}' not found`)
      additionalCatIds.push(addCat._id)
    }
  }
  
  const customizationSectionIds = []
  if (customizationSections && customizationSections.length > 0) {
    for (const sectionName of customizationSections) {
      const section = await CustomizationSection.findOne({ name: sectionName })
      if (!section) throw new Error(`Customization section '${sectionName}' not found`)
      customizationSectionIds.push(section._id)
    }
  }
  
  const product = new Product({
    name,
    description,
    price,
    mainCategory: mainCat._id,
    subCategory: subCat._id,
    thirdCategory: thirdCat._id,
    additionalCategories: additionalCatIds,
    customizationSections: customizationSectionIds,
    keywords: keywords || [],
    images: images || [],
    addedBy: adminId,
    serviceableAreas: serviceableAreas || []
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
  const products = await Product.find({ addedBy: adminId })
    .populate('mainCategory')
    .populate('subCategory')
    .populate('thirdCategory')
    .populate('additionalCategories')
    .populate({
      path: 'customizationSections',
      populate: {
        path: 'subSections.addons'
      }
    })
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
  const { name, description } = categoryData
  const category = new MainCategory({ name, description })
  await category.save()
  return category
}

const addSubCategory = async (categoryData) => {
  const SubCategory = require('../models/sub-category-model')
  const MainCategory = require('../models/main-category-model')
  const { name, description, mainCategory } = categoryData
  
  const mainCat = await MainCategory.findOne({ name: mainCategory })
  if (!mainCat) throw new Error(`Main category '${mainCategory}' not found`)
  
  const subCategory = new SubCategory({ name, description, mainCategory: mainCat._id })
  await subCategory.save()
  return subCategory
}

const addThirdCategory = async (categoryData) => {
  const ThirdCategory = require('../models/third-category-model')
  const SubCategory = require('../models/sub-category-model')
  const { name, description, subCategory } = categoryData
  
  const subCat = await SubCategory.findOne({ name: subCategory })
  if (!subCat) throw new Error(`Sub category '${subCategory}' not found`)
  
  const thirdCategory = new ThirdCategory({ name, description, subCategory: subCat._id })
  await thirdCategory.save()
  return thirdCategory
}

const createCategoryHierarchy = async (categoryData) => {
  const MainCategory = require('../models/main-category-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')
  const AdditionalCategory = require('../models/additional-category-model')
  
  const { mainCategory, subCategory, thirdCategory, additionalCategories } = categoryData
  
  // Create or find main category
  let mainCat = await MainCategory.findOne({ name: mainCategory.name })
  if (!mainCat) {
    mainCat = new MainCategory(mainCategory)
    await mainCat.save()
  }
  
  // Create or find sub category
  let subCat = await SubCategory.findOne({ name: subCategory.name, mainCategory: mainCat._id })
  if (!subCat) {
    subCat = new SubCategory({ ...subCategory, mainCategory: mainCat._id })
    await subCat.save()
  }
  
  // Create or find third category
  let thirdCat = await ThirdCategory.findOne({ name: thirdCategory.name, subCategory: subCat._id })
  if (!thirdCat) {
    thirdCat = new ThirdCategory({ ...thirdCategory, subCategory: subCat._id })
    await thirdCat.save()
  }
  
  // Create additional categories if provided
  const additionalCats = []
  if (additionalCategories && additionalCategories.length > 0) {
    let parentCategory = thirdCat._id
    let parentModel = 'ThirdCategory'
    
    for (let i = 0; i < additionalCategories.length; i++) {
      const addCatData = additionalCategories[i]
      let addCat = await AdditionalCategory.findOne({ 
        name: addCatData.name, 
        parentCategory, 
        level: 4 + i 
      })
      
      if (!addCat) {
        addCat = new AdditionalCategory({
          ...addCatData,
          parentCategory,
          parentModel,
          level: 4 + i
        })
        await addCat.save()
      }
      
      additionalCats.push(addCat)
      parentCategory = addCat._id
      parentModel = 'AdditionalCategory'
    }
  }
  
  return {
    mainCategory: mainCat,
    subCategory: subCat,
    thirdCategory: thirdCat,
    additionalCategories: additionalCats
  }
}

const getBlogs = async (adminId) => {
  const Blog = require('../models/blog-model')
  const blogs = await Blog.find({ author: adminId }).populate('author')
  return blogs
}

const editBlog = async (blogId, adminId, updateData) => {
  const Blog = require('../models/blog-model')
  const blog = await Blog.findOneAndUpdate(
    { _id: blogId, author: adminId },
    updateData,
    { new: true }
  )
  
  if (!blog) {
    throw new Error('Blog not found or unauthorized')
  }
  
  return blog
}

const deleteBlog = async (blogId, adminId) => {
  const Blog = require('../models/blog-model')
  const blog = await Blog.findOneAndDelete({
    _id: blogId,
    author: adminId
  })
  
  if (!blog) {
    throw new Error('Blog not found or unauthorized')
  }
  
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
  const { name, location, images, description } = venueData
  
  const venue = new Venue({
    name,
    location,
    images: images || [],
    description
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
  const { name, description, price, image } = addonData
  
  const addon = new Addon({ name, description, price, image })
  await addon.save()
  return addon
}

const createCustomizationSection = async (sectionData) => {
  const CustomizationSection = require('../models/customization-section-model')
  const Addon = require('../models/addon-model')
  const { name, description, subSections } = sectionData
  
  const processedSubSections = await Promise.all(subSections.map(async (subSection) => {
    const addonIds = []
    
    if (subSection.addons && subSection.addons.length > 0) {
      for (const addonName of subSection.addons) {
        const addon = await Addon.findOne({ name: addonName })
        if (!addon) throw new Error(`Addon '${addonName}' not found`)
        addonIds.push(addon._id)
      }
    }
    
    return {
      name: subSection.name,
      description: subSection.description,
      addons: addonIds
    }
  }))
  
  const section = new CustomizationSection({
    name,
    description,
    subSections: processedSubSections
  })
  
  await section.save()
  return section
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

module.exports = { 
  sendAdminOTP, 
  verifyAdminOTP, 
  sendAdminPasswordResetOTP,
  resetAdminPassword,
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
  addVenue,
  getVenues,
  getBlogs, 
  editBlog, 
  deleteBlog,
  refreshAdminAccessToken,
  logoutAdmin
}