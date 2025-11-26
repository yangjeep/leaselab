import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { Link, useLoaderData } from '@remix-run/react';
import { requireUser } from '~/lib/auth.server';
import { getSiteId } from '~/lib/site.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
    await requireUser(request, context);
    const db = context.cloudflare.env.DB;
    const siteId = getSiteId(request);

    // Fetch site API tokens for this site
    const tokens = await db
        .prepare(
            `SELECT 
        id,
        token_name,
        is_active,
        last_used_at,
        created_at,
        expires_at
      FROM site_api_tokens 
      WHERE site_id = ?
      ORDER BY created_at DESC`
        )
        .bind(siteId)
        .all();

    // Fetch site config
    const siteConfig = await db
        .prepare('SELECT site_name FROM site_configs WHERE site_id = ?')
        .bind(siteId)
        .first();

    return json({
        tokens: tokens.results || [],
        siteName: siteConfig?.site_name || siteId,
        siteId,
    });
}

export default function SiteTokens() {
    const { tokens, siteName, siteId } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Site API Tokens</h1>
                    <p className="text-sm opacity-70 mt-1">
                        Manage API tokens for {siteName} ({siteId})
                    </p>
                </div>
            </div>

            <div className="card p-6 space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        How to Generate a New Token
                    </h3>
                    <p className="text-sm opacity-80 mb-2">Run this command in your terminal:</p>
                    <code className="block bg-black/20 p-3 rounded text-sm font-mono">
                        cd apps/ops && node scripts/generate-token.js {siteId} "Token Name"
                    </code>
                </div>

                {tokens.length === 0 ? (
                    <div className="text-center py-12 opacity-70">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12 mx-auto mb-4 opacity-50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                            />
                        </svg>
                        <h3 className="text-lg font-semibold mb-2">No API tokens yet</h3>
                        <p className="text-sm">
                            Generate a token using the command above to allow sites to access this backend.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tokens.map((token: any) => (
                            <div
                                key={token.id}
                                className="border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold">{token.token_name}</h3>
                                            {token.is_active ? (
                                                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm opacity-70">
                                            <div>
                                                <span className="text-xs opacity-60">Created:</span>{' '}
                                                {new Date(token.created_at).toLocaleDateString()}
                                            </div>
                                            {token.last_used_at && (
                                                <div>
                                                    <span className="text-xs opacity-60">Last used:</span>{' '}
                                                    {new Date(token.last_used_at).toLocaleDateString()}
                                                </div>
                                            )}
                                            {token.expires_at && (
                                                <div>
                                                    <span className="text-xs opacity-60">Expires:</span>{' '}
                                                    {new Date(token.expires_at).toLocaleDateString()}
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-xs opacity-60">Token ID:</span>{' '}
                                                <code className="text-xs">{token.id}</code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="card p-6">
                <h2 className="font-semibold mb-3">About API Tokens</h2>
                <ul className="space-y-2 text-sm opacity-80">
                    <li className="flex items-start gap-2">
                        <span className="opacity-50">•</span>
                        <span>
                            API tokens allow your frontend site to securely access backend APIs
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="opacity-50">•</span>
                        <span>Tokens are hashed (SHA-256) in the database for security</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="opacity-50">•</span>
                        <span>
                            The actual token is only shown once during generation - save it securely
                        </span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="opacity-50">•</span>
                        <span>Use tokens in the Authorization header: Bearer {'<token>'}</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
