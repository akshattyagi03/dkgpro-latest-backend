const cron = require('node-cron')
const User = require('../models/user-model')

// Runs every day at midnight
const startInterestDecayCron = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      const users = await User.find({ 'interests.0': { $exists: true } })
      for (const user of users) {
        await user.save() // pre-save hook applies decay
      }
      console.log(`Interest decay applied to ${users.length} users`)
    } catch (error) {
      console.error('Interest decay cron failed:', error.message)
    }
  })
}

module.exports = startInterestDecayCron
