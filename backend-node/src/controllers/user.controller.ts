import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { AuditLog } from '../models/AuditLog';

// Helper for strict validation
export const validateUserInput = (data: any, isUpdate = false) => {
  const errors: string[] = [];

  if (!isUpdate || data.email !== undefined) {
    if (!data.email || typeof data.email !== 'string') {
      errors.push('Valid email address is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.push('Email format is invalid.');
    }
  }

  if (!isUpdate) {
    if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
      errors.push('Password must be at least 6 characters long.');
    }
  } else if (data.password !== undefined) {
    if (typeof data.password !== 'string' || data.password.length < 6) {
      errors.push('Updated password must be at least 6 characters long.');
    }
  }

  if (data.role !== undefined && !['admin', 'user', 'analyst', 'manager'].includes(data.role)) {
    errors.push('Role must be one of: admin, user, analyst, manager.');
  }

  if (data.status !== undefined && !['active', 'inactive', 'pending'].includes(data.status)) {
    errors.push('Status must be one of: active, inactive, pending.');
  }

  if (data.phone && typeof data.phone === 'string' && data.phone.trim().length > 0) {
    if (!/^[\d\s+\-()]{7,20}$/.test(data.phone.trim())) {
      errors.push('Phone number format is invalid.');
    }
  }

  return errors;
};

// 1. CREATE USER (POST /api/users)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const operatorId = req.user!.userId;
    const validationErrors = validateUserInput(req.body, false);

    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'User data validation failed', details: validationErrors }
      });
      return;
    }

    const { email, password, role = 'user', firstName = '', lastName = '', phone = '', department = 'Operations' } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: `User with email '${normalizedEmail}' already exists in database.` }
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      companyId: new mongoose.Types.ObjectId(companyId),
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      department: department.trim(),
      status: 'active',
      isVerified: true,
      verifiedAt: new Date()
    });

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(operatorId),
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user._id.toString(),
      metadata: { email: user.email, role: user.role }
    });

    res.status(201).json({
      success: true,
      message: 'User created, verified and persisted in MongoDB successfully.',
      data: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        department: user.department,
        status: user.status,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// 2. READ ALL USERS (GET /api/users)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const query: any = { companyId: new mongoose.Types.ObjectId(companyId) };

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      const regex = new RegExp(search as string, 'i');
      query.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }, { department: regex }];
    }

    const p = Math.max(1, parseInt(page as string, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (p - 1) * l;

    const [users, total] = await Promise.all([
      User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(l),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { total, page: p, limit: l, pages: Math.ceil(total / l) }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// 3. READ SINGLE USER (GET /api/users/:id)
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid User ObjectId format' } });
      return;
    }

    const user = await User.findOne({
      _id: id,
      companyId: new mongoose.Types.ObjectId(companyId)
    }).select('-passwordHash').populate('companyId', 'name industry country');

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found in this company' } });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// 4. UPDATE USER (PUT /api/users/:id)
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const operatorId = req.user!.userId;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid User ObjectId format' } });
      return;
    }

    const validationErrors = validateUserInput(req.body, true);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'User data validation failed', details: validationErrors }
      });
      return;
    }

    const updates: any = {};
    const allowedFields = ['firstName', 'lastName', 'phone', 'department', 'role', 'status', 'isVerified'];
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    // Password reset if provided
    if (req.body.password) {
      updates.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: id, companyId: new mongoose.Types.ObjectId(companyId) },
      updates,
      { new: true }
    ).select('-passwordHash');

    if (!updatedUser) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(operatorId),
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: updates
    });

    res.json({
      success: true,
      message: 'User data updated and verified successfully in MongoDB',
      data: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// 5. DELETE USER (DELETE /api/users/:id)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const operatorId = req.user!.userId;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid User ObjectId format' } });
      return;
    }

    if (id === operatorId) {
      res.status(400).json({ success: false, error: { code: 'CANNOT_SELF_DELETE', message: 'Cannot delete your own active administrator account' } });
      return;
    }

    const deleted = await User.findOneAndDelete({
      _id: id,
      companyId: new mongoose.Types.ObjectId(companyId)
    });

    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(operatorId),
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: id,
      metadata: { deletedEmail: deleted.email }
    });

    res.json({
      success: true,
      message: `User '${deleted.email}' removed from MongoDB successfully`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// 6. VERIFY USER STATUS (POST /api/users/:id/verify)
export const verifyUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid User ObjectId' } });
      return;
    }

    const user = await User.findOneAndUpdate(
      { _id: id, companyId: new mongoose.Types.ObjectId(companyId) },
      { isVerified: true, verifiedAt: new Date(), status: 'active' },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({
      success: true,
      message: 'User credentials and status validated and verified successfully',
      data: user
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
