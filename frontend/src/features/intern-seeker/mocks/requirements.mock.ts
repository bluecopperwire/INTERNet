import type { InternshipRequirement } from '../types/requirement.types'

export const MOCK_REQUIREMENTS: InternshipRequirement[] = [
  {
    id: 'proof-of-residency',
    title: 'Proof of Residency',
    description: 'Upload your valid proof of residence such as a Quezon City ID or any valid ID showing your current address.',
    status: 'submitted',
    document: { fileName: 'proof-of-residency.pdf', mimeType: 'application/pdf', size: 824_000, uploadedAt: '2026-07-20T10:30:00+08:00' },
  },
  {
    id: 'latest-credentials',
    title: 'Latest Credentials',
    description: 'Attach your latest academic credentials, which may include a certificate of grades, Form 137/138, enrollment registration form, or supporting academic documents.',
    status: 'submitted',
    document: { fileName: 'latest-credentials.pdf', mimeType: 'application/pdf', size: 1_180_000, uploadedAt: '2026-07-20T10:30:00+08:00' },
  },
  {
    id: 'resume',
    title: 'Curriculum Vitae / Resume',
    description: 'Submit your updated résumé with your contact information, educational background, and relevant skills.',
    status: 'submitted',
    document: { fileName: 'curriculum-vitae.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 286_000, uploadedAt: '2026-07-20T10:30:00+08:00' },
  },
  {
    id: 'letter-of-intent',
    title: 'Letter of Intent',
    description: 'Express your intent to apply for an internship placement under the Work Immersion and Internship Program.',
    status: 'pending',
    recipientLines: ['Address your letter to:', 'Mr. Rogelio L. Reyes', 'Government Department Head III'],
  },
  {
    id: 'recommendation-letter',
    title: 'Recommendation Letter / Registration Form',
    description: 'From your teacher, adviser, or institution (if available), with OJT/Work Immersion clearly indicated.',
    status: 'pending',
  },
]
