// CLUBSA edge worker
// - مسارات /api/* تُمرَّر إلى خادم Replit (نفس الدومين، فتبقى الكوكيز وجلسة Clerk تعمل).
// - أي مسار آخر يخدمه Cloudflare من ملفات الواجهة الثابتة.

const DEFAULT_API_ORIGIN = "https://clubsa--saadalsubaei203.replit.app";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const origin = env.API_ORIGIN || DEFAULT_API_ORIGIN;
      const target = new URL(url.pathname + url.search, origin);
      const upstream = new Request(target.toString(), request);
      upstream.headers.set("x-forwarded-proto", "https");
      return fetch(upstream, { redirect: "manual" });
    }

    return env.ASSETS.fetch(request);
  },
};
