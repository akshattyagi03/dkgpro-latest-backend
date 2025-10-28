const twilio = require('twilio')

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

const sendSMSOTP = async (phoneNumber, otp) => {
  try {
    await client.messages.create({
      body: `Your login OTP is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })
  } catch (error) {
    throw new Error(`SMS sending failed: ${error.message}`)
  }
}

module.exports = { sendSMSOTP }