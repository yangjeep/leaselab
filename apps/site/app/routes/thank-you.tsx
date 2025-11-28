import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Thank You - Application Submitted" },
    { name: "description", content: "Your rental application has been submitted successfully" },
  ];
};

export default function ThankYou() {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold">Thank You!</h1>
          <p className="text-lg opacity-90">
            Your application has been submitted successfully. We will review your
            information and get back to you soon.
          </p>
          <p className="text-sm opacity-70">
            You should receive a confirmation email shortly. If you don't see it,
            please check your spam folder.
          </p>
          <Link to="/" className="btn inline-block">
            Return to Listings
          </Link>
        </div>
      </div>
    </div>
  );
}
