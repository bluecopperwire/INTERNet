export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer | string;
  contentType?: string;
  cid?: string;
}

export interface SendEmailOptions {
  to: string;
  cc?: string | string[];
  fallbackTo?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
}

export interface EmailJob {
  id: string;
  options: SendEmailOptions;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  lastError?: string;
  sentTo?: string;
}

export interface ReferralEmailPayload {
  companyContactEmail: string;
  companyAccountEmail?: string;
  companyName: string;
  contactPersonName?: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  schoolName?: string;
  yearLevel?: string;
  opportunityTitle: string;
  opportunityId: number;
  studentId: number;
  referralPdfPath: string;
}

export interface EmployerCredentialsEmailPayload {
  companyName: string;
  contactPersonName?: string;
  contactEmail: string;
  accountEmail: string;
  temporaryPassword: string;
  loginUrl?: string;
}

