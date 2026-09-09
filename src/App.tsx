import React, { useState, useEffect } from 'react';
import { AppData } from './types';
import { loadAppData, saveAppData } from './utils/storage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { HomeView } from './components/HomeView';
import { SalesView } from './components/SalesView';
import { PurchasesView } from './components/PurchasesView';
import { CashView } from './components/CashView';
import { AccountsView } from './components/AccountsView';
import { ItemsView } from './components/ItemsView';
import { OperationsView } from './components/OperationsView';
import { TreasuryView } from './components/TreasuryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { UsersView } from './components/UsersView';
import { BackupView } from './components/BackupView';
import { InventoryStocktakingView } from './components/InventoryStocktakingView';
import { YearEndClosingView } from './components/YearEndClosingView';

// Enterprise Pillar Views
import { PosView } from './components/PosView';
import { AccountsTreeView } from './components/AccountsTreeView';
import { QuotesOrdersView } from './components/QuotesOrdersView';
import { BranchesView } from './components/BranchesView';
import { EInvoicingView } from './components/EInvoicingView';
import { AuditTrailView } from './components/AuditTrailView';
import { BiAnalyticsView } from './components/BiAnalyticsView';

// 6 Enterprise ERP Modules
import { HrPayrollView } from './components/HrPayrollView';
import { FixedAssetsView } from './components/FixedAssetsView';
import { ChequesView } from './components/ChequesView';
import { PriceManagementView } from './components/PriceManagementView';
import { SalesRepsCommissionsView } from './components/SalesRepsCommissionsView';
import { ManufacturingView } from './components/ManufacturingView';
import { BankReconciliationView } from './components/BankReconciliationView';
import { OwnerPanelView } from './components/OwnerPanelView';
import { TransactionInspectorModal, InspectableItem } from './components/TransactionInspectorModal';
import { CustomerCatalogView } from './components/CustomerCatalogView';
import { ShareCatalogModal } from './components/ShareCatalogModal';
import { CatalogManagerView } from './components/CatalogManagerView';
import { WebOrdersInboxView } from './components/WebOrdersInboxView';
import { printWebOrderReceipt } from './utils/printOrderReceipt';
import { playOrderAlertChime } from './utils/audioChime';
import {
  createSystemSnapshot,
  downloadBackupJsonFile,
  shouldTriggerAutoBackup,
} from './utils/autoBackup';
import { LoginView } from './components/LoginView';
import {
  fetchCurrentSession,
  fetchTenantDataCloud,
  saveTenantDataCloud,
  logoutFromCloud,
  activateTenantLicenseCloud,
  verifyOwnerSecretApi,
  AuthSessionResponse,
} from './services/cloudApi';
import { realtimeSync } from './services/realtimeSync';
import { AlertTriangle, KeyRound } from 'lucide-react';

