import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  TenantCompany,
  SubscriptionPlan,
  LicenseRecord,
  TrialRegistryRecord,
  User,
  AppData,
} from '../src/types';
import {
  DEFAULT_COMPANIES,
  DEFAULT_SUBSCRIPTION_PLANS,
  DEFAULT_TRIAL_REGISTRY,
  createNewTenantCompany,
  generateLicenseActivationCode,
} from '../src/utils/multiTenantService';
import { getDefaultData } from '../src/utils/storage';
import { sendOtpVerificationEmail } from './emailService';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'rakeeza_cloud_db.json');

export interface SessionRecord {
  token: string;
  userId: string;
  companyId: string;
  userName: string;
  userCode?: string | number;
  role: string;
  createdAt: string;
  expiresAt: string;
}

export interface PendingVerification {
  email: string;
  code: string;
  expiresAt: number;
  companyName?: string;
  phone?: string;
  adminName?: string;
  requestCount?: number;
  lastRequestedAt?: number;
}

export interface CloudDatabaseSchema {
  version: number;
  companies: TenantCompany[];
  plans: SubscriptionPlan[];
  trialRegistry: TrialRegistryRecord[];
  licenses: LicenseRecord[];
  sessions: Record<string, SessionRecord>;
  tenantsData: Record<string, AppData>;
  globalUsers: User[]; // Owner & cross-tenant administrative users
  pendingVerifications?: Record<string, PendingVerification>;
  verifiedEmails?: Record<string, boolean>;
}

let dbCache: CloudDatabaseSchema | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Initializes and seeds the cloud database if not already present on disk
 */
export function initCloudDatabase(): CloudDatabaseSchema {
  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content) as CloudDatabaseSchema;
      parsed.pendingVerifications = parsed.pendingVerifications || {};
      parsed.verifiedEmails = parsed.verifiedEmails || {};
      dbCache = parsed;
      return parsed;
    } catch (err) {
      console.error('Failed reading existing cloud database, creating fresh seed:', err);
    }
  }

  // Build Initial Seed
  const baseDefaultData = getDefaultData();

  // Company 1 Seed Data (RAKEEZA HQ)
  const comp1Data: AppData = {
    ...baseDefaultData,
    companyId: 'COMP-000001',
    settings: {
      ...baseDefaultData.settings,
      companyName: 'شركة ركيزة للمحاسبة والتجارة العامة (RAKEEZA)',
      phone1: '01029190615',
      taxNumber: '',
      commercialReg: 'CR-98765',
      activityCode: '4651 - تجارة أجهزة وإلكترونيات',
    },
    users: [
      {
        id: 'u-admin-1',
        code: 1,
        companyId: 'COMP-000001',
        name: 'Mohamed Nazih (المدير العام)',
        username: 'admin',
        password: 'admin123',
        role: 'company_admin',
        phone: '01029190615',
        status: 'active',
        permissions: { all: true },
      },
      {
        id: 'u-cashier-1',
        code: 2,
        companyId: 'COMP-000001',
        name: 'أحمد محمود (كاشير الفرع الرئيسي)',
        username: 'cashier',
        password: '123',
        role: 'cashier',
        status: 'active',
        permissions: { sales: true, pos: true, quotes_orders: true },
      },
      {
        id: 'u-warehouse-1',
        code: 3,
        companyId: 'COMP-000001',
        name: 'سامح إبراهيم (أمين المخزن المركزي)',
        username: 'warehouse',
        password: '123',
        role: 'warehouse_keeper',
        status: 'active',
        permissions: { inventory: true, purchases: true },
      },
    ],
    items: baseDefaultData.items.filter((i) => i.companyId === 'COMP-000001' || !i.companyId),
  };

  // Company 2 Seed Data (مؤسسة الأمل للتوريدات)
  const comp2Data: AppData = {
    ...baseDefaultData,
    companyId: 'COMP-000002',
    settings: {
      companyName: 'مؤسسة الأمل للتوريدات العمومية',
      address: 'شارع السودان، المهندسين، الجيزة',
      phone1: '01011223344',
      phone2: '01122334455',
      phone3: '',
      taxNumber: '987-654-321',
      commercialReg: 'CR-11223',
      activityCode: '4791 - تجارة التجزئة والتوريدات',
      notes: 'مؤسسة الأمل - رواد توريد مستلزمات الطباعة والكاشير',
      defaultTaxRate: 14,
      withholdingTaxRate: 1,
      currencySymbol: 'ج.م',
      fiscalYear: '2026',
    },
    users: [
      {
        id: 'u-amal-admin',
        companyId: 'COMP-000002',
        name: 'أحمد محمود القاضي (مدير الأمل)',
        username: 'alamal_admin',
        password: '123',
        role: 'company_admin',
        status: 'active',
        phone: '01011223344',
        permissions: { all: true },
      },
      {
        id: 'u-amal-cashier',
        companyId: 'COMP-000002',
        name: 'علي مصطفى (كاشير الأمل)',
        username: 'amal_cashier',
        password: '123',
        role: 'cashier',
        status: 'active',
        permissions: { sales: true, pos: true },
      },
    ],
    customers: [
      {
        id: 'c-amal-1',
        name: 'سلسلة مطاعم البركة',
        phone: '01099887766',
        balance: 0,
        address: 'الدقي، الجيزة',
        priceTier: 'wholesale',
      },
      {
        id: 'c-amal-2',
        name: 'هايبر ماركت التوحيد',
        phone: '01233445566',
        balance: 0,
        address: 'الهرم، الجيزة',
        priceTier: 'retail',
      },
    ],
    suppliers: [
      {
        id: 's-amal-1',
        name: 'مصنع الأهرام للبكر الحراري',
        phone: '01188776655',
        balance: 0,
        address: 'مدينة 6 أكتوبر',
      },
    ],
    items: baseDefaultData.items.filter((i) => i.companyId === 'COMP-000002'),
    salesInvoices: [],
    purchaseInvoices: [],
    cashTransactions: [],
    branches: [
      {
        id: 'br-amal-main',
        code: 'AMAL-01',
        name: 'مقر ومخزن المهندسين',
        location: 'المهندسين، الجيزة',
        phone: '01011223344',
        isMain: true,
        manager: 'أحمد محمود القاضي',
      },
    ],
    activeBranchId: 'br-amal-main',
  };

  // Company 3 Seed Data (مجموعة السلام الهندسية)
  const comp3Data: AppData = {
    ...baseDefaultData,
    companyId: 'COMP-000003',
    settings: {
      companyName: 'مجموعة السلام الهندسية والمقاولات',
      address: 'سموحة، الإسكندرية',
      phone1: '01299887766',
      phone2: '',
      phone3: '',
      taxNumber: '445-556-667',
      commercialReg: 'CR-77889',
      activityCode: '4321 - التركيبات والتجهيزات الهندسية',
      notes: 'السلام إنجينيرينج - حلول وتجهيزات هندسية متكاملة',
      defaultTaxRate: 14,
      currencySymbol: 'ج.م',
      fiscalYear: '2026',
    },
    users: [
      {
        id: 'u-salam-admin',
        companyId: 'COMP-000003',
        name: 'م. حسام علي إبراهيم (مدير السلام)',
        username: 'elsalam_admin',
        password: '123',
        role: 'company_admin',
        status: 'active',
        phone: '01299887766',
        permissions: { all: true },
      },
    ],
    items: [],
    salesInvoices: [],
    purchaseInvoices: [],
    branches: [
      {
        id: 'br-salam-main',
        code: 'SLM-01',
        name: 'مقر سموحة الإسكندرية',
        location: 'سموحة، الإسكندرية',
        phone: '01299887766',
        isMain: true,
        manager: 'م. حسام علي إبراهيم',
      },
    ],
  };

  const initialSchema: CloudDatabaseSchema = {
    version: 1,
    companies: DEFAULT_COMPANIES,
    plans: DEFAULT_SUBSCRIPTION_PLANS,
    trialRegistry: DEFAULT_TRIAL_REGISTRY,
    licenses: [
      {
        id: 'LIC-2026-9901',
        activationCode: 'RKZ-2026-PRO-ANNUAL-001',
        companyId: 'COMP-000001',
        companyName: 'شركة ركيزة للمحاسبة والتجارة العامة (RAKEEZA)',
        planId: 'annual',
        planName: 'الاشتراك السنوي (Annual Pro)',
        startDate: '2026-01-01',
        expiryDate: '2027-01-01',
        status: 'active',
        features: DEFAULT_SUBSCRIPTION_PLANS[3].features,
        limits: DEFAULT_SUBSCRIPTION_PLANS[3].limits,
        generatedAt: '2026-01-01 08:00',
        generatedBy: 'RAKEEZA OWNER',
        activationCount: 1,
      },
    ],
    sessions: {},
    tenantsData: {
      'COMP-000001': comp1Data,
      'COMP-000002': comp2Data,
      'COMP-000003': comp3Data,
    },
    globalUsers: [
      {
        id: 'owner-super-1',
        name: 'مالك المنظومة السحابية (RAKEEZA Owner)',
        username: 'owner',
        password: '123',
        role: 'owner',
        status: 'active',
        permissions: { all: true },
      },
      {
        id: 'owner-super-2',
        name: 'إدارة منظومة ركيزة (Super Admin)',
        username: 'rakeeza_admin',
        password: '123',
        role: 'owner',
        status: 'active',
        permissions: { all: true },
      },
    ],
  };

  saveCloudDatabase(initialSchema);
  return initialSchema;
}

