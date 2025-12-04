export type BillingStatus = "completed" | "pending" | "processing" | "waiting" | "nc";

export interface BillingStep {
  id: string;
  label: string;
  status: BillingStatus;
  date?: string;
}

export interface BillingRecord {
  id: string;
  doctorName: string;
  patientName: string;
  procedure: string;
  surgeryDate: string;
  hospital: string;
  billingLocation: string;
  value: number;
  steps: BillingStep[];
}