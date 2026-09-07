import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import userModel from './models/userModel.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const EMAIL = 'moderator@mysecxion.com';
const PASSWORD = 'SecxionReview2026!';
const NAME = 'Play Store Reviewer';

async function createReviewUser() {
  try {
    console.log('Connecting to MongoDB...');
    // Strip quotes if they exist in the env var
    const uri = process.env.MONGODB_URI.replace(/^"|"$/g, '');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const existingUser = await userModel.findOne({ email: EMAIL });
    if (existingUser) {
      console.log('⚠️ User already exists. Updating password and verification status...');
      existingUser.password = bcrypt.hashSync(PASSWORD, bcrypt.genSaltSync(10));
      existingUser.isVerified = true;
      existingUser.name = NAME;
      await existingUser.save();
      console.log('✅ User updated successfully');
    } else {
      console.log('Creating new reviewer user...');
      const hashPassword = bcrypt.hashSync(PASSWORD, bcrypt.genSaltSync(10));
      const newUser = new userModel({
        name: NAME,
        email: EMAIL,
        password: hashPassword,
        role: 'GENERAL',
        isVerified: true,
        tag: 'REVIEWER'
      });
      await newUser.save();
      console.log('✅ Reviewer user created successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createReviewUser();
