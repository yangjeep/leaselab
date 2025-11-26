import type { ActionFunctionArgs, MetaFunction } from '@remix-run/cloudflare';
import { json, redirect } from '@remix-run/cloudflare';
import { Form, Link, useActionData, useNavigation } from '@remix-run/react';
import { LoginSchema } from '~/shared/config';
import { login } from '~/lib/auth.server';
import { createSessionCookieHeader } from '~/lib/session-cookie.server';
import { getSiteId } from '~/lib/site.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Sign In - LeaseLab.io' }];
};

export async function action({ request, context }: ActionFunctionArgs) {
  const db = context.cloudflare.env.DB;
  const secret = context.cloudflare.env.SESSION_SECRET as string;
  const siteId = getSiteId(request);
  const workerEnv = {
    WORKER_URL: context.cloudflare.env.WORKER_URL,
    WORKER_INTERNAL_KEY: context.cloudflare.env.WORKER_INTERNAL_KEY,
  };

  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const validationResult = LoginSchema.safeParse({ email, password });
  if (!validationResult.success) {
    return json(
      { error: 'Invalid email or password format' },
      { status: 400 }
    );
  }

  const result = await login(db, secret, siteId, email, password, workerEnv);
  if (!result) {
    return json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  }

  const setCookie = createSessionCookieHeader(result.sessionId);
  return redirect('/admin', {
    headers: {
      'Set-Cookie': setCookie,
    },
  });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white px-8 py-10 shadow-lg rounded-xl">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Sign in to LeaseLab.io
          </h1>

          <Form method="post" className="space-y-6">
            {actionData?.error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {actionData.error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}
