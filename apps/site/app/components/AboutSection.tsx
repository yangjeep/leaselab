import { Card, CardContent, CardHeader, CardTitle } from "@leaselab/ui-components";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="opacity-80">{description}</p>
        <div className="grid gap-4 pt-4 md:grid-cols-3">
          {stats.map((stat, index) => (
            <div key={index} className="rounded-lg border border-white/10 p-4 text-center">
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm opacity-70">{stat.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
