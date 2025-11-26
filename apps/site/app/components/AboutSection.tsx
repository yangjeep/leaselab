import type { SiteConfig } from "~/lib/api-client";

type AboutSectionProps = {
  config?: SiteConfig;
};

export default function AboutSection({ config }: AboutSectionProps) {
  // Fallback to defaults if config is not provided
  const title = config?.about?.title || "About Us";
  const description = config?.about?.description ||
    "We are a professional property management company dedicated to providing quality rental homes for families and individuals. Our properties are well-maintained and located in desirable neighborhoods.";
  const stats = config?.about?.stats || [
    { label: "Properties Managed", value: "100+" },
    { label: "Happy Tenants", value: "500+" },
    { label: "Years Experience", value: "10+" },
  ];

  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="opacity-80">{description}</p>
      <div className="grid md:grid-cols-3 gap-4 pt-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center p-4">
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-sm opacity-70">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
