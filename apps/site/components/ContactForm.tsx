"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Property = {
  title: string;
  recordId?: string;
  status?: string;
};

// Helper function to get the first day of next month in YYYY-MM-DD format
function getFirstDayOfNextMonth(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, "0");
  const day = "01";
  return `${year}-${month}-${day}`;
}

export default function ContactForm({ listingTitle }: { listingTitle: string }) {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [formData, setFormData] = useState({
    propertyRecordId: "",
    name: "",
    email: "",
    phone: "",
    message: "",
    moveInDate: getFirstDayOfNextMonth(),
    numberOfOccupants: "",
    employmentStatus: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch properties on mount
  useEffect(() => {
    async function fetchProperties() {
      try {
        const response = await fetch("/api/properties");
        if (response.ok) {
          const data = await response.json();
          setProperties(data);
          // If listingTitle is provided, find its record ID and set it as default
          if (listingTitle) {
            const matchingProperty = data.find((p: Property) => p.title === listingTitle);
            if (matchingProperty && matchingProperty.recordId) {
              setFormData((prev) => ({ ...prev, propertyRecordId: matchingProperty.recordId }));
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch properties:", error);
      } finally {
        setLoadingProperties(false);
      }
    }
    fetchProperties();
  }, [listingTitle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.propertyRecordId.trim()) {
      newErrors.propertyRecordId = "Property is required";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email) || formData.email.length > 320) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tenant-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit form");
      }

      // Redirect to thank you page on success
      router.push("/thank-you");
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "An error occurred. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card p-4">
      <h2 className="mb-4 text-xl font-semibold">Apply / Inquire</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="propertyRecordId" className="label block mb-1">
            Property <span className="text-red-400">*</span>
          </label>
          <select
            id="propertyRecordId"
            name="propertyRecordId"
            value={formData.propertyRecordId}
            onChange={handleChange}
            className={`input w-full ${errors.propertyRecordId ? "border-red-400" : ""}`}
            required
            disabled={loadingProperties}
          >
            <option value="">
              {loadingProperties ? "Loading properties..." : "Select a property..."}
            </option>
            {properties.map((prop) => {
              const isUnavailable = prop.status === "Pending" || prop.status === "Rented";
              let displayText = prop.title;
              
              if (isUnavailable) {
                displayText += " -- Currently Rented, Future rental";
              } else if (prop.status) {
                displayText += ` (${prop.status})`;
              }
              
              return (
                <option 
                  key={prop.recordId || prop.title} 
                  value={prop.recordId || ""}
                  style={isUnavailable ? { opacity: 0.5 } : {}}
                >
                  {displayText}
                </option>
              );
            })}
            <option value="other-inquiries">Other Inquiries</option>
          </select>
          {errors.propertyRecordId && <p className="text-red-400 text-sm mt-1">{errors.propertyRecordId}</p>}
        </div>

        <div>
          <label htmlFor="name" className="label block mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`input w-full ${errors.name ? "border-red-400" : ""}`}
            required
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="label block mb-1">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`input w-full ${errors.email ? "border-red-400" : ""}`}
            required
          />
          {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="label block mb-1">
            Phone <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`input w-full ${errors.phone ? "border-red-400" : ""}`}
            required
          />
          {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="moveInDate" className="label block mb-1">
            Ideal Move-in Date
          </label>
          <input
            type="date"
            id="moveInDate"
            name="moveInDate"
            value={formData.moveInDate}
            onChange={handleChange}
            className="input w-full"
          />
        </div>

        <div>
          <label htmlFor="numberOfOccupants" className="label block mb-1">
            Number of Occupants
          </label>
          <input
            type="number"
            id="numberOfOccupants"
            name="numberOfOccupants"
            value={formData.numberOfOccupants}
            onChange={handleChange}
            min="1"
            className="input w-full"
          />
        </div>

        <div>
          <label htmlFor="employmentStatus" className="label block mb-1">
            Employment Status
          </label>
          <select
            id="employmentStatus"
            name="employmentStatus"
            value={formData.employmentStatus}
            onChange={handleChange}
            className="input w-full"
          >
            <option value="">Select...</option>
            <option value="Employed">Employed</option>
            <option value="Self-Employed">Self-Employed</option>
            <option value="Student">Student</option>
            <option value="Retired">Retired</option>
            <option value="Unemployed">Unemployed</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className="label block mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            className="input w-full"
          />
        </div>

        {errors.submit && (
          <div className="text-red-400 text-sm">{errors.submit}</div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </section>
  );
}
