// [ASSEMBLY] Do not remove or modify. Handles iframe CSP for the Assembly parent shell.
// The frame-ancestors allowlist combines a static set of Assembly-owned domains with
// the current workspace's custom portalUrl, resolved per request via @assembly-js/node-sdk
// and cached by token for the token's 5-minute lifetime. See AGENTS.md § Hard rules.
import { NextRequest, NextResponse } from "next/server";
import { getAssembly } from "@/app/api/_assembly/server";

// Assembly-owned parent domains. Kept in sync with
// webapp/src/constants/hostnameConsts.ts in the assemblycom/core monorepo.
const STATIC_FRAME_ANCESTORS = [
  "'self'",
  "https://*.assembly.com",
  "https://*.assembly-staging.com",
  "https://*.myassembly.com",
  "https://*.myassembly-staging.com",
  "https://*.copilot.app",
  "https://*.copilot-staging.app",
];

const TOKEN_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2_000;

// Per-instance cache: session tokens live 5 minutes and are opaque identifiers,
// so keying by token is safe. Each serverless instance maintains its own cache;
// the cold-start cost is one retrieveWorkspace() call per new token.
const portalUrlCache = new Map<
  string,
  { portalUrl: string | null; expiresAt: number }
>();

async function resolvePortalUrl(token: string): Promise<string | null> {
  const now = Date.now();
  const cached = portalUrlCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached.portalUrl;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const assembly = await getAssembly({ token });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("retrieveWorkspace timeout")),
        FETCH_TIMEOUT_MS,
      );
    });
    const workspace = await Promise.race([
      assembly.retrieveWorkspace(),
      timeoutPromise,
    ]);
    clearTimeout(timeoutId);
    // workspace.portalUrl is a bare hostname (e.g. "portal.acme.com") per the
    // Assembly Node SDK — no protocol prefix. Strip defensively in case the
    // SDK contract ever changes, to avoid producing "https://https://..." in
    // the frame-ancestors header.
    const rawPortalUrl = workspace.portalUrl ?? null;
    const portalUrl = rawPortalUrl
      ? rawPortalUrl.replace(/^https?:\/\//, "")
      : null;
    portalUrlCache.set(token, { portalUrl, expiresAt: now + TOKEN_TTL_MS });
    return portalUrl;
  } catch {
    clearTimeout(timeoutId);
    // Never block the request on CSP resolution — fall back to the static list.
    return null;
  }
}

export async function middleware(
  request: NextRequest,
): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  const frameAncestors = [...STATIC_FRAME_ANCESTORS];

  if (token) {
    const portalUrl = await resolvePortalUrl(token);
    if (portalUrl) {
      frameAncestors.push(`https://${portalUrl}`);
    }
  }

  const response = NextResponse.next();
  response.headers.set(
    "Content-Security-Policy",
    `frame-ancestors ${frameAncestors.join(" ")}`,
  );
  return response;
}

export const config = {
  // nodejs runtime is required to call the Node SDK (retrieveWorkspace) from middleware.
  // Stable in Next.js 15.2+.
  runtime: "nodejs",
  matcher: [
    /*
     * Match all request paths except:
     *  - _next/static (static files)
     *  - _next/image (image optimization)
     *  - favicon.ico, sitemap.xml, robots.txt (static metadata)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
  ],
};
