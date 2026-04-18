const Admin = require('../models/admin-model')
const RefreshToken = require('../models/refresh-token-model')
const OTP = require('../models/otp-model')
const bcrypt = require('bcryptjs')
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
    discountedPrice,
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

  if (discountedPrice && Number(discountedPrice) >= Number(price)) {
    throw new Error('Discounted price must be less than original price')
  }

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

  const watermarkedImages = images && images.length > 0 && images[0].startsWith('http')
    ? images  // already Cloudinary URLs, skip watermarking
    : await addWatermarkToImages(images || [])

  const builtSections = []

  if (customizationSections?.length) {
    for (const section of customizationSections) {
      const addonEntries = []

      if (section.addons?.length) {
        for (const addonItem of section.addons) {
          const addon = await Addon.findOne({ name: addonItem.name })
          if (!addon) throw new Error(`Addon '${addonItem.name}' not found`)

          addonEntries.push({
            addon: addon._id
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
    discountedPrice: discountedPrice ? Number(discountedPrice) : null,
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

function normalizeBlogTags (tags) {
  if (!tags && tags !== '') return []
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean)
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags)
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean)
    } catch (_) {
      /* comma-separated */
    }
    return tags.split(',').map((t) => t.trim()).filter(Boolean)
  }
  return []
}

function normalizeBlogPublished (published) {
  return published === true || published === 'true'
}

const createBlog = async (blogData, adminId) => {
  const Blog = require('../models/blog-model')
  const { title, content, tags, published, image, excerpt, category, metaTitle, metaDescription } = blogData
  const tagsArr = normalizeBlogTags(tags)
  const publishedFlag = normalizeBlogPublished(published)

  // auto-generate slug from title
  const baseSlug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const existing = await Blog.findOne({ slug: { $regex: `^${baseSlug}` } }).sort({ createdAt: -1 })
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

  // auto-calculate reading time (avg 200 words/min)
  const wordCount = content.trim().split(/\s+/).length
  const readingTime = Math.ceil(wordCount / 200)

  const blog = new Blog({
    title,
    slug,
    excerpt,
    content,
    featuredImage: image || null,
    author: adminId,
    category,
    tags: tagsArr,
    readingTime,
    metaTitle: metaTitle || title,
    metaDescription: metaDescription || excerpt,
    published: publishedFlag,
    publishedAt: publishedFlag ? new Date() : null
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

  const { name, description, parentName, parentModel, bannerImage } = data

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
    level,
    bannerImage: bannerImage || null
  })

  return newCategory
}

const addSubCategory = async (categoryData) => {
  const SubCategory = require('../models/sub-category-model')
  const MainCategory = require('../models/main-category-model')

  const { name, description, mainCategory, bannerImage } = categoryData

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
    mainCategory: mainCat._id,
    bannerImage: bannerImage || null
  })

  return subCategoryDoc
}

