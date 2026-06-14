const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const Addon = require('./src/models/addon-model');

// Unsplash image URLs for addons
const images = {
  balloons: 'https://images.unsplash.com/photo-1559635874-8b2f8f2f8f7c?w=500&h=500&fit=crop',
  balloonRed: 'https://images.unsplash.com/photo-1578695178884-12a22ecb2b92?w=500&h=500&fit=crop',
  balloonBlue: 'https://images.unsplash.com/photo-1596578904546-19f1c5d7c766?w=500&h=500&fit=crop',
  balloonGold: 'https://images.unsplash.com/photo-1569623160373-10a97e4a652d?w=500&h=500&fit=crop',
  giftBox: 'https://images.unsplash.com/photo-1576269354888-d0d9f92f237c?w=500&h=500&fit=crop',
  ribbon: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&h=500&fit=crop',
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&h=500&fit=crop',
  candles: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&h=500&fit=crop',
  card: 'https://images.unsplash.com/photo-1565299624946-b28e9efdbda5?w=500&h=500&fit=crop',
  heart: 'https://images.unsplash.com/photo-1599599810694-f3f733ceb607?w=500&h=500&fit=crop',
  flowers: 'https://images.unsplash.com/photo-1549465220-1a0b1f538c42?w=500&h=500&fit=crop',
  premium: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop',
  deluxe: 'https://images.unsplash.com/photo-1599599810694-f3f733ceb607?w=500&h=500&fit=crop',
  decor: 'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?w=500&h=500&fit=crop',
  personalize: 'https://images.unsplash.com/photo-1585927212207-4779814ae0c0?w=500&h=500&fit=crop',
  express: 'https://images.unsplash.com/photo-1594268417980-1d55d5f71e2d?w=500&h=500&fit=crop'
};