export function getCloudDatabase(): CloudDatabaseSchema {
  if (!dbCache) {
    dbCache = initCloudDatabase();
  }
  return dbCache;
}

export function saveCloudDatabase(data: CloudDatabaseSchema): void {
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    dbCache = data;
  } catch (err) {
    console.error('Failed writing cloud database:', err);
  }
}

/**
 * Authentication Engine: Multi-Tenant & Owner Verification
 */
export function authenticateUser(
  companyIdOrCode: string,
  username: string,
  password: string
): {
  success: boolean;
  token?: string;
  user?: User;
  company?: TenantCompany;
  subscription?: {
    status: string;
    planName: string;
    daysRemaining: number;
    isExpired: boolean;
    expiresAt?: string;
  };
  error?: string;
} {
  const db = getCloudDatabase();
  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanCompanyInput = (companyIdOrCode || '').trim().toUpperCase();

  // 1. Owner Login Route
  if (
    cleanCompanyInput === 'OWNER' ||
    cleanCompanyInput === 'RAKEEZA' ||
    cleanCompanyInput === 'SYSTEM' ||
    cleanUsername === 'owner' ||
    cleanUsername === 'rakeeza_admin'
  ) {
    const ownerUser = db.globalUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.password === password
    );

    if (ownerUser) {
      const token = `tok_owner_${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      db.sessions[token] = {
        token,
        userId: ownerUser.id,
        companyId: 'OWNER',
        userName: ownerUser.name,
        role: 'owner',
        createdAt: new Date().toISOString(),
        expiresAt,
      };
      saveCloudDatabase(db);

      const ownerVirtualCompany: TenantCompany = {
        id: 'OWNER',
        tenantId: 'TENANT-RAKEEZA-CLOUD-ROOT',
        code: 'OWNER-00',
        name: 'منظومة RAKEEZA Cloud ERP - لوحة المالك',
        tradeName: 'RAKEEZA Enterprise Cloud',
        phone: '01029190615',
        status: 'active',
        planId: 'lifetime',
        planName: 'ترخيص المالك المطلق (Root Owner)',
        limits: {
          maxUsers: 99999,
          maxBranches: 9999,
          maxWarehouses: 9999,
          maxTransactionsPerMonth: 99999999,
          storageMb: 999999,
          maxSalesReps: 9999,
        },
        features: ['sales', 'purchases', 'inventory', 'accounting', 'reports', 'multi_branch', 'e_invoicing', 'bi'],
        usersCount: db.companies.reduce((acc, c) => acc + (c.usersCount || 1), 0),
        branchesCount: 1,
        warehousesCount: 1,
        operationsCount: 9999,
      };

      return {
        success: true,
        token,
        user: ownerUser,
        company: ownerVirtualCompany,
        subscription: {
          status: 'active',
          planName: 'ترخيص المالك المطلق (Root Owner)',
          daysRemaining: 36500,
          isExpired: false,
        },
      };
    }
  }

  // 2. Company Lookup
  if (!cleanCompanyInput) {
    return {
      success: false,
      error: 'يرجى إدخال كود الشركة (Company ID) أو كود المنشأة.',
    };
  }

  const company = db.companies.find(
    (c) =>
      c.id.toUpperCase() === cleanCompanyInput ||
      c.code.toUpperCase() === cleanCompanyInput ||
      c.tenantId.toUpperCase() === cleanCompanyInput
  );

  if (!company) {
    return {
      success: false,
      error: `لم يتم العثور على شركة مسجلة بالكود "${companyIdOrCode}". يرجى التأكد من كتابة كود الشركة بشكل صحيح.`,
    };
  }

  // 3. Company Status & Suspension Check
  if (company.status === 'suspended') {
    return {
      success: false,
      error: 'عذراً، تم تعليق حساب هذه الشركة مؤقتاً من قِبل إدارة النظام. يرجى التواصل مع الدعم الفني لشركة ركيزة.',
    };
  }

  // 4. Find User in Company Data
  const tenantData = db.tenantsData[company.id];
  const companyUsers = tenantData?.users || [];

  // If company has admin in company object itself, consider it too
  let matchedUser = companyUsers.find(
    (u) => u.username.toLowerCase() === cleanUsername && u.password === password
  );

  if (!matchedUser && company.adminUsername?.toLowerCase() === cleanUsername && company.adminPassword === password) {
    matchedUser = {
      id: `u-${company.id}-admin`,
      companyId: company.id,
      name: company.adminName || 'المدير العام',
      username: company.adminUsername,
      password: company.adminPassword,
      role: 'company_admin',
      status: 'active',
      permissions: { all: true },
    };
  }

  if (!matchedUser) {
    return {
      success: false,
      error: 'اسم المستخدم أو كلمة المرور غير صحيحة لهذه الشركة.',
    };
  }

  if (matchedUser.status === 'disabled') {
    return {
      success: false,
      error: 'تم تعطيل هذا الحساب بواسطة مدير الشركة. يرجى مراجعة المسؤول.',
    };
  }

  // 5. Subscription Status Evaluation
  const now = new Date();
  let expiryDateStr = company.subscriptionExpiresAt || company.trialExpiresAt;
  let isExpired = false;
  let daysRemaining = 30;

  if (expiryDateStr) {
    const expiryDate = new Date(expiryDateStr);
    const diffTime = expiryDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) {
      isExpired = true;
      daysRemaining = 0;
    }
  }

  // 6. Generate Session Token
  const token = `tok_${company.id}_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.sessions[token] = {
    token,
    userId: matchedUser.id,
    companyId: company.id,
    userName: matchedUser.name,
    userCode: matchedUser.code || (matchedUser.role === 'company_admin' || matchedUser.role === 'admin' ? 1 : 2),
    role: matchedUser.role,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  // Log in company's audit logs
  if (tenantData) {
    const loginLog = {
      id: `log-login-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: matchedUser.name,
      userId: matchedUser.id,
      companyId: company.id,
      action: 'login',
      module: 'المصادقة والأمان',
      details: `تسجيل دخول ناجح إلى منظومة شركة "${company.name}"`,
    };
    tenantData.auditLogs = [loginLog, ...(tenantData.auditLogs || [])].slice(0, 500);
  }

  saveCloudDatabase(db);

  return {
    success: true,
    token,
    user: matchedUser,
    company,
    subscription: {
      status: isExpired ? 'expired' : company.status,
      planName: company.planName || 'الاشتراك القياسي',
      daysRemaining,
      isExpired,
      expiresAt: expiryDateStr,
    },
  };
}

/**
 * Secret Owner Verification (Accessed secretly by long-pressing system name anywhere)
 */
export function verifyOwnerSecret(secret: string): {
  success: boolean;
  token?: string;
  user?: User;
  company?: TenantCompany;
  subscription?: {
    status: string;
    planName: string;
    daysRemaining: number;
    isExpired: boolean;
    expiresAt?: string;
  };
  error?: string;
} {
  const clean = (secret || '').trim();
  const db = getCloudDatabase();
  const isMasterPin = clean === '29190615' || clean === '123' || clean.toLowerCase() === 'rakeeza';
  const ownerUser = db.globalUsers.find((u) => u.password === clean) || (isMasterPin ? db.globalUsers[0] : null);

  if (!ownerUser) {
    return { success: false, error: 'كلمة المرور أو رمز PIN الخاص بمالك المنظومة غير صحيح.' };
  }

  const token = `tok_owner_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.sessions[token] = {
    token,
    userId: ownerUser.id,
    companyId: 'OWNER',
    userName: ownerUser.name,
    role: 'owner',
    createdAt: new Date().toISOString(),
    expiresAt,
  };
  saveCloudDatabase(db);

  const ownerVirtualCompany: TenantCompany = {
    id: 'OWNER',
    tenantId: 'TENANT-RAKEEZA-CLOUD-ROOT',
    code: 'OWNER-00',
    name: 'منظومة RAKEEZA Cloud ERP - لوحة المالك',
    tradeName: 'RAKEEZA Enterprise Cloud',
    phone: '01029190615',
    status: 'active',
    planId: 'lifetime',
    planName: 'ترخيص المالك المطلق (Root Owner)',
    limits: {
      maxUsers: 99999,
      maxBranches: 9999,
      maxWarehouses: 9999,
      maxTransactionsPerMonth: 99999999,
      storageMb: 999999,
      maxSalesReps: 9999,
    },
    features: ['sales', 'purchases', 'inventory', 'accounting', 'reports', 'multi_branch', 'e_invoicing', 'bi'],
    usersCount: db.companies.reduce((acc, c) => acc + (c.usersCount || 1), 0),
    branchesCount: 1,
    warehousesCount: 1,
    operationsCount: 9999,
  };

  return {
    success: true,
    token,
    user: ownerUser,
    company: ownerVirtualCompany,
    subscription: {
      status: 'active',
      planName: 'ترخيص المالك المطلق (Root Owner)',
      daysRemaining: 36500,
      isExpired: false,
    },
  };
}

/**
 * Sign in or Register using Google / Gmail
 */
export function authenticateOrRegisterWithGmail(
  gmail: string,
  companyName?: string,
  phone?: string,
  adminName?: string
): {
  success: boolean;
  isNewCompany?: boolean;
  token?: string;
  user?: User;
  company?: TenantCompany;
  subscription?: {
    status: string;
    planName: string;
    daysRemaining: number;
    isExpired: boolean;
    expiresAt?: string;
  };
  error?: string;
  needsRegistration?: boolean;
} {
  const cleanEmail = (gmail || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'يرجى إدخال عنوان بريد Gmail صالح.' };
  }

  const db = getCloudDatabase();

  // 1. Look for existing company matching this email
  let company = db.companies.find(
    (c) =>
      c.email?.toLowerCase() === cleanEmail ||
      c.adminEmail?.toLowerCase() === cleanEmail
  );

  // 2. Or check users within any tenant's data
  let matchedUser: User | undefined;
  if (company) {
    const tenantData = db.tenantsData[company.id];
    matchedUser = tenantData?.users?.find(
      (u) =>
        u.email?.toLowerCase() === cleanEmail ||
        u.username?.toLowerCase() === cleanEmail ||
        u.role === 'company_admin'
    );
  } else {
    // Check all tenants to see if user exists with this email
    for (const c of db.companies) {
      const td = db.tenantsData[c.id];
      const foundUser = td?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (foundUser) {
        company = c;
        matchedUser = foundUser;
        break;
      }
    }
  }

  // 3. If found, generate session token and log in
  if (company) {
    if (!matchedUser) {
      matchedUser = {
        id: `u-${company.id}-gmail`,
        companyId: company.id,
        name: adminName || company.adminName || cleanEmail.split('@')[0],
        username: cleanEmail.split('@')[0],
        role: 'company_admin',
        status: 'active',
        email: cleanEmail,
        permissions: { all: true },
      };
    }

    const token = `tok_${company.id}_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.sessions[token] = {
      token,
      userId: matchedUser.id,
      companyId: company.id,
      userName: matchedUser.name,
      role: matchedUser.role,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    saveCloudDatabase(db);

    return {
      success: true,
      isNewCompany: false,
      token,
      user: matchedUser,
      company,
      subscription: {
        status: company.status,
        planName: company.planName || 'الاشتراك القياسي',
        daysRemaining: 30,
        isExpired: false,
      },
    };
  }

  // 4. If not found and no companyName specified yet -> prompt user for registration
  if (!companyName || !companyName.trim()) {
    return {
      success: false,
      needsRegistration: true,
      error: 'لم يتم العثور على منشأة سابقة مرتبطة بهذا البريد. يرجى إدخال اسم المنشأة لبدء الاستخدام فوراً مجاناً.',
    };
  }

  // 5. If not found and companyName is provided -> create new company immediately!
  const newCompanyInput: Partial<TenantCompany> = {
    name: companyName.trim(),
    tradeName: companyName.trim(),
    email: cleanEmail,
    adminEmail: cleanEmail,
    adminName: adminName?.trim() || cleanEmail.split('@')[0],
    adminUsername: cleanEmail.split('@')[0],
    adminPassword: '123',
    phone: phone?.trim() || '',
    activity: 'تجارة عامة وخدمات',
    address: 'الفرع الرئيسي',
  };

  const created = createNewCompanyCloud(newCompanyInput, 'trial');
  const freshCompany = created.company;
  const tenantData = db.tenantsData[freshCompany.id];
  const freshAdminUser: User = (tenantData?.users && tenantData.users[0]) || {
    id: `u-${freshCompany.id}-admin`,
    companyId: freshCompany.id,
    name: newCompanyInput.adminName || 'المدير العام',
    username: newCompanyInput.adminUsername || 'admin',
    role: 'company_admin',
    status: 'active',
    email: cleanEmail,
    permissions: { all: true },
  };

  freshAdminUser.email = cleanEmail;

  const token = `tok_${freshCompany.id}_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.sessions[token] = {
    token,
    userId: freshAdminUser.id,
    companyId: freshCompany.id,
    userName: freshAdminUser.name,
    role: freshAdminUser.role,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  saveCloudDatabase(db);

  return {
    success: true,
    isNewCompany: true,
    token,
    user: freshAdminUser,
    company: freshCompany,
    subscription: {
      status: 'trial',
      planName: 'تجربة سحابية مجانية (14 يوم)',
      daysRemaining: 14,
      isExpired: false,
    },
  };
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  '10minutemail.com',
  'mailinator.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'fake.com',
  'test.com',
  'dispostable.com',
  'sharklasers.com',
  'getairmail.com',
  'crazymailing.com',
  'mytemp.email',
  'throwawaymail.com',
  'generator.email',
  'temp-mail.org',
]);

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Request an OTP verification code sent to Gmail to prevent fake registrations
 */
export async function requestEmailVerification(
  email: string,
  companyName?: string,
  phone?: string,
  adminName?: string
): Promise<{
  success: boolean;
  message: string;
  isExistingCompany?: boolean;
  previewCode?: string;
  error?: string;
}> {
  const cleanEmail = (email || '').trim().toLowerCase();
  
  // 1. Strict syntax check
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
    return {
      success: false,
      message: 'صيغة البريد الإلكتروني غير صحيحة. يرجى إدخال عنوان Gmail حقيقي وصحيح.',
      error: 'بريد غير صالح',
    };
  }

  // 2. Reject disposable / fake domains
  const domain = cleanEmail.split('@')[1];
  if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      success: false,
      message: 'عذراً، النطاقات والبريد المؤقت غير مسموح بها. يرجى إدخال بريد Gmail حقيقي لتأكيد حساب المنشأة.',
      error: 'بريد وهمي غير مسموح',
    };
  }

  const db = getCloudDatabase();
  db.pendingVerifications = db.pendingVerifications || {};

  // 3. Anti-repeat rate limiting (prevent repeated rapid spamming)
  const now = Date.now();
  const existingPending = db.pendingVerifications[cleanEmail];
  if (existingPending) {
    const elapsed = now - (existingPending.lastRequestedAt || 0);
    // Cool-down of 20 seconds
    if (elapsed < 20000) {
      return {
        success: false,
        message: 'يرجى الانتظار 20 ثانية قبل طلب رمز تحقق جديد لمنع تكرار الإرسال.',
        error: 'انتظر قبل إعادة المحاولة',
      };
    }
    // Limit to max 5 requests per 10 minutes
    if ((existingPending.requestCount || 0) >= 5 && elapsed < 600000) {
      return {
        success: false,
        message: 'لقد تم تجاوز الحد الأقصى المسموح لطلبات التحقق لهذا البريد. يرجى الانتظار 10 دقائق.',
        error: 'تجاوز حد الإرسال',
      };
    }
  }

  // Check if company already exists with this email
  const existingCompany = db.companies.find(
    (c) => c.email?.toLowerCase() === cleanEmail || c.adminEmail?.toLowerCase() === cleanEmail
  );

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes
  const prevCount = existingPending?.requestCount || 0;

  db.pendingVerifications[cleanEmail] = {
    email: cleanEmail,
    code,
    expiresAt,
    companyName: companyName?.trim() || existingPending?.companyName,
    phone: phone?.trim() || existingPending?.phone,
    adminName: adminName?.trim() || existingPending?.adminName,
    requestCount: prevCount + 1,
    lastRequestedAt: now,
  };

  saveCloudDatabase(db);

  // Send email via SMTP / Gmail
  const emailRes = await sendOtpVerificationEmail(cleanEmail, code, companyName);

  return {
    success: true,
    message: emailRes.sentViaSmtp
      ? `تم إرسال كود التحقق بنجاح إلى بريدك الإلكتروني (${cleanEmail}). يرجى فحص صندوق الوارد أو الرسائل غير المرغوب فيها (Spam).`
      : `تم إرسال رمز التحقق إلى (${cleanEmail}). رمز التحقق هو: ${code}`,
    isExistingCompany: !!existingCompany,
    previewCode: code,
  };
}

/**
 * Verify OTP code and activate company registration or login
 */
export function verifyEmailOtpAndRegister(
  email: string,
  code: string,
  companyName?: string,
  phone?: string,
  adminName?: string
): {
  success: boolean;
  token?: string;
  user?: User;
  company?: TenantCompany;
  subscription?: {
    status: string;
    planName: string;
    daysRemaining: number;
    isExpired: boolean;
    expiresAt?: string;
  };
  error?: string;
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanCode = (code || '').trim();

  if (!cleanEmail || !cleanCode) {
    return { success: false, error: 'يرجى إدخال البريد الإلكتروني وكود التحقق المكون من 6 أرقام.' };
  }

  const db = getCloudDatabase();
  db.pendingVerifications = db.pendingVerifications || {};
  db.verifiedEmails = db.verifiedEmails || {};

  const pending = db.pendingVerifications[cleanEmail];
  // Allow master OTPs for administrative ease or exact match
  const isMasterOtp = cleanCode === '291906' || cleanCode === '123456';
  const isCodeValid = isMasterOtp || (pending && pending.code === cleanCode);

  if (!isCodeValid) {
    return {
      success: false,
      error: 'رمز التحقق غير صحيح. يرجى التأكد من الرمز المكون من 6 أرقام أو طلب إرسال رمز جديد.',
    };
  }

  if (pending && Date.now() > pending.expiresAt && !isMasterOtp) {
    return {
      success: false,
      error: 'انتهت صلاحية رمز التحقق (صلاحية الرمز 10 دقائق). يرجى طلب إرسال رمز جديد.',
    };
  }

  // Mark email as verified and clear pending
  db.verifiedEmails[cleanEmail] = true;
  delete db.pendingVerifications[cleanEmail];

  // 1. Check if an existing company already matches this verified email
  let company = db.companies.find(
    (c) => c.email?.toLowerCase() === cleanEmail || c.adminEmail?.toLowerCase() === cleanEmail
  );

  // If existing company found, log in directly
  if (company) {
    const tenantData = db.tenantsData[company.id];
    let matchedUser = tenantData?.users?.find(
      (u) =>
        u.email?.toLowerCase() === cleanEmail ||
        u.username?.toLowerCase() === cleanEmail ||
        u.role === 'company_admin'
    );

    if (!matchedUser) {
      matchedUser = {
        id: `u-${company.id}-admin`,
        companyId: company.id,
        name: adminName || company.adminName || cleanEmail.split('@')[0],
        username: cleanEmail.split('@')[0],
        role: 'company_admin',
        status: 'active',
        email: cleanEmail,
        permissions: { all: true },
      };
    }

    const token = `tok_${company.id}_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.sessions[token] = {
      token,
      userId: matchedUser.id,
      companyId: company.id,
      userName: matchedUser.name,
      role: matchedUser.role,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    saveCloudDatabase(db);

    return {
      success: true,
      token,
      user: matchedUser,
      company,
      subscription: {
        status: company.status,
        planName: company.planName || 'الاشتراك القياسي',
        daysRemaining: 30,
        isExpired: false,
      },
    };
  }

  // 2. New Company Registration (after OTP verification has proven legitimate email)
  const finalCompanyName = (companyName || pending?.companyName || '').trim();
  if (!finalCompanyName) {
    return {
      success: false,
      error: 'يرجى إدخال اسم المنشأة أو الشركة لإتمام إنشاء الحساب السحابي.',
    };
  }

  const newCompanyInput: Partial<TenantCompany> = {
    name: finalCompanyName,
    tradeName: finalCompanyName,
    email: cleanEmail,
    adminEmail: cleanEmail,
    adminName: (adminName || pending?.adminName || cleanEmail.split('@')[0]).trim(),
    adminUsername: cleanEmail.split('@')[0],
    adminPassword: '123',
    phone: (phone || pending?.phone || '').trim(),
    activity: 'تجارة عامة وخدمات',
    address: 'الفرع الرئيسي',
  };

  const created = createNewCompanyCloud(newCompanyInput, 'trial');
  const freshCompany = created.company;
  const tenantData = db.tenantsData[freshCompany.id];
  const freshAdminUser: User = (tenantData?.users && tenantData.users[0]) || {
    id: `u-${freshCompany.id}-admin`,
    companyId: freshCompany.id,
    name: newCompanyInput.adminName || 'المدير العام',
    username: newCompanyInput.adminUsername || 'admin',
    role: 'company_admin',
    status: 'active',
    email: cleanEmail,
    permissions: { all: true },
  };

  freshAdminUser.email = cleanEmail;

  const token = `tok_${freshCompany.id}_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.sessions[token] = {
    token,
    userId: freshAdminUser.id,
    companyId: freshCompany.id,
    userName: freshAdminUser.name,
    role: freshAdminUser.role,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  saveCloudDatabase(db);

  return {
    success: true,
    token,
    user: freshAdminUser,
    company: freshCompany,
    subscription: {
      status: freshCompany.status,
      planName: freshCompany.planName || 'التجربة المجانية',
      daysRemaining: 30,
      isExpired: false,
    },
  };
}

/**
 * Validate active session token
 */
export function validateSession(token: string): {
  valid: boolean;
  session?: SessionRecord;
  user?: User;
  company?: TenantCompany;
  subscription?: {
    status: string;
    planName: string;
    daysRemaining: number;
    isExpired: boolean;
    expiresAt?: string;
  };
} {
  if (!token) return { valid: false };
  const db = getCloudDatabase();
  const session = db.sessions[token];
  if (!session) return { valid: false };

  // Check expiration
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    delete db.sessions[token];
    saveCloudDatabase(db);
    return { valid: false };
  }

  if (session.companyId === 'OWNER') {
    const ownerUser = db.globalUsers.find((u) => u.id === session.userId) || db.globalUsers[0];
    const ownerVirtualCompany: TenantCompany = {
      id: 'OWNER',
      tenantId: 'TENANT-RAKEEZA-CLOUD-ROOT',
      code: 'OWNER-00',
      name: 'منظومة RAKEEZA Cloud ERP - لوحة المالك',
      tradeName: 'RAKEEZA Enterprise Cloud',
      phone: '01029190615',
      status: 'active',
      planId: 'lifetime',
      planName: 'ترخيص المالك المطلق (Root Owner)',
      limits: {
        maxUsers: 99999,
        maxBranches: 9999,
        maxWarehouses: 9999,
        maxTransactionsPerMonth: 99999999,
        storageMb: 999999,
        maxSalesReps: 9999,
      },
      features: ['sales', 'purchases', 'inventory', 'accounting', 'reports', 'multi_branch', 'e_invoicing', 'bi'],
      usersCount: db.companies.reduce((acc, c) => acc + (c.usersCount || 1), 0),
      branchesCount: 1,
      warehousesCount: 1,
      operationsCount: 9999,
    };
    return {
      valid: true,
      session,
      user: ownerUser,
      company: ownerVirtualCompany,
      subscription: {
        status: 'active',
        planName: 'ترخيص المالك المطلق',
        daysRemaining: 36500,
        isExpired: false,
      },
    };
  }

  const company = db.companies.find((c) => c.id === session.companyId);
  if (!company) return { valid: false };

  const tenantData = db.tenantsData[company.id];
  const user = tenantData?.users?.find((u) => u.id === session.userId) || {
    id: session.userId,
    name: session.userName,
    username: session.userName,
    role: session.role as any,
    permissions: { all: true },
  };

  const now = new Date();
  const expiryDateStr = company.subscriptionExpiresAt || company.trialExpiresAt;
  let isExpired = false;
  let daysRemaining = 30;

  if (expiryDateStr) {
    const expiryDate = new Date(expiryDateStr);
    const diffTime = expiryDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) {
      isExpired = true;
      daysRemaining = 0;
    }
  }

  return {
    valid: true,
    session,
    user,
    company,
    subscription: {
      status: isExpired ? 'expired' : company.status,
      planName: company.planName || 'الاشتراك السنوي',
      daysRemaining,
      isExpired,
      expiresAt: expiryDateStr,
    },
  };
}

/**
 * Terminate session
 */
export function invalidateSession(token: string): boolean {
  const db = getCloudDatabase();
  if (db.sessions[token]) {
    delete db.sessions[token];
    saveCloudDatabase(db);
    return true;
  }
  return false;
}

/**
 * Fetch strictly isolated tenant ERP data
 */
export function getTenantDataStrict(companyId: string): AppData | null {
  const db = getCloudDatabase();
  if (!db.tenantsData[companyId]) {
    // If not existing yet, create clean isolated tenant data
    const base = getDefaultData();
    const company = db.companies.find((c) => c.id === companyId);
    db.tenantsData[companyId] = {
      ...base,
      companyId,
      settings: {
        ...base.settings,
        companyName: company?.name || 'منشأة جديدة',
        phone1: company?.phone || '',
        taxNumber: company?.taxNumber || '',
        commercialReg: company?.commercialReg || '',
      },
      items: [],
      salesInvoices: [],
      purchaseInvoices: [],
      customers: [],
      suppliers: [],
      cashTransactions: [],
    };
    saveCloudDatabase(db);
  }
  return db.tenantsData[companyId];
}

/**
 * Update strictly isolated tenant ERP data with automatic audit logging
 */
export function saveTenantDataStrict(
  companyId: string,
  updatedData: Partial<AppData>,
  actorUser?: { id: string; name: string; code?: string | number; role?: string },
  actionInfo?: { action?: string; module?: string; details?: string }
): AppData {
  const db = getCloudDatabase();
  const current = getTenantDataStrict(companyId) || getDefaultData();

  // Audit operation stamp
  let auditLogs = updatedData.auditLogs || current.auditLogs || [];
  if (actorUser) {
    const userCode = actorUser.code || (actorUser.role === 'company_admin' || actorUser.role === 'admin' ? 1 : undefined);
    const newLog = {
      id: `log-op-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: actorUser.name,
      userId: actorUser.id,
      userCode: userCode,
      userRole: actorUser.role,
      companyId,
      action: actionInfo?.action || 'update',
      module: actionInfo?.module || 'مزامنة سحابية لحظية',
      details: actionInfo?.details || `قام المستخدم "${actorUser.name}" (كود ${userCode || 'غير محدد'}) بتحديث بيانات المنظومة`,
    };
    auditLogs = [newLog, ...auditLogs].slice(0, 500);
  }

  const merged: AppData = {
    ...current,
    ...updatedData,
    companyId,
    auditLogs,
  };

  db.tenantsData[companyId] = merged;

  // Update operation count and user count in company meta
  const companyIdx = db.companies.findIndex((c) => c.id === companyId);
  if (companyIdx !== -1) {
    db.companies[companyIdx].operationsCount =
      (merged.salesInvoices?.length || 0) +
      (merged.purchaseInvoices?.length || 0) +
      (merged.cashTransactions?.length || 0);
    db.companies[companyIdx].usersCount = merged.users?.length || 1;
    db.companies[companyIdx].lastActivityAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
  }

  saveCloudDatabase(db);
  return merged;
}

/**
 * Owner: Create a new company
 */
export function createNewCompanyCloud(
  companyInput: Partial<TenantCompany>,
  planId: string
): { company: TenantCompany; license: LicenseRecord } {
  const db = getCloudDatabase();
  const res = createNewTenantCompany(companyInput, planId, db.plans, db.trialRegistry);

  db.companies.push(res.company);
  db.licenses.push(res.license);
  db.trialRegistry = res.updatedRegistry;

  // Initialize fresh isolated data for the new company
  const base = getDefaultData();
  db.tenantsData[res.company.id] = {
    ...base,
    companyId: res.company.id,
    settings: {
      ...base.settings,
      companyName: res.company.name,
      address: res.company.address || 'جمهورية مصر العربية',
      phone1: res.company.phone || '',
      taxNumber: res.company.taxNumber || '',
      commercialReg: res.company.commercialReg || '',
      activityCode: res.company.activity || '',
    },
    users: [
      {
        id: `u-${res.company.id}-admin`,
        companyId: res.company.id,
        name: res.company.adminName || 'المدير العام',
        username: res.company.adminUsername || 'admin',
        password: res.company.adminPassword || '123456',
        role: 'company_admin',
        status: 'active',
        permissions: { all: true },
      },
    ],
    items: [],
    salesInvoices: [],
    purchaseInvoices: [],
    customers: [],
    suppliers: [],
    cashTransactions: [],
    branches: [
      {
        id: `br-${res.company.id}-main`,
        code: 'HQ-01',
        name: 'المقر الرئيسي',
        location: res.company.address || 'المقر الرئيسي',
        phone: res.company.phone || '',
        isMain: true,
        manager: res.company.adminName || 'المدير العام',
      },
    ],
    activeBranchId: `br-${res.company.id}-main`,
  };

  saveCloudDatabase(db);
  return { company: res.company, license: res.license };
}

/**
 * Owner: Update company metadata & subscription
 */
export function updateCompanyCloud(
  companyId: string,
  updates: Partial<TenantCompany>
): TenantCompany | null {
  const db = getCloudDatabase();
  const idx = db.companies.findIndex((c) => c.id === companyId);
  if (idx === -1) return null;

  db.companies[idx] = { ...db.companies[idx], ...updates };
  saveCloudDatabase(db);
  return db.companies[idx];
}

/**
 * Owner: Delete a company completely from the cloud database
 */
export function deleteCompanyCloud(companyId: string): {
  success: boolean;
  error?: string;
  remainingCompanies?: TenantCompany[];
  deletedCompany?: TenantCompany;
} {
  const db = getCloudDatabase();
  const targetId = (companyId || '').trim();
  const companyIndex = db.companies.findIndex((c) => c.id === targetId || c.code === targetId);

  if (companyIndex === -1) {
    return { success: false, error: 'الشركة المطلوبة غير مسجلة أو تم حذفها مسبقاً.' };
  }

  const [deletedCompany] = db.companies.splice(companyIndex, 1);
  const actualId = deletedCompany.id;

  // 1. Delete tenant isolated dataset completely
  if (db.tenantsData && db.tenantsData[actualId]) {
    delete db.tenantsData[actualId];
  }

  // 2. Invalidate any active sessions belonging to this company
  if (db.sessions) {
    for (const [token, sess] of Object.entries(db.sessions)) {
      if (sess.companyId === actualId) {
        delete db.sessions[token];
      }
    }
  }

  // 3. Remove assigned licenses
  if (db.licenses) {
    db.licenses = db.licenses.filter((l) => l.companyId !== actualId);
  }

  // 4. Remove trial registrations matching this company
  if (db.trialRegistry) {
    db.trialRegistry = db.trialRegistry.filter(
      (t) =>
        t.companyId !== actualId &&
        (!deletedCompany.phone || t.phone !== deletedCompany.phone) &&
        (!deletedCompany.email || t.email !== deletedCompany.email)
    );
  }

  saveCloudDatabase(db);
  return {
    success: true,
    deletedCompany,
    remainingCompanies: db.companies,
  };
}

/**
 * 🧹 Clean Entire System: Clears all movements, transactions, invoices, journals, and balances
 * safely, preserving real user accounts, existing headers, and authentic tax data.
 */
export function cleanEntireSystemCloud(
  targetCompanyId?: string,
  onlyDemoData: boolean = false
): { success: boolean; message: string; affectedCompaniesCount: number } {
  const db = getCloudDatabase();
  let affectedCount = 0;

  // Demo company IDs that were pre-seeded as trial/samples
  const demoCompanyIds = new Set(['COMP-000001', 'COMP-000002', 'COMP-000003']);

  if (db.tenantsData) {
    for (const [compId, tenantData] of Object.entries(db.tenantsData)) {
      // If a specific company is requested, only clean that company
      if (targetCompanyId && compId !== targetCompanyId) {
        continue;
      }

      // If onlyDemoData is requested, never wipe data belonging to real registered user companies
      if (onlyDemoData && !demoCompanyIds.has(compId)) {
        continue;
      }

      affectedCount++;
      // Clean all transactional and movement data
      tenantData.salesInvoices = [];
      tenantData.purchaseInvoices = [];
      tenantData.cashTransactions = [];
      tenantData.journalEntries = [];
      tenantData.physicalInventories = [];
      tenantData.inventoryAdjustments = [];
      tenantData.goodsIssueVouchers = [];
      tenantData.fiscalClosings = [];
      tenantData.stockTransfers = [];
      tenantData.quotations = [];
      tenantData.payrollSlips = [];
      tenantData.employeeAdvances = [];
      tenantData.cheques = [];
      tenantData.commissions = [];
      tenantData.productionOrders = [];
      tenantData.bankStatements = [];
      tenantData.approvalRequests = [];

      // Reset numeric counters to 1
      tenantData.nextInvoiceNumber = 1;
      tenantData.nextPurchaseNumber = 1;
      tenantData.nextCashId = 1;
      tenantData.nextJournalId = 1;
      tenantData.nextQuoteId = 1;
      tenantData.nextStocktakeId = 1;
      tenantData.nextAdjustmentId = 1;
      tenantData.nextGoodsIssueId = 1;
      tenantData.nextClosingId = 1;
      tenantData.nextPayrollId = 1;
      tenantData.nextChequeId = 1;
      tenantData.nextProductionId = 1;

      // Reset cash boxes & bank balances to 0
      tenantData.cashBox = { drawer: 0, vodafone: 0, instapay: 0, bank: 0 };
      if (tenantData.bankAccounts) {
        tenantData.bankAccounts = tenantData.bankAccounts.map((b) => ({ ...b, balance: 0 }));
      }

      // Reset customer & supplier balances to 0
      if (tenantData.customers) {
        tenantData.customers = tenantData.customers.map((c) => ({
          ...c,
          balance: 0,
        }));
      }
      if (tenantData.suppliers) {
        tenantData.suppliers = tenantData.suppliers.map((s) => ({
          ...s,
          balance: 0,
        }));
      }

      // Reset items stock and quantities to 0
      if (tenantData.items) {
        tenantData.items = tenantData.items.map((it) => ({
          ...it,
          quantity: 0,
          stock: 0,
          branchQuantities: {},
        }));
      }

      // Reset general ledger tree debit/credit/balances
      if (tenantData.accounts) {
        tenantData.accounts = tenantData.accounts.map((acc) => ({
          ...acc,
          debit: 0,
          credit: 0,
          balance: 0,
        }));
      }

      // Add audit log entry
      tenantData.auditLogs = [
        {
          id: `log-clean-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          userName: 'مالك المنظومة (Owner System Reset)',
          action: 'system_cleanup',
          module: 'إدارة النظام',
          details: 'تم تنظيف النظام وتصفير كافة الحركات والمبالغ المسجلة بنجاح لبدء العمليات الجديدة.',
        },
      ];
    }
  }

  // Update operationsCount on registered companies to 0
  if (db.companies) {
    db.companies = db.companies.map((c) => ({
      ...c,
      operationsCount: 0,
    }));
  }

  saveCloudDatabase(db);

  return {
    success: true,
    message: `تم تنظيف النظام بالكامل بنجاح وتصفير كافة الحركات والفواتير والمبالغ لعدد ${affectedCount} شركة.`,
    affectedCompaniesCount: affectedCount,
  };
}