const addThirdCategory = async (categoryData) => {
  const ThirdCategory = require('../models/third-category-model')
  const SubCategory = require('../models/sub-category-model')

  const { name, description, subCategory, bannerImage } = categoryData

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
    subCategory: subCat._id,
    bannerImage: bannerImage || null
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

const editBlog = async (blogId, adminId, updateDataRaw) => {
  const Blog = require('../models/blog-model')
  const updateData = { ...updateDataRaw }

  const existingBlog = await Blog.findById(blogId)
  if (!existingBlog) throw new Error('Blog not found')
  if (existingBlog.author.toString() !== adminId.toString()) throw new Error('Unauthorized access')

  if (Object.prototype.hasOwnProperty.call(updateData, 'tags')) {
    updateData.tags = normalizeBlogTags(updateData.tags)
  }
  if (Object.prototype.hasOwnProperty.call(updateData, 'published')) {
    updateData.published = normalizeBlogPublished(updateData.published)
  }

  // recalculate reading time if content changed
  if (updateData.content) {
    const wordCount = updateData.content.trim().split(/\s+/).length
    updateData.readingTime = Math.ceil(wordCount / 200)
  }

  // set publishedAt if being published for first time
  if (updateData.published && !existingBlog.publishedAt) {
    updateData.publishedAt = new Date()
  }

  // map image → featuredImage if sent
  if (updateData.image) {
    updateData.featuredImage = updateData.image
    delete updateData.image
  }

  const blog = await Blog.findByIdAndUpdate(blogId, updateData, { new: true })
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

const searchAddons = async (query) => {
  const Addon = require('../models/addon-model')
  if (!query || !query.trim()) throw new Error('Search query is required')

  const regex = { $regex: query.trim(), $options: 'i' }

  return Addon.find({
    $or: [
      { name: regex },
      { description: regex },
      { category: regex },
      { tags: regex }
    ]
  }).select('name description price image category tags')
}

const addAddon = async (addonData) => {
  const Addon = require('../models/addon-model')
  const { name, description, image, category } = addonData
  let { price, tags, customFields } = addonData
  price = typeof price === 'string' ? Number(price) : price
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Valid price is required')
  }
  if (typeof tags === 'string') {
    try {
      tags = JSON.parse(tags)
    } catch {
      tags = tags.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }
  if (typeof customFields === 'string') {
    try {
      customFields = JSON.parse(customFields)
    } catch {
      customFields = []
    }
  }
  if (!Array.isArray(customFields)) {
    customFields = []
  }

  // Validate and sanitize customFields
  const validTypes = ['text', 'textarea', 'number', 'dropdown', 'file']
  const sanitizedCustomFields = customFields?.map(field => {
    let fieldType = field.type

    // Map common incorrect values to valid ones
    if (fieldType === 'string') {
      fieldType = 'text'
    }

    if (!validTypes.includes(fieldType)) {
      throw new Error(`Invalid custom field type '${fieldType}'. Must be one of: ${validTypes.join(', ')}`)
    }

    return {
      ...field,
      type: fieldType
    }
  }) || []

  const addon = new Addon({
    name,
    description,
    price,
    image,
    category,
    tags: tags || [],
    customFields: sanitizedCustomFields
  })
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

const addHeroBanner = async (bannerData, attribution = {}) => {
  const HeroBanner = require('../models/hero-banner-model')
  const SubCategory = require('../models/sub-category-model')
  const ThirdCategory = require('../models/third-category-model')

  const { image, subCategory, thirdCategory, placement, sortOrder, title } = bannerData

  const adminId =
    attribution && typeof attribution === 'object' && 'adminId' in attribution
      ? attribution.adminId
      : attribution
  const superAdminId =
    attribution && typeof attribution === 'object' && 'superAdminId' in attribution
      ? attribution.superAdminId
      : null

  if (!subCategory && !thirdCategory) throw new Error('Provide either subCategory or thirdCategory')
  if (subCategory && thirdCategory) throw new Error('Provide only one of subCategory or thirdCategory')
  if (!adminId && !superAdminId) throw new Error('Admin or super-admin attribution required')

  const allowedPlacements = [
    'hero',
    'festival',
    'festival_hub',
    'wedding',
    'wedding_extra',
    'romantic_couple',
    'kids',
    'occasion'
  ]
  const placementVal =
    placement && allowedPlacements.includes(String(placement)) ? String(placement) : 'hero'
  const sortVal =
    sortOrder !== undefined && sortOrder !== null && String(sortOrder).trim() !== ''
      ? parseInt(String(sortOrder), 10)
      : 0
  const sortOrderSafe = Number.isFinite(sortVal) ? sortVal : 0

  const bannerPayload = {
    image,
    ...(adminId ? { addedBy: adminId } : {}),
    ...(superAdminId ? { addedBySuperAdmin: superAdminId } : {}),
    placement: placementVal,
    sortOrder: sortOrderSafe,
    ...(title != null && String(title).trim() !== '' ? { title: String(title).trim() } : {})
  }

  if (subCategory) {
    const subCat = await SubCategory.findOne({ name: subCategory })
    if (!subCat) throw new Error(`Sub category '${subCategory}' not found`)
    bannerPayload.subCategory = subCat._id
  }

  if (thirdCategory) {
    const thirdCat = await ThirdCategory.findOne({ name: thirdCategory })
    if (!thirdCat) throw new Error(`Third category '${thirdCategory}' not found`)
    bannerPayload.thirdCategory = thirdCat._id
  }

  const banner = new HeroBanner(bannerPayload)
  await banner.save()
  return banner.populate([
    { path: 'subCategory', populate: { path: 'mainCategory', select: 'name' } },
    { path: 'thirdCategory', populate: { path: 'subCategory', populate: { path: 'mainCategory', select: 'name' } } }
  ])
}

const getOrderForInvoice = async (orderId, adminId) => {
  const Order = require('../models/order-model')
  const Product = require('../models/product-model')

  const order = await Order.findById(orderId)
    .populate('user', 'fullName email phoneNumber')
    .populate('items.product', 'name price images')

  if (!order) throw new Error('Order not found')

  // verify at least one item belongs to this admin
  const adminProducts = await Product.find({ addedBy: adminId }).select('_id').lean()
  const adminProductIds = adminProducts.map(p => p._id.toString())
  const hasAccess = order.items.some(i => i.product && adminProductIds.includes(i.product._id.toString()))
  if (!hasAccess) throw new Error('Unauthorized: this order does not contain your products')

  return order
}

const sendInvoiceToCustomer = async (orderId, adminId) => {
  const { generateInvoicePDF, sendOrderConfirmationEmail } = require('../utils/email-service')
  const { sendInvoiceWhatsApp } = require('../utils/sms-service')

  const order = await getOrderForInvoice(orderId, adminId)
  const orderNumber = `ORD-${order._id.toString().slice(-6).toUpperCase()}`
  const pdfBuffer = await generateInvoicePDF(order)

  const results = { email: null, whatsapp: null }

  // send email
  if (order.user?.email) {
    try {
      await sendOrderConfirmationEmail(order.user.email, order)
      results.email = 'sent'
    } catch (err) {
      results.email = `failed: ${err.message}`
    }
  } else {
    results.email = 'skipped: no email on file'
  }

  // send whatsapp
  if (order.user?.phoneNumber) {
    try {
      await sendInvoiceWhatsApp(order.user.phoneNumber, orderNumber, pdfBuffer)
      results.whatsapp = 'sent'
    } catch (err) {
      results.whatsapp = `failed: ${err.message}`
    }
  } else {
    results.whatsapp = 'skipped: no phone number on file'
  }

  return { orderNumber, results }
}

const getAllUsers = async (page = 1, limit = 10) => {
  const SuperAdmin = require('../models/super-admin-model')
  const User = require('../models/user-model')

  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const [superAdmins, superAdminTotal, admins, adminTotal, users, userTotal] = await Promise.all([
    SuperAdmin.find().select('-password').skip(skip).limit(limitNum).lean(),
    SuperAdmin.countDocuments(),
    Admin.find().select('-password').skip(skip).limit(limitNum).lean(),
    Admin.countDocuments(),
    User.find().select('-password').skip(skip).limit(limitNum).lean(),
    User.countDocuments()
  ])

  const paginate = (total) => ({
    currentPage: pageNum,
    totalPages: Math.ceil(total / limitNum),
    total,
    hasNext: pageNum < Math.ceil(total / limitNum),
    hasPrev: pageNum > 1
  })

  return {
    superAdmins: {
      data: superAdmins.map(u => ({ ...u, role: 'superadmin' })),
      pagination: paginate(superAdminTotal)
    },
    admins: {
      data: admins.map(u => ({ ...u, role: 'admin' })),
      pagination: paginate(adminTotal)
    },
    users: {
      data: users.map(u => ({ ...u, role: 'user' })),
      pagination: paginate(userTotal)
    }
  }
}

const getAdminOrders = async (adminId, page = 1, limit = 10) => {
  const Order = require('../models/order-model')
  const Product = require('../models/product-model')

  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  // get only this admin's product IDs
  const adminProducts = await Product.find({ addedBy: adminId }).select('_id').lean()
  const adminProductIds = adminProducts.map(p => p._id.toString())

  // find orders that contain at least one of this admin's products
  const query = { 'items.product': { $in: adminProducts.map(p => p._id) } }

  const orders = await Order.find(query)
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 })
    .populate('user', 'fullName email phoneNumber')
    .populate('items.product', 'name price images')

  const total = await Order.countDocuments(query)

  // filter each order's items to only include this admin's products
  const formatted = orders.map(o => {
    const myItems = o.items.filter(item =>
      item.product && adminProductIds.includes(item.product._id.toString())
    )
    const myTotal = myItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return {
      id: o._id,
      orderNumber: `ORD-${o._id.toString().slice(-6).toUpperCase()}`,
      userName: o.user?.fullName || 'N/A',
      userEmail: o.user?.email || 'N/A',
      userPhone: o.user?.phoneNumber || 'N/A',
      items: myItems,
      myTotal,
      orderTotal: o.totalAmount,
      status: o.status,
      shippingAddress: o.shippingAddress,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    }
  })

  return {
    orders: formatted,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalOrders: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

/** Single order for admin — same shape as list entries; throws if order missing or none of this admin's products */
const getAdminOrderById = async (adminId, orderId) => {
  const Order = require('../models/order-model')
  const Product = require('../models/product-model')

  const adminProducts = await Product.find({ addedBy: adminId }).select('_id').lean()
  const adminProductIds = adminProducts.map(p => p._id.toString())

  const o = await Order.findById(orderId)
    .populate('user', 'fullName email phoneNumber')
    .populate('items.product', 'name price images')

  if (!o) throw new Error('Order not found')

  const myItems = o.items.filter(item =>
    item.product && adminProductIds.includes(item.product._id.toString())
  )
  if (myItems.length === 0) throw new Error('Order not found')

  const myTotal = myItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return {
    id: o._id,
    orderNumber: `ORD-${o._id.toString().slice(-6).toUpperCase()}`,
    userName: o.user?.fullName || 'N/A',
    userEmail: o.user?.email || 'N/A',
    userPhone: o.user?.phoneNumber || 'N/A',
    items: myItems,
    myTotal,
    orderTotal: o.totalAmount,
    status: o.status,
    shippingAddress: o.shippingAddress,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  }
}

/** All platform orders (super admin) — same response shape as getAdminOrders, with full line items. */
const getSuperAdminOrders = async (page = 1, limit = 10) => {
  const Order = require('../models/order-model')

  const pageNum = parseInt(page) || 1
  const limitNum = Math.min(parseInt(limit) || 10, 50)
  const skip = (pageNum - 1) * limitNum

  const orders = await Order.find({})
    .skip(skip)
    .limit(limitNum)
    .sort({ createdAt: -1 })
    .populate('user', 'fullName email phoneNumber')
    .populate('items.product', 'name price images')

  const total = await Order.countDocuments({})

  const formatted = orders.map((o) => {
    const allItems = o.items.filter((item) => item.product)
    const myTotal = allItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return {
      id: o._id,
      orderNumber: `ORD-${o._id.toString().slice(-6).toUpperCase()}`,
      userName: o.user?.fullName || 'N/A',
      userEmail: o.user?.email || 'N/A',
      userPhone: o.user?.phoneNumber || 'N/A',
      items: allItems,
      myTotal,
      orderTotal: o.totalAmount,
      status: o.status,
      shippingAddress: o.shippingAddress,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt
    }
  })

  return {
    orders: formatted,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalOrders: total,
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    }
  }
}

const getSuperAdminOrderById = async (orderId) => {
  const Order = require('../models/order-model')

  const o = await Order.findById(orderId)
    .populate('user', 'fullName email phoneNumber')
    .populate('items.product', 'name price images')

  if (!o) throw new Error('Order not found')

  const allItems = o.items.filter((item) => item.product)
  const myTotal = allItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return {
    id: o._id,
    orderNumber: `ORD-${o._id.toString().slice(-6).toUpperCase()}`,
    userName: o.user?.fullName || 'N/A',
    userEmail: o.user?.email || 'N/A',
    userPhone: o.user?.phoneNumber || 'N/A',
    items: allItems,
    myTotal,
    orderTotal: o.totalAmount,
    status: o.status,
    shippingAddress: o.shippingAddress,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt
  }
}

const updateOrderStatus = async (orderId, status) => {
  const Order = require('../models/order-model')
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
  if (!validStatuses.includes(status)) throw new Error('Invalid status')
  const Product = require("../models/product-model")
  const prevOrder = await Order.findById(orderId)
  if (!prevOrder) throw new Error('Order not found')

  const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true })
    .populate('user', 'fullName email')
    .populate('items.product', 'name price')

  // send confirmation email only when transitioning from pending → confirmed
  if (prevOrder.status === 'pending' && status === 'confirmed' && order.user?.email) {
    const { sendOrderConfirmationEmail, sendOrderNotificationToSuperAdmin } = require('../utils/email-service')
    const SuperAdmin = require('../models/super-admin-model')

    // email user
    try {
      await sendOrderConfirmationEmail(order.user.email, order)
      console.log('Order confirmation email sent to:', order.user.email)
    } catch (emailErr) {
      console.error('Failed to send order confirmation email:', emailErr.message)
    }

    // email all super admins
    try {
      const superAdmins = await SuperAdmin.find().select('email')
      await Promise.all(
        superAdmins.map(sa =>
          sendOrderNotificationToSuperAdmin(sa.email, order).catch(err =>
            console.error('Failed to notify super admin:', sa.email, err.message)
          )
        )
      )
    } catch (err) {
      console.error('Failed to fetch super admins for notification:', err.message)
    }
  }

  return order
}

