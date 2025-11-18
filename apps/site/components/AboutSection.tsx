export default function AboutSection() {
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">About Us</h2>
        <div className="space-y-4 opacity-90">
          <p>
            We are a professional property management company dedicated to providing quality rental
            properties in the Ottawa area. Our team is committed to helping you find the perfect home
            that meets your needs and budget.
          </p>
          <p>
            With years of experience in the rental market, we understand what tenants are looking for
            and work hard to maintain our properties to the highest standards. We offer a wide range
            of rental options, from cozy apartments to spacious family homes.
          </p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Our Services</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold mb-2">Property Management</h3>
            <p className="opacity-80 text-sm">
              Professional management services to ensure your property is well-maintained and
              profitable.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Tenant Services</h3>
            <p className="opacity-80 text-sm">
              Responsive maintenance and support to keep our tenants happy and comfortable.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Property Listings</h3>
            <p className="opacity-80 text-sm">
              Comprehensive listings with detailed information and photos to help you make informed
              decisions.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Application Process</h3>
            <p className="opacity-80 text-sm">
              Streamlined application process to make finding your next home as easy as possible.
            </p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
        <div className="space-y-2 opacity-90">
          <p>
            <strong>Phone:</strong> 613-725-1171
          </p>
          <p>
            <strong>Email:</strong> info@daweizhu.com
          </p>
          <p>
            <strong>Office Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM
          </p>
        </div>
      </section>
    </div>
  );
}

