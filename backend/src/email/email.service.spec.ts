import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';

describe('EmailModule Services', () => {
  let emailService: EmailService;
  let queueService: EmailQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        EmailQueueService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: any) => {
              if (key === 'email.host') return 'smtp.gmail.com';
              if (key === 'email.port') return 587;
              if (key === 'email.user') return ''; // triggers mock mode
              if (key === 'email.pass') return '';
              if (key === 'email.fromName') return 'QC PESO';
              if (key === 'email.fromEmail') return 'peso@quezoncity.gov.ph';
              if (key === 'email.queueDelayMs') return 50; // fast for tests
              if (key === 'email.maxRetries') return 3;
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
    queueService = module.get<EmailQueueService>(EmailQueueService);
  });

  afterEach(() => {
    queueService.onModuleDestroy();
  });

  describe('EmailService', () => {
    it('should correctly format referral cover letter HTML and text', () => {
      const payload = {
        companyContactEmail: 'hr@techcorp.ph',
        companyAccountEmail: 'account@techcorp.ph',
        companyName: 'TechCorp Solutions',
        contactPersonName: 'Mr. Alex Reyes',
        studentName: 'Maria Santos',
        studentEmail: 'maria.santos@qcu.edu.ph',
        studentPhone: '09123456789',
        schoolName: 'Quezon City University',
        yearLevel: '4th Year College',
        opportunityTitle: 'Full Stack Web Developer Intern',
        opportunityId: 10,
        studentId: 4,
        referralPdfPath: '/dummy/path/referral.pdf',
      };

      const result = emailService.buildReferralCoverLetter(payload);

      expect(result.subject).toContain('Maria Santos');
      expect(result.subject).toContain('Full Stack Web Developer Intern');
      expect(result.text).toContain('TechCorp Solutions');
      expect(result.text).toContain('Mr. Alex Reyes');
      expect(result.text).toContain('Quezon City University');
      expect(result.html).toContain('Full Stack Web Developer Intern');
      expect(result.html).toContain('maria.santos@qcu.edu.ph');
    });

    it('should send email in mock simulation mode when unconfigured', async () => {
      const result = await emailService.sendDirect({
        to: 'company@example.com',
        fallbackTo: 'backup@example.com',
        subject: 'Test Subject',
        text: 'Test content',
      });

      expect(result.success).toBe(true);
      expect(result.recipient).toBe('company@example.com');
      expect(result.messageId).toContain('mock-');
    });
  });

  describe('EmailQueueService', () => {
    it('should enqueue and process referral emails sequentially', async () => {
      const payload = {
        companyContactEmail: 'recruitment@partner.com',
        companyName: 'Partner Corp',
        studentName: 'John Doe',
        opportunityTitle: 'Data Analyst Intern',
        opportunityId: 5,
        studentId: 12,
        referralPdfPath: '',
      };

      const job = await queueService.enqueueReferralEmail(payload);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.options.to).toBe('recruitment@partner.com');
      expect(job.options.subject).toContain('John Doe');

      // Wait for queue processing loop
      await new Promise((resolve) => setTimeout(resolve, 200));

      const updatedJob = queueService.getJob(job.id);
      expect(updatedJob).toBeDefined();
      expect(updatedJob?.status).toBe('sent');
      expect(updatedJob?.sentTo).toBe('recruitment@partner.com');
    });
  });
});