const addonsData = [
  // 1. Balloon Color Selection - Dropdown
  {
    name: 'Balloon Color Pack',
    description: 'Choose your favorite balloon color for the decoration',
    price: 99,
    category: 'Balloons',
    image: images.balloonRed,
    tags: ['balloons', 'decoration', 'color', 'party'],
    customFields: [
      {
        label: 'Balloon Color',
        key: 'balloonColor',
        type: 'dropdown',
        required: true,
        options: ['Red', 'Blue', 'Gold', 'Silver', 'Purple', 'Green', 'Pink', 'White']
      }
    ]
  },

  // 2. Custom Text on Balloons - Text input (affects pricing concept)
  {
    name: 'Personalized Text Balloons',
    description: 'Add custom text to your balloons. Extra charge applies based on text length',
    price: 149,
    category: 'Balloons',
    image: images.balloons,
    tags: ['personalized', 'custom-text', 'balloons'],
    customFields: [
      {
        label: 'Text to Print',
        key: 'customText',
        type: 'text',
        required: true,
        maxLength: 50
      },
      {
        label: 'Font Size',
        key: 'fontSize',
        type: 'dropdown',
        required: true,
        options: ['Small (10px)', 'Medium (16px)', 'Large (24px)', 'Extra Large (32px)']
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

  // 3. Special Instructions - Textarea
  {
    name: 'Special Instructions',
    description: 'Add any special instructions for the order preparation',
    price: 0,
    category: 'Instructions',
    image: images.card,
    tags: ['instructions', 'special-requests', 'notes'],
    customFields: [
      {
        label: 'Your Instructions',
        key: 'specialInstructions',
        type: 'textarea',
        required: false,
        maxLength: 500
      }
    ]
  },

  // 4. Quantity Selection - Number
  {
    name: 'Extra Balloons Bundle',
    description: 'Add extra balloons to your order - charge per unit',
    price: 49,
    category: 'Balloons',
    image: images.balloonBlue,
    tags: ['balloons', 'quantity', 'bulk'],
    customFields: [
      {
        label: 'Number of Extra Balloons',
        key: 'extraBalloonCount',
        type: 'number',
        required: true
      }
    ]
  },

  // 5. Gift Wrapping Options - Dropdown
  {
    name: 'Premium Gift Wrapping',
    description: 'Choose your preferred gift wrapping style',
    price: 199,
    category: 'Wrapping',
    image: images.giftBox,
    tags: ['wrapping', 'gift', 'presentation'],
    customFields: [
      {
        label: 'Wrapping Style',
        key: 'wrappingStyle',
        type: 'dropdown',
        required: true,
        options: ['Elegant Satin', 'Luxury Gold', 'Classic Silver', 'Rose Red', 'Ocean Blue', 'Pastel Pink']
      },
      {
        label: 'Include Bow',
        key: 'includeBow',
        type: 'dropdown',
        required: true,
        options: ['Yes - Matching Color', 'Yes - Contrasting Color', 'No Bow']
      }
    ]
  },

  // 6. Ribbon Color Selection - Dropdown
  {
    name: 'Decorative Ribbon',
    description: 'Beautiful ribbons to enhance your gift presentation',
    price: 79,
    category: 'Decorations',
    image: images.ribbon,
    tags: ['ribbon', 'decoration', 'color'],
    customFields: [
      {
        label: 'Ribbon Color',
        key: 'ribbonColor',
        type: 'dropdown',
        required: true,
        options: ['Gold', 'Silver', 'Red', 'Black', 'White', 'Purple', 'Emerald', 'Rose']
      },
      {
        label: 'Ribbon Width',
        key: 'ribbonWidth',
        type: 'dropdown',
        required: true,
        options: ['1 inch', '1.5 inches', '2 inches']
      }
    ]
  },

  // 7. Greeting Card - Text input
  {
    name: 'Personalized Greeting Card',
    description: 'Include a custom greeting message with your order',
    price: 89,
    category: 'Cards',
    image: images.card,
    tags: ['card', 'greeting', 'message'],
    customFields: [
      {
        label: 'Greeting Message',
        key: 'greetingMessage',
        type: 'text',
        required: true,
        maxLength: 100
      },
      {
        label: 'Card Design',
        key: 'cardDesign',
        type: 'dropdown',
        required: true,
        options: ['Floral', 'Modern', 'Classic', 'Festive', 'Romantic', 'Birthday']
      }
    ]
  },

  // 8. Candles Quantity - Number
  {
    name: 'Birthday Candles',
    description: 'Add birthday candles to your cake - price per candle',
    price: 19,
    category: 'Candles',
    image: images.candles,
    tags: ['candles', 'birthday', 'quantity'],
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

  // 9. Cake Topper Selection - Dropdown
  {
    name: 'Cake Topper',
    description: 'Decorative topper for your cake',
    price: 129,
    category: 'Cake Decorations',
    image: images.cake,
    tags: ['topper', 'cake', 'decoration'],
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

  // 10. Delivery Time Slot - Dropdown
  {
    name: 'Priority Express Delivery',
    description: 'Choose your preferred delivery time slot',
    price: 299,
    category: 'Delivery',
    image: images.express,
    tags: ['delivery', 'time', 'express'],
    customFields: [
      {
        label: 'Delivery Time Slot',
        key: 'deliverySlot',
        type: 'dropdown',
        required: true,
        options: ['9:00 AM - 11:00 AM', '11:00 AM - 1:00 PM', '1:00 PM - 3:00 PM', '3:00 PM - 5:00 PM', '5:00 PM - 7:00 PM', '7:00 PM - 9:00 PM']
      }
    ]
  },

  // 11. Custom Photo Upload - File (concept example)
  {
    name: 'Photo Cake Design',
    description: 'Upload a photo to be printed on your cake',
    price: 349,
    category: 'Custom Designs',
    image: images.personalize,
    tags: ['photo', 'custom', 'design'],
    customFields: [
      {
        label: 'Photo for Cake',
        key: 'cakePhoto',
        type: 'file',
        required: true
      },
      {
        label: 'Photo Position',
        key: 'photoPosition',
        type: 'dropdown',
        required: true,
        options: ['Center', 'Top', 'Bottom', 'Entire Cake']
      }
    ]
  },

  // 12. Theme Selection - Dropdown
  {
    name: 'Party Theme Package',
    description: 'Complete theme decoration for your celebration',
    price: 499,
    category: 'Themes',
    image: images.decor,
    tags: ['theme', 'decoration', 'party'],
    customFields: [
      {
        label: 'Theme',
        key: 'partyTheme',
        type: 'dropdown',
        required: true,
        options: ['Tropical', 'Elegant', 'Fun & Colorful', 'Vintage', 'Modern Minimalist', 'Disney', 'Sports', 'Superhero']
      },
      {
        label: 'Color Palette',
        key: 'colorPalette',
        type: 'dropdown',
        required: true,
        options: ['Warm Tones', 'Cool Tones', 'Rainbow', 'Pastel', 'Metallic']
      }
    ]
  },

  // 13. Name Personalization - Text
  {
    name: 'Name Personalization',
    description: 'Get the birthday person\'s name personalized on the decoration',
    price: 109,
    category: 'Personalization',
    image: images.heart,
    tags: ['personalized', 'name', 'custom'],
    customFields: [
      {
        label: 'Name',
        key: 'personName',
        type: 'text',
        required: true,
        maxLength: 30
      },
      {
        label: 'Font Style',
        key: 'fontStyle',
        type: 'dropdown',
        required: true,
        options: ['Elegant', 'Bold', 'Playful', 'Script', 'Modern']
      }
    ]
  },

  // 14. Dietary Requirements - Dropdown
  {
    name: 'Dietary Preferences',
    description: 'Specify dietary requirements for food items',
    price: 0,
    category: 'Food Requirements',
    image: images.cake,
    tags: ['dietary', 'requirements', 'food'],
    customFields: [
      {
        label: 'Dietary Requirement',
        key: 'dietaryReq',
        type: 'dropdown',
        required: false,
        options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Nut-Free', 'Dairy-Free', 'Sugar-Free']
      }
    ]
  },

  // 15. Flower Selection with Details - Multiple fields
  {
    name: 'Flower Arrangement Add-on',
    description: 'Beautiful fresh flowers to complement your celebration',
    price: 399,
    category: 'Flowers',
    image: images.flowers,
    tags: ['flowers', 'arrangement', 'decoration'],
    customFields: [
      {
        label: 'Flower Type',
        key: 'flowerType',
        type: 'dropdown',
        required: true,
        options: ['Roses', 'Lilies', 'Sunflowers', 'Orchids', 'Tulips', 'Mixed Bouquet']
      },
      {
        label: 'Color',
        key: 'flowerColor',
        type: 'dropdown',
        required: true,
        options: ['Red', 'Pink', 'White', 'Yellow', 'Purple', 'Mixed Colors']
      },
      {
        label: 'Number of Flowers',
        key: 'flowerCount',
        type: 'number',
        required: true
      }
    ]
  },

  // 16. Special Message with Date - Text + Dropdown
  {
    name: 'Event Date Banner',
    description: 'Custom banner with event date and special message',
    price: 159,
    category: 'Banners',
    image: images.card,
    tags: ['banner', 'date', 'custom'],
    customFields: [
      {
        label: 'Banner Message',
        key: 'bannerMessage',
        type: 'text',
        required: true,
        maxLength: 50
      },
      {
        label: 'Banner Size',
        key: 'bannerSize',
        type: 'dropdown',
        required: true,
        options: ['Small (2x1 ft)', 'Medium (3x2 ft)', 'Large (4x3 ft)']
      }
    ]
  },

  // 17. Detailed Event Instructions - Long Textarea
  {
    name: 'Custom Event Notes',
    description: 'Provide detailed setup and coordination notes',
    price: 0,
    category: 'Event Planning',
    image: images.personalize,
    tags: ['notes', 'planning', 'coordination'],
    customFields: [
      {
        label: 'Event Details & Special Requests',
        key: 'eventNotes',
        type: 'textarea',
        required: false,
        maxLength: 1000
      },
      {
        label: 'Setup Location',
        key: 'setupLocation',
        type: 'text',
        required: false,
        maxLength: 100
      }
    ]
  },

  // 18. Premium Package Tier - Dropdown
  {
    name: 'Premium Upgrade Package',
    description: 'Upgrade to premium decorations and services',
    price: 799,
    category: 'Premium Services',
    image: images.deluxe,
    tags: ['premium', 'upgrade', 'deluxe'],
    customFields: [
      {
        label: 'Premium Package',
        key: 'premiumTier',
        type: 'dropdown',
        required: true,
        options: ['Gold Package - Includes setup', 'Platinum Package - Setup + Photography', 'Diamond Package - Full Event Coordination']
      }
    ]
  },

  // 19. Quantity Bundle Deal - Number with ranges
  {
    name: 'Balloon Bouquet Bundle',
    description: 'Create a custom balloon bouquet - charge based on quantity',
    price: 69,
    category: 'Balloons',
    image: images.balloonGold,
    tags: ['balloons', 'bundle', 'bulk', 'bouquet'],
    customFields: [
      {
        label: 'Number of Balloons',
        key: 'bouquetQuantity',
        type: 'number',
        required: true
      },
      {
        label: 'Bouquet Style',
        key: 'bouquetStyle',
        type: 'dropdown',
        required: true,
        options: ['Standing', 'Floating', 'Table Centerpiece', 'Arch']
      },
      {
        label: 'Color Theme',
        key: 'colorTheme',
        type: 'dropdown',
        required: true,
        options: ['Monochrome', 'Pastel Mix', 'Vibrant Mix', 'Metallic']
      }
    ]
  },

  // 20. Complete Customization - All field types combined
  {
    name: 'Ultimate Custom Package',
    description: 'Fully customizable celebration package - everything combined',
    price: 999,
    category: 'Premium',
    image: images.premium,
    tags: ['custom', 'complete', 'everything'],
    customFields: [
      {
        label: 'Celebration Name',
        key: 'celebrationName',
        type: 'text',
        required: true,
        maxLength: 50
      },
      {
        label: 'Special Instructions',
        key: 'specialInstructions',
        type: 'textarea',
        required: false,
        maxLength: 500
      },
      {
        label: 'Number of Guests',
        key: 'guestCount',
        type: 'number',
        required: true
      },
      {
        label: 'Decoration Style',
        key: 'decorStyle',
        type: 'dropdown',
        required: true,
        options: ['Elegant', 'Fun & Playful', 'Romantic', 'Minimalist', 'Extravagant']
      },
      {
        label: 'Custom Design File',
        key: 'designFile',
        type: 'file',
        required: false
      }
    ]
  }
];

// Seed function
const seedAddons = async () => {
  try {
    // Clear existing addons
    await Addon.deleteMany({});
    console.log('Cleared existing addons');

    // Insert new addons
    const createdAddons = await Addon.insertMany(addonsData);
    console.log(`✅ Successfully seeded ${createdAddons.length} addons`);

    // Display summary
    console.log('\n--- Addon Summary ---');
    console.log(`Total Addons: ${createdAddons.length}`);
    
    const categories = {};
    createdAddons.forEach(addon => {
      categories[addon.category] = (categories[addon.category] || 0) + 1;
    });

    console.log('\nAddons by Category:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

    console.log('\nCustom Field Types Used:');
    const fieldTypes = new Set();
    createdAddons.forEach(addon => {
      addon.customFields?.forEach(field => {
        fieldTypes.add(field.type);
      });
    });
    fieldTypes.forEach(type => console.log(`  ✓ ${type}`));

    process.exit(0);
  } catch (error) {
    console.error('Error seeding addons:', error);
    process.exit(1);
  }
};

// Run seed
seedAddons();
