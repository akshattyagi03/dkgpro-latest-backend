const mongoose = require('mongoose')

const balloonColorChoiceSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['default', 'preset', 'custom'],
      default: 'default',
    },
    label: { type: String, trim: true },
    colors: [{ type: String, trim: true }],
  },
  { _id: false }
)

const giftCardChoiceSchema = new mongoose.Schema(
  {
    babyName: { type: String, trim: true },
    whichBirthday: { type: String, trim: true },
    size: { type: String, trim: true },
    sizePrice: { type: Number, min: 0 },
  },
  { _id: false }
)

/** Per cart/order line — booking pincode, date/time, balloon colour / gift card choice */
const bookingDetailsSchema = new mongoose.Schema(
  {
    pincode: { type: String, trim: true },
    district: { type: String, trim: true },
    bookingDate: { type: String, trim: true },
    startTime: { type: String, trim: true },
    endTime: { type: String, trim: true },
    balloonColorChoice: {
      type: balloonColorChoiceSchema,
      default: undefined,
    },
    giftCardChoice: {
      type: giftCardChoiceSchema,
      default: undefined,
    },
  },
  { _id: false }
)

module.exports = bookingDetailsSchema
