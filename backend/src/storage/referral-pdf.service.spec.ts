import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { existsSync, unlinkSync } from 'node:fs';
import { ReferralPdfService } from './referral-pdf.service';

describe('ReferralPdfService', () => {
  let service: ReferralPdfService;
  let createdFilePath: string | null = null;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralPdfService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: any) => {
              if (key === 'email.pesoManagerName') return 'ROGELIO L. REYES, MCD';
              if (key === 'email.watermarkPath') return 'uploads/static/qc_peso_seal.png';
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ReferralPdfService>(ReferralPdfService);
  });

  afterAll(() => {
    if (createdFilePath && existsSync(createdFilePath)) {
      try {
        unlinkSync(createdFilePath);
      } catch {
        // ignore cleanup error
      }
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a referral letter PDF and save it under docs/uploads/referral', async () => {
    const result = await service.generateReferralLetter({
      studentId: 999,
      studentLastName: 'Dela_Cruz',
      studentFullName: 'Juan Dela Cruz',
      opportunityId: 888,
      opportunityTitle: 'Frontend Engineer Intern',
      requiredHours: 350,
      schoolName: 'Quezon City University',
      yearLevel: '4th Year College',
      companyName: 'Acme Technologies Inc.',
      contactPersonName: 'Jane Smith',
      contactPersonDesignation: 'HR Director',
    });

    expect(result).toBeDefined();
    expect(result.fileName).toContain('referral_student_999_dela_cruz_opp_888.pdf');
    expect(result.relativeFilePath).toBe(
      '/docs/uploads/referral/referral_student_999_dela_cruz_opp_888.pdf',
    );
    expect(existsSync(result.absoluteFilePath)).toBe(true);

    createdFilePath = result.absoluteFilePath;
  });
});
