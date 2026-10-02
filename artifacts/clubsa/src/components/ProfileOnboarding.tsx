import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { ProfileInput } from '@workspace/api-client-react';
import { REGIONS } from '@/data';
import {
  Form,
} from '@/components/ui/form';

const onboardingSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل')
      .max(24, 'اسم المستخدم يجب ألا يتجاوز 24 حرفاً')
      .regex(/^[a-zA-Z0-9_]+$/, 'استخدم الحروف الإنجليزية والأرقام والشرطة السفلية فقط'),
    name: z.string().trim().min(2, 'الاسم يجب أن يتكون من حرفين على الأقل').max(60),
    role: z.enum(['president', 'scout', 'player']),
    region: z.string().trim().min(1).max(80),
    eaId: z.string().trim().min(3, 'EA ID يجب أن يتكون من 3 أحرف على الأقل').max(32),
    isFreeAgent: z.boolean(),
    clubName: z.string().trim().max(60),
    referralCode: z.string().trim().max(32),
  })
  .superRefine((values, context) => {
    const needsClub =
      values.role === 'president' ||
      values.role === 'scout' ||
      (values.role === 'player' && !values.isFreeAgent);
    if (needsClub && values.clubName.length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clubName'],
        message: 'أدخل اسم النادي',
      });
    }
  });

type OnboardingFields = z.infer<typeof onboardingSchema>;

function errorText(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = error.data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = data.error;
      if (typeof message === 'string') {
        if (message === 'Username already taken') return 'اسم المستخدم مستخدم بالفعل';
        if (message === 'Club not found') return 'لم نعثر على النادي بهذا الاسم';
        if (message === 'Profile already exists') return 'الملف موجود بالفعل، حدّث الصفحة للمتابعة';
        if (message === 'Only approved email domains can register') {
          return 'نطاق البريد الإلكتروني هذا غير مدعوم للتسجيل';
        }
        return message;
      }
    }
  }
  return 'تعذر حفظ الملف الشخصي. تحقق من البيانات وحاول مرة أخرى.';
}

export default function ProfileOnboarding({
  email,
  suggestedName,
  suggestedUsername,
  submitting,
  onSubmitProfile,
  onSignOut,
}: {
  email: string;
  suggestedName: string;
  suggestedUsername: string;
  submitting: boolean;
  onSubmitProfile: (data: ProfileInput) => Promise<unknown>;
  onSignOut: () => void;
}) {
  const [submitError, setSubmitError] = useState('');
  const form = useForm<OnboardingFields>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: suggestedUsername
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 24),
      name: suggestedName,
      role: 'player',
      region: REGIONS[0],
      eaId: '',
      isFreeAgent: false,
      clubName: '',
      referralCode: new URLSearchParams(window.location.search).get('ref') ?? '',
    },
  });

  const role = form.watch('role');
  const isFreeAgent = form.watch('isFreeAgent');

  const handleSubmit = async (values: OnboardingFields) => {
    setSubmitError('');
    try {
      await onSubmitProfile({
        username: values.username.trim(),
        name: values.name.trim(),
        role: values.role,
        region: values.region.trim(),
        eaId: values.eaId.trim(),
        isFreeAgent: values.role === 'player' && values.isFreeAgent,
        clubName: values.clubName.trim() || null,
        referralCode: values.referralCode.trim() || null,
      });
    } catch (error) {
      setSubmitError(errorText(error));
    }
  };

  const fieldClass =
    'w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-cyan-400';

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/95 px-4 py-8 text-slate-100 backdrop-blur-sm"
      data-testid="profile-onboarding"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold text-cyan-300">CLUBSA</p>
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: 'Cairo, sans-serif' }}>
              أكمل ملفك للبدء
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              اختر اسم المستخدم وأدخل بياناتك حتى يظهر ملفك للاعبين وتتمكن من استخدام الأصدقاء والرسائل.
            </p>
            <p className="mt-2 text-xs leading-5 text-amber-300/90">
              حسابات CLUBSA القديمة المحفوظة في هذا المتصفح لا تنتقل تلقائياً إلى Clerk. استخدم حساب Clerk جديداً وأكمل ملفك هنا.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            data-testid="button-onboarding-sign-out"
          >
            تسجيل الخروج
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5">
          <p className="text-[11px] text-slate-500">البريد المرتبط بحساب Clerk</p>
          <p className="mt-0.5 break-all text-sm font-semibold text-slate-200" data-testid="text-onboarding-email">
            {email}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">اسم المستخدم</span>
                <input
                  {...form.register('username')}
                  autoComplete="username"
                  maxLength={24}
                  className={fieldClass}
                  placeholder="player_01"
                  data-testid="input-profile-username"
                />
                {form.formState.errors.username && (
                  <span className="mt-1 block text-xs text-red-300">
                    {form.formState.errors.username.message}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">الاسم الظاهر</span>
                <input
                  {...form.register('name')}
                  autoComplete="name"
                  maxLength={60}
                  className={fieldClass}
                  data-testid="input-profile-name"
                />
                {form.formState.errors.name && (
                  <span className="mt-1 block text-xs text-red-300">
                    {form.formState.errors.name.message}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">نوع الحساب</span>
                <select {...form.register('role')} className={fieldClass} data-testid="select-profile-role">
                  <option value="player">لاعب</option>
                  <option value="scout">كشّاف</option>
                  <option value="president">رئيس نادٍ</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">المنطقة</span>
                <select {...form.register('region')} className={fieldClass} data-testid="select-profile-region">
                  {REGIONS.map((regionName) => (
                    <option key={regionName} value={regionName}>{regionName}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">EA ID</span>
                <input
                  {...form.register('eaId')}
                  autoComplete="off"
                  maxLength={32}
                  className={fieldClass}
                  data-testid="input-profile-ea-id"
                />
                {form.formState.errors.eaId && (
                  <span className="mt-1 block text-xs text-red-300">
                    {form.formState.errors.eaId.message}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">رمز الإحالة (اختياري)</span>
                <input
                  {...form.register('referralCode')}
                  maxLength={32}
                  className={fieldClass}
                  data-testid="input-profile-referral"
                />
              </label>
            </div>

            {role === 'player' && (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  {...form.register('isFreeAgent')}
                  className="h-4 w-4 accent-cyan-400"
                  data-testid="checkbox-profile-free-agent"
                />
                لاعب حر (Free Agent)
              </label>
            )}

            {(role === 'president' || role === 'scout' || (role === 'player' && !isFreeAgent)) && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">
                  {role === 'president'
                    ? 'اسم النادي الجديد'
                    : role === 'scout'
                      ? 'اسم النادي الذي تعمل معه'
                      : 'النادي المرشح له'}
                </span>
                <input
                  {...form.register('clubName')}
                  maxLength={60}
                  className={fieldClass}
                  data-testid="input-profile-club"
                />
                {role === 'scout' && (
                  <span className="mt-1 block text-xs text-amber-300">
                    يجب أن يطابق الاسم نادياً موجوداً في CLUBSA.
                  </span>
                )}
                {form.formState.errors.clubName && (
                  <span className="mt-1 block text-xs text-red-300">
                    {form.formState.errors.clubName.message}
                  </span>
                )}
              </label>
            )}

            {submitError && (
              <p className="rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-200" role="alert" data-testid="status-profile-error">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || form.formState.isSubmitting}
              className="w-full rounded-lg bg-cyan-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="button-complete-profile"
            >
              {submitting || form.formState.isSubmitting ? 'جارٍ حفظ الملف...' : 'حفظ الملف والمتابعة'}
            </button>
          </form>
        </Form>
      </div>
    </div>
  );
}