export default function App() {
  const [appData, setAppData] = useState<AppData>(() => loadAppData());
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isShareCatalogOpen, setIsShareCatalogOpen] = useState<boolean>(false);

  // Cloud Authentication & Tenant Session State
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState<boolean>(false);
  const [licenseCodeInput, setLicenseCodeInput] = useState<string>('');
  const [isActivatingLicense, setIsActivatingLicense] = useState<boolean>(false);

  // Global Transaction Inspector Modal State (Click-to-inspect, print, edit, delete, review)
  const [inspectModalItem, setInspectModalItem] = useState<InspectableItem | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState<boolean>(false);

  const handleInspectItem = (type: any, data: any) => {
    setInspectModalItem({ type, data });
    setIsInspectModalOpen(true);
  };

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const updateData = (newData: AppData, actionInfo?: { action?: string; module?: string; details?: string }) => {
    setAppData(newData);
    saveAppData(newData);
    if (session?.company?.id) {
      saveTenantDataCloud(newData, session.company.id, actionInfo).catch((err) => {
        console.warn('Cloud sync error:', err);
      });
    }
  };

  // 🔄 Real-time Instant Synchronization between Manager (Code 1) and Users (Code 2+)
  useEffect(() => {
    if (!session?.company?.id) {
      realtimeSync.stop();
      return;
    }

    const currentCode = session.user?.code || 1;
    const currentName = session.user?.name || 'مستخدم';

    realtimeSync.init({
      companyId: session.company.id,
      currentUserCode: currentCode,
      currentUserName: currentName,
      onDataUpdated: (incomingData, meta) => {
        setAppData(incomingData);
        saveAppData(incomingData);
        if (meta?.actorCode && meta.actorCode !== currentCode) {
          const actionMsg = meta.actionInfo?.details || 'تعديل وتحديث بيانات المنظومة';
          showToast(
            `⚡ مزامنة فورية: [كود ${meta.actorCode} - ${meta.actorName || 'مستخدم'} (${meta.actorRole === 'admin' ? 'المدير' : 'موظف'})] قام بـ: ${actionMsg}`,
            'info'
          );
        }
      },
    });

    return () => {
      realtimeSync.stop();
    };
  }, [session?.company?.id, session?.user?.code, session?.user?.name]);

  // ☁️ Initialize and Validate Cloud Authentication Session on App Launch
  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
      try {
        const activeSession = await fetchCurrentSession();
        if (isMounted) {
          if (activeSession.valid && activeSession.user && activeSession.company) {
            setSession(activeSession);
            // Fetch isolated tenant data directly from cloud database
            const cloudRes = await fetchTenantDataCloud(activeSession.company.id);
            if (cloudRes.success && cloudRes.data) {
              setAppData(cloudRes.data);
            }
          } else {
            setSession(null);
          }
        }
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };
    initSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 🔐 Login Success Handler
  const handleLoginSuccess = async (loginResult: {
    user: any;
    company: any;
    subscription: any;
  }) => {
    setSession({
      valid: true,
      user: loginResult.user,
      company: loginResult.company,
      subscription: loginResult.subscription,
    });

    showToast(
      `مرحباً بك ${loginResult.user.name}! تم تسجيل الدخول إلى شركة: ${loginResult.company.name}`,
      'success'
    );

    // Fetch tenant-isolated ERP data from cloud server
    try {
      const cloudRes = await fetchTenantDataCloud(loginResult.company.id);
      if (cloudRes.success && cloudRes.data) {
        setAppData(cloudRes.data);
      }
    } catch (e) {
      console.error('Failed fetching tenant cloud data on login:', e);
    }

    if (loginResult.user.role === 'owner') {
      setCurrentPage('owner_panel');
    } else {
      setCurrentPage('home');
    }
  };

  // 🚪 Logout Handler
  const handleLogout = async () => {
    try {
      await logoutFromCloud();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setSession(null);
    setCurrentPage('home');
    showToast('تم تسجيل الخروج بنجاح من المنظومة', 'info');
  };

  // 🔑 License Activation Submission
  const handleActivateLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseCodeInput.trim()) {
      showToast('يرجى إدخال كود التفعيل', 'warning');
      return;
    }

    setIsActivatingLicense(true);
    try {
      const res = await activateTenantLicenseCloud(licenseCodeInput.trim());
      if (res.success) {
        showToast(res.message, 'success');
        setIsLicenseModalOpen(false);
        setLicenseCodeInput('');
        const freshSession = await fetchCurrentSession();
        if (freshSession.valid) {
          setSession(freshSession);
        }
      } else {
        showToast(res.message || 'كود التفعيل غير صالح', 'error');
      }
    } catch {
      showToast('فشل تفعيل الترخيص', 'error');
    } finally {
      setIsActivatingLicense(false);
    }
  };

  // 🌐 Real-time Synchronization across tabs/windows for incoming web orders + Auto Print
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accounting_system_v8' && e.newValue) {
        try {
          const freshData: AppData = JSON.parse(e.newValue);
          setAppData((prevData) => {
            const prevIds = new Set((prevData.quotations || []).map((q) => q.id));
            const newWebOrders = (freshData.quotations || []).filter(
              (q) =>
                q.source === 'online_catalog' &&
                !prevIds.has(q.id) &&
                q.autoPrinted !== true
            );

            if (newWebOrders.length > 0) {
              const latestOrder = newWebOrders[0];
              // Audio alert
              if (freshData.catalogConfig?.soundAlertEnabled !== false) {
                playOrderAlertChime();
              }
              // Toast notification
              showToast(
                `🔔 وصل طلب شراء جديد أونلاين #${latestOrder.orderReference || latestOrder.id} من: ${latestOrder.clientName}!`,
                'success'
              );
              // Automatic printing on Rakeeza station if autoPrintOrders is enabled
              if (freshData.catalogConfig?.autoPrintOrders) {
                printWebOrderReceipt(
                  latestOrder,
                  freshData,
                  freshData.catalogConfig.printFormat || '80mm',
                  true
                );
              }
            }
            return freshData;
          });
        } catch (syncErr) {
          console.error('Storage sync error:', syncErr);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 🤖 Automated Scheduled Background Backup Engine (Auto-Backup Scheduler)
  useEffect(() => {
    const backupIntervalTimer = setInterval(() => {
      const config = appData.autoBackupConfig;
      if (!config || !config.enabled) return;

      if (shouldTriggerAutoBackup(config)) {
        // Generate automatic system snapshot
        const newSnapshot = createSystemSnapshot(appData, '🤖 نسخة احتياطية مجدولة آلياً', 'auto');
        const maxKeep = config.maxSnapshotsToKeep || 15;
        const newBackups = [newSnapshot, ...(appData.backups || [])].slice(0, maxKeep);

        const updatedData: AppData = {
          ...appData,
          backups: newBackups,
          autoBackupConfig: {
            ...config,
            lastBackupTimestamp: new Date().toISOString(),
          },
        };

        // If user configured auto file download
        if (config.autoDownloadFile) {
          downloadBackupJsonFile(appData);
        }

        saveAppData(updatedData);
        setAppData(updatedData);

        if (config.notifyOnBackup) {
          showToast('🛡️ تم حفظ نسخة احتياطية تلقائية من بيانات النظام في المتصفح', 'info');
        }
      }
    }, 30000); // Checks every 30 seconds

    return () => clearInterval(backupIntervalTimer);
  }, [appData]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  // Keyboard Shortcuts (Ctrl+1: Sales, Ctrl+2: Purchases, Ctrl+3: POS, Ctrl+4: Items, Ctrl+5: Accounts, Ctrl+0: Home)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleNavigate('sales');
          showToast('اختصار: تم الانتقال إلى المبيعات', 'info');
        } else if (e.key === '2') {
          e.preventDefault();
          handleNavigate('purchases');
          showToast('اختصار: تم الانتقال إلى المشتريات', 'info');
        } else if (e.key === '3') {
          e.preventDefault();
          handleNavigate('pos');
          showToast('اختصار: تم الانتقال إلى نقطة البيع السريعة POS', 'info');
        } else if (e.key === '4') {
          e.preventDefault();
          handleNavigate('items');
          showToast('اختصار: تم الانتقال إلى الأصناف والمخزون', 'info');
        } else if (e.key === '5') {
          e.preventDefault();
          handleNavigate('accounts');
          showToast('اختصار: تم الانتقال إلى الحسابات', 'info');
        } else if (e.key === '0') {
          e.preventDefault();
          handleNavigate('home');
          showToast('اختصار: تم الانتقال إلى الرئيسية', 'info');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // URL Parameter Detection for Direct Customer Catalog Access (?mode=catalog or #catalog)
  useEffect(() => {
    const checkCatalogRoute = () => {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('mode') === 'catalog' ||
        params.get('view') === 'catalog' ||
        window.location.hash === '#catalog'
      ) {
        setCurrentPage('catalog');
      }
    };
    checkCatalogRoute();
    window.addEventListener('popstate', checkCatalogRoute);
    return () => window.removeEventListener('popstate', checkCatalogRoute);
  }, []);

  const currentUser =
    session?.user ||
    appData.users.find((u) => u.id === appData.currentUser) ||
    appData.users[0];
  const isOwner =
    session?.user?.role === 'owner' ||
    currentUser?.role === 'owner' ||
    appData.isOwnerAuthenticated;
  const userCompanyId =
    session?.company?.id || currentUser?.companyId || appData.companyId || 'COMP-000001';

  const pendingWebOrdersCount = (appData.quotations || []).filter((q) => {
    const isWebOrder =
      (q.source === 'online_catalog' || q.status === 'online_order' || (q.orderReference && q.orderReference.startsWith('ORD-'))) &&
      (q.orderStatus === 'new' || q.status === 'online_order' || !q.isRead);
    if (!isWebOrder) return false;
    if (isOwner) return true;
    return q.companyId === userCompanyId || (!q.companyId && userCompanyId === 'COMP-000001');
  }).length;

  const getPageTitle = (pageId: string) => {
    const titles: Record<string, string> = {
      home: '🏠 لوحة القيادة والتحكم الرئيسية',
      pos: '⚡ نقطة البيع السريعة والكاشير (POS)',
      sales: '💰 إدارة المبيعات والفواتير',
      price_management: '🏷️ إدارة وتسعير المنتجات المركزية (Price Management)',
      quotes_orders: '📑 عروض الأسعار والطلبيات (Quotations & Pipeline)',
      web_orders: '📥 طلبات الويب سايت والكتالوج الإلكتروني (Incoming Web Orders)',
      catalog_manager: '🛍️ إدارة منتجات وأسعار الكتالوج الإلكتروني (Catalog Products & Pricing)',
      catalog: '🛍️ كتالوج المنتجات والمتجر الإلكتروني للعملاء (B2B / B2C Catalog)',
      purchases: '🛒 إدارة المشتريات والتوريدات',
      cash: '💵 سندات القبض والصرف',
      accounts: '📋 حسابات العملاء والموردين',
      accounts_tree: '🌳 دليل الحسابات الشجري ومراكز التكلفة',
      items: '📦 إدارة الأصناف والمخزون',
      item_movement: '📦 سجل حركة الأصناف',
      inventory: '📦 تقييم المخزون الإجمالي',
      physical_inventory: '📦 الجرد الفعلي للمخازن',
      inventory_settlement: '📦 مطابقة وتسوية الجرد',
      branches: '🏢 إدارة الفروع والتحويلات المخزنية',
      e_invoicing: '🏛️ الفاتورة والمنظومة الضريبية (E-Invoicing & VAT)',
      bi_analytics: '📊 ذكاء الأعمال والتحليلات التنبؤية (BI Intelligence)',
      daily_operations: '📊 العمليات اليومية',
      daily_entries: '📊 دفتر القيود اليومية المحاسبية المزدوجة',
      trial_balance: '📊 ميزان المراجعة بالمجاميع والأرصدة',
      income_statement: '📊 قائمة الدخل والأرباح والخسائر (P&L)',
      balance_sheet: '📊 الميزانية العمومية والمركز المالي',
      year_end_closing: '🏛️ الإقفال السنوي وترحيل الحسابات الختامية (Fiscal Year Closing)',
      treasury: '🏦 الخزينة والأرصدة النقدية',
      cheques: '💳 إدارة الشيكات وأوراق القبض والدفع',
      sales_reps: '🎯 المندوبين والعمولات والائتمان',
      hr_payroll: '👥 الموارد البشرية ومسير الرواتب (HR & Payroll)',
      fixed_assets: '🏢 الأصول الثابتة وحساب الإهلاكات',
      manufacturing: '⚙️ التصنيع ومعادلات التكوين (BOM & Work Orders)',
      bank_reconciliation: '🏦 التسوية البنكية ودورة الاعتمادات',
      audit_trail: '🛡️ سجل التدقيق الرقابي والأمان (Audit Trail)',
      settings: '⚙️ إعدادات المؤسسة والنظام',
      users: '👥 مستخدمي النظام والصلاحيات',
      backup: '💾 النسخ الاحتياطي والاستعادة',
      owner_panel: '👑 لوحة مالك النظام السحابي وإدارة الاشتراكات والشركات (Owner Multi-Tenant SaaS)',
      reports_group: '📊 التقارير الشاملة',
    };

    if (pageId.startsWith('reports_')) {
      const parts = pageId.split('_');
      if (parts.length >= 3) {
        const repName = parts.slice(2).join(' ').replace(/_/g, ' ');
        return `📊 تقارير - ${repName}`;
      }
      return titles[pageId] || '📊 التقارير الشاملة';
    }

    return titles[pageId] || pageId;
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return <HomeView appData={appData} onNavigate={handleNavigate} />;
      case 'pos':
        return <PosView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'sales':
        return <SalesView appData={appData} onUpdateData={updateData} showToast={showToast} onInspectItem={handleInspectItem} />;
      case 'price_management':
        return <PriceManagementView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'quotes_orders':
        return (
          <QuotesOrdersView
            appData={appData}
            onUpdateData={updateData}
            showToast={showToast}
            onInspectItem={handleInspectItem}
            onShareCatalog={() => setIsShareCatalogOpen(true)}
          />
        );
      case 'web_orders':
        return (
          <WebOrdersInboxView
            appData={appData}
            onUpdateData={updateData}
            showToast={showToast}
            onNavigateToSales={() => handleNavigate('sales')}
            onInspectItem={handleInspectItem}
          />
        );
      case 'catalog_manager':
        return (
          <CatalogManagerView
            appData={appData}
            onUpdateData={updateData}
            showToast={showToast}
            onPreviewStore={(companyId) => {
              const param = companyId ? `&company=${companyId}` : '';
              window.open(`${window.location.origin}${window.location.pathname}?mode=catalog${param}`, '_blank');
            }}
            onShareCatalog={() => setIsShareCatalogOpen(true)}
          />
        );
      case 'catalog':
        return (
          <CustomerCatalogView
            appData={appData}
            onUpdateData={updateData}
            showToast={showToast}
            onExitToAdmin={() => handleNavigate('home')}
            onShareCatalog={() => setIsShareCatalogOpen(true)}
          />
        );
      case 'purchases':
        return <PurchasesView appData={appData} onUpdateData={updateData} showToast={showToast} onInspectItem={handleInspectItem} />;
      case 'cash':
        return <CashView appData={appData} onUpdateData={updateData} showToast={showToast} onInspectItem={handleInspectItem} />;
      case 'accounts':
        return <AccountsView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'accounts_tree':
        return <AccountsTreeView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'branches':
        return <BranchesView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'e_invoicing':
        return <EInvoicingView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'bi_analytics':
        return <BiAnalyticsView appData={appData} onNavigate={handleNavigate} />;
      case 'audit_trail':
        return <AuditTrailView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'items':
      case 'item_movement':
      case 'inventory':
      case 'physical_inventory':
      case 'inventory_settlement':
        return (
          <ItemsView
            appData={appData}
            subPage={currentPage}
            onUpdateData={updateData}
            showToast={showToast}
            onShareCatalog={() => setIsShareCatalogOpen(true)}
            onOpenCatalog={() => handleNavigate('catalog')}
          />
        );
      case 'daily_operations':
      case 'daily_entries':
      case 'trial_balance':
      case 'income_statement':
      case 'balance_sheet':
        return <OperationsView appData={appData} subPage={currentPage} onUpdateData={updateData} showToast={showToast} />;
      case 'year_end_closing':
        return <YearEndClosingView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'treasury':
        return <TreasuryView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'cheques':
        return <ChequesView appData={appData} onUpdateData={updateData} showToast={showToast} onInspectItem={handleInspectItem} />;
      case 'sales_reps':
        return <SalesRepsCommissionsView appData={appData} onUpdateData={updateData} showToast={showToast} onInspectItem={handleInspectItem} />;
      case 'hr_payroll':
        return <HrPayrollView appData={appData} onUpdateData={updateData} showToast={showToast} onInspectItem={handleInspectItem} />;
      case 'fixed_assets':
        return <FixedAssetsView appData={appData} onUpdateData={updateData} showToast={showToast} onInspectItem={handleInspectItem} />;
      case 'manufacturing':
        return <ManufacturingView appData={appData} onUpdateData={updateData} showToast={showToast} onInspectItem={handleInspectItem} />;
      case 'bank_reconciliation':
        return <BankReconciliationView appData={appData} onUpdateData={updateData} showToast={showToast} onInspectItem={handleInspectItem} />;
      case 'settings':
        return (
          <SettingsView
            appData={appData}
            onUpdateData={updateData}
            showToast={showToast}
            onShareCatalog={() => setIsShareCatalogOpen(true)}
          />
        );
      case 'users':
        return <UsersView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'backup':
        return <BackupView appData={appData} onUpdateData={updateData} showToast={showToast} />;
      case 'owner_panel':
        return (
          <OwnerPanelView
            appData={appData}
            onUpdateAppData={(partial) => {
              const updated = { ...appData, ...partial };
              updateData(updated);
            }}
            onEnterCompany={(company, asSupport, supportReason) => {
              showToast(`تم الدخول إلى شركة: ${company.name} ${asSupport ? '(جلسة دعم فني)' : ''}`, 'success');
              handleNavigate('home');
            }}
            onClose={() => handleNavigate('home')}
            onLogout={handleLogout}
          />
        );
      default:
        if (currentPage.startsWith('reports')) {
          return (
            <ReportsView
              appData={appData}
              pageId={currentPage}
              onNavigate={handleNavigate}
              onUpdateData={updateData}
              showToast={showToast}
            />
          );
        }
        return <HomeView appData={appData} onNavigate={handleNavigate} />;
    }
  };

  // Standalone Customer Storefront Route (?mode=catalog or user browsing catalog)
  if (currentPage === 'catalog') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" dir="rtl">
        <CustomerCatalogView
          appData={appData}
          onUpdateData={updateData}
          showToast={showToast}
          onExitToAdmin={() => handleNavigate('home')}
          onShareCatalog={() => setIsShareCatalogOpen(true)}
        />
        <ShareCatalogModal
          isOpen={isShareCatalogOpen}
          onClose={() => setIsShareCatalogOpen(false)}
          appData={appData}
          onUpdateData={updateData}
          showToast={showToast}
          currentCompanyId={userCompanyId}
          onOpenCatalogDirectly={() => {
            setIsShareCatalogOpen(false);
            handleNavigate('catalog');
          }}
        />
        <Toast message={toastMessage} type={toastType} />
      </div>
    );
  }

  // Cloud Auth Loading State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 font-sans" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-xl flex items-center justify-center mb-4 animate-pulse">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <span className="text-3xl font-black text-amber-400">R</span>
          </div>
        </div>
        <div className="w-7 h-7 border-3 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mb-3" />
        <h3 className="text-lg font-bold text-white tracking-wide">RAKEEZA Cloud ERP</h3>
        <p className="text-xs text-slate-400 mt-1">جاري التحقق من الجلسة السحابية وعزل بيانات الشركة...</p>
      </div>
    );
  }

  // Not Logged In Gate: Display Login Page
  if (!session?.valid && currentPage !== 'catalog' && currentPage !== 'owner_panel') {
    return (
      <>
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenOwnerPanelDirectly={async () => {
            try {
              const res = await verifyOwnerSecretApi('29190615');
              if (res.success && res.user && res.company) {
                handleLoginSuccess({
                  user: res.user,
                  company: res.company,
                  subscription: res.subscription,
                });
                return;
              }
            } catch {}
            setCurrentPage('owner_panel');
          }}
        />
        <Toast message={toastMessage} type={toastType} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-800 flex flex-col font-sans max-w-full overflow-x-hidden" dir="rtl">
      {/* Header */}
      <Header
        currentUser={currentUser}
        companyName={session?.company?.name || appData.settings?.companyName}
        companyCode={session?.company?.code || userCompanyId}
        subscriptionPlan={session?.subscription?.planName || session?.company?.planName}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onLogout={handleLogout}
        autoBackupActive={appData.autoBackupConfig?.enabled ?? true}
        onNavigateBackup={() => handleNavigate('backup')}
        onNavigateOwner={() => handleNavigate('owner_panel')}
        onShareCatalog={() => setIsShareCatalogOpen(true)}
        onOpenCatalog={() => handleNavigate('catalog')}
        pendingWebOrdersCount={pendingWebOrdersCount}
        onNavigateWebOrders={() => handleNavigate('web_orders')}
      />

      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-35 backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        activePage={currentPage}
        onNavigate={handleNavigate}
        pendingWebOrdersCount={pendingWebOrdersCount}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        currentUser={currentUser}
        companyName={session?.company?.name || appData.settings?.companyName}
      />

      {/* Main Content Area */}
      <main
        className={`mt-[60px] p-2.5 sm:p-4 md:p-6 pb-24 md:pb-6 transition-all duration-300 flex-1 max-w-full overflow-x-hidden ${
          isSidebarOpen ? 'md:mr-[290px]' : 'mr-0'
        }`}
      >
        <div className="w-full max-w-[1720px] mx-auto">
          {/* Subscription Status Banner if expired or warning */}
          {session?.subscription?.isExpired && (
            <div className="mb-4 p-3.5 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                </div>
                <div className="text-xs sm:text-sm">
                  <p className="font-extrabold text-amber-950">
                    تنبيه: انتهت صلاحية اشتراك المنظومة لشركة ({session?.company?.name || 'الشركة'})
                  </p>
                  <p className="text-amber-800 text-xs">
                    بياناتك ومستنداتك محفوظة بأمان تام في السحابة. لتجديد الترخيص ومتابعة العمل، يرجى إدخال كود التفعيل المعتمد.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLicenseModalOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                🔑 إدخال كود الترخيص
              </button>
            </div>
          )}

          {/* Page Top Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-5 pb-3 border-b-2 border-slate-200 gap-3">
            <div className="w-full sm:w-auto">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-[#1a237e] flex items-center gap-2 flex-wrap">
                {getPageTitle(currentPage)}
              </h2>
              <span className="hidden sm:inline-block text-[11px] text-slate-500 mt-0.5">
                💡 تلميح اختصارات لوحة المفاتيح: (Ctrl+0 الرئيسية | Ctrl+1 المبيعات | Ctrl+2 المشتريات | Ctrl+3 نقطة البيع | Ctrl+4 المخزون | Ctrl+5 الحسابات)
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {currentPage !== 'pos' && (
                <button
                  onClick={() => handleNavigate('pos')}
                  className="min-h-[40px] bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-xs flex-1 sm:flex-initial"
                >
                  ⚡ POS سريع
                </button>
              )}
              {currentPage !== 'home' && (
                <button
                  onClick={() => handleNavigate('home')}
                  className="min-h-[40px] bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 flex-1 sm:flex-initial"
                >
                  🏠 الرئيسية
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Page View */}
          {renderContent()}
        </div>
      </main>

      {/* Mobile Sticky Quick Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 flex items-center justify-around px-1 shadow-lg no-print mobile-bottom-nav"
        aria-label="التنقل السريع للهاتف"
      >
        <button
          onClick={() => handleNavigate('home')}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition ${
            currentPage === 'home' ? 'text-[#1a237e] font-black' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="text-lg">🏠</span>
          <span className="text-[10px] mt-0.5">الرئيسية</span>
        </button>

        <button
          onClick={() => handleNavigate('pos')}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition ${
            currentPage === 'pos' ? 'text-[#1a237e] font-black' : 'text-amber-600 hover:text-amber-700'
          }`}
        >
          <span className="text-lg">⚡</span>
          <span className="text-[10px] mt-0.5 font-bold">الكاشير</span>
        </button>

        <button
          onClick={() => handleNavigate('sales')}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition ${
            currentPage === 'sales' ? 'text-[#1a237e] font-black' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="text-lg">💰</span>
          <span className="text-[10px] mt-0.5">المبيعات</span>
        </button>

        <button
          onClick={() => handleNavigate('purchases')}
          className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition ${
            currentPage === 'purchases' ? 'text-[#1a237e] font-black' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="text-lg">🛒</span>
          <span className="text-[10px] mt-0.5">المشتريات</span>
        </button>

        <button
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 text-slate-500 hover:text-slate-800 transition"
        >
          <span className="text-lg">☰</span>
          <span className="text-[10px] mt-0.5">القائمة</span>
        </button>
      </nav>

      {/* System Footer & Developer Copyright */}
      <footer
        className={`no-print py-3.5 px-4 sm:px-6 bg-white border-t border-slate-200 text-xs text-slate-600 transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs mb-16 md:mb-0 ${
          isSidebarOpen ? 'md:mr-[290px]' : 'mr-0'
        }`}
      >
        <div className="flex items-center gap-2 text-center sm:text-right">
          <span className="font-bold text-[#1a237e] text-sm">منظومة ركيزة | RAKEEZA ERP</span>
          <span className="text-slate-300">|</span>
          <span>جميع الحقوق محفوظة © {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 font-semibold text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 text-center">
          <span>👨‍💻 تطوير: <strong className="text-[#0d47a1]">Mohamed Nazih</strong></span>
          <span className="text-slate-300">|</span>
          <span>📱 للتواصل: <strong className="text-emerald-700 font-mono text-sm" dir="ltr">01029190615</strong></span>
        </div>
      </footer>

      {/* Toast Notification */}
      <Toast message={toastMessage} type={toastType} />

      {/* Share Catalog Modal */}
      <ShareCatalogModal
        isOpen={isShareCatalogOpen}
        onClose={() => setIsShareCatalogOpen(false)}
        appData={appData}
        onUpdateData={updateData}
        showToast={showToast}
        currentCompanyId={userCompanyId}
        onOpenCatalogDirectly={() => {
          setIsShareCatalogOpen(false);
          handleNavigate('catalog');
        }}
      />

      {/* Global Transaction Inspector Modal */}
      {isInspectModalOpen && inspectModalItem && (
        <TransactionInspectorModal
          isOpen={isInspectModalOpen}
          item={inspectModalItem}
          appData={appData}
          onClose={() => {
            setIsInspectModalOpen(false);
            setInspectModalItem(null);
          }}
          onUpdateData={updateData}
          showToast={showToast}
        />
      )}

      {/* Subscription License Activation Modal */}
      {isLicenseModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in"
          dir="rtl"
          onClick={() => setIsLicenseModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    تفعيل كود ترخيص واشتراك المنظومة
                  </h3>
                  <p className="text-xs text-slate-500">
                    شركة: {session?.company?.name || 'الشركة'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLicenseModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActivateLicenseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  أدخل كود الترخيص السحابي (Activation Code):
                </label>
                <input
                  type="text"
                  autoFocus
                  value={licenseCodeInput}
                  onChange={(e) => setLicenseCodeInput(e.target.value.toUpperCase())}
                  placeholder="مثال: RKZ-2026-PRO-ANNUAL-001"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl px-4 py-2.5 text-center text-sm font-mono tracking-widest text-slate-900 outline-none uppercase"
                  disabled={isActivatingLicense}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  يمكنك الحصول على كود الترخيص من إدارة مبيعات ركيزة
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isActivatingLicense}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isActivatingLicense ? 'جاري التحقق والتفعيل...' : 'تفعيل وتجديد الاشتراك'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLicenseModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
