import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { connectDB } from '../config/database.js';

// Load environment variables
dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@gmail.com' });

    if (existingAdmin) {
      // Update existing admin
      existingAdmin.role = 'SUPER_ADMIN';
      existingAdmin.password = '1234admin@';
      existingAdmin.isActive = true;
      existingAdmin.emailVerified = true;
      await existingAdmin.save();
      console.log('✅ Super admin updated successfully');
      console.log('📧 Email: admin@gmail.com');
      console.log('🔑 Password: 1234admin@');
    } else {
      // Create new admin
      const admin = await User.create({
        name: 'Super Admin',
        email: 'admin@gmail.com',
        phone: '+1234567890',
        password: '1234admin@',
        address: 'Admin Address',
        role: 'SUPER_ADMIN',
        isActive: true,
        emailVerified: true,
      });

      console.log('✅ Super admin created successfully');
      console.log('📧 Email: admin@gmail.com');
      console.log('🔑 Password: 1234admin@');
      console.log('🆔 User ID:', admin._id);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();

