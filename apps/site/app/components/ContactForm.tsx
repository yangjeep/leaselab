import { Form, useActionData, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import type { Listing } from "~/lib/types";
import FileUpload from "./FileUpload";

type ContactFormProps = {
  listings?: Listing[];
  selectedProperty?: string;
};

function getFirstDayOfNextMonth(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const year = nextMonth.getFullYear();
  const month = String(nextMonth.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export default function ContactForm({ listings = [], selectedProperty }: ContactFormProps) {
  const actionData = useActionData<{ error?: string; success?: boolean }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [selectedPropertyId, setSelectedPropertyId] = useState(selectedProperty || "");
  const [fileIds, setFileIds] = useState<string[]>([]);

  useEffect(() => {
    if (selectedProperty) {
      setSelectedPropertyId(selectedProperty);
    }
  }, [selectedProperty]);

  const handleFilesChange = (newFileIds: string[]) => {
    setFileIds(newFileIds);
  };

  return (
    <section className="card p-4">
      <h2 className="mb-4 text-xl font-semibold">Apply / Inquire</h2>
      <Form method="post" action="/api/tenant-leads" className="space-y-4">
        {actionData?.error && (
          <div className="text-red-400 text-sm p-3 rounded-lg bg-red-400/10">
            {actionData.error}
          </div>
        )}

        {/* Property Select */}
        <div>
          <label htmlFor="propertyId" className="label block mb-1">
            Property <span className="text-red-400">*</span>
          </label>
          <select
            id="propertyId"
            name="propertyId"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="input w-full"
            required
          >
            <option value="">Select a property...</option>
            {listings.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.title} ({prop.status})
              </option>
            ))}
            <option value="other">Other Inquiries</option>
          </select>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="label block mb-1">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              className="input w-full"
              required
            />
          </div>
          <div>
            <label htmlFor="lastName" className="label block mb-1">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              className="input w-full"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="label block mb-1">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="input w-full"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="label block mb-1">
            Phone <span className="text-red-400">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className="input w-full"
            required
          />
        </div>

        {/* Move-in Date */}
        <div>
          <label htmlFor="moveInDate" className="label block mb-1">
            Ideal Move-in Date
          </label>
          <input
            type="date"
            id="moveInDate"
            name="moveInDate"
            defaultValue={getFirstDayOfNextMonth()}
            className="input w-full"
          />
        </div>

        {/* Employment Status */}
        <div>
          <label htmlFor="employmentStatus" className="label block mb-1">
            Employment Status
          </label>
          <select
            id="employmentStatus"
            name="employmentStatus"
            className="input w-full"
          >
            <option value="">Select...</option>
            <option value="employed">Employed</option>
            <option value="self_employed">Self-Employed</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
            <option value="unemployed">Unemployed</option>
          </select>
        </div>

        {/* Monthly Income removed (internal-only now) */}

        {/* Message */}
        <div>
          <label htmlFor="message" className="label block mb-1">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            className="input w-full"
          />
        </div>

        {/* File Upload */}
        <FileUpload onFilesChange={handleFilesChange} />

        {/* Hidden input for fileIds */}
        <input type="hidden" name="fileIds" value={JSON.stringify(fileIds)} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </button>
      </Form>
    </section>
  );
}
