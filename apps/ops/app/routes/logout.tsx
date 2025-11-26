import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { redirect } from '@remix-run/cloudflare';
import { createLogoutCookie } from '~/lib/auth.server';

export async function action({ request }: ActionFunctionArgs) {
  return redirect('/login', {
    headers: {
      'Set-Cookie': createLogoutCookie(),
    },
  });
}

export async function loader() {
  return redirect('/login');
}
