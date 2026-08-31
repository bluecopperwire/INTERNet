# Email Sending & Referral Letter Generation Capability

## 1. Overview

The QC PESO INTERNet system incorporates an automated referral workflow that triggers when a PESO officer accepts an applicant for endorsement (referred to in the UI as **Refer Applicant**). Upon referral:

1. The system updates the application status to `approved_for_referral`.
2. A formal **QC PESO Referral Letter & Return Slip (WIIRP Form)** is dynamically constructed as a PDF using data from the student, school, host employer, and opportunity.
3. The generated PDF is archived under `backend/docs/uploads/referral/` with a deterministic, structured filename:
   ```
   referral_student_<studentId>_<studentLastName>_opp_<opportunityId>.pdf
   ```
4. A professional cover letter email is queued and dispatched via **Gmail SMTP** to the employer's contact email (with fallback to the company user account email).
5. The queue system handles rate-limiting delays and automatic retries with exponential backoff to ensure reliability.

---

## 2. Architecture & Pipeline

```
 [ PESO Officer ]
        │
        ▼ (Clicks "Refer Applicant")
 ┌─────────────────────────────────────────────────────────────┐
 │ POST /dashboard/peso/applications/:id/status                │
 │ Status: approved_for_referral                               │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PesoDashboardService (withStatusActor Transaction)          │
 │ 1. Updates application status to approved_for_referral      │
 │ 2. Queries student academic info + employer contact details │
 │ 3. Calls ReferralPdfService to construct PDF document       │
 │ 4. Saves referral record with relative document file path   │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ EmailQueueService (FIFO Queue Worker)                       │
 │ 1. Enqueues job with HTML/Text cover letter & PDF attachment│
 │ 2. Applies inter-job delay (EMAIL_QUEUE_DELAY_MS = 2000ms)  │
 │ 3. Invokes EmailService with Nodemailer SMTP transport      │
 │ 4. Retries up to EMAIL_MAX_RETRIES times on transient error │
 │ 5. Delivers to primary contact_email (fallback to user email│
 └─────────────────────────────────────────────────────────────┘
```

---

## 3. Gmail SMTP Setup Guide

To enable live email delivery via Gmail SMTP:

### Step 1: Enable 2-Step Verification on your Google Account
1. Log in to your Google / Gmail account.
2. Go to **Manage your Google Account** > **Security**.
3. Under *How you sign in to Google*, ensure **2-Step Verification** is turned ON.

### Step 2: Generate an App Password
1. In the search bar inside Google Account settings, search for **App passwords**.
2. Create a new app name (e.g., `QC PESO System`).
3. Click **Create**. Google will generate a 16-character password (e.g., `abcd efgh ijkl mnop`).
4. Copy this 16-character string (without spaces) and use it as `SMTP_PASS`.

### Step 3: Configure Environment Variables
In your `backend/.env` file:
```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_peso_email@gmail.com
SMTP_PASS=your_16_character_app_password
SMTP_FROM_NAME="QC PESO - Work Immersion and Internship Referral Program"
SMTP_FROM_EMAIL=your_peso_email@gmail.com

# Email Queue & Rate Limiting
EMAIL_QUEUE_DELAY_MS=2000
EMAIL_MAX_RETRIES=3
```

> [!NOTE]
> **Mock Mode**: If `SMTP_USER` or `SMTP_PASS` contains placeholder strings or is blank, `EmailService` automatically runs in safe **simulation mode**, logging all outbound emails to the console and database without throwing exceptions or blocking workflows.

---

## 4. Referral Letter PDF Specification

The PDF replicates the official **Quezon City Public Employment Service Office (QC PESO) Work Immersion and Internship Referral Program (WIIRP)** template:

### Dynamic Placeholders

| Field | Source | Example Output |
|---|---|---|
| `[Date]` | Current Date | `August 31, 2026` |
| `[NAME OF FOCAL/HR/REPRESENTATIVE]` | Company Contact Person | `JUAN DELA CRUZ` |
| `[Designation]` | Contact Person Role | `HR Officer / Representative` |
| `[NAME OF COMPANY]` | Registered Company Name | `ACME TECH SOLUTIONS INC.` |
| `[NAME OF STUDENT]` | Student Full Name | `MARIA CLARA SANTOS` |
| `[YEAR/GRADE LEVEL]` | Student Academic Information | `4th Year College` / `Grade 12` |
| `[SCHOOL]` | Academic Institution Name | `Quezon City University` |
| `[NUMBER OF HOURS]` | Opportunity / Student Required Hours | `300` |
| Signatory | Environment / Config | `ROGELIO L. REYES, MCD`<br>`City Government Department Head III`<br>`PESO Manager` |

### Return Slip Section
- The bottom half contains the **Return Slip** prefilled with student and company names.
- Checkboxes for HR action: `( ) Qualified for Internship`, `( ) For further evaluation/under process`, `( ) Not qualified`.
- Signature line for the host employer's HR Officer.

### Watermark & E-Signature Customization
- **Watermark Seal**: Placed at `backend/uploads/static/qc_peso_seal.png` (configured via `REFERRAL_WATERMARK_PATH`). Rendered with 12% opacity behind the Return Slip.
- **E-Signature**: Placed at `backend/uploads/static/peso_manager_signature.png` (configured via `REFERRAL_SIGNATURE_PATH`). Rendered above the signatory name when present.

---

## 5. Queue System & Rate Limiting

Gmail SMTP enforces strict rate limits and burst protection:
- Standard consumer Gmail: ~500 emails/day.
- Google Workspace: ~2,000 emails/day.
- Socket connection throttling on rapid bursts.

### Queue Parameters
- **`EMAIL_QUEUE_DELAY_MS`**: Configurable inter-job spacing (default: `2000` ms = 2 seconds) between successive SMTP transmissions.
- **`EMAIL_MAX_RETRIES`**: Maximum number of delivery attempts before dead-letter marking (default: `3`).
- **Exponential Backoff**: When a send fails due to network or SMTP socket timeout, retry attempts are delayed by `min(2^attempt * 2s, 60s)` (e.g. 4s, 8s, 16s).
- **Secondary Address Fallback**: If delivery to `company.contact_email` encounters a recipient rejection or error, the queue worker automatically retries using the company user account login email (`user_account.email`).

---

## 6. Storage & Download Endpoints

- **Filesystem Path**: `backend/docs/uploads/referral/`
- **Static Asset Endpoint**: Mounted at `/docs/uploads/` (accessible via `http://localhost:3000/docs/uploads/referral/...`)
- **Database Reference**: Stored in `public.referral.referral_document_file_path`.

---

## 7. Troubleshooting & Verification

### Common Scenarios

1. **`535-5.7.8 Username and Password not accepted`**:
   - Cause: Standard Gmail password used instead of a 16-character Google App Password.
   - Solution: Generate an App Password in Google Account Security settings.
2. **`EENVELOPE / Invalid Recipient`**:
   - Cause: The company's `contact_email` is malformed or invalid.
   - Solution: The system attempts delivery to `company_account_email`. Ensure valid email addresses are entered during employer registration.
3. **Queue Status Check**:
   - The queue worker logs all actions under the `EmailQueueService` logger:
     ```
     [EmailQueueService] Enqueued email job ... for "hr@partner.com"
     [EmailQueueService] Processing email job ... (Attempt 1/3)
     [EmailService] Email successfully sent to hr@partner.com (MessageId: <...>)
     ```
