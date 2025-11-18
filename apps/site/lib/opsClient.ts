// Ops API Client for submitting leads to the backend

const OPS_API_URL = process.env.OPS_API_URL || 'http://localhost:8788';

interface LeadSubmission {
  propertyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentAddress?: string;
  employmentStatus: string;
  monthlyIncome: number;
  moveInDate: string;
  message?: string;
}

interface OpsApiResponse {
  success: boolean;
  data?: {
    leadId: string;
    message: string;
  };
  error?: string;
}

export async function submitLeadToOps(lead: LeadSubmission): Promise<OpsApiResponse> {
  try {
    const response = await fetch(`${OPS_API_URL}/api/public/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lead),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit lead');
    }

    return data as OpsApiResponse;
  } catch (error) {
    console.error('Error submitting lead to Ops:', error);
    throw error;
  }
}

// Map form employment status to API format
export function mapEmploymentStatus(status: string): string {
  const mapping: Record<string, string> = {
    'Employed': 'employed',
    'Self-Employed': 'self_employed',
    'Student': 'student',
    'Retired': 'retired',
    'Unemployed': 'unemployed',
    'Other': 'employed', // Default to employed for "Other"
  };
  return mapping[status] || 'employed';
}
