import { useSearchParams } from "@remix-run/react";
import { Button, Card, CardContent, Label, Select } from "@leaselab/ui-components";
import type { Listing } from "~/lib/types";

type FiltersProps = {
  allListings: Listing[];
};

export default function Filters({ allListings }: FiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get unique cities
  const cities = ["All", ...new Set(allListings.map((l) => l.city).filter(Boolean))];

  const handleChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "All" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const handleReset = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {/* City Filter */}
            <div className="space-y-1">
              <Label htmlFor="filter-city">City</Label>
              <Select id="filter-city" value={searchParams.get("city") || "All"} onChange={(event) => handleChange("city", event.target.value)}>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Select>
            </div>

            {/* Bedrooms */}
            <div className="space-y-1">
              <Label htmlFor="filter-bedrooms">Bedrooms</Label>
              <Select id="filter-bedrooms" value={searchParams.get("bedrooms") || ""} onChange={(event) => handleChange("bedrooms", event.target.value)}>
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </Select>
            </div>

            {/* Bathrooms */}
            <div className="space-y-1">
              <Label htmlFor="filter-bathrooms">Bathrooms</Label>
              <Select id="filter-bathrooms" value={searchParams.get("bathrooms") || ""} onChange={(event) => handleChange("bathrooms", event.target.value)}>
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
              </Select>
            </div>

            {/* Max Price */}
            <div className="space-y-1">
              <Label htmlFor="filter-max">Max Rent</Label>
              <Select id="filter-max" value={searchParams.get("max") || ""} onChange={(event) => handleChange("max", event.target.value)}>
                <option value="">Any</option>
                <option value="1500">$1,500</option>
                <option value="2000">$2,000</option>
                <option value="2500">$2,500</option>
                <option value="3000">$3,000</option>
                <option value="4000">$4,000</option>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label htmlFor="filter-status">Status</Label>
              <Select id="filter-status" value={searchParams.get("status") || ""} onChange={(event) => handleChange("status", event.target.value)}>
                <option value="">All</option>
                <option value="Available">Available</option>
                <option value="Pending">Pending</option>
                <option value="Rented">Rented</option>
              </Select>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