const getAdminAnalytics = async (adminId) => {
  const Order = require('../models/order-model')
  const Product = require('../models/product-model')
  const User = require('../models/user-model')

  const adminProducts = await Product.find({ addedBy: adminId }).select('_id name price')
  const adminProductIds = adminProducts.map(p => p._id)
  const query = { 'items.product': { $in: adminProductIds } }

  const allOrders = await Order.find(query).populate('items.product', 'name price')

  const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const totalOrders = allOrders.length
  const totalUsers = await User.countDocuments()

  // orders by status
  const statusMap = {}
  allOrders.forEach(o => {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1
  })
  const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }))

  // sales trend — last 6 months grouped by month
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const recentOrders = allOrders.filter(o => new Date(o.createdAt) >= sixMonthsAgo)
  const salesByMonth = {}
  recentOrders.forEach(o => {
    const key = new Date(o.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' })
    salesByMonth[key] = (salesByMonth[key] || 0) + o.totalAmount
  })
  const salesTrend = Object.entries(salesByMonth).map(([date, revenue]) => ({ date, revenue }))

  // user growth — last 6 months
  const allUsers = await User.find({ createdAt: { $gte: sixMonthsAgo } }).select('createdAt')
  const usersByMonth = {}
  allUsers.forEach(u => {
    const key = new Date(u.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' })
    usersByMonth[key] = (usersByMonth[key] || 0) + 1
  })
  const userGrowth = Object.entries(usersByMonth).map(([date, users]) => ({ date, users }))

  // top products by revenue
  const productRevenue = {}
  const productSales = {}
  allOrders.forEach(o => {
    o.items.forEach(item => {
      if (!item.product) return
      const id = item.product._id.toString()
      const name = item.product.name
      productRevenue[id] = { name, revenue: (productRevenue[id]?.revenue || 0) + item.price * item.quantity }
      productSales[id] = (productSales[id] || 0) + item.quantity
    })
  })
  const topProducts = Object.entries(productRevenue)
    .map(([id, { name, revenue }]) => ({ name, revenue, sales: productSales[id] }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return {
    totalRevenue,
    revenueGrowth: 0,
    totalOrders,
    ordersGrowth: 0,
    totalUsers,
    salesTrend,
    ordersByStatus,
    userGrowth,
    topProducts
  }
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
  searchAddons,
  getCustomizationSections,
  toggleProductFeatured,
  toggleProductTier,
  addVenue,
  getVenues,
  getAdminOrders,
  getAdminOrderById,
  getSuperAdminOrders,
  getSuperAdminOrderById,
  updateOrderStatus,
  getAdminAnalytics,
  getOrderForInvoice,
  sendInvoiceToCustomer,
  getAllUsers,
  getBlogs,
  editBlog,
  deleteBlog,
  refreshAdminAccessToken,
  logoutAdmin,
  addAdditionalCategory,
  addHeroBanner
}