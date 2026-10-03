import { StrictMode, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignIn, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Link, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import App from "./App.tsx";
import SignUpWizard from "./components/SignUpWizard";
import { queryClient } from "./lib/queryClient";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBasePath(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "none" as const,
  },
  variables: {
    colorPrimary: "#2563eb",
    colorForeground: "#e2e8f0",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#f87171",
    colorBackground: "#0f172a",
    colorInput: "#1e293b",
    colorInputForeground: "#f1f5f9",
    colorNeutral: "#334155",
    fontFamily: "Tajawal, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 !shadow-none overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    // إخفاء الزوائد: الشعار، أزرار الشبكات الاجتماعية، الفاصل، وتذييل Clerk
    logoBox: "!hidden",
    socialButtonsRoot: "!hidden",
    dividerRow: "!hidden",
    footer: "!hidden",
    headerTitle: "text-lg font-extrabold text-white",
    headerSubtitle: "text-xs text-slate-400",
    formFieldLabel: "text-xs text-slate-400",
    formFieldInput:
      "bg-slate-800/60 border border-slate-700 text-slate-100 focus:border-cyan-500",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-500 text-white font-bold",
    formFieldSuccessText: "text-emerald-300",
    formFieldErrorText: "text-red-400",
    alertText: "text-red-300",
    alert: "bg-red-950 border-red-800",
    identityPreviewEditButton: "text-cyan-300",
    otpCodeFieldInput: "bg-slate-800 border-slate-700 text-slate-100",
    formResendCodeLink: "text-cyan-300",
    backLink: "text-cyan-300",
  },
};

function AuthShell({
  children,
  switchText,
  switchLabel,
  switchHref,
}: {
  children: ReactNode;
  switchText: string;
  switchLabel: string;
  switchHref: string;
}) {
  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 px-4 py-8"
      style={{ fontFamily: "Tajawal, sans-serif" }}
    >
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-extrabold text-slate-950">
          S
        </div>
        <span className="font-extrabold tracking-tight text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
          CLUBSA
        </span>
      </div>
      {children}
      <p className="mt-4 text-xs text-slate-400">
        {switchText}{" "}
        <Link href={switchHref} className="font-bold text-cyan-400 hover:text-cyan-300">
          {switchLabel}
        </Link>
      </p>
      <Link href="/" className="mt-2 text-xs text-slate-500 hover:text-slate-300">
        العودة إلى الموقع
      </Link>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthShell
      switchText="ليس لديك حساب؟"
      switchLabel="إنشاء حساب جديد"
      switchHref="/sign-up"
    >
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </AuthShell>
  );
}

function SignUpPage() {
  return <SignUpWizard />;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        previousUserId.current !== undefined &&
        previousUserId.current !== userId
      ) {
        client.clear();
      }
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);

  return null;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        locale: "ar-SA",
        formFieldLabel__emailAddress: "البريد الإلكتروني",
        formFieldLabel__password: "كلمة المرور",
        formButtonPrimary: "متابعة",
        signIn: {
          start: {
            title: "تسجيل الدخول إلى CLUBSA",
            subtitle: "أدخل لحسابك وابدأ التواصل مع اللاعبين",
          },
        },
        signUp: {
          start: {
            title: "إنشاء حساب جديد في CLUBSA",
            subtitle: "أنشئ حسابك للعثور على لاعبين والتواصل معهم",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBasePath(to))}
      routerReplace={(to) => setLocation(stripBasePath(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route component={App} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WouterRouter base={basePath}>
      <ClerkRoutes />
    </WouterRouter>
  </StrictMode>,
);