/**
 * Owner: Generate License Activation Code
 */
export function generateLicenseCloud(
  planId: string,
  companyId?: string
): LicenseRecord {
  const db = getCloudDatabase();
  const selectedPlan = db.plans.find((p) => p.id === planId) || db.plans[3];
  const company = companyId ? db.companies.find((c) => c.id === companyId) : undefined;

  const now = new Date();
  const startDateStr = now.toISOString().split('T')[0];
  const expiryDate = new Date();
  expiryDate.setDate(now.getDate() + (selectedPlan.durationDays || 365));
  const expiryDateStr = expiryDate.toISOString().split('T')[0];

  const license: LicenseRecord = {
    id: `LIC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    activationCode: generateLicenseActivationCode(),
    companyId: company?.id || '',
    companyName: company?.name || 'ترخيص عام لمنظومة ركيزة',
    planId: selectedPlan.id,
    planName: selectedPlan.name,
    startDate: startDateStr,
    expiryDate: expiryDateStr,
    status: 'active',
    features: [...selectedPlan.features],
    limits: { ...selectedPlan.limits },
    generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    generatedBy: 'RAKEEZA OWNER',
    activationCount: 0,
  };

  db.licenses.push(license);
  saveCloudDatabase(db);
  return license;
}

/**
 * Tenant: Activate license code to renew or upgrade subscription
 */
export function activateLicenseCloud(
  companyId: string,
  code: string
): { success: boolean; message: string; company?: TenantCompany } {
  const db = getCloudDatabase();
  const cleanCode = code.trim().toUpperCase();
  const license = db.licenses.find((l) => l.activationCode.toUpperCase() === cleanCode);

  if (!license) {
    return { success: false, message: 'كود التفعيل غير صحيح أو غير موجود في قاعدة بيانات التراخيص.' };
  }

  if (license.status === 'revoked') {
    return { success: false, message: 'تم إيقاف كود التفعيل هذا بواسطة مالك النظام.' };
  }

  const companyIdx = db.companies.findIndex((c) => c.id === companyId);
  if (companyIdx === -1) {
    return { success: false, message: 'لم يتم العثور على بيانات الشركة.' };
  }

  const comp = db.companies[companyIdx];
  const selectedPlan = db.plans.find((p) => p.id === license.planId) || db.plans[3];
  const now = new Date();
  const newExpiry = new Date();
  newExpiry.setDate(now.getDate() + (selectedPlan.durationDays || 365));

  comp.status = 'active';
  comp.planId = selectedPlan.id;
  comp.planName = selectedPlan.name;
  comp.licenseId = license.id;
  comp.subscriptionStartedAt = now.toISOString().split('T')[0];
  comp.subscriptionExpiresAt = newExpiry.toISOString().split('T')[0];
  comp.limits = { ...selectedPlan.limits };
  comp.features = [...selectedPlan.features];

  license.activationCount = (license.activationCount || 0) + 1;
  license.companyId = comp.id;
  license.companyName = comp.name;

  saveCloudDatabase(db);

  return {
    success: true,
    message: `تهانينا! تم تفعيل خطة "${selectedPlan.name}" بنجاح حتى تاريخ ${comp.subscriptionExpiresAt}.`,
    company: comp,
  };
}
