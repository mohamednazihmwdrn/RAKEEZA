import React, { useState } from 'react';
import { AppData, EInvoiceConfig } from '../types';
import { addAuditLog } from '../utils/storage';
import { openUnifiedPrintWindow } from '../utils/printUnified';
import { exportToExcel } from '../utils/excelExport';

interface EInvoicingViewProps {
  appData: AppData;
  onUpdateData: (newData: AppData) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const EInvoicingView: React.FC<EInvoicingViewProps> = ({
  appData,
  onUpdateData,
  showToast,
}) => {
  const [config, setConfig] = useState<EInvoiceConfig>(
    appData.eInvoiceConfig || {
      taxRegNumber: appData.settings.taxNumber || '123-456-789',
      commercialRegNumber: appData.settings.commercialReg || 'CR-98765',
      branchCode: '0',
      activityCode: appData.settings.activityCode || '4651',
      posSerial: 'NAZIH-POS-001',
      isEtaConnected: true,
      autoGenerateQr: true,
    }
  );

  const [activeTab, setActiveTab] = useState<'status' | 'vatReturn' | 'withholding' | 'config'>('status');

  const handleSaveConfig = () => {
    let updatedData: AppData = {
      ...appData,
      eInvoiceConfig: config,
      settings: {
        ...appData.settings,
        taxNumber: config.taxRegNumber,
        commercialReg: config.commercialRegNumber,
        activityCode: config.activityCode,
      },
    };

    updatedData = addAuditLog(
      updatedData,
      'update',
      'الفاتورة الإلكترونية',
      `تم تحديث إعدادات الفاتورة والربط الضريبي (الرقم الضريبي: ${config.taxRegNumber})`
    );

    onUpdateData(updatedData);
    showToast('تم حفظ إعدادات منظومة الفاتورة الإلكترونية بنجاح', 'success');
  };

  // VAT calculations
  const totalSalesTax = appData.salesInvoices.reduce((sum, inv) => sum + (inv.tax || 0), 0);
  const totalPurchasesTax = appData.purchaseInvoices.reduce((sum, inv) => sum + (inv.tax || 0), 0);
  const netVatPayable = totalSalesTax - totalPurchasesTax;

  // Withholding Tax (1% or custom)
  const totalWithholdingDeducted = appData.purchaseInvoices.reduce((sum, inv) => {
    return sum + (inv.withholdingTax || ((inv.total || 0) * (appData.settings.withholdingTaxRate || 1) / 100));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-[#0d47a1] to-[#1565c0] text-white p-5 rounded-2xl shadow-md flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏛️</span>
            <h3 className="font-black text-lg md:text-xl text-[#ffd54f]">
              المنظومة الضريبية والفاتورة الإلكترونية (E-Invoicing & Tax Compliance)
            </h3>
          </div>
          <p className="text-xs text-blue-100 mt-1 opacity-90">
            توليد QR Codes متوافقة مع مصلحة الضرائب (ETA/ZATCA)، حساب ضريبة القيمة المضافة والإقرارات الضريبية
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 px-3 py-1.5 rounded-xl text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold text-emerald-200">الربط الإلكتروني: مُفعل ونشط</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('status')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'status'
              ? 'bg-[#1a237e] text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          📄 الفواتير المعتمدة إلكترونياً
        </button>
        <button
          onClick={() => setActiveTab('vatReturn')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'vatReturn'
              ? 'bg-[#1a237e] text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          🧮 إقرار ضريبة القيمة المضافة (VAT Return)
        </button>
        <button
          onClick={() => setActiveTab('withholding')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'withholding'
              ? 'bg-[#1a237e] text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          📑 ضريبة الخصم والتحصيل من المنبع (WHT)
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'config'
              ? 'bg-[#1a237e] text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          ⚙️ إعدادات وتكوين المنظومة الضريبية
        </button>
      </div>

      {/* Tab 1: E-Invoices List */}
      {activeTab === 'status' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="pb-3 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="text-base md:text-lg font-bold text-[#1a237e]">
                سجل الفواتير والإيصالات الإلكترونية الصادرة
              </h3>
              <p className="text-xs text-slate-500">
                فواتير صادرة ومحققة بالرقم التعريفي الفريد (UUID) والباركود الضريبي المشفر.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  openUnifiedPrintWindow(
                    {
                      title: 'سجل الفواتير والإيصالات الإلكترونية والربط الضريبي',
                      partyLabel: 'إجمالي الفواتير الصادرة',
                      partyName: `${appData.salesInvoices.length} فاتورة ضريبية`,
                      items: appData.salesInvoices.map((inv) => ({
                        name: `${inv.customerName} (فاتورة #${inv.id})`,
                        code: inv.eInvoiceUuid || `UUID-${inv.id}`,
                        unit: inv.type === 'nagdi' ? 'نقدي' : 'آجل',
                        qty: 1,
                        price: inv.subtotal - inv.discount,
                        total: inv.total,
                        notes: `التاريخ: ${inv.date} | الضريبة (${inv.tax.toFixed(2)}) | الحالة: معتمد ومحقق ضريبياً`,
                      })),
                      totals: [
                        {
                          label: 'إجمالي القيمة الخاضعة للضريبة:',
                          value: appData.salesInvoices.reduce((a, b) => a + (b.subtotal - b.discount), 0),
                          isBold: true,
                        },
                        {
                          label: 'إجمالي ضريبة القيمة المضافة:',
                          value: totalSalesTax,
                          isBold: true,
                        },
                        {
                          label: 'إجمالي المبيعات الشامل:',
                          value: appData.salesInvoices.reduce((a, b) => a + b.total, 0),
                          isBold: true,
                          isHighlight: true,
                        },
                      ],
                    },
                    appData.settings,
                    showToast
                  );
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>🖨️ طباعة السجل</span>
              </button>
              <button
                onClick={() => {
                  exportToExcel({
                    filename: `سجل_الفواتير_الإلكترونية_${new Date().toISOString().split('T')[0]}`,
                    sheetName: 'الفواتير الإلكترونية',
                    data: appData.salesInvoices,
                    columns: [
                      { header: 'رقم الفاتورة', key: 'id', width: 14 },
                      { header: 'التاريخ', key: 'date', width: 14 },
                      { header: 'اسم العميل / المستلم', key: 'customerName', width: 25 },
                      { header: 'الرقم التعريفي الفريد UUID', getValue: (inv) => inv.eInvoiceUuid || `E-INV-2026-${String(inv.id).padStart(6, '0')}`, width: 30 },
                      { header: 'قبل الضريبة (ج.م)', getValue: (inv) => (inv.subtotal - inv.discount).toFixed(2), width: 18 },
                      { header: 'ضريبة القيمة المضافة (ج.م)', getValue: (inv) => inv.tax.toFixed(2), width: 22 },
                      { header: 'الإجمالي الشامل (ج.م)', getValue: (inv) => inv.total.toFixed(2), width: 20 },
                      { header: 'طريقة الدفع', getValue: (inv) => inv.type === 'nagdi' ? 'نقداً' : 'آجل', width: 14 },
                      { header: 'الحالة الضريبية', getValue: () => 'معتمد ومحقق ضريبياً', width: 18 },
                    ],
                    companyName: appData.settings?.companyName || 'المنظومة المحاسبية المعتمدة',
                    reportTitle: 'سجل الفواتير والإيصالات الإلكترونية والربط الضريبي ETA',
                  });
                  showToast('تم تصدير سجل الفواتير الإلكترونية إلى Excel بنجاح', 'success');
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <span>📊 تصدير Excel</span>
              </button>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden space-y-3">
            {appData.salesInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                لا توجد فواتير مبيعات مسجلة بعد.
              </div>
            ) : (
              appData.salesInvoices.map((inv) => {
                const uuid = inv.eInvoiceUuid || `E-INV-2026-${String(inv.id).padStart(6, '0')}`;
                return (
                  <div
                    key={inv.id}
                    className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                      <div>
                        <strong className="text-slate-900 text-sm">{inv.customerName}</strong>
                        <span className="text-xs font-mono font-bold text-indigo-900 block">فاتورة #{inv.id}</span>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        ✅ معتمد ضريبياً
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-100 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">التاريخ والوقت:</span>
                        <strong className="text-slate-700">{inv.date}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">قبل الضريبة:</span>
                        <strong className="text-slate-800">{(inv.subtotal - inv.discount).toFixed(2)} ج.م</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">ضريبة القيمة المضافة:</span>
                        <strong className="text-blue-700">{inv.tax.toFixed(2)} ج.م</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">الإجمالي الشامل:</span>
                        <strong className="text-emerald-700 font-black">{inv.total.toFixed(2)} ج.م</strong>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono break-all bg-white/70 p-2 rounded-lg border border-slate-100">
                      <span className="font-sans font-semibold text-slate-500 block">الرقم التعريفي (UUID):</span>
                      {uuid}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs md:text-sm">
              <thead className="bg-[#1a237e] text-white">
                <tr>
                  <th className="p-3 rounded-r-lg">رقم الفاتورة</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3">المبلغ بدون ضريبة</th>
                  <th className="p-3">ضريبة القيمة المضافة</th>
                  <th className="p-3">الإجمالي الشامل</th>
                  <th className="p-3">الرقم التعريفي (UUID)</th>
                  <th className="p-3 rounded-l-lg">الحالة الضريبية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appData.salesInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد فواتير مبيعات مسجلة بعد.
                    </td>
                  </tr>
                ) : (
                  appData.salesInvoices.map((inv) => {
                    const uuid = inv.eInvoiceUuid || `E-INV-2026-${String(inv.id).padStart(6, '0')}`;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-indigo-900">#{inv.id}</td>
                        <td className="p-3 font-mono">{inv.date}</td>
                        <td className="p-3 font-bold text-slate-800">{inv.customerName}</td>
                        <td className="p-3 font-mono">{(inv.subtotal - inv.discount).toFixed(2)} ج.م</td>
                        <td className="p-3 font-mono font-bold text-blue-700">{inv.tax.toFixed(2)} ج.م</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">{inv.total.toFixed(2)} ج.م</td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{uuid}</td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-1 rounded-full font-bold">
                            ✅ معتمد ضريبياً
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: VAT Return */}
      {activeTab === 'vatReturn' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base md:text-lg font-bold text-[#1a237e]">
              إقرار ضريبة القيمة المضافة (VAT Return Summary)
            </h3>
            <p className="text-xs text-slate-500">
              المعادلة الضريبية: ضريبة المخرجات (المبيعات) - ضريبة المدخلات (المشتريات) = صافي الضريبة واجبة السداد للمصلحة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200">
              <span className="text-xs text-blue-700 block mb-1 font-bold">1️⃣ ضريبة مبيعات مخرجات (Output VAT)</span>
              <strong className="text-blue-900 text-xl font-mono block">
                {totalSalesTax.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
              </strong>
              <span className="text-[11px] text-slate-500 mt-1 block">محصلة من العملاء عبر فواتير المبيعات</span>
            </div>

            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200">
              <span className="text-xs text-rose-700 block mb-1 font-bold">2️⃣ ضريبة مشتريات مدخلات قابلة للخصم (Input VAT)</span>
              <strong className="text-rose-900 text-xl font-mono block">
                {totalPurchasesTax.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
              </strong>
              <span className="text-[11px] text-slate-500 mt-1 block">مسددة للموردين عن فواتير المشتريات</span>
            </div>

            <div className="bg-[#1a237e] text-white p-5 rounded-2xl shadow-sm">
              <span className="text-xs text-blue-200 block mb-1 font-bold">3️⃣ صافي الضريبة واجبة التوريد للمصلحة</span>
              <strong className="text-[#ffd54f] text-2xl font-mono block font-black">
                {netVatPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
              </strong>
              <span className="text-[11px] text-blue-100 mt-1 block">
                {netVatPayable >= 0 ? 'مبلغ مستحق السداد لمصلحة الضرائب' : 'رصيد دائن مسترد للمنشأة'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Withholding Tax */}
      {activeTab === 'withholding' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base md:text-lg font-bold text-[#1a237e]">
              ضريبة الخصم والتحصيل من المنبع (Withholding Tax - النموذج 41)
            </h3>
            <p className="text-xs text-slate-500">
              حصر مبالغ الخصم من المنبع على فواتير المشتريات والتوريدات لإعداد كشوف الربع سنوية.
            </p>
          </div>

          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 max-w-xl">
            <span className="text-xs font-bold text-amber-800 block mb-1">
              إجمالي مبالغ الخصم والتحصيل المقتطعة ({appData.settings.withholdingTaxRate || 1}%)
            </span>
            <strong className="text-amber-950 text-2xl font-mono block">
              {totalWithholdingDeducted.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
            </strong>
            <p className="text-xs text-slate-600 mt-2">
              يتم توريد هذه المبالغ بموجب النموذج 41 ضريبة خصم وتحصيل لكل ربع سنة مالي.
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Configuration */}
      {activeTab === 'config' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base md:text-lg font-bold text-[#1a237e]">
              إعدادات البطاقة الضريبية ونقاط البيع (Tax Profile)
            </h3>
            <p className="text-xs text-slate-500">
              بيانات التسجيل الضريبي المطلوبة قانونياً للظهور على الفواتير والإيصالات والربط مع الخوادم.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم التسجيل الضريبي (Tax ID) *</label>
              <input
                type="text"
                value={config.taxRegNumber}
                onChange={(e) => setConfig({ ...config, taxRegNumber: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">رقم السجل التجاري (Commercial Reg) *</label>
              <input
                type="text"
                value={config.commercialRegNumber}
                onChange={(e) => setConfig({ ...config, commercialRegNumber: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">كود النشاط الضريبي (ISIC4 Code) *</label>
              <input
                type="text"
                value={config.activityCode}
                onChange={(e) => setConfig({ ...config, activityCode: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">الرقم التسلسلي لنقطة البيع (POS Serial)</label>
              <input
                type="text"
                value={config.posSerial}
                onChange={(e) => setConfig({ ...config, posSerial: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveConfig}
              className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm transition cursor-pointer shadow-sm"
            >
              💾 حفظ الإعدادات الضريبية
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
