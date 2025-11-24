import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

import { getSiteId } from "~/lib/site.server";
import { getOptionalUser } from "~/lib/auth.server";

export const meta: MetaFunction = () => {
  return [
    { title: "LeaseLab.io - Property Management Platform" },
    { name: "description", content: "AI-powered rental property operations management" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const siteId = getSiteId(request);
  const user = await getOptionalUser(request, context.cloudflare.env.DB, context.cloudflare.env.KV, siteId);
  return null;
}

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900">
          Lease<span className="text-indigo-600">Lab</span>.io
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          AI-powered property management operations
        </p>
        <div className="mt-8">
          <Link
            to="/login"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
