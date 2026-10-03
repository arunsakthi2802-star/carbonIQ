import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { EmissionFactor } from '../models/EmissionFactor';
import { AuditLog } from '../models/AuditLog';

const JWT_SECRET = process.env.JWT_SECRET || 'carboniq-super-secret-production-key-2026';

const DEFAULT_FACTORS_SEED = [
  { activityType: 'electricity', name: 'Grid Electricity (India Average)', factorValue: 0.82, unit: 'kg CO2e/kWh', scope: 2, region: 'IN', source: 'CEA Baseline Database / GHG Protocol' },
  { activityType: 'diesel', name: 'Diesel Stationary & Fleet Combustion', factorValue: 2.68, unit: 'kg CO2e/litre', scope: 1, region: 'Global', source: 'DEFRA / IPCC Guidelines' },
  { activityType: 'road_freight', name: 'Heavy Commercial Road Freight', factorValue: 0.14, unit: 'kg CO2e/ton-km', scope: 3, region: 'Global', source: 'GLEC Framework / GHG Protocol Scope 3' },
  { activityType: 'cotton', name: 'Raw Cotton Cultivation & Processing', factorValue: 5.90, unit: 'kg CO2e/kg', scope: 3, region: 'Global', source: 'World Apparel & Footprint Database' }
];

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName, industry, country, email, password } = req.body;

    if (!companyName || !country || !email || !password) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Company Name, Country, Email and Password are required.' }
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters long.' }
      });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'An account with this email address already exists.' }
      });
      return;
    }

    // 1. Create Company
    const company = await Company.create({
      name: companyName.trim(),
      industry: (industry || 'Manufacturing & Supply Chain').trim(),
      country: country.trim()
    });

    // 2. Hash Password & Create Admin User
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      companyId: company._id,
      role: 'admin',
      firstName: companyName.split(' ')[0] || 'Admin',
      lastName: 'Manager'
    });

    // 3. Seed Default Emission Factors for Company
    const factorsToInsert = DEFAULT_FACTORS_SEED.map(f => ({
      ...f,
      companyId: company._id,
      active: true
    }));
    await EmissionFactor.insertMany(factorsToInsert);

    // 4. Log Audit Trail
    await AuditLog.create({
      companyId: company._id,
      userId: user._id,
      action: 'REGISTER',
      entityType: 'User',
      entityId: user._id.toString(),
      metadata: { companyName: company.name, email: user.email }
    });

    // 5. Generate JWT (24-hour expiry)
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        companyId: company._id.toString(),
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        },
        company: {
          id: company._id,
          name: company.name,
          industry: company.industry,
          country: company.country
        }
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Internal server error during registration.' }
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' }
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('companyId');
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
      return;
    }

    const company = user.companyId as any;

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        companyId: company._id.toString(),
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit Log
    await AuditLog.create({
      companyId: company._id,
      userId: user._id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user._id.toString()
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        },
        company: {
          id: company._id,
          name: company.name,
          industry: company.industry,
          country: company.country,
          settings: company.settings
        }
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Internal server error during login.' }
    });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    const user = await User.findById(req.user.userId).populate('companyId');
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    const company = user.companyId as any;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        },
        company: {
          id: company._id,
          name: company.name,
          industry: company.industry,
          country: company.country,
          settings: company.settings
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};
