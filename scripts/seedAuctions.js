import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import Auction from '../models/Auction.js';
import { computeNextMinimum } from '../utils/auctionHelpers.js';

dotenv.config();

async function seed() {
  await connectDB();

  const merchant = await User.findOne({ role: 'MERCHANT', merchantVerified: true });
  if (!merchant) {
    console.error('No verified merchant found. Run npm run seed:merchant first.');
    process.exit(1);
  }

  const now = Date.now();
  const samples = [
    {
      title: 'Antique Gold Bracelet',
      description: 'Beautiful handcrafted antique gold bracelet with intricate designs',
      category: 'Bracelets',
      purity: '22K',
      weight: '25.4g',
      condition: 'Excellent',
      startingBid: 35000,
      images: [
        'https://images.unsplash.com/photo-1611955167811-4711904bb9f8?w=400&h=300&fit=crop',
      ],
      hours: 3,
    },
    {
      title: 'Traditional Kada',
      description: 'Traditional solid gold kada with cultural significance',
      category: 'Bracelets',
      purity: '22K',
      weight: '30.2g',
      condition: 'Very Good',
      startingBid: 25000,
      images: [
        'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400&h=300&fit=crop',
      ],
      hours: 2,
    },
    {
      title: 'Diamond Ring Set',
      description: 'Elegant diamond ring set with matching wedding bands',
      category: 'Rings',
      purity: '18K',
      weight: '12.8g',
      condition: 'Like New',
      startingBid: 125000,
      images: [
        'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=400&h=300&fit=crop',
      ],
      hours: 6,
    },
  ];

  for (const s of samples) {
    const exists = await Auction.findOne({ merchant: merchant._id, title: s.title });
    if (exists) {
      console.log(`Skip existing: ${s.title}`);
      continue;
    }
    const startsAt = new Date(now);
    const endsAt = new Date(now + s.hours * 3600 * 1000);
    await Auction.create({
      merchant: merchant._id,
      title: s.title,
      description: s.description,
      images: s.images,
      category: s.category,
      purity: s.purity,
      weight: s.weight,
      condition: s.condition,
      startingBid: s.startingBid,
      currentBid: s.startingBid,
      minIncrement: 2000,
      nextMinimum: computeNextMinimum(s.startingBid, 2000),
      startsAt,
      endsAt,
      status: 'active',
      bidCount: 0,
      watcherCount: 0,
    });
    console.log(`Created auction: ${s.title}`);
  }

  console.log('Done seeding auctions.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
