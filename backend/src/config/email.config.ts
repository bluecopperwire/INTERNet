import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  fromName:
    process.env.SMTP_FROM_NAME ||
    'QC PESO - Work Immersion and Internship Referral Program',
  fromEmail:
    process.env.SMTP_FROM_EMAIL ||
    process.env.SMTP_USER ||
    'no-reply@quezoncity.gov.ph',
  queueDelayMs: parseInt(process.env.EMAIL_QUEUE_DELAY_MS || '2000', 10),
  maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10),
  watermarkPath:
    process.env.REFERRAL_WATERMARK_PATH || 'uploads/static/qc_peso_seal.png',
  signaturePath:
    process.env.REFERRAL_SIGNATURE_PATH ||
    'uploads/static/peso_manager_signature.png',
  pesoManagerName: process.env.PESO_MANAGER_NAME || 'ROGELIO L. REYES, MCD',
  pesoManagerTitle:
    process.env.PESO_MANAGER_TITLE || 'City Government Department Head III',
  pesoManagerOffice: process.env.PESO_MANAGER_OFFICE || 'PESO Manager',
}));
