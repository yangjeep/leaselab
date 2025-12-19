import { useFetcher } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@leaselab/ui-components";
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
  const fetcher = useFetcher<{ error?: string; success?: boolean }>();
  const isSubmitting = fetcher.state === "submitting" || fetcher.state === "loading";
  const hasRedirected = useRef(false);

  const [selectedListingId, setSelectedListingId] = useState(selectedProperty || "");
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [employmentStatus, setEmploymentStatus] = useState("");

  useEffect(() => {
    if (selectedProperty) {
      setSelectedListingId(selectedProperty);
    }
  }, [selectedProperty]);

  // Navigate to thank you page when submission succeeds
  // Check as soon as data is available (during loading state), not just idle
  useEffect(() => {
    console.log("ContactForm fetcher state:", fetcher.state, "data:", fetcher.data);
    if (fetcher.data?.success && !hasRedirected.current) {
      console.log("Submission successful, redirecting...");
      hasRedirected.current = true;
      // Use window.location for more reliable navigation
      window.location.href = "/thank-you";
    }
  }, [fetcher.state, fetcher.data]);

  const handleFilesChange = (newFileIds: string[]) => {
    setFileIds(newFileIds);
  };

  // Find the selected listing to get its propertyId and unitId
  const selectedListing = listings.find(l => l.id === selectedListingId);
  const propertyIdToSubmit = selectedListingId === "other"
    ? "general"
    : (selectedListing?.propertyId || selectedListingId);
  const unitIdToSubmit = selectedListingId === "other" ? undefined : selectedListingId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apply / Inquire</CardTitle>
      </CardHeader>
      <CardContent>
        <fetcher.Form method="post" action="/api/tenant-leads" className="space-y-4">
        {fetcher.data?.error && (
          <Alert variant="destructive">
            <AlertTitle>Submission failed</AlertTitle>
            <AlertDescription>{fetcher.data.error}</AlertDescription>
          </Alert>
        )}

        {/* Property Select */}
        <div className="space-y-2">
          <Label htmlFor="listingSelect">
            Property <span className="text-red-400">*</span>
          </Label>
          <Select
            id="listingSelect"
            name="listingSelect"
            required
            value={selectedListingId}
            onChange={(event) => setSelectedListingId(event.target.value)}
          >
            <option value="">Select a property...</option>
            {listings.map((prop) => (
              <option key={prop.id} value={prop.id}>
                {prop.title} ({prop.status})
              </option>
            ))}
            <option value="other">Other Inquiries</option>
          </Select>
        </div>

        {/* Hidden inputs for propertyId and unitId */}
        <input type="hidden" name="propertyId" value={propertyIdToSubmit} />
        {unitIdToSubmit && <input type="hidden" name="unitId" value={unitIdToSubmit} />}

        {/* Name Fields */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-red-400">*</span>
            </Label>
            <Input type="text" id="firstName" name="firstName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-red-400">*</span>
            </Label>
            <Input type="text" id="lastName" name="lastName" required />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-red-400">*</span>
          </Label>
          <Input type="email" id="email" name="email" required />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone <span className="text-red-400">*</span>
          </Label>
          <Input type="tel" id="phone" name="phone" required />
        </div>

        {/* Move-in Date */}
        <div className="space-y-2">
          <Label htmlFor="moveInDate">Ideal Move-in Date</Label>
          <Input type="date" id="moveInDate" name="moveInDate" defaultValue={getFirstDayOfNextMonth()} />
        </div>

        {/* Employment Status */}
        <div className="space-y-2">
          <Label htmlFor="employmentStatus">Employment Status</Label>
          <Select
            id="employmentStatus"
            name="employmentStatus"
            value={employmentStatus}
            onChange={(event) => setEmploymentStatus(event.target.value)}
          >
            <option value="">Select...</option>
            <option value="employed">Employed</option>
            <option value="self_employed">Self-Employed</option>
            <option value="student">Student</option>
            <option value="retired">Retired</option>
            <option value="unemployed">Unemployed</option>
          </Select>
        </div>

        {/* Monthly Income removed (internal-only now) */}

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" name="message" rows={4} />
        </div>

        {/* File Upload */}
        <FileUpload onFilesChange={handleFilesChange} />

        {/* Hidden input for fileIds */}
        <input type="hidden" name="fileIds" value={JSON.stringify(fileIds)} />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>
      </fetcher.Form>
      </CardContent>
    </Card>
  );
}
