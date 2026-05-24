import dotenv from 'dotenv';
import User from '../models/User.js';
import { connectDB } from '../config/database.js';

dotenv.config();

const seedMerchant = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    const email = 'merchant@gmail.com';
    const password = '1234merchant@';

    const existing = await User.findOne({ email });

    if (existing) {
      existing.role = 'MERCHANT';
      existing.merchantVerified = true;
      existing.password = password;
      existing.isActive = true;
      existing.emailVerified = true;
      await existing.save();
      console.log('✅ Merchant user updated');
    } else {
      await User.create({
        name: 'Demo Merchant',
        email,
        phone: '+94700000001',
        password,
        address: 'Merchant HQ',
        role: 'MERCHANT',
        merchantVerified: true,
        isActive: true,
        emailVerified: true,
      });
      console.log('✅ Merchant user created');
    }

    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding merchant:', error);
    process.exit(1);
  }
};

seedMerchant();
