const path = require("path")
require("dotenv").config({ path: path.join(__dirname, ".env") })
require("dotenv").config({ path: path.join(__dirname, "src/.env") })
const express=require("express")
const cookieParser=require("cookie-parser")
const connectDB = require('./src/config/database')
const startInterestDecayCron = require('./src/utils/interestDecayCron')
const app=express()
const userRoutes=require("./src/routes/user-routes")
const adminRoutes=require("./src/routes/admin-routes")
const superAdminRoutes=require("./src/routes/super-admin-routes")
const oauthRoutes=require("./src/routes/oauth-routes")

connectDB()
startInterestDecayCron()

// CORS Configuration
const defaultOrigins = [
  'http://localhost:5500',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:8080',
  'https://dkgpro.in',
  'https://www.dkgpro.in',
  'https://dkgpro-admin.vercel.app',
]
const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
if (process.env.FRONTEND_URL) {
  envOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''))
}
const corsOrigins = [...new Set([...defaultOrigins, ...envOrigins])]

const corsOptions = {
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (corsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.set('view engine', 'ejs')
app.set('views', './src/views')
app.use(express.static('public'))

app.get("/", (req, res)=>{
    res.send("Hey, it's working")
})

// ─────────────────────────────────────────────────────────────
// TESTING ONLY — EJS routes for backend payment testing
// These routes are NOT meant for production use.
// Frontend developers should use the API endpoints directly:
//   POST /users/login          → login & get cookies
//   POST /users/create-order   → create Razorpay order
//   POST /users/verify-payment → verify payment
//   GET  /users/orders         → order history
//   GET  /users/order/:id      → order details
// ─────────────────────────────────────────────────────────────
app.get("/login", (req, res)=>{
    res.render('login')
})

app.post("/login", async (req, res)=>{
    try {
        const jwt = require('jsonwebtoken')
        const bcrypt = require('bcryptjs')
        const crypto = require('crypto')
        const User = require('./src/models/user-model')
        const RefreshToken = require('./src/models/refresh-token-model')
        const Cart = require('./src/models/cart-model')

        const { email, password } = req.body
        const user = await User.findOne({ email })
        if (!user || !(await user.comparePassword(password))) {
            return res.render('login', { error: 'Invalid credentials' })
        }

        const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '15m' })
        const refreshTokenValue = crypto.randomBytes(64).toString('hex')
        await new RefreshToken({
            token: refreshTokenValue,
            userId: user._id,
            userType: 'User',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }).save()

        res.cookie('accessToken', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 15 * 60 * 1000 })
        res.cookie('refreshToken', refreshTokenValue, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })

        const Product = require('./src/models/product-model')
        const cart = await Cart.findOne({ user: user._id }).populate('items.product')
        const cartItems = cart ? cart.items.filter(i => i.product !== null) : []
        const totalAmount = cartItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0)

        res.render('payment', { razorpayKeyId: process.env.RAZORPAY_KEY_ID, cartItems, totalAmount })
    } catch(e) {
        res.render('login', { error: e.message })
    }
})

// GET /payment — renders payment page if already logged in
app.get("/payment", async (req, res)=>{
    const accessToken = req.cookies.accessToken
    const refreshToken = req.cookies.refreshToken
    if (!accessToken && !refreshToken) {
        return res.redirect('/login')
    }

    try {
        const jwt = require('jsonwebtoken')
        const Cart = require('./src/models/cart-model')
        const Product = require('./src/models/product-model')
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY)
        const cart = await Cart.findOne({ user: decoded.userId }).populate('items.product')

        const cartItems = cart ? cart.items.filter(i => i.product !== null) : []
        const totalAmount = cartItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0)

        res.render('payment', { razorpayKeyId: process.env.RAZORPAY_KEY_ID, cartItems, totalAmount })
    } catch(e) {
        res.redirect('/login')
    }
})
// ─────────────────────────────────────────────────────────────
app.use("/users", userRoutes)
app.use("/admins", adminRoutes)
app.use("/superadmins", superAdminRoutes)
app.use("/auth", oauthRoutes)
module.exports=app