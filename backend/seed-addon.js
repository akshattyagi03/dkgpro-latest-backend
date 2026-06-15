const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const Addon = require('./src/models/addon-model');

/**
 * Guest customize UI structure:
 *   Recommended → sub-tabs: Alphabets Foil Balloons | Shape Foil Balloons | Cake Table
 *   Engagement Activity → Party Games | Photo Booth
 *
 * Run: npm run seed:addons
 */

const images = {
  alphabetBalloon:
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&h=600&fit=crop',
  textBalloon:
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=600&fit=crop',
  shapeBalloon:
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=600&fit=crop',
  candles:
    'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=600&fit=crop',
  games:
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=600&fit=crop',
  photoBooth:
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=600&fit=crop',
};

const addonsData = [
  // ── Recommended › Alphabets Foil Balloons (2 items) ───────────────────
  {
    name: 'Alphabet Foil Balloon Set',
    description:
      'Custom alphabet foil balloons to spell names or messages for your celebration setup.',
    price: 2499,
    category: 'Alphabets Foil Balloons',
    image: images.alphabetBalloon,
    tags: ['balloons', 'alphabet', 'foil'],
    customFields: [
      {
        label: 'Balloon Color',
        key: 'balloonColor',
        type: 'dropdown',
        required: true,
        options: ['Gold', 'Silver', 'Rose Gold', 'Red', 'Blue', 'Pink']
      }
    ]
  },
  {
    name: 'Personalized Text Balloons',
    description:
      'Add a custom name or message on foil balloons — priced per letter for your event.',
    price: 49,
    category: 'Alphabets Foil Balloons',
    image: images.textBalloon,
    tags: ['balloons', 'personalized', 'name'],
    customFields: [
      {
        label: 'Name / Message',
        key: 'customText',
        type: 'text',
        required: true,
        maxLength: 50
      },
      {
        label: 'Text Color',
        key: 'textColor',
        type: 'dropdown',
        required: true,
        options: ['Black', 'White', 'Gold', 'Silver', 'Red', 'Blue']
      }
    ]
  },

  // ── Recommended › Shape Foil Balloons ─────────────────────────────────
  {
    name: 'Shape Foil Balloon Pack',
    description:
      'Star, heart, and number shape foil balloons to complement your party decor.',
    price: 899,
    category: 'Shape Foil Balloons',
    image: images.shapeBalloon,
    tags: ['balloons', 'shape', 'foil'],
    customFields: [
      {
        label: 'Balloon Shape',
        key: 'balloonShape',
        type: 'dropdown',
        required: true,
        options: ['Star', 'Heart', 'Number', 'Round']
      }
    ]
  },

  // ── Recommended › Cake Table ──────────────────────────────────────────
  {
    name: 'Birthday Cake Add-on',
    description: 'Add a birthday cake to your celebration package with delivery to the venue.',
    price: 499,
    category: 'Cake Table',
    image: images.cake,
    tags: ['cake', 'birthday'],
    customFields: []
  },
  {
    name: 'Cake Topper',
    description: 'Decorative topper for your cake — Happy Birthday, name, or custom style.',
    price: 129,
    category: 'Cake Table',
    image: images.cake,
    tags: ['cake', 'topper'],
    customFields: [
      {
        label: 'Topper Style',
        key: 'topperStyle',
        type: 'dropdown',
        required: true,
        options: ['Happy Birthday', 'Congratulations', 'Love', 'Anniversary', 'Custom Number', 'Name']
      }
    ]
  },
  {
    name: 'Birthday Candles',
    description: 'Birthday candles for your cake — price per candle.',
    price: 19,
    category: 'Cake Table',
    image: images.candles,
    tags: ['cake', 'candles'],
    customFields: [
      {
        label: 'Number of Candles',
        key: 'candleCount',
        type: 'number',
        required: true
      },
      {
        label: 'Candle Color',
        key: 'candleColor',
        type: 'dropdown',
        required: true,
        options: ['Traditional Yellow', 'White', 'Colored Rainbow', 'Gold', 'Silver']
      }
    ]
  },

  // ── Engagement Activity ───────────────────────────────────────────────
  {
    name: 'Party Games Pack',
    description:
      'Fun engagement games for your celebration — treasure hunt cards, quizzes, and team activities.',
    price: 799,
    category: 'Party Games',
    image: images.games,
    tags: ['engagement', 'games'],
    customFields: []
  },
  {
    name: 'Photo Booth Props Set',
    description:
      'Fun props for memorable photo moments — hats, frames, and themed accessories for guests.',
    price: 599,
    category: 'Photo Booth',
    image: images.photoBooth,
    tags: ['engagement', 'photo-booth'],
    customFields: []
  }
];

const seedAddons = async () => {
  try {
    await Addon.deleteMany({});
    console.log('Cleared existing addons');

    const createdAddons = await Addon.insertMany(addonsData);
    console.log(`✅ Seeded ${createdAddons.length} addons`);

    const categories = {};
    createdAddons.forEach((addon) => {
      categories[addon.category] = (categories[addon.category] || 0) + 1;
    });
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding addons:', error);
    process.exit(1);
  }
};

seedAddons();
