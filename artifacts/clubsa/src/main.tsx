import { StrictMode, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import App from "./App.tsx";
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
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#06b6d4",
    colorForeground: "#e2e8f0",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#f87171",
    colorBackground: "#0f172a",
    colorInput: "#1e293b",
    colorInputForeground: "#f8fafc",
    colorNeutral: "#334155",
    fontFamily: "Tajawal, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-slate-900 rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-100 font-bold",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-slate-100",
    formFieldLabel: "text-slate-300",
    footerActionLink: "text-cyan-300",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-cyan-300",
    formFieldSuccessText: "text-emerald-300",
    alertText: "text-red-300",
    logoBox: "mx-auto",
    logoImage: "max-h-12",
    socialButtonsBlockButton:
      "border-slate-700 bg-slate-800 hover:bg-slate-700",
    formButtonPrimary: "bg-cyan-600 hover:bg-cyan-500 text-white",
    formFieldInput: "bg-slate-800 border-slate-700 text-slate-100",
    footerAction: "border-slate-800",
    dividerLine: "bg-slate-700",
    alert: "bg-red-950 border-red-800",
    otpCodeFieldInput: "bg-slate-800 border-slate-700 text-slate-100",
    formFieldRow: "text-slate-300",
    main: "text-slate-100",
  },
};

function SignInPage() {
  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-8"
    >
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-8"
    >
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
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
        signIn: {
          start: {
            title: "مرحباً بعودتك",
            subtitle: "سجّل الدخول إلى حسابك في CLUBSA",
          },
        },
        signUp: {
          start: {
            title: "انضم إلى CLUBSA",
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
