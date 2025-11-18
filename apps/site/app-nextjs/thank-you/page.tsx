import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8 text-center space-y-6">
        <h1 className="text-3xl font-semibold">Thank You!</h1>
        <p className="text-lg opacity-90">
          Your application has been submitted successfully. We will review your information and get back to you soon.
        </p>
        <Link href="/" className="btn inline-block">
          Return to Listings
        </Link>
      </div>
    </div>
  );
}

