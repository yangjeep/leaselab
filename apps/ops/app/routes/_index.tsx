import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Rental Ops - Property Management Platform" },
    { name: "description", content: "AI-powered rental property operations management" },
  ];
};

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900">
          Rental <span className="text-indigo-600">Ops</span>
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          AI-powered property management operations
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            to="/admin"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Admin Dashboard
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
