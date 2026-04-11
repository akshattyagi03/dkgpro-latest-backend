const twilio = require('twilio')

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

const sendSMSOTP = async (phoneNumber, otp) => {
  try {
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
    if (process.env.NODE_ENV === 'development') {
      console.log(`SMS Error (dev mode): ${error.message}. OTP: ${otp}`)
      return
    }
    throw new Error(`SMS sending failed: ${error.message}`)
  }
}

const sendInvoiceWhatsApp = async (phoneNumber, orderNumber, pdfBuffer) => {
  // Twilio WhatsApp requires the PDF to be hosted at a public URL.
  // We upload the buffer to Cloudinary and use the returned URL.
  const cloudinary = require('cloudinary').v2

  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'dkgpro/invoices', public_id: `Invoice-${orderNumber}`, format: 'pdf' },
      (err, result) => err ? reject(err) : resolve(result)
    )
    const { Readable } = require('stream')
    Readable.from(pdfBuffer).pipe(stream)
  })

  const normalised = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`

  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'}`,
    to: `whatsapp:${normalised}`,
    body: `Hi! Your DKGPro invoice for order ${orderNumber} is attached below. Thank you for your order! 🎉`,
    mediaUrl: [uploadResult.secure_url]
  })
}

module.exports = { sendSMSOTP, sendInvoiceWhatsApp }