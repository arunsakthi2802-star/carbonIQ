import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { EmissionFactor } from '../models/EmissionFactor';
import { ActivityEntry } from '../models/ActivityEntry';
import { CalculationResult } from '../models/CalculationResult';
import { ExplainabilityResult } from '../models/ExplainabilityResult';
import { WhatIfScenario } from '../models/WhatIfScenario';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';

export interface SeedResult {
  companies: number;
  users: number;
  factors: number;
  activities: number;
  calculations: number;
  explainabilities: number;
  scenarios: number;
  auditLogs: number;
  notifications: number;
}

export const seedDatabase = async (forceClean = false): Promise<SeedResult> => {
  console.log('🌱 Checking / Seeding database collections...');

  if (forceClean) {
    console.log('🧹 Clean seed requested — clearing existing demo documents...');
    await Promise.all([
      Company.deleteMany({}),
      User.deleteMany({}),
      EmissionFactor.deleteMany({}),
      ActivityEntry.deleteMany({}),
      CalculationResult.deleteMany({}),
      ExplainabilityResult.deleteMany({}),
      WhatIfScenario.deleteMany({}),
      AuditLog.deleteMany({}),
      Notification.deleteMany({})
    ]);
  }

  // 1. Check or Seed Company
  let company = await Company.findOne({ name: 'Apex Global Logistics' });
  if (!company) {
    company = await Company.create({
      name: 'Apex Global Logistics',
      industry: 'Logistics & Supply Chain',
      country: 'India',
      settings: {
        defaultReportingPeriod: '2026-08',
        factorSource: 'GHG Protocol / CEA Benchmark',
        unitPreference: 't',
        currency: 'USD',
        aiProvider: 'gemini'
      }
    });
    console.log(`✅ Seeded default company: ${company.name} (${company._id})`);
  }

  // 2. Check or Seed Users
  let adminUser = await User.findOne({ email: 'admin@carboniq.io' });
  if (!adminUser) {
    const adminPass = await bcrypt.hash('admin123', 10);
    const analystPass = await bcrypt.hash('analyst123', 10);
    const operatorPass = await bcrypt.hash('operator123', 10);

    const users = await User.insertMany([
      {
        email: 'admin@carboniq.io',
        passwordHash: adminPass,
        companyId: company._id,
        role: 'admin',
        firstName: 'Sarah',
        lastName: 'Chen',
        phone: '+91 98765 43210',
        department: 'Sustainability Leadership',
        status: 'active',
        isVerified: true,
        verifiedAt: new Date()
      },
      {
        email: 'analyst@carboniq.io',
        passwordHash: analystPass,
        companyId: company._id,
        role: 'analyst',
        firstName: 'Marcus',
        lastName: 'Vance',
        phone: '+91 98765 43211',
        department: 'ESG Data Science',
        status: 'active',
        isVerified: true,
        verifiedAt: new Date()
      },
      {
        email: 'operator@carboniq.io',
        passwordHash: operatorPass,
        companyId: company._id,
        role: 'user',
        firstName: 'David',
        lastName: 'Miller',
        phone: '+91 98765 43212',
        department: 'Supply Chain Operations',
        status: 'active',
        isVerified: true,
        verifiedAt: new Date()
      }
    ]);
    adminUser = users[0];
    console.log(`✅ Seeded ${users.length} verified users for ${company.name}`);
  }

  // 3. Check or Seed Emission Factors
  const factorCount = await EmissionFactor.countDocuments({ companyId: company._id });
  if (factorCount === 0) {
    const factors = await EmissionFactor.insertMany([
      {
        companyId: company._id,
        name: 'Grid Electricity (CEA National Grid Avg)',
        activityType: 'electricity',
        scope: 2,
        factorValue: 0.82,
        unit: 'kg CO2e / kWh',
        region: 'IN',
        source: 'CEA GHG Database v20.0',
        active: true
      },
      {
        companyId: company._id,
        name: 'Diesel Fuel (Direct Fleet & Generators)',
        activityType: 'diesel',
        scope: 1,
        factorValue: 2.68,
        unit: 'kg CO2e / L',
        region: 'Global',
        source: 'GHG Protocol Stationary/Mobile Fuel Tables',
        active: true
      },
      {
        companyId: company._id,
        name: 'Heavy Commercial Vehicle Road Freight',
        activityType: 'road_freight',
        scope: 3,
        factorValue: 0.14,
        unit: 'kg CO2e / t-km',
        region: 'Global',
        source: 'GLEC Framework v3.0 / EPA',
        active: true
      },
      {
        companyId: company._id,
        name: 'Raw Cotton Supply Chain Fibre',
        activityType: 'cotton',
        scope: 3,
        factorValue: 5.90,
        unit: 'kg CO2e / kg',
        region: 'Global',
        source: 'Ecoinvent v3.9',
        active: true
      }
    ]);
    console.log(`✅ Seeded ${factors.length} standard emission factors`);
  }

  // 4. Seed Activity Entries & Calculations if empty
  const activityCount = await ActivityEntry.countDocuments({ companyId: company._id });
  if (activityCount === 0 && adminUser) {
    const demoItems = [
      {
        period: '2026-08',
        activityType: 'electricity' as const,
        facility: 'BLR-HUB-01',
        supplierId: 'BESCOM-GRID',
        department: 'Warehousing & Operations',
        quantity: 125000,
        unit: 'kWh',
        region: 'IN',
        equipmentAgeYears: 3,
        cargoWeightTons: 0,
        baselineKg: 102500, // 125,000 * 0.82
        correctedKg: 104850 // ML operational correction (+2.3% due to high load factor)
      },
      {
        period: '2026-08',
        activityType: 'diesel' as const,
        facility: 'BLR-HUB-01',
        supplierId: 'IOCL-DEPOT',
        department: 'Fleet Transport',
        quantity: 18400,
        unit: 'L',
        region: 'IN',
        equipmentAgeYears: 6,
        cargoWeightTons: 120,
        baselineKg: 49312, // 18,400 * 2.68
        correctedKg: 52140 // ML operational correction (+5.7% due to older engine wear)
      },
      {
        period: '2026-08',
        activityType: 'road_freight' as const,
        facility: 'MUM-CORRIDOR',
        supplierId: 'TCI-LOGISTICS',
        department: 'Inbound Logistics',
        quantity: 450000,
        unit: 't-km',
        region: 'IN',
        equipmentAgeYears: 4,
        cargoWeightTons: 350,
        baselineKg: 63000, // 450,000 * 0.14
        correctedKg: 64890 // ML operational correction (+3.0%)
      },
      {
        period: '2026-08',
        activityType: 'cotton' as const,
        facility: 'TEX-SPINNING-02',
        supplierId: 'VARDHMAN-TEXTILES',
        department: 'Raw Materials Sourcing',
        quantity: 15000,
        unit: 'kg',
        region: 'IN',
        equipmentAgeYears: 2,
        cargoWeightTons: 15,
        baselineKg: 88500, // 15,000 * 5.90
        correctedKg: 87100 // ML operational correction (-1.6% due to high purity supplier)
      },
      {
        period: '2026-07',
        activityType: 'electricity' as const,
        facility: 'BLR-HUB-01',
        supplierId: 'BESCOM-GRID',
        department: 'Warehousing & Operations',
        quantity: 118000,
        unit: 'kWh',
        region: 'IN',
        equipmentAgeYears: 3,
        cargoWeightTons: 0,
        baselineKg: 96760,
        correctedKg: 98200
      },
      {
        period: '2026-07',
        activityType: 'diesel' as const,
        facility: 'BLR-HUB-01',
        supplierId: 'IOCL-DEPOT',
        department: 'Fleet Transport',
        quantity: 19200,
        unit: 'L',
        region: 'IN',
        equipmentAgeYears: 6,
        cargoWeightTons: 130,
        baselineKg: 51456,
        correctedKg: 54300
      }
    ];

    await ActivityEntry.insertMany(demoItems.map(d => ({ ...d, companyId: company!._id })));
    console.log(`✅ Seeded ${demoItems.length} operational activity entries`);

    // Precalculate and seed monthly calculation results for 2026-08
    const s1 = 52140; // diesel
    const s2 = 104850; // electricity
    const s3 = 64890 + 87100; // road freight + cotton = 151990
    const totalCorrected = s1 + s2 + s3; // 308980
    const totalBaseline = 49312 + 102500 + 63000 + 88500; // 303312
    const adjustment = totalCorrected - totalBaseline; // 5668
    const adjustmentPct = (adjustment / totalBaseline) * 100;

    const calcResult = await CalculationResult.create({
      companyId: company._id,
      period: '2026-08',
      scope1Kg: s1,
      scope2Kg: s2,
      scope3Kg: s3,
      totalKg: totalCorrected,
      baselineTotalKg: totalBaseline,
      correctedTotalKg: totalCorrected,
      adjustmentKg: adjustment,
      adjustmentPct: Math.round(adjustmentPct * 100) / 100,
      breakdown: {
        electricity: 104850,
        diesel: 52140,
        road_freight: 64890,
        cotton: 87100
      },
      modelVersion: '1.0.0-xgb-shap',
      activityCount: 4
    });
    console.log(`✅ Seeded aggregated CalculationResult for 2026-08`);

    // Seed SHAP Explainability Result
    await ExplainabilityResult.create({
      companyId: company._id,
      period: '2026-08',
      calculationResultId: calcResult._id,
      explainerType: 'TreeSHAP (Exact TreeExplainer)',
      topFactors: [
        {
          feature: 'quantity',
          label: 'Activity Volume (Throughput)',
          contribution: 3200,
          contributionPct: 56.4,
          direction: 'positive',
          plainLanguage: 'High warehouse throughput and road freight volume added +3.2 t CO2e to emissions.',
          rank: 1
        },
        {
          feature: 'equipmentAgeYears',
          label: 'Equipment & Vehicle Degradation',
          contribution: 1850,
          contributionPct: 32.6,
          direction: 'positive',
          plainLanguage: 'Fleet age (6 years) and older diesel combustion caused an operational overhead of +1.85 t CO2e.',
          rank: 2
        },
        {
          feature: 'supplierEfficiency',
          label: 'Supplier Decarbonization Efficiency',
          contribution: -950,
          contributionPct: -16.8,
          direction: 'negative',
          plainLanguage: 'Vardhman Textiles renewable spinning processes reduced supply chain emissions by -0.95 t CO2e.',
          rank: 3
        }
      ]
    });
    console.log(`✅ Seeded ExplainabilityResult with Tree SHAP diagnostics`);
  }

  // 5. Seed What-If Scenarios
  const scenarioCount = await WhatIfScenario.countDocuments({ companyId: company._id });
  if (scenarioCount === 0 && adminUser) {
    await WhatIfScenario.insertMany([
      {
        companyId: company._id,
        period: '2026-08',
        scenarioName: '30% Solar Rooftop Transition (Scope 2)',
        changes: { electricity: -30 },
        currentBaselineTotalKg: 303312,
        currentCorrectedTotalKg: 308980,
        projectedBaselineTotalKg: 272562,
        projectedTotalKg: 277525,
        savingsKg: 31455,
        savingsTonnes: 31.46,
        reductionPct: 10.18,
        createdBy: adminUser._id
      },
      {
        companyId: company._id,
        period: '2026-08',
        scenarioName: 'Fleet Telematics & Route Optimization (Scope 1)',
        changes: { diesel: -25 },
        currentBaselineTotalKg: 303312,
        currentCorrectedTotalKg: 308980,
        projectedBaselineTotalKg: 290984,
        projectedTotalKg: 295945,
        savingsKg: 13035,
        savingsTonnes: 13.04,
        reductionPct: 4.22,
        createdBy: adminUser._id
      }
    ]);
    console.log(`✅ Seeded 2 What-If reduction scenarios`);
  }

  // 6. Seed Notifications
  const notifCount = await Notification.countDocuments({ companyId: company._id });
  if (notifCount === 0) {
    await Notification.insertMany([
      {
        companyId: company._id,
        title: 'GHG Inventory Initialized',
        message: 'CarbonIQ GHG Protocol inventory accounting engine initialized and synced with MongoDB.',
        type: 'success',
        read: false
      },
      {
        companyId: company._id,
        title: 'Operational Inefficiency Flagged',
        message: 'Transport efficiency dropped 7% on MUM-CORRIDOR freight. Review ML explainability diagnostic.',
        type: 'warning',
        read: false
      }
    ]);
    console.log(`✅ Seeded system notifications`);
  }

  // 7. Seed Audit Logs
  const auditCount = await AuditLog.countDocuments({ companyId: company._id });
  if (auditCount === 0 && adminUser) {
    await AuditLog.create({
      companyId: company._id,
      userId: adminUser._id,
      action: 'DATABASE_INITIALIZED',
      entityType: 'System',
      entityId: company._id.toString(),
      metadata: { initializedBy: 'SeedScript', status: 'VERIFIED_AND_SEEDED' }
    });
    console.log(`✅ Seeded initial audit log trail`);
  }

  const counts: SeedResult = {
    companies: await Company.countDocuments(),
    users: await User.countDocuments(),
    factors: await EmissionFactor.countDocuments(),
    activities: await ActivityEntry.countDocuments(),
    calculations: await CalculationResult.countDocuments(),
    explainabilities: await ExplainabilityResult.countDocuments(),
    scenarios: await WhatIfScenario.countDocuments(),
    auditLogs: await AuditLog.countDocuments(),
    notifications: await Notification.countDocuments()
  };

  console.log('🎉 Seed complete! Current MongoDB collection metrics:', counts);
  return counts;
};
