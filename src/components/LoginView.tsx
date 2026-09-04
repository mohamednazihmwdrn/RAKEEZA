import React, { useState } from 'react';
import {
  Building2,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight,
  ShoppingCart,
  ShoppingBag,
  Package,
  CircleDollarSign,
  BarChart3,
  Users2,
  Cloud,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import { loginToCloud } from '../services/cloudApi';
import { TenantCompany, User as AppUser } from '../types';

interface LoginViewProps {
  onLoginSuccess: (session: {
    user: AppUser;
    company: TenantCompany;
    subscription: any;
  }) => void;
  onOpenOwnerPanelDirectly?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenOwnerPanelDirectly,
}) => {
  // Login Form States
  const [companyId, setCompanyId] = useState<string>('COMP-000001');
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'company' | 'owner'>('company');

  // Owner PIN Login
  const [ownerUsername, setOwnerUsername] = useState<string>('owner');
  const [ownerPassword, setOwnerPassword] = useState<string>('123');

  // Features list mirroring the official RAKEEZA identity
  const systemFeatures = [
    { icon: ShoppingCart, label: 'المبيعات', color: 'from-blue-500 to-indigo-600' },
    { icon: ShoppingBag, label: 'المشتريات', color: 'from-amber-500 to-orange-600' },
    { icon: Package, label: 'المخازن', color: 'from-emerald-500 to-teal-600' },
    { icon: CircleDollarSign, label: 'المحاسبة', color: 'from-violet-500 to-purple-600' },
    { icon: BarChart3, label: 'التقارير', color: 'from-rose-500 to-red-600' },
    { icon: Users2, label: 'متعدد الشركات', color: 'from-cyan-500 to-blue-600' },
    { icon: Cloud, label: 'نظام سحابي', color: 'from-sky-500 to-indigo-600' },
  ];

  const handleCompanyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!companyId.trim()) {
      setErrorMessage('يرجى إدخال كود الشركة (Company ID)');
      return;
    }
    if (!username.trim()) {
      setErrorMessage('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password) {
      setErrorMessage('يرجى إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginToCloud(companyId.trim(), username.trim(), password);
      if (res.success && res.user && res.company) {
        onLoginSuccess({
          user: res.user,
          company: res.company,
          subscription: res.subscription,
        });
      } else {
        setErrorMessage(res.error || 'فشل تسجيل الدخول. يرجى التحقق من البيانات.');
      }
    } catch {
      setErrorMessage('حدث خطأ أثناء الاتصال بالخادم السحابي.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!ownerUsername.trim() || !ownerPassword) {
      setErrorMessage('يرجى إدخال اسم مستخدم المالك وكلمة المرور');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginToCloud('OWNER', ownerUsername.trim(), ownerPassword);
      if (res.success && res.user && res.company) {
        onLoginSuccess({
          user: res.user,
          company: res.company,
          subscription: res.subscription,
        });
      } else {
        setErrorMessage(res.error || 'بيانات اعتماد مالك المنظومة غير صحيحة.');
      }
    } catch {
      setErrorMessage('فشل الاتصال بالسيرفر.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick preset buttons for instant ease of access
  const handleSelectQuickCompany = (cId: string, uName: string, pass: string) => {
    setCompanyId(cId);
    setUsername(uName);
    setPassword(pass);
    setErrorMessage(null);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col justify-between selection:bg-blue-500 selection:text-white"
    >
      {/* Background Decorative Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 py-4 sm:py-6 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-blue-400">
                R
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-wider text-white">
                RAKEEZA
              </span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Cloud ERP
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              المنظومة السحابية المتكاملة لإدارة المنشآت والشركات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'company' ? 'owner' : 'company')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'owner'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>{activeTab === 'owner' ? 'دخول الشركات' : 'منطقة المالك (Owner)'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Right Column: Hero Branding & 7 Pillars (Visible on desktop/tablet, concise on mobile) */}
          <div className="lg:col-span-6 space-y-6 text-right order-2 lg:order-1">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs sm:text-sm font-medium">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span>كل أعمالك في نظام ذكي واحد • One Smart ERP System</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                منظومة <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">RAKEEZA</span> السحابية
              </h1>
              <p className="text-lg sm:text-xl font-medium text-amber-300/90">
                إدارة شركتك أصبحت أسهل
              </p>
              <p className="text-sm text-slate-300 leading-relaxed max-w-md">
                نظام إدارة موارد المؤسسات السحابي المتكامل متعدد الشركات. عزل حقيقي للبيانات، صلاحيات دقيقة للمستخدمين، وتوافق تام مع الفاتورة الإلكترونية والمتاجر الرقمية.
              </p>
            </div>

            {/* Visual Pillars Badge Grid (7 pillars from the user's RAKEEZA logo/artwork) */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>الوحدات الأساسية المتكاملة في المنظومة:</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {systemFeatures.map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shadow-xs hover:border-blue-500/40 transition-colors"
                    >
                      <div className={`w-5 h-5 rounded-md bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white shrink-0`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-medium text-slate-200">{feat.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Demo Credentials Info for Testing & Evaluation */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 text-xs text-slate-300 space-y-2.5">
              <div className="flex items-center justify-between font-semibold text-slate-200 border-b border-slate-700/50 pb-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>شركات تجريبية مهيأة في قاعدة البيانات السحابية:</span>
                </span>
                <span className="text-[11px] text-blue-400">انقر للتبديل السريع</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectQuickCompany('COMP-000001', 'admin', 'admin123')}
                  className="text-right p-2 rounded-lg bg-slate-900/60 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-500/50 transition-all text-xs"
                >
                  <p className="font-bold text-white">شركة ركيزة (HQ)</p>
                  <p className="text-[11px] text-slate-400">كود: <span className="font-mono text-blue-300">COMP-000001</span></p>
                  <p className="text-[10px] text-slate-500">مستخدم: admin | كلمة سر: admin123</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectQuickCompany('COMP-000002', 'alamal_admin', '123')}
                  className="text-right p-2 rounded-lg bg-slate-900/60 hover:bg-emerald-900/30 border border-slate-700 hover:border-emerald-500/50 transition-all text-xs"
                >
                  <p className="font-bold text-white">مؤسسة الأمل للتوريدات</p>
                  <p className="text-[11px] text-slate-400">كود: <span className="font-mono text-emerald-300">COMP-000002</span></p>
                  <p className="text-[10px] text-slate-500">مستخدم: alamal_admin | كلمة سر: 123</p>
                </button>
              </div>
            </div>
          </div>

          {/* Left Column: Form Card */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="w-full max-w-md mx-auto bg-slate-800/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl shadow-black/50">
              
              {/* Form Title & Subtitle */}
              <div className="text-center mb-6 space-y-1">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/30 mb-2">
                  {activeTab === 'company' ? (
                    <Building2 className="w-7 h-7 text-blue-400" />
                  ) : (
                    <KeyRound className="w-7 h-7 text-amber-400" />
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {activeTab === 'company' ? 'تسجيل الدخول إلى منظومتك' : 'تسجيل دخول مالك المنظومة'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {activeTab === 'company'
                    ? 'أدخل كود الشركة وبيانات حسابك المعتمد'
                    : 'لوحة التحكم والسيطرة المركزية لإدارة اشتراكات السحابة'}
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {activeTab === 'company' ? (
                /* COMPANY LOGIN FORM */
                <form onSubmit={handleCompanyLogin} className="space-y-4">
                  {/* Field 1: Company ID */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 text-right">
                      كود الشركة / Company ID <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value.toUpperCase())}
                        placeholder="مثال: COMP-000001 أو RKZ-01"
                        dir="ltr"
                        className="w-full pl-3 pr-11 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left uppercase"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 text-right">
                      كود المعرّف الخاص بشركتك المسجل في قاعدة البيانات
                    </p>
                  </div>

                  {/* Field 2: Username */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 text-right">
                      اسم المستخدم (Username) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="أدخل اسم المستخدم"
                        dir="ltr"
                        className="w-full pl-3 pr-11 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Field 3: Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">حساس لحالة الأحرف</span>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200 text-right">
                        كلمة المرور (Password) <span className="text-rose-400">*</span>
                      </label>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        dir="ltr"
                        className="w-full pl-11 pr-11 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left font-mono"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Assistance */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded-sm bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                      />
                      <span>تذكر بيانات الدخول</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => alert('لإعادة تعيين كلمة المرور أو الاستفسار عن كود الشركة، يرجى التواصل مع مدير النظام بشركتك أو الدعم الفني لمنظومة ركيزة: 01029190615')}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>جاري التحقق والمصادقة السحابية...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          <span>تسجيل الدخول إلى المنظومة</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* OWNER LOGIN FORM */
                <form onSubmit={handleOwnerLogin} className="space-y-4">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      منطقة مالك المنظومة السحابية (Owner Panel) مخصصة فقط لإدارة الشركات والاشتراكات والمصادقات المركزية.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 text-right">
                      اسم مستخدم المالك (Owner Username)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={ownerUsername}
                        onChange={(e) => setOwnerUsername(e.target.value)}
                        placeholder="owner أو rakeeza_admin"
                        dir="ltr"
                        className="w-full pl-3 pr-11 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-left"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5 text-right">
                      كلمة المرور أو PIN المالك
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="123"
                        dir="ltr"
                        className="w-full pl-11 pr-11 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-left font-mono"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                          <span>جاري التحقق من صلاحيات المالك...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-5 h-5" />
                          <span>دخول لوحة المالك (Owner Control)</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Footer Status / Assurance */}
              <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تشفير بيانات سحابي 256-bit</span>
                </span>
                <span>الإصدار 8.4 Enterprise</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-slate-800 text-xs text-slate-400">
        <p>
          جميع الحقوق محفوظة لمنظومة <span className="text-white font-semibold">RAKEEZA | ركيزة</span> © {new Date().getFullYear()} • حلول الإدارة السحابية المتقدمة
        </p>
      </footer>
    </div>
  );
};
