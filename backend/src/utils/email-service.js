const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

const sendOTP = async (email, otp, userType) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `${userType} Registration - OTP Verification`,
    html: `
      <h2>OTP Verification</h2>
      <p>Your OTP for ${userType} registration is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 5 minutes.</p>
    `
  }
  
  await transporter.sendMail(mailOptions)
}

module.exports = { sendOTP }