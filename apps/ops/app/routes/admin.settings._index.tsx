import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { redirect } from '@remix-run/cloudflare';

export async function loader({}: LoaderFunctionArgs) {
  return redirect('/admin/settings/profile');
}

