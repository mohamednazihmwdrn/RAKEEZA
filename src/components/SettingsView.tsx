import React, { useState } from 'react';
import { AppData, Settings } from '../types';

interface SettingsViewProps {
  appData: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onShareCatalog?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ appData, onUpdateData, showToast, onShareCatalog }) => {
  const [settings, setSettings] = useState<Settings>({
    paperSize: 'A4',
    pageMargin: 5,
    showLogoInPrint: true,
    printerType: 'standard',
    ...appData.settings,
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح (PNG / JPG / WEBP / SVG)', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('حجم الصورة كبير جداً، يفضل اختيار صورة أقل من 2 ميجابايت', 'warning');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSettings((prev) => ({
        ...prev,
        logo: base64,
        logoUrl: base64,
      }));
      try {
        localStorage.setItem('company_logo_base64', base64);
      } catch (e) {
        console.warn('LocalStorage limit reached for standalone logo', e);
      }
      showToast('تم تحميل الشعار بنجاح، اضغط على زر حفظ الإعدادات لتثبيته', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSettings((prev) => ({
      ...prev,
      logo: '',
      logoUrl: '',
    }));
    try {
      localStorage.removeItem('company_logo_base64');
    } catch (e) {
      console.warn(e);
    }
    showToast('تمت إزالة الشعار', 'info');
  };

  const handleSave = () => {
    const updatedData = { ...appData, settings };
    onUpdateData(updatedData);
    if (settings.logo) {
      try {
        localStorage.setItem('company_logo_base64', settings.logo);
      } catch (e) {
        console.warn(e);
      }
    }
    showToast('تم حفظ بيانات وإعدادات النظام وهوامش الطباعة والشعار بنجاح', 'success');
  };

  const handleClearSampleData = () => {
    if (
      confirm(
        'هل أنت أسلوب متأكد من تفريغ كافة العملاء والموردين والأصناف والفواتير السابقة للبدء بنظام فارغ 100% لإدخال بياناتك الحقيقية الخاصة؟'
      )
    ) {
      const emptyData: AppData = {
        ...appData,
        customers: [],
        suppliers: [],
        items: [],
        salesInvoices: [],
        purchaseInvoices: [],
        cashTransactions: [],
        cashBox: { drawer: 0, vodafone: 0, instapay: 0, bank: 0 },
        salesReps: [],
        bankAccounts: [],
        nextInvoiceNumber: 1,
        nextPurchaseNumber: 1,
        nextCashId: 1,
      };

      onUpdateData(emptyData);
      showToast('تم تفريغ كافة البيانات للبدء بنظام فارغ تماماً', 'info');
    }
  };

  const currentLogo = settings.logo || settings.logoUrl || '';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Company Info & Logo */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
        <h4 className="text-[#1a237e] font-bold text-base flex items-center gap-1 border-b border-gray-100 pb-3">
          <span>🏢</span> بيانات المؤسسة والشعار المعتمد
        </h4>

        {/* Logo Upload Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-indigo-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative group">
            {currentLogo ? (
              <img
                src={currentLogo}
                alt="شعار الشركة"
                className="w-full h-full object-contain p-1.5"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="text-center p-2 text-slate-400">
                <span className="text-2xl block mb-1">🖼️</span>
                <span className="text-[10px] font-bold block">لا يوجد شعار</span>
              </div>
            )}
          </div>

          <div className="space-y-2 flex-1 text-center sm:text-right">
            <div className="text-sm font-bold text-slate-800">شعار المؤسسة الرسمي للطباعة</div>
            <p className="text-xs text-slate-500">
              يظهر هذا الشعار تلقائياً في ترويسة جميع فواتير المبيعات والمشتريات، كشوفات الحساب، تقفيل الخزينة، وتقارير النظام الشاملة.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <label className="bg-[#1a237e] hover:bg-[#0d47a1] text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs">
                <span>📤</span> رفع شعار جديد
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>

              {currentLogo && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <span>🗑️</span> حذف الشعار
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm">
          <div>
            <label className="block font-bold mb-1">اسم المؤسسة / النشاط التجاري</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">العنوان والمقر الرئيسي</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">رقم الهاتف الأول</label>
            <input
              type="text"
              dir="ltr"
              value={settings.phone1}
              onChange={(e) => setSettings({ ...settings, phone1: e.target.value })}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none text-right"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">رقم الهاتف الثاني</label>
            <input
              type="text"
              dir="ltr"
              value={settings.phone2}
              onChange={(e) => setSettings({ ...settings, phone2: e.target.value })}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none text-right"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">الرقم الضريبي (Tax ID)</label>
            <input
              type="text"
              value={settings.taxNumber}
              onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold mb-1">ملاحظات وتذييل الفاتورة</label>
            <input
              type="text"
              value={settings.notes}
              onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Printing & Layout Engine Configuration */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h4 className="text-[#1a237e] font-bold text-base flex items-center gap-1 border-b border-gray-100 pb-3">
          <span>🖨️</span> إعدادات محرك الطباعة وتنسيق الورقة (CSS Page Setup)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs md:text-sm">
          {/* Default Page Size */}
          <div>
            <label className="block font-bold mb-1 text-slate-700">حجم الصفحة الافتراضي للتقارير</label>
            <select
              value={settings.paperSize || 'A4'}
              onChange={(e) => setSettings({ ...settings, paperSize: e.target.value as any })}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:border-[#1a237e] focus:outline-none bg-white font-bold"
            >
              <option value="A4">A4 (210mm × 297mm) - المقاس القياسي للتقارير</option>
              <option value="A5">A5 (148mm × 210mm) - فواتير وسندات نصف ورقة</option>
              <option value="Letter">Letter (8.5 × 11 بوصة)</option>
              <option value="auto">تلقائي (Auto Fit)</option>
            </select>
            <span className="text-[11px] text-slate-400 mt-1 block">يتحكم في مقاس الورقة لجميع قوالب التقارير والفواتير.</span>
          </div>

          {/* Page Margin in MM */}
          <div>
            <label className="block font-bold mb-1 text-slate-700">
              هوامش الصفحة (Margin): <span className="font-mono text-indigo-700">{settings.pageMargin ?? 5} ملم</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={settings.pageMargin ?? 5}
                onChange={(e) => setSettings({ ...settings, pageMargin: Number(e.target.value) })}
                className="flex-1 accent-[#1a237e]"
              />
              <input
                type="number"
                min="0"
                max="30"
                value={settings.pageMargin ?? 5}
                onChange={(e) => setSettings({ ...settings, pageMargin: Number(e.target.value) })}
                className="w-16 p-2 border-2 border-gray-200 rounded-xl font-mono text-center text-xs font-bold"
              />
            </div>
            {/* Quick Margins Presets */}
            <div className="flex gap-1.5 mt-1.5">
              {[0, 3, 5, 8, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSettings({ ...settings, pageMargin: m })}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    settings.pageMargin === m
                      ? 'bg-indigo-900 text-white border-indigo-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m}mm
                </button>
              ))}
            </div>
          </div>

          {/* Show Logo in Print */}
          <div>
            <label className="block font-bold mb-1 text-slate-700">خيارات الشعار والمظهر في المطبوعات</label>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showLogoInPrint !== false}
                  onChange={(e) => setSettings({ ...settings, showLogoInPrint: e.target.checked })}
                  className="w-4 h-4 accent-[#1a237e] rounded"
                />
                <span className="font-bold text-xs text-slate-800">إظهار الشعار في ترويسة المطبوعات</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.printerType === 'thermal'}
                  onChange={(e) => setSettings({ ...settings, printerType: e.target.checked ? 'thermal' : 'standard' })}
                  className="w-4 h-4 accent-[#1a237e] rounded"
                />
                <span className="font-bold text-xs text-slate-800">الوضع الافتراضي: طابعة إيصالات حرارية 80mm</span>
              </label>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-8 py-2.5 rounded-xl font-bold transition cursor-pointer shadow-xs flex items-center gap-2"
          >
            <span>💾</span>
            <span>حفظ كافة التعديلات والإعدادات</span>
          </button>
        </div>
      </div>

      {/* Online Catalog & B2B/B2C Storefront Settings Card */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-amber-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl">
              🛍️
            </div>
            <div>
              <h4 className="font-black text-lg text-slate-900 flex items-center gap-2">
                كتالوج المنتجات والمتجر الإلكتروني للعملاء (B2B / B2C Catalog)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                تفعيل وإدارة رابط الكتالوج الخارجي، واستقبال طلبات الشراء أونلاين مباشرة إلى خط سير الفواتير والطلبيات، وطباعة بوستر QR Code لمتجرك.
              </p>
            </div>
          </div>
          {onShareCatalog && (
            <button
              type="button"
              onClick={onShareCatalog}
              className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black px-5 py-2.5 rounded-xl text-sm transition cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
            >
              <span>⚡</span>
              <span>مشاركة الكتالوج وتوليد QR Code</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-600">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>🌐</span> رابط مباشر للعملاء
            </div>
            <p className="text-slate-500">
              يمكن لعملائك تصفح المنتجات والأسعار من أي متصفح أو هاتف بدون تثبيت تطبيق.
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>📥</span> طلبات شراء فورية
            </div>
            <p className="text-slate-500">
              تحويل طلبات الشراء تلقائياً إلى عروض أسعار وطلبيات في نظام ERP مع إشعار فوري.
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>📱</span> جاهز للواتساب والطباعة
            </div>
            <p className="text-slate-500">
              توليد ملصقات QR Code عالية الدقة للطباعة على الكروت وأبواب المحل أو الإرسال واتساب.
            </p>
          </div>
        </div>
      </div>

      {/* Developer Rights Box */}
      <div className="bg-gradient-to-r from-[#072a4e] to-[#0d4b8e] text-white p-6 rounded-2xl shadow-sm border border-indigo-900 space-y-3">
        <h4 className="font-bold text-lg flex items-center gap-2 text-[#ffd54f]">
          <span>💻</span> حقوق الملكية وتطوير النظام
        </h4>
        <div className="text-sm space-y-1.5 opacity-95">
          <p>
            اسم المنظومة: <strong className="text-white text-base">منظومة ركيزة | RAKEEZA Cloud ERP</strong>
          </p>
          <p>
            تطوير وبرمجة: <strong className="text-[#ffd54f] text-base">Mohamed Nazih</strong>
          </p>
          <p>
            رقم الهاتف والتواصل المباشر: <strong className="font-mono text-emerald-300 text-base" dir="ltr">01029190615</strong>
          </p>
        </div>
        <p className="text-xs text-blue-200 pt-2 border-t border-white/20">
          جميع حقوق الملكية والتأليف محفوظة للمطور. يتم طباعة هذا التذييل تلقائياً على جميع الفواتير، التقارير الشاملة، كشوفات الحسابات وسندات الخزينة.
        </p>
      </div>

      {/* Clear Sample Data Box */}
      <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-200 space-y-3">
        <h4 className="text-[#c62828] font-bold text-base flex items-center gap-1">
          <span>🗑️</span> تفريغ بيانات العينات للبدء بشركة جديدة
        </h4>
        <p className="text-gray-600 text-xs">
          إذا كنت تريد البدء بنظام فارغ 100% بدون أية أصناف أو عملاء أو موردين أو فواتير سابقة لبدء إدخال بياناتك الحقيقية، يمكنك تفريغ العينات بنقرة واحدة.
        </p>
        <button
          onClick={handleClearSampleData}
          className="bg-[#c62828] hover:bg-[#b71c1c] text-white px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer"
        >
          🗑️ تفريغ النظام والبدء بقاعدة فارغة
        </button>
      </div>
    </div>
  );
};
