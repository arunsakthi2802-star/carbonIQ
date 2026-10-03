import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ActivityEntry } from '../models/ActivityEntry';
import { AuditLog } from '../models/AuditLog';
import { recalculateEmissions } from '../services/calculationOrchestrator.service';
import { mlClient } from '../services/mlClient.service';

const VALID_ACTIVITIES = ['electricity', 'diesel', 'road_freight', 'cotton'];

export const createActivityEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const {
      activityType,
      quantity,
      unit,
      region,
      equipmentAgeYears,
      cargoWeightTons,
      supplierId,
      facility,
      department,
      notes,
      period
    } = req.body;

    // Validation
    const act = String(activityType || '').toLowerCase().trim();
    if (!VALID_ACTIVITIES.includes(act)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ACTIVITY', message: `Activity must be one of: ${VALID_ACTIVITIES.join(', ')}` }
      });
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUANTITY', message: 'Quantity must be a positive number greater than zero.' }
      });
      return;
    }

    if (act === 'road_freight' && (!cargoWeightTons || parseFloat(cargoWeightTons) <= 0)) {
      res.status(400).json({
        success: false,
        error: { code: 'CARGO_WEIGHT_REQUIRED', message: 'Road freight requires cargoWeightTons greater than zero.' }
      });
      return;
    }

    const targetPeriod = period && /^\d{4}-\d{2}$/.test(period) ? period : new Date().toISOString().substring(0, 7);

    // Default units
    let defaultUnit = unit;
    if (!defaultUnit) {
      if (act === 'electricity') defaultUnit = 'kWh';
      else if (act === 'diesel') defaultUnit = 'litre';
      else if (act === 'road_freight') defaultUnit = 'km';
      else if (act === 'cotton') defaultUnit = 'kg';
    }

    const entry = await ActivityEntry.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      period: targetPeriod,
      activityType: act,
      quantity: qty,
      unit: defaultUnit,
      region: (region || 'IN').toUpperCase(),
      equipmentAgeYears: Math.max(0, parseFloat(equipmentAgeYears) || 0),
      cargoWeightTons: act === 'road_freight' ? parseFloat(cargoWeightTons) : 0,
      supplierId: supplierId || '',
      facility: facility || 'Primary Site',
      department: department || 'Operations',
      notes: notes || ''
    });

    // Orchestrate recalculation for this period
    const recalc = await recalculateEmissions(companyId, targetPeriod, userId);

    // Audit Log
    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(userId),
      action: 'CREATE_ACTIVITY',
      entityType: 'ActivityEntry',
      entityId: entry._id.toString(),
      metadata: { activityType: act, quantity: qty, period: targetPeriod }
    });

    res.status(201).json({
      success: true,
      data: {
        entry,
        periodSummary: recalc?.calculation,
        explainability: recalc?.explainability
      }
    });
  } catch (error: any) {
    console.error('Error creating activity entry:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

export const getActivityEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const {
      period,
      activityType,
      region,
      supplierId,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const query: any = { companyId: new mongoose.Types.ObjectId(companyId) };

    if (period) query.period = period;
    if (activityType) query.activityType = activityType;
    if (region) query.region = (region as string).toUpperCase();
    if (supplierId) query.supplierId = supplierId;

    if (search) {
      const regex = new RegExp(search as string, 'i');
      query.$or = [
        { supplierId: regex },
        { facility: regex },
        { notes: regex },
        { activityType: regex }
      ];
    }

    const p = Math.max(1, parseInt(page as string, 10));
    const l = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (p - 1) * l;

    const [entries, total] = await Promise.all([
      ActivityEntry.find(query).sort({ period: -1, createdAt: -1 }).skip(skip).limit(l),
      ActivityEntry.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          total,
          page: p,
          limit: l,
          pages: Math.ceil(total / l)
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getActivityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid activity ID format' } });
      return;
    }

    const entry = await ActivityEntry.findOne({ _id: id, companyId: new mongoose.Types.ObjectId(companyId) });
    if (!entry) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Activity entry not found' } });
      return;
    }

    // Call ML service to get single item explainability & formula audit
    let singleAudit = null;
    try {
      const resp = await mlClient.post('/correct', {
        entries: [{
          activityType: entry.activityType,
          quantity: entry.quantity,
          unit: entry.unit,
          region: entry.region,
          equipmentAgeYears: entry.equipmentAgeYears,
          cargoWeightTons: entry.cargoWeightTons,
          period: entry.period
        }]
      });
      singleAudit = resp.data.data.items?.[0];
    } catch (e) {
      // Fallback
    }

    res.json({
      success: true,
      data: {
        entry,
        audit: singleAudit
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const deleteActivityEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid ID format' } });
      return;
    }

    const entry = await ActivityEntry.findOneAndDelete({ _id: id, companyId: new mongoose.Types.ObjectId(companyId) });
    if (!entry) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Activity entry not found' } });
      return;
    }

    // Immediately recalculate period
    await recalculateEmissions(companyId, entry.period, userId);

    // Audit log
    await AuditLog.create({
      companyId: new mongoose.Types.ObjectId(companyId),
      userId: new mongoose.Types.ObjectId(userId),
      action: 'DELETE_ACTIVITY',
      entityType: 'ActivityEntry',
      entityId: id,
      metadata: { period: entry.period, activityType: entry.activityType }
    });

    res.json({
      success: true,
      data: { message: 'Activity entry deleted and period recalculation completed.' }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const bulkUploadCSV = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { rows, defaultPeriod } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_ROWS', message: 'No activity rows provided in upload payload.' }
      });
      return;
    }

    const acceptedDocs: any[] = [];
    const rejectedRows: any[] = [];
    const affectedPeriods = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Normalize aliases
      const actRaw = String(row.activityType || row.activity_type || row.activity || '').toLowerCase().trim();
      let act = actRaw;
      if (['freight', 'transport', 'road freight'].includes(act)) act = 'road_freight';
      if (['material', 'raw_material'].includes(act)) act = 'cotton';

      const qty = parseFloat(row.quantity || row.qty || 0);
      const rowPeriod = String(row.period || defaultPeriod || new Date().toISOString().substring(0, 7)).trim();
      const cargo = parseFloat(row.cargoWeightTons || row.cargo_weight_tons || row.cargo_weight || 0);
      const age = parseFloat(row.equipmentAgeYears || row.equipment_age || row.age || 5);

      if (!VALID_ACTIVITIES.includes(act)) {
        rejectedRows.push({ rowNumber: i + 1, error: `Invalid activity '${actRaw}'. Allowed: ${VALID_ACTIVITIES.join(', ')}` });
        continue;
      }
      if (isNaN(qty) || qty <= 0) {
        rejectedRows.push({ rowNumber: i + 1, error: 'Quantity must be positive numeric value.' });
        continue;
      }
      if (act === 'road_freight' && (isNaN(cargo) || cargo <= 0)) {
        rejectedRows.push({ rowNumber: i + 1, error: 'Road freight requires positive cargo weight.' });
        continue;
      }
      if (!/^\d{4}-\d{2}$/.test(rowPeriod)) {
        rejectedRows.push({ rowNumber: i + 1, error: `Invalid period format '${rowPeriod}'. Must be YYYY-MM.` });
        continue;
      }

      let unit = row.unit;
      if (!unit) {
        if (act === 'electricity') unit = 'kWh';
        else if (act === 'diesel') unit = 'litre';
        else if (act === 'road_freight') unit = 'km';
        else if (act === 'cotton') unit = 'kg';
      }

      acceptedDocs.push({
        companyId: new mongoose.Types.ObjectId(companyId),
        period: rowPeriod,
        activityType: act,
        quantity: qty,
        unit,
        region: String(row.region || 'IN').toUpperCase(),
        equipmentAgeYears: isNaN(age) ? 5 : Math.max(0, age),
        cargoWeightTons: act === 'road_freight' ? cargo : 0,
        supplierId: String(row.supplierId || row.supplier_id || row.supplier || ''),
        facility: String(row.facility || 'Primary Facility'),
        department: String(row.department || 'Operations'),
        notes: String(row.notes || '')
      });

      affectedPeriods.add(rowPeriod);
    }

    if (acceptedDocs.length > 0) {
      await ActivityEntry.insertMany(acceptedDocs);

      // Trigger recalculation for all distinct periods affected
      for (const p of affectedPeriods) {
        await recalculateEmissions(companyId, p, userId);
      }

      // Audit log
      await AuditLog.create({
        companyId: new mongoose.Types.ObjectId(companyId),
        userId: new mongoose.Types.ObjectId(userId),
        action: 'BULK_IMPORT',
        entityType: 'ActivityEntry',
        metadata: {
          acceptedCount: acceptedDocs.length,
          rejectedCount: rejectedRows.length,
          affectedPeriods: Array.from(affectedPeriods)
        }
      });
    }

    res.json({
      success: true,
      data: {
        totalRows: rows.length,
        acceptedCount: acceptedDocs.length,
        rejectedCount: rejectedRows.length,
        rejectedRows,
        affectedPeriods: Array.from(affectedPeriods)
      }
    });
  } catch (error: any) {
    console.error('Error during bulk CSV import:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
