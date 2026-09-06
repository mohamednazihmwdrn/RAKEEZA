import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, Share2, CheckCircle2, X } from 'lucide-react';

interface Props {
  variant?: 'header' | 'login' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General instructions modal if browser doesn't expose beforeinstallprompt yet
      setShowIOSGuide(true);
    }
  };

  if (variant === 'login') {
    return (
      <>
        <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 text-right ${className}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#1a237e] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                  تشغيل المنظومة كتطبيق موبايل
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  تثبيت فوري على هاتفك مع تحديثات تلقائية مستمرة من السحابة
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="bg-[#1a237e] hover:bg-[#0d47a1] active:bg-[#082a61] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تثبيت التطبيق</span>
            </button>
          </div>
        </div>

        {/* Instructions Modal for Mobile / iOS / Chrome */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-right space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-[#1a237e] flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  <span>تثبيت تطبيق ركيزة على الموبايل</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                <p className="font-semibold text-slate-900 leading-relaxed">
                  يمكنك تشغيل هذا الرابط كتطبيق أصيل كامل على هاتفك المحمول (أندرويد أو آيفون)، وبمجرد رفع أي تحديث على GitHub سيصل هاتفك فوراً:
                </p>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-[#1a237e] flex items-center gap-1.5">
                    <span>📱 لمستخدمي هواتف أندرويد (Google Chrome):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 pr-1">
                    <li>اضغط على زر القائمة (الثلاث نقاط <strong>⋮</strong>) بأعلى متصفح كروم.</li>
                    <li>اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«الإضافة إلى الشاشة الرئيسية»</strong>.</li>
                    <li>سيظهر تطبيق ركيزة بأيقونته على شاشتك الرئيسية ويعمل مثل أي تطبيق من متجر بلاي.</li>
                  </ol>
                </div>

                <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-blue-700" />
                    <span>🍏 لمستخدمي آيفون / آيباد (Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700 pr-1">
                    <li>اضغط على زر <strong>المشاركة (Share ⬆️)</strong> في شريط متصفح سفاري بالأسفل.</li>
                    <li>مرر للأسفل واضغط على <strong>«إضافة إلى الصفحة الرئيسية (Add to Home Screen)»</strong>.</li>
                    <li>اضغط <strong>إضافة (Add)</strong> بالأعلى لتجد التطبيق على شاشة هاتفك.</li>
                  </ol>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>تلقي التحديثات: كلما رفعت كوداً جديداً على GitHub، يُحدَّث التطبيق تلقائياً!</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-[#1a237e] py-2.5 text-xs font-bold text-white hover:bg-[#0d47a1] transition cursor-pointer"
              >
                فهمت ذلك، إغلاق
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Header Variant
  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer ${className}`}
        title="تثبيت المنظومة كتطبيق على هاتفك المحمول"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">تثبيت التطبيق 📱</span>
        <span className="sm:hidden">تثبيت</span>
      </button>

      {/* Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#1a237e] flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span>تثبيت تطبيق ركيزة على هاتفك</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-[#1a237e]">
                  📱 هواتف أندرويد (Google Chrome):
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  اضغط على خيارات المتصفح (<strong>⋮</strong>) ثم اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                </p>
              </div>

              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2">
                <div className="font-bold text-blue-900">
                  🍏 هواتف آيفون (Safari):
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  اضغط زر <strong>مشاركة (Share ⬆️)</strong> في سفاري ثم اضغط <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                </p>
              </div>

              <div className="p-2.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>أي تحديث ترفعه على GitHub سينزل تلقائياً على هاتف العميل بدون الحاجة لإعادة التثبيت!</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-[#1a237e] py-2.5 text-xs font-bold text-white hover:bg-[#0d47a1] transition cursor-pointer"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
