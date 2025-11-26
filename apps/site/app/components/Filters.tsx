import { useSearchParams } from "@remix-run/react";
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
    <div className="card p-4">
      {/* Full-width evenly spaced filters with Reset button */}
      <div className="flex items-end gap-4">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* City Filter */}
        <div className="flex flex-col gap-1">
          <label className="label">City</label>
          <select
            className="input"
            value={searchParams.get("city") || "All"}
            onChange={(e) => handleChange("city", e.target.value)}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Bedrooms */}
        <div className="flex flex-col gap-1">
          <label className="label">Bedrooms</label>
          <select
            className="input"
            value={searchParams.get("bedrooms") || ""}
            onChange={(e) => handleChange("bedrooms", e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>

        {/* Bathrooms */}
        <div className="flex flex-col gap-1">
          <label className="label">Bathrooms</label>
          <select
            className="input"
            value={searchParams.get("bathrooms") || ""}
            onChange={(e) => handleChange("bathrooms", e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
          </select>
        </div>

        {/* Max Price */}
        <div className="flex flex-col gap-1">
          <label className="label">Max Rent</label>
          <select
            className="input"
            value={searchParams.get("max") || ""}
            onChange={(e) => handleChange("max", e.target.value)}
          >
            <option value="">Any</option>
            <option value="1500">$1,500</option>
            <option value="2000">$2,000</option>
            <option value="2500">$2,500</option>
            <option value="3000">$3,000</option>
            <option value="4000">$4,000</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="label">Status</label>
          <select
            className="input"
            value={searchParams.get("status") || ""}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="">All</option>
            <option value="Available">Available</option>
            <option value="Pending">Pending</option>
            <option value="Rented">Rented</option>
          </select>
        </div>
        </div>
        <button
          onClick={handleReset}
          className="btn bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg whitespace-nowrap"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
