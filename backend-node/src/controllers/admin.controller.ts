import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { AuditLog } from '../models/AuditLog';
import { ActivityEntry } from '../models/ActivityEntry';
import { checkMlHealth } from '../services/mlClient.service';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const users = await User.find({ companyId: new mongoose.Types.ObjectId(companyId) }, '-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const adminId = req.user!.userId;
    const { email, password, role = 'user', firstName, lastName } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required' } });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ success: false, error: { code: 'USER_EXISTS', message: 'Email already registered' } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      companyId: new mongoose.Types.ObjectId(companyId),
      role: role === 'admin' ? 'admin' : 'user',
      firstName: firstName || '',
      lastName: lastName || ''
    });

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(adminId),
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: newUser._id.toString(),
      metadata: { email: newUser.email, role: newUser.role }
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const adminId = req.user!.userId;
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: 'Role must be admin or user' } });
      return;
    }

    const updated = await User.findOneAndUpdate(
      { _id: id, companyId: new mongoose.Types.ObjectId(companyId) },
      { role },
      { new: true }
    ).select('-passwordHash');

    if (!updated) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(adminId),
      action: 'ROLE_CHANGED',
      entityType: 'User',
      entityId: id,
      metadata: { newRole: role }
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const logs = await AuditLog.find({
      companyId: new mongoose.Types.ObjectId(companyId)
    }).populate('userId', 'email firstName lastName').sort({ createdAt: -1 }).limit(100);

    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getSystemStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;

    const [mlHealth, company, userCount, activityCount] = await Promise.all([
      checkMlHealth(),
      Company.findById(companyId),
      User.countDocuments({ companyId: new mongoose.Types.ObjectId(companyId) }),
      ActivityEntry.countDocuments({ companyId: new mongoose.Types.ObjectId(companyId) })
    ]);

    const mongoReady = mongoose.connection.readyState === 1;

    res.json({
      success: true,
      data: {
        services: {
          apiGateway: { name: 'Node.js Express Gateway', status: 'Healthy', port: 5000 },
          database: { name: 'MongoDB Data Store', status: mongoReady ? 'Healthy' : 'Unavailable', readyState: mongoose.connection.readyState },
          mlMicroservice: { name: 'FastAPI Python ML Service', status: mlHealth.status, details: mlHealth },
          aiProvider: { name: process.env.GEMINI_API_KEY ? 'Google Gemini 1.5 Flash' : 'Rule-Based Fallback Engine', status: 'Healthy' },
          emissionFactorSource: { name: 'GHG Protocol Baseline / Climatiq Hybrid', status: 'Healthy' }
        },
        organizationStats: {
          companyName: company?.name,
          userCount,
          activityCount
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
