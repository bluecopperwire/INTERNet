export interface Opportunity {
  id: string;
  title: string;
  department: string;
  slots: number;
  duration: number; // in hours
  status: 'Active' | 'Closed' | 'Pending';
  applicants: number;
  jobDescription?: string;
  requiredSkills?: string;
  qualifications?: string;
  applicationDeadline?: string;
}

export interface Applicant {
  id: string;
  name: string;
  opportunityId: string;
  opportunityTitle: string;
  course: string;
  yearLevel: string;
  dateApplied: string;
  status: 'Pending' | 'For Review' | 'Shortlisted' | 'Accepted' | 'Rejected' | 'Under Review';
  // Additional details for Review Modal
  email?: string;
  phone?: string;
  location?: string;
  school?: string;
  preferredField?: string;
  requiredHours?: number;
  availabilityDate?: string;
  notes?: string;
}

export interface CompanyProfile {
  companyName: string;
  location: string;
  industry: string;
  about: string;
  verified: boolean;
  verifiedBy: string;
  dateVerified: string;
  verificationId: string;
  contactPerson: string;
  email: string;
  contactNumber: string;
  website: string;
  yearEstablished: string;
  companySize: string;
  logoUrl?: string;
  bannerUrl?: string;
}

