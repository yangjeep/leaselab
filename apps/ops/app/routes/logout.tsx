import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { redirect } from '@remix-run/cloudflare';
import { logout, createLogoutCookie } from '~/lib/auth.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const kv = context.cloudflare.env.SESSION_KV;

  await logout(kv, request);

  return redirect('/login', {
    headers: {
      'Set-Cookie': createLogoutCookie(),
    },
  });
}

export async function loader() {
  return redirect('/login');
}
