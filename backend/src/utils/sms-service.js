const twilio = require('twilio')

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

const sendSMSOTP = async (phoneNumber, otp) => {
  try {
    // Skip SMS in development or if Twilio not configured
    if (process.env.NODE_ENV === 'development' || !process.env.TWILIO_ACCOUNT_SID) {
      console.log(`Development mode: SMS OTP for ${phoneNumber}: ${otp}`)
      return
    }
    
    await client.messages.create({
      body: `Your login OTP is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })
  } catch (error) {
    // In development, log error but don't fail
    if (process.env.NODE_ENV === 'development') {
      console.log(`SMS Error (dev mode): ${error.message}. OTP: ${otp}`)
      return
    }
    throw new Error(`SMS sending failed: ${error.message}`)
  }
}

module.exports = { sendSMSOTP }