import dotenv from 'dotenv';
import User from '../models/User.js';
import { connectDB } from '../config/database.js';

dotenv.config();

// Allow overriding the admin to seed/promote via env vars or CLI args.
// Usage:
//   ADMIN_EMAIL=kgfgoldtradex@gmail.com ADMIN_PASSWORD=Test@1234 npm run seed:admin
//   node scripts/seedAdmin.js kgfgoldtradex@gmail.com Test@1234
const [argEmail, argPassword] = process.argv.slice(2);

const ADMIN_EMAIL = (argEmail || process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
const ADMIN_PASSWORD = argPassword || process.env.ADMIN_PASSWORD || '1234admin@';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Super Admin';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '+1234567890';
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || 'Admin Address';

const seedAdmin = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      existingAdmin.role = 'SUPER_ADMIN';
      existingAdmin.password = ADMIN_PASSWORD;
      existingAdmin.isActive = true;
      existingAdmin.emailVerified = true;
      await existingAdmin.save();
      console.log('✅ Super admin updated (promoted to SUPER_ADMIN)');
    } else {
      const admin = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE,
        password: ADMIN_PASSWORD,
        address: ADMIN_ADDRESS,
        role: 'SUPER_ADMIN',
        isActive: true,
        emailVerified: true,
      });
      console.log('✅ Super admin created successfully');
      console.log('🆔 User ID:', admin._id);
    }

    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();

