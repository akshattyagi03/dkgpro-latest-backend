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

/** Per cart/order line — booking pincode, date/time, balloon colour choice */
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
  },
  { _id: false }
)

module.exports = bookingDetailsSchema
