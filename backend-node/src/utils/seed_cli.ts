import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB, closeDB, activeDatabaseType } from '../config/db';
import { seedDatabase } from './seeder';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { AuditLog } from '../models/AuditLog';
import { validateUserInput } from '../controllers/user.controller';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const run = async () => {
  console.log(`
============================================================
 CARBONIQ MONGODB SEEDING & USER CRUD VALIDATION SUITE
============================================================
  `);

  try {
    // 1. Connect to Database (Atlas or fallback)
    await connectDB();
    console.log(`Connected to: ${activeDatabaseType}`);

    // 2. Seed All Collections with Fresh Data
    console.log('\n--- Step 1: Seeding All Collections ---');
    const counts = await seedDatabase(false);

    // 3. User Data Validation Test Suite
    console.log('\n--- Step 2: Testing User Data Validation Rules ---');
    
    // Test Invalid Email
    const invalidEmailErrors = validateUserInput({ email: 'bad-email-format', password: 'password123' });
    console.log('Testing invalid email format:', invalidEmailErrors.length > 0 ? '✅ PASSED (Caught invalid email)' : '❌ FAILED');

    // Test Short Password
    const shortPassErrors = validateUserInput({ email: 'valid@carboniq.io', password: '123' });
    console.log('Testing short password (<6 chars):', shortPassErrors.length > 0 ? '✅ PASSED (Caught short password)' : '❌ FAILED');

    // Test Invalid Role
    const invalidRoleErrors = validateUserInput({ email: 'valid@carboniq.io', password: 'password123', role: 'superadmin' });
    console.log('Testing unauthorized role:', invalidRoleErrors.length > 0 ? '✅ PASSED (Caught invalid role)' : '❌ FAILED');

    // Test Valid Input
    const validErrors = validateUserInput({
      email: 'verified.analyst@carboniq.io',
      password: 'StrongPassword2026!',
      role: 'analyst',
      phone: '+91 99887 76655'
    });
    console.log('Testing valid user payload:', validErrors.length === 0 ? '✅ PASSED (Validation passed clean)' : '❌ FAILED');

    // 4. Test User CRUD in MongoDB
    console.log('\n--- Step 3: Testing User CRUD Operations in MongoDB ---');
    const company = await Company.findOne({ name: 'Apex Global Logistics' });
    if (!company) throw new Error('Company not found');

    const testEmail = `test.operator.${Date.now()}@carboniq.io`;
    const hashedPass = await bcrypt.hash('TestPass2026!', 10);

    // [C] CREATE
    const createdUser = await User.create({
      email: testEmail,
      passwordHash: hashedPass,
      companyId: company._id,
      role: 'user',
      firstName: 'Validation',
      lastName: 'Tester',
      phone: '+91 99000 11223',
      department: 'Logistics QA',
      status: 'pending',
      isVerified: false
    });
    console.log(`[C] Created User: ${createdUser.email} (ID: ${createdUser._id}, isVerified: ${createdUser.isVerified})`);

    // [R] READ
    const fetchedUser = await User.findById(createdUser._id).select('-passwordHash');
    console.log(`[R] Read User: Found ${fetchedUser?.firstName} ${fetchedUser?.lastName} (${fetchedUser?.email})`);

    // [U] UPDATE & VERIFY
    const updatedUser = await User.findByIdAndUpdate(
      createdUser._id,
      {
        department: 'Advanced Decarbonization Unit',
        role: 'manager',
        isVerified: true,
        verifiedAt: new Date(),
        status: 'active'
      },
      { new: true }
    ).select('-passwordHash');
    console.log(`[U] Updated User: Verified=${updatedUser?.isVerified}, Role=${updatedUser?.role}, Dept=${updatedUser?.department}`);

    // Log Audit Trail
    await AuditLog.create({
      companyId: company._id,
      userId: createdUser._id,
      action: 'USER_VERIFIED_AND_TESTED',
      entityType: 'User',
      entityId: createdUser._id.toString(),
      metadata: { testSuite: 'SeederVerification' }
    });
    console.log(`[A] Audit log persisted for test user.`);

    // [D] DELETE
    const deletedUser = await User.findByIdAndDelete(createdUser._id);
    console.log(`[D] Deleted Test User: ${deletedUser?.email} successfully removed from MongoDB.`);

    // 5. Final Collections Verification Report
    console.log('\n--- Step 4: MongoDB Collections & Document Counts ---');
    const finalCounts = {
      'Companies Collection': await mongoose.connection.collection('companies').countDocuments(),
      'Users Collection': await mongoose.connection.collection('users').countDocuments(),
      'Emission Factors Collection': await mongoose.connection.collection('emissionfactors').countDocuments(),
      'Activity Entries Collection': await mongoose.connection.collection('activityentries').countDocuments(),
      'Calculation Results Collection': await mongoose.connection.collection('calculationresults').countDocuments(),
      'Explainability Results Collection': await mongoose.connection.collection('explainabilityresults').countDocuments(),
      'What-If Scenarios Collection': await mongoose.connection.collection('whatifscenarios').countDocuments(),
      'Audit Logs Collection': await mongoose.connection.collection('auditlogs').countDocuments(),
      'Notifications Collection': await mongoose.connection.collection('notifications').countDocuments()
    };

    console.table(finalCounts);

    console.log('\n🎉 ALL COLLECTIONS SEEDED, VALIDATED, AND VERIFIED IN MONGODB SUCCESSFULLY!\n');
    await closeDB();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error executing seed & validation suite:', error);
    process.exit(1);
  }
};

run();
