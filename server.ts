import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  initCloudDatabase,
  getCloudDatabase,
  saveCloudDatabase,
  authenticateUser,
  validateSession,
  invalidateSession,
  getTenantDataStrict,
  saveTenantDataStrict,
  createNewCompanyCloud,
  updateCompanyCloud,
  generateLicenseCloud,
  activateLicenseCloud,
  authenticateOrRegisterWithGmail,
  verifyOwnerSecret,
  requestEmailVerification,
  verifyEmailOtpAndRegister,
} from './server/cloudDb';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS Middleware: Allow all cross-origin requests and handle preflight OPTIONS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Cloud Database on boot
  initCloudDatabase();

  // ----------------------------------------------------
  // Middleware: Extract & Verify Token
  // ----------------------------------------------------
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    if (!token) {
      return res.status(401).json({ success: false, error: 'غير مصرح: يرجى تسجيل الدخول أولاً.' });
    }

    const verification = validateSession(token);
    if (!verification.valid || !verification.session) {
      return res.status(401).json({ success: false, error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.' });
    }

    (req as any).auth = verification;
    next();
  };

  const requireOwner = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    requireAuth(req, res, () => {
      const auth = (req as any).auth;
      if (auth.session.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'هذه العملية تتطلب صلاحيات مالك المنظومة (Owner Only).' });
      }
      next();
    });
  };

  // ----------------------------------------------------
  // 1. Health & Ping
  // ----------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'RAKEEZA Cloud Multi-Tenant ERP',
      time: new Date().toISOString(),
    });
  });

  // ----------------------------------------------------
  // 2. Authentication Routes
  // ----------------------------------------------------
  app.post('/api/auth/login', (req, res) => {
    const { companyId, username, password } = req.body;
    const result = authenticateUser(companyId, username, password);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  });

  // Google / Gmail Authentication & Registration Route
  app.post('/api/auth/google', (req, res) => {
    const { email, companyName, phone, adminName } = req.body;
    const result = authenticateOrRegisterWithGmail(email, companyName, phone, adminName);

    if (!result.success) {
      return res.status(200).json(result); // Return 200 with result payload so client can read needsRegistration or error cleanly
    }

    res.json(result);
  });

  // Request 6-digit OTP verification code sent to Gmail
  app.post('/api/auth/request-otp', async (req, res) => {
    const { email, companyName, phone, adminName } = req.body;
    try {
      const result = await requestEmailVerification(email, companyName, phone, adminName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'حدث خطأ أثناء إرسال كود التحقق' });
    }
  });

  // Verify OTP code and complete company registration
  app.post('/api/auth/verify-otp', (req, res) => {
    const { email, code, companyName, phone, adminName } = req.body;
    const result = verifyEmailOtpAndRegister(email, code, companyName, phone, adminName);

    if (!result.success) {
      return res.status(200).json(result);
    }

    res.json(result);
  });

  // Secret Owner PIN/Password Verification Route (triggered by long-press on RAKEEZA)
  app.post('/api/auth/owner-verify', (req, res) => {
    const { secret } = req.body;
    const result = verifyOwnerSecret(secret);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  });

  app.get('/api/auth/session', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

    if (!token) {
      return res.status(401).json({ valid: false, error: 'لا يوجد رمز مصادقة' });
    }

    const sessionData = validateSession(token);
    if (!sessionData.valid) {
      return res.status(401).json({ valid: false, error: 'رمز الجلسة غير صالح' });
    }

    res.json(sessionData);
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.body.token as string);
    if (token) {
      invalidateSession(token);
    }
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح.' });
  });

  // ----------------------------------------------------
  // 3. Isolated Tenant ERP Data
  // ----------------------------------------------------
  app.get('/api/tenant/data', requireAuth, (req, res) => {
    const auth = (req as any).auth;
    let targetCompanyId = auth.session.companyId;

    // Owner can inspect any company via query param
    if (auth.session.role === 'owner' && req.query.companyId) {
      targetCompanyId = req.query.companyId as string;
    }

    if (targetCompanyId === 'OWNER') {
      targetCompanyId = 'COMP-000001'; // Default viewing tenant for owner
    }

    const data = getTenantDataStrict(targetCompanyId);
    res.json({
      success: true,
      companyId: targetCompanyId,
      company: auth.company,
      subscription: auth.subscription,
      data,
    });
  });

  app.post('/api/tenant/data', requireAuth, (req, res) => {
    const auth = (req as any).auth;
    let targetCompanyId = auth.session.companyId;

    // Owner can edit any company
    if (auth.session.role === 'owner' && req.body.companyId) {
      targetCompanyId = req.body.companyId;
    }

    if (targetCompanyId === 'OWNER') {
      targetCompanyId = 'COMP-000001';
    }

    const actorUser = {
      id: auth.session.userId,
      name: auth.session.userName,
    };

    const saved = saveTenantDataStrict(targetCompanyId, req.body.data, actorUser);
    res.json({ success: true, companyId: targetCompanyId, data: saved });
  });

  // ----------------------------------------------------
  // 4. Tenant License Activation
  // ----------------------------------------------------
  app.post('/api/tenant/activate-license', requireAuth, (req, res) => {
    const auth = (req as any).auth;
    const { code } = req.body;
    const result = activateLicenseCloud(auth.session.companyId, code);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // ----------------------------------------------------
  // 5. Public Storefront / Customer Catalog APIs
  // ----------------------------------------------------
  app.get('/api/tenant/catalog/:companyId', (req, res) => {
    const { companyId } = req.params;
    const db = getCloudDatabase();
    const company = db.companies.find((c) => c.id === companyId || c.code === companyId);
    const tenantData = getTenantDataStrict(company?.id || companyId);

    if (!company && !tenantData) {
      return res.status(404).json({ error: 'الكتالوج أو المتجر غير موجود.' });
    }

    // Return catalog-ready items and company branding
    const catalogItems = (tenantData?.items || []).filter((i) => i.showInCatalog !== false);
    res.json({
      company: {
        id: company?.id || companyId,
        name: company?.name || tenantData?.settings?.companyName,
        phone: company?.phone || tenantData?.settings?.phone1,
        address: company?.address || tenantData?.settings?.address,
        currencySymbol: tenantData?.settings?.currencySymbol || 'ج.م',
      },
      catalogConfig: tenantData?.catalogConfig || {},
      items: catalogItems,
    });
  });

  app.post('/api/tenant/catalog/:companyId/order', (req, res) => {
    const { companyId } = req.params;
    const orderData = req.body;
    const db = getCloudDatabase();
    const company = db.companies.find((c) => c.id === companyId || c.code === companyId);
    const targetId = company?.id || companyId;
    const tenantData = getTenantDataStrict(targetId);

    if (!tenantData) {
      return res.status(404).json({ error: 'الشركة غير موجودة' });
    }

    // Add incoming order to company's quotations / web orders
    const newQuotation = {
      ...orderData,
      id: `ord-web-${Date.now()}`,
      orderReference: `ORD-${Date.now().toString().slice(-6)}`,
      companyId: targetId,
      source: 'online_catalog',
      status: 'online_order',
      orderStatus: 'new',
      isRead: false,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    const updatedQuotations = [newQuotation, ...(tenantData.quotations || [])];
    saveTenantDataStrict(targetId, { quotations: updatedQuotations });

    res.json({
      success: true,
      message: 'تم استلام طلبكم بنجاح! سيتواصل معكم فريق العمل لتأكيد التوريد.',
      orderReference: newQuotation.orderReference,
    });
  });

  // ----------------------------------------------------
  // 6. Owner Panel Cloud APIs (Owner Only)
  // ----------------------------------------------------
  app.get('/api/owner/companies', requireOwner, (req, res) => {
    const db = getCloudDatabase();
    res.json({
      companies: db.companies,
      plans: db.plans,
      trialRegistry: db.trialRegistry,
      licenses: db.licenses,
    });
  });

  app.post('/api/owner/companies', requireOwner, (req, res) => {
    const { company, planId } = req.body;
    try {
      const result = createNewCompanyCloud(company, planId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'فشل إنشاء الشركة' });
    }
  });

  app.put('/api/owner/companies/:id', requireOwner, (req, res) => {
    const { id } = req.params;
    const updated = updateCompanyCloud(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });
    }
    res.json({ success: true, company: updated });
  });

  app.post('/api/owner/licenses/generate', requireOwner, (req, res) => {
    const { planId, companyId } = req.body;
    const license = generateLicenseCloud(planId, companyId);
    res.json({ success: true, license });
  });

  // ----------------------------------------------------
  // Vite Middleware & SPA Static Serving
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RAKEEZA Multi-Tenant Cloud Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
