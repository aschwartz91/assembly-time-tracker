// [ASSEMBLY] Single source of truth for server-side Assembly API access.
// Do not call assemblyApi() elsewhere — always go through getAssembly().
// See AGENTS.md § Fetch data.

import { assemblyApi } from '@assembly-js/node-sdk';

type SearchParamsInput =
  | { token?: string }
  | URLSearchParams
  | Promise<{ token?: string }>;

function extractToken(params: { token?: string } | URLSearchParams): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get('token') ?? undefined;
  }
  return params.token;
}

export async function getAssembly(searchParams: SearchParamsInput) {
  const apiKey = process.env.ASSEMBLY_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLY_API_KEY environment variable is not set');
  }

  const resolved = await Promise.resolve(searchParams);
  const token = extractToken(resolved as { token?: string } | URLSearchParams);

  return assemblyApi({ apiKey, token });
}
