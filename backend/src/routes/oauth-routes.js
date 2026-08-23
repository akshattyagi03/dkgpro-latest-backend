const express = require('express')
const axios = require('axios')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/user-model')
const RefreshToken = require('../models/refresh-token-model')
const { accessTokenOptions, refreshTokenOptions } = require('../utils/cookie-options')

const router = express.Router()

const generateTokens = async (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET_KEY, { expiresIn: '15m' })
  const refreshTokenValue = crypto.randomBytes(64).toString('hex')
  await new RefreshToken({
    token: refreshTokenValue,
    userId,
    userType: 'User',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }).save()
  return { accessToken, refreshToken: refreshTokenValue }
}

// Step 1 — redirect user to Google consent screen
// GET /auth/google
router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

// Step 2 — Google redirects back with ?code=
// GET /auth/google/callback
router.get('/google/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ message: 'Authorization code missing' })

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    })

    const { id_token } = tokenRes.data

    // Decode id_token to get user info (no need to verify — Google already validated)
    const googleUser = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString())
    const { sub: googleId, email, name: fullName } = googleUser

    // Find or create user
    let user = await User.findOne({ $or: [{ googleId }, { email }] })

    if (!user) {
      user = await User.create({ fullName, email, googleId, authProvider: 'google' })
    } else if (!user.googleId) {
      user.googleId = googleId
      user.authProvider = 'google'
      await user.save()
    }

    const { accessToken, refreshToken } = await generateTokens(user._id)

    res.cookie('accessToken', accessToken, accessTokenOptions)
    res.cookie('refreshToken', refreshToken, refreshTokenOptions)

    // Redirect to frontend after login (?login=success lets guest app hydrate session)
    const successBase = (process.env.GOOGLE_LOGIN_SUCCESS_REDIRECT || 'http://localhost:3000').replace(/\/$/, '')
    const successUrl = successBase.includes('?')
      ? `${successBase}&login=success`
      : `${successBase}?login=success`
    res.redirect(successUrl)
  } catch (error) {
    res.status(500).json({ message: 'Google OAuth failed', error: error.message })
  }
})

module.exports = router
