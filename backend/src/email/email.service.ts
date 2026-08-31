import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  SendEmailOptions,
  ReferralEmailPayload,
} from './email.interfaces';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('email.host', 'smtp.gmail.com');
    const port = this.configService.get<number>('email.port', 587);
    const secure = this.configService.get<boolean>('email.secure', false);
    const user = this.configService.get<string>('email.user', '');
    const pass = this.configService.get<string>('email.pass', '');

    const isPlaceholder =
      !user ||
      !pass ||
      user.includes('your_') ||
      pass.includes('your_') ||
      user === 'your_email@gmail.com';

    if (!isPlaceholder) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      this.isConfigured = true;
      this.logger.log(`Email service configured with SMTP host: ${host}:${port} (${user})`);
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'Email credentials not fully configured. Email service will run in mock/simulation mode.',
      );
    }
  }

  async sendDirect(
    options: SendEmailOptions,
  ): Promise<{ success: boolean; messageId: string; recipient: string }> {
    const fromName = this.configService.get<string>(
      'email.fromName',
      'QC PESO - Work Immersion and Internship Referral Program',
    );
    const fromEmail = this.configService.get<string>(
      'email.fromEmail',
      'no-reply@quezoncity.gov.ph',
    );

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        path: att.path,
        content: att.content,
        contentType: att.contentType,
      })),
    };

    if (!this.isConfigured || !this.transporter) {
      this.logger.log(
        `[MOCK EMAIL SENT] To: ${options.to} | Subject: "${options.subject}" | Attachments: ${
          options.attachments?.length || 0
        }`,
      );
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        recipient: options.to,
      };
    }

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email successfully sent to ${options.to} (MessageId: ${info.messageId})`,
      );
      return {
        success: true,
        messageId: info.messageId,
        recipient: options.to,
      };
    } catch (primaryError: any) {
      this.logger.error(
        `Failed to send email to primary address: ${options.to}. Error: ${primaryError.message}`,
      );

      if (options.fallbackTo && options.fallbackTo !== options.to) {
        this.logger.log(
          `Attempting fallback delivery to secondary account email: ${options.fallbackTo}`,
        );
        try {
          const fallbackInfo = await this.transporter.sendMail({
            ...mailOptions,
            to: options.fallbackTo,
          });
          this.logger.log(
            `Email successfully delivered to fallback address: ${options.fallbackTo} (MessageId: ${fallbackInfo.messageId})`,
          );
          return {
            success: true,
            messageId: fallbackInfo.messageId,
            recipient: options.fallbackTo,
          };
        } catch (fallbackError: any) {
          this.logger.error(
            `Fallback email delivery to ${options.fallbackTo} also failed: ${fallbackError.message}`,
          );
          throw fallbackError;
        }
      }

      throw primaryError;
    }
  }

  buildReferralCoverLetter(payload: ReferralEmailPayload): {
    subject: string;
    text: string;
    html: string;
  } {
    const contactGreeting = payload.contactPersonName
      ? `Dear ${payload.contactPersonName},`
      : `Dear Hiring Team at ${payload.companyName},`;

    const studentAcademicInfo = [
      payload.yearLevel,
      payload.schoolName ? `student of ${payload.schoolName}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const subject = `[QC PESO Referral] Endorsement for ${payload.studentName} - ${payload.opportunityTitle}`;

    const text = `
Quezon City Public Employment Service Office (QC PESO)
PESO Work Immersion and Internship Referral Program (WIIRP)

${contactGreeting}

Greetings from the Quezon City Public Employment Service Office!

We are pleased to officially endorse and refer Mr./Ms. ${payload.studentName}${
      studentAcademicInfo ? ` (a ${studentAcademicInfo})` : ''
    }, who has applied for the "${payload.opportunityTitle}" internship opportunity at ${
      payload.companyName
    }.

Attached to this email is the official QC PESO Referral Letter (WIIRP Form) along with the Return Slip for your ready reference.

Student Contact Details:
- Name: ${payload.studentName}
- Email: ${payload.studentEmail || 'N/A'}
- Contact Number: ${payload.studentPhone || 'N/A'}
- Educational Institution: ${payload.schoolName || 'N/A'}
- Level: ${payload.yearLevel || 'N/A'}

Action Requested:
Kindly review the attached referral document and accomplish the Return Slip section indicating your action taken (Qualified for Internship, For further evaluation/under process, or Not qualified).

Thank you very much for your continuous partnership and support of the PESO Work Immersion and Internship Referral Program.

Very truly yours,

ROGELIO L. REYES, MCD
City Government Department Head III
PESO Manager
Quezon City Government
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #160e6f; color: #ffffff; padding: 24px 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.85; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
    .highlight-card { background: #f0f4ff; border-left: 4px solid #160e6f; padding: 16px 20px; border-radius: 4px; margin: 20px 0; }
    .highlight-card h3 { margin: 0 0 8px 0; font-size: 15px; color: #160e6f; }
    .details-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .details-table td { padding: 4px 0; font-size: 14px; }
    .details-table td.label { width: 40%; font-weight: 600; color: #475569; }
    .details-table td.val { width: 60%; color: #0f172a; }
    .instructions { background: #fffbeb; border: 1px solid #fef3c7; padding: 14px 18px; border-radius: 6px; font-size: 13px; color: #92400e; margin: 20px 0; }
    .footer { border-top: 1px solid #e2e8f0; padding: 24px 32px; font-size: 13px; color: #64748b; background: #fafafa; }
    .signatory { margin-top: 20px; font-size: 14px; font-weight: 600; color: #0f172a; }
    .signatory-title { font-size: 12px; color: #64748b; font-weight: normal; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>QUEZON CITY PESO</h1>
      <p>Work Immersion and Internship Referral Program (WIIRP)</p>
    </div>
    <div class="content">
      <div class="greeting">${contactGreeting}</div>
      <p>Greetings from the <strong>Quezon City Public Employment Service Office</strong>!</p>
      <p>
        We are pleased to officially endorse and refer <strong>${payload.studentName}</strong>${
          studentAcademicInfo ? ` (${studentAcademicInfo})` : ''
        }, who has submitted an application for the <strong>${payload.opportunityTitle}</strong> internship opening at <strong>${payload.companyName}</strong>.
      </p>
      
      <div class="highlight-card">
        <h3>Applicant Information Summary</h3>
        <table class="details-table">
          <tr>
            <td class="label">Student Name:</td>
            <td class="val"><strong>${payload.studentName}</strong></td>
          </tr>
          <tr>
            <td class="label">Applied Position:</td>
            <td class="val">${payload.opportunityTitle}</td>
          </tr>
          <tr>
            <td class="label">School:</td>
            <td class="val">${payload.schoolName || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Year / Grade Level:</td>
            <td class="val">${payload.yearLevel || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label">Email:</td>
            <td class="val"><a href="mailto:${payload.studentEmail || ''}">${payload.studentEmail || 'N/A'}</a></td>
          </tr>
          <tr>
            <td class="label">Contact Number:</td>
            <td class="val">${payload.studentPhone || 'N/A'}</td>
          </tr>
        </table>
      </div>

      <div class="instructions">
        <strong>Action Requested:</strong><br>
        Please find the attached official <strong>QC PESO Referral Letter & Return Slip</strong>. Kindly review the student credentials, conduct your interview process, and accomplish the Return Slip with your decision.
      </div>

      <p>Thank you very much for your continuous partnership and support of the Quezon City PESO internship initiatives.</p>

      <div class="signatory">
        ROGELIO L. REYES, MCD<br>
        <span class="signatory-title">City Government Department Head III<br>PESO Manager, Quezon City</span>
      </div>
    </div>
    <div class="footer">
      This is an automated notification sent via the Quezon City PESO Internship Portal. Please do not reply directly to this automated email address.
    </div>
  </div>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }
}
