import type { NextConfig } from "next";

// Applied to every response. `Strict-Transport-Security` is safe to send even over plain HTTP in
// dev (browsers only honor it on HTTPS responses), so it doesn't need a NODE_ENV guard.
//
// X-Frame-Options is SAMEORIGIN, not DENY — the document detail page embeds its own generated PDF
// in an <iframe src="/api/documents/[id]/pdf">, which is same-origin. DENY blocks ALL framing,
// including that same-origin case, and breaks the PDF preview outright ("localhost refused to
// connect" in the iframe, even though the underlying request succeeds — the browser refuses to
// render the response inside a frame at all). SAMEORIGIN still blocks the actual threat this header
// exists for (another site framing our login/app pages for clickjacking).
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle (.next/standalone) with only the production deps it
  // actually needs — this is what the Dockerfile copies, instead of shipping the full node_modules.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
