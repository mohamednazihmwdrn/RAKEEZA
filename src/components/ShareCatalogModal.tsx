import React, { useState, useEffect, useMemo } from 'react';
import { AppData, CatalogConfig } from '../types';
import { generateQrDataUrl, printQrPoster } from '../utils/qrHelper';
import { addAuditLog } from '../utils/storage';
import { DEFAULT_COMPANIES } from '../utils/multiTenantService';

interface ShareCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenCatalogDirectly?: () => void;
  currentCompanyId?: string;
}

export const ShareCatalogModal: React.FC<ShareCatalogModalProps> = ({
  isOpen,
  onClose,
  appData,
  onUpdateData,
  showToast,
  onOpenCatalogDirectly,
  currentCompanyId,
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'settings'>('share');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const companies = useMemo(() => {
    return appData.companies && appData.companies.length > 0 ? appData.companies : DEFAULT_COMPANIES;
  }, [appData.companies]);

  const currentUser = useMemo(() => {
    return appData.users.find((u) => u.id === appData.currentUser) || appData.users[0];
  }, [appData.users, appData.currentUser]);

  const isOwner = currentUser?.role === 'owner' || appData.isOwnerAuthenticated;

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    return currentCompanyId || appData.companyId || companies[0]?.id || 'COMP-000001';
  });

  useEffect(() => {
    if (currentCompanyId) {
      setSelectedCompanyId(currentCompanyId);
    }
  }, [currentCompanyId]);

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId) || companies[0];
  }, [companies, selectedCompanyId]);

  // Derive catalog URL strictly containing the company code
  const companyCode = activeCompany?.code || activeCompany?.id || 'RKZ-001';
  const catalogUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?mode=catalog&company=${encodeURIComponent(companyCode)}`
      : `https://rakeeza-erp.com/?mode=catalog&company=${encodeURIComponent(companyCode)}`;

  // Per-company configuration state
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [banner, setBanner] = useState('');
  const [priceMode, setPriceMode] = useState<'retail_only' | 'wholesale_only' | 'both'>('both');
  const [showStock, setShowStock] = useState(true);
  const [showExactQty, setShowExactQty] = useState(false);

  // Sync state whenever activeCompany changes
  useEffect(() => {
    if (activeCompany) {
      const tenantMap = appData.companyCatalogConfigs?.[activeCompany.id];
      const companyDirect = activeCompany.catalogConfig;
      const fallback = appData.catalogConfig;

      setStoreName(
        tenantMap?.storeName ||
          companyDirect?.storeName ||
          activeCompany.tradeName ||
          activeCompany.name ||
          appData.settings.companyName
      );
      setStoreDesc(
        tenantMap?.storeDescription ||
          companyDirect?.storeDescription ||
          `الكتالوج الإلكتروني لشركة ${activeCompany.name} - تصفح وطلب مباشر`
      );
      setWhatsapp(
        tenantMap?.whatsappNumber ||
          companyDirect?.whatsappNumber ||
          activeCompany.whatsapp ||
          activeCompany.phone ||
          '01029190615'
      );
      setBanner(tenantMap?.bannerMessage || companyDirect?.bannerMessage || fallback?.bannerMessage || '');
      setPriceMode(
        tenantMap?.priceDisplayMode || companyDirect?.priceDisplayMode || fallback?.priceDisplayMode || 'both'
      );
      setShowStock(
        tenantMap?.showStockStatus ?? companyDirect?.showStockStatus ?? fallback?.showStockStatus ?? true
      );
      setShowExactQty(
        tenantMap?.showExactStockQty ?? companyDirect?.showExactStockQty ?? fallback?.showExactStockQty ?? false
      );
    }
  }, [activeCompany, appData.companyCatalogConfigs, appData.catalogConfig, appData.settings]);

  // Generate QR code when modal opens or URL changes
  useEffect(() => {
    if (isOpen && catalogUrl) {
      generateQrDataUrl(catalogUrl, 360).then((url) => {
        setQrDataUrl(url);
      });
    }
  }, [isOpen, catalogUrl]);

  if (!isOpen) return null;

  // Copy Link to clipboard
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(catalogUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = catalogUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      showToast(`تم نسخ رابط المتجر الخاص بـ "${activeCompany.name}" بنجاح! 📋`, 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      showToast('تعذر النسخ التلقائي، يمكنك تحديد الرابط ونسخه يدوياً', 'warning');
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const text = `🛍️ *المتجر والكتالوج الإلكتروني الرسمي لشركة ${activeCompany.name}*
يسرنا دعوتكم لتصفح أحدث منتجاتنا وبضائعنا وتقديم طلبات الشراء أونلاين مباشرة:
🔗 ${catalogUrl}

📞 للتواصل والاستفسار: ${whatsapp || activeCompany.phone || '01029190615'}
أهلاً وسهلاً بكم دائماً! ✨`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Download QR as PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `catalog-qr-${(activeCompany.name || 'company').replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`تم بدء تحميل QR Code الخاص بشركة ${activeCompany.name}`, 'success');
  };

  // Print Poster
  const handlePrintPoster = () => {
    if (!qrDataUrl) return;
    printQrPoster({
      companyName: activeCompany.name,
      storeName,
      qrDataUrl,
      targetUrl: catalogUrl,
      phone: activeCompany.phone || appData.settings.phone1,
      whatsapp,
      address: activeCompany.address || appData.settings.address,
      bannerMessage: banner || storeDesc,
    });
  };

  // Save Settings per Company
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const newConfig: CatalogConfig = {
      enabled: true,
      storeName: storeName.trim(),
      storeDescription: storeDesc.trim(),
      whatsappNumber: whatsapp.trim(),
      contactPhone: activeCompany.phone || appData.settings.phone1,
      bannerMessage: banner.trim(),
      priceDisplayMode: priceMode,
      showStockStatus: showStock,
      showExactStockQty: showExactQty,
      currencySymbol: appData.settings.currencySymbol,
      companyId: activeCompany.id,
    };

    const updatedCompanyConfigs = {
      ...(appData.companyCatalogConfigs || {}),
      [activeCompany.id]: newConfig,
    };

    const updatedCompanies = (appData.companies || []).map((c) =>
      c.id === activeCompany.id ? { ...c, catalogConfig: newConfig } : c
    );

    let updatedData: AppData = {
      ...appData,
      companyCatalogConfigs: updatedCompanyConfigs,
      companies: updatedCompanies,
    };

    // If saving for the primary company, also keep fallback in sync
    if (activeCompany.id === 'COMP-000001' || activeCompany.id === companies[0]?.id) {
      updatedData.catalogConfig = newConfig;
    }

    updatedData = addAuditLog(
      updatedData,
      'update',
      'كتالوج المنتجات والمتجر الإلكتروني',
      `تحديث إعدادات الكتالوج الخارجي الخاص بشركة (${activeCompany.name})`
    );

    onUpdateData(updatedData);
    showToast(`تم حفظ إعدادات متجر "${activeCompany.name}" بنجاح!`, 'success');
    setActiveTab('share');
  };

  return (
    <div
      className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a237e] via-[#0d47a1] to-[#1565c0] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shadow-inner">
              🛍️
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                <span>مشاركة كتالوج المنتجات والمتجر الإلكتروني</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                  B2B / B2C
                </span>
              </h3>
              <p className="text-xs text-blue-100">
                رابط خارجي ورمز QR Code يتيح لعملائك تصفح البضائع وطلب الشراء فورياً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-base cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'share'
                ? 'bg-white text-[#1a237e] border-t-2 border-[#1a237e] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🔗</span>
            <span>الرابط ورمز QR Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white text-[#1a237e] border-t-2 border-[#1a237e] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⚙️</span>
            <span>تخصيص إعدادات الكتالوج</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm">
          {activeTab === 'share' ? (
            <div className="space-y-6">
              {/* Tenant Selection & Multi-Company Isolation Assurance */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                        🏢 الشركة الحالية
                      </span>
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                        {activeCompany.code || activeCompany.id}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 mt-1">
                      {activeCompany.name}
                    </h4>
                  </div>

                  {isOwner && companies.length > 1 && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600 whitespace-nowrap">عرض رابط شركة أخرى:</label>
                      <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden"
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code || c.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-blue-200/60 flex items-start gap-2 text-xs text-blue-950">
                  <span className="text-base leading-none">🔒</span>
                  <p className="leading-relaxed">
                    <strong>ضمان العزل والخصوصية التامة:</strong> هذا الرابط ورمز الـ QR مخصصان حصرياً لـ <strong>{activeCompany.name}</strong>. لا يمكن لأي عميل أو شركة أخرى الاطلاع على المنتجات أو الأسعار أو الطلبيات إلا للشركة المحددة بهذا الرابط.
                  </p>
                </div>
              </div>

              {/* External Link Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                    <span>🌐</span> رابط الكتالوج الخارجي للعملاء
                  </label>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                    متاح للفتح بدون تسجيل دخول
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={catalogUrl}
                    dir="ltr"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs text-slate-700 select-all focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#1a237e] hover:bg-[#0d47a1] text-white'
                    }`}
                  >
                    <span>{copied ? '✓' : '📋'}</span>
                    <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {onOpenCatalogDirectly ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCatalogDirectly();
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>👁️</span> فتح ومعاينة الكتالوج الآن
                    </button>
                  ) : (
                    <a
                      href={catalogUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🌐</span> فتح في نافذة جديدة
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>💬</span> مشاركة فورية عبر واتساب
                  </button>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-5 text-center space-y-4 shadow-xs">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xs font-black text-slate-500 mb-1">
                    رمز الاستجابة السريعة (QR Code) للمتجر
                  </span>
                  <h4 className="text-sm font-black text-slate-900">{storeName}</h4>

                  {/* QR Image */}
                  <div className="mt-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm inline-block">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Code لكتالوج المتجر"
                        className="w-48 h-48 rounded-lg mx-auto block"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                        جاري توليد رمز الـ QR...
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 max-w-xs">
                    وجّه كاميرا أي هاتف محمول نحو الرمز ليفتح الكتالوج الإلكتروني فورياً دون تثبيت أي برامج
                  </p>
                </div>

                {/* QR Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-md mx-auto pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs text-xs"
                  >
                    <span>💾</span> تحميل صورة الـ QR (PNG)
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPoster}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs text-xs"
                  >
                    <span>🖨️</span> طباعة بوستر / ملصق الكتالوج
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Settings Form Tab */
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المتجر / البراند المعروض للعملاء
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#1a237e] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وصف مختصر للمتجر
                </label>
                <input
                  type="text"
                  value={storeDesc}
                  onChange={(e) => setStoreDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#1a237e] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم هاتف الواتساب لاستقبال طلبات الشراء
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#1a237e] focus:outline-hidden text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شريط إعلان ترحيبي في أعلى الكتالوج (اختياري)
                </label>
                <input
                  type="text"
                  value={banner}
                  onChange={(e) => setBanner(e.target.value)}
                  placeholder="مثال: خصم 5% على طلبيات الجملة التي تتجاوز 10,000 ج.م"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-[#1a237e] focus:outline-hidden"
                />
              </div>

              {/* Price display mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  سياسة عرض الأسعار في الكتالوج
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceMode('retail_only')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                      priceMode === 'retail_only'
                        ? 'bg-blue-50 border-[#1a237e] text-[#1a237e]'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    قطاعي فقط
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode('wholesale_only')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                      priceMode === 'wholesale_only'
                        ? 'bg-blue-50 border-[#1a237e] text-[#1a237e]'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    جملة فقط
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode('both')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition ${
                      priceMode === 'both'
                        ? 'bg-blue-50 border-[#1a237e] text-[#1a237e]'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    كلاهما (مع زر تبديل)
                  </button>
                </div>
              </div>

              {/* Stock visibility toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showStock}
                    onChange={(e) => setShowStock(e.target.checked)}
                    className="rounded text-[#1a237e]"
                  />
                  <span>إظهار حالة التوفر بالمخزن (متوفر / غير متوفر)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showExactQty}
                    onChange={(e) => setShowExactQty(e.target.checked)}
                    className="rounded text-[#1a237e]"
                  />
                  <span>إظهار عدد القطع المتبقية بدقة للعملاء (مثال: متوفر 12 قطعة)</span>
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-[#1a237e] hover:bg-[#0d47a1] text-white py-3 px-4 rounded-xl font-bold text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <span>💾</span> حفظ إعدادات الكتالوج
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center text-xs">
          <span className="text-slate-500">منظومة RAKEEZA للمحاسبة السحابية - المتجر الذكي</span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg font-bold transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
