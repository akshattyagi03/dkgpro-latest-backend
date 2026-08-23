/**
 * Shared cookie configuration for cross-origin cookie delivery.
 *
 * When the backend (dkgpro.in) needs to set cookies on a different-origin
 * frontend (dkgpro-admin.vercel.app), browsers require:
 *   - secure: true   (cookies only sent over HTTPS)
 *   - sameSite: 'none' (allows cross-site cookie delivery)
 *
 * In development (NODE_ENV !== 'production') we relax these so cookies work
 * on localhost without HTTPS.
 */

const isProduction = process.env.NODE_ENV === 'production'

const accessTokenOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
}

const refreshTokenOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

module.exports = { accessTokenOptions, refreshTokenOptions }
