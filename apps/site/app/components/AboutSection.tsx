export default function AboutSection() {
  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-2xl font-semibold">About Us</h2>
      <p className="opacity-80">
        We are a professional property management company dedicated to providing
        quality rental homes for families and individuals. Our properties are
        well-maintained and located in desirable neighborhoods.
      </p>
      <div className="grid md:grid-cols-3 gap-4 pt-4">
        <div className="text-center p-4">
          <div className="text-3xl font-bold">100+</div>
          <div className="text-sm opacity-70">Properties Managed</div>
        </div>
        <div className="text-center p-4">
          <div className="text-3xl font-bold">500+</div>
          <div className="text-sm opacity-70">Happy Tenants</div>
        </div>
        <div className="text-center p-4">
          <div className="text-3xl font-bold">10+</div>
          <div className="text-sm opacity-70">Years Experience</div>
        </div>
      </div>
    </div>
  );
}
