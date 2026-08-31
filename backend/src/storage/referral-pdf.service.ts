import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as _PDFDocument from 'pdfkit';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PDFDocument: any = (_PDFDocument as any).default || _PDFDocument;

export interface GenerateReferralPdfDto {
  studentId: number;
  studentLastName: string;
  studentFullName: string;
  opportunityId: number;
  opportunityTitle?: string;
  requiredHours: number;
  schoolName: string;
  yearLevel: string;
  companyName: string;
  contactPersonName?: string;
  contactPersonDesignation?: string;
  dateStr?: string;
}

export interface GeneratedPdfResult {
  fileName: string;
  relativeFilePath: string;
  absoluteFilePath: string;
}

@Injectable()
export class ReferralPdfService {
  private readonly logger = new Logger(ReferralPdfService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateReferralLetter(
    dto: GenerateReferralPdfDto,
  ): Promise<GeneratedPdfResult> {
    const uploadDir = resolve(process.cwd(), 'docs', 'uploads', 'referral');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const sanitizedLastName = (dto.studentLastName || 'student')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 25);

    const fileName = `referral_student_${dto.studentId}_${sanitizedLastName}_opp_${dto.opportunityId}.pdf`;
    const absoluteFilePath = join(uploadDir, fileName);
    const relativeFilePath = `/docs/uploads/referral/${fileName}`;

    await this.createPdfDocument(dto, absoluteFilePath);

    this.logger.log(`Generated referral letter PDF saved at: ${absoluteFilePath}`);

    return {
      fileName,
      relativeFilePath,
      absoluteFilePath,
    };
  }

  private createPdfDocument(
    dto: GenerateReferralPdfDto,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolvePromise, rejectPromise) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 54, bottom: 54, left: 60, right: 60 },
          autoFirstPage: true,
        });

        const writeStream = createWriteStream(outputPath);
        doc.pipe(writeStream);

        const currentDate =
          dto.dateStr ||
          new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });

        const focalName = (
          dto.contactPersonName || 'THE HR MANAGER / REPRESENTATIVE'
        ).toUpperCase();
        const designation = dto.contactPersonDesignation || 'HR Officer / Representative';
        const companyName = (dto.companyName || 'COMPANY').toUpperCase();
        const studentName = (dto.studentFullName || 'STUDENT').toUpperCase();
        const yearLevel = (dto.yearLevel || 'COLLEGE').toUpperCase();
        const school = (dto.schoolName || 'ACADEMIC INSTITUTION').toUpperCase();
        const hours = dto.requiredHours || 300;

        const managerName = this.configService.get<string>(
          'email.pesoManagerName',
          'ROGELIO L. REYES, MCD',
        );
        const managerTitle = this.configService.get<string>(
          'email.pesoManagerTitle',
          'City Government Department Head III',
        );
        const managerOffice = this.configService.get<string>(
          'email.pesoManagerOffice',
          'PESO Manager',
        );

        // Watermark placement in the lower region behind return slip
        const watermarkRelPath = this.configService.get<string>(
          'email.watermarkPath',
          'uploads/static/qc_peso_seal.png',
        );
        const watermarkAbsPath = resolve(process.cwd(), watermarkRelPath);

        if (existsSync(watermarkAbsPath)) {
          try {
            doc.save();
            doc.opacity(0.12);
            // Center in lower half of page (20% bigger: 190 * 1.2 = 228)
            const sealSize = 228;
            const sealX = (doc.page.width - sealSize) / 2;
            const sealY = 470;
            doc.image(watermarkAbsPath, sealX, sealY, {
              width: sealSize,
              height: sealSize,
            });
            doc.restore();
          } catch (imgErr) {
            this.logger.warn(`Could not render watermark image: ${imgErr}`);
          }
        }

        // --- TOP SECTION ---
        doc.fontSize(11).font('Helvetica').text(currentDate, { align: 'left' });
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold').text(focalName);
        doc.font('Helvetica').text(designation);
        doc.font('Helvetica-Bold').text(companyName);
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold').text('Dear Ma’am/Sir:');
        doc.moveDown(1.2);

        // --- BODY SECTION ---
        doc
          .font('Helvetica')
          .fontSize(10.5)
          .text('The bearer Mr./Ms. ', { continued: true, lineGap: 3.5 })
          .font('Helvetica-Bold')
          .text(studentName, { continued: true })
          .font('Helvetica')
          .text(' a ', { continued: true })
          .font('Helvetica-Bold')
          .text(yearLevel, { continued: true })
          .font('Helvetica')
          .text(' student of ', { continued: true })
          .font('Helvetica-Bold')
          .text(school, { continued: true })
          .font('Helvetica')
          .text(
            ` sought the assistance of this office to apply for a `,
            { continued: true },
          )
          .font('Helvetica-Bold')
          .text(`${hours}-hour`, { continued: true })
          .font('Helvetica')
          .text(' internship in your company.');

        doc.moveDown(1.2);
        doc
          .font('Helvetica')
          .text(
            'We would appreciate it if you could furnish us the kind of assistance you have extended to him/her by accomplishing the hereunder return slip for our ready reference.',
            { lineGap: 3.5 },
          );

        doc.moveDown(1.2);
        doc
          .font('Helvetica')
          .text(
            'Thank you very much for your continuous support of the PESO Work Immersion and Internship Referral Program (WIIRP).',
            { lineGap: 3.5 },
          );

        doc.moveDown(1.5);
        doc.text('Very truly yours,');
        doc.moveDown(1.8);

        // Optional E-Signature
        const signatureRelPath = this.configService.get<string>(
          'email.signaturePath',
          'uploads/static/peso_manager_signature.png',
        );
        const signatureAbsPath = resolve(process.cwd(), signatureRelPath);
        if (existsSync(signatureAbsPath)) {
          try {
            doc.image(signatureAbsPath, doc.x, doc.y - 35, {
              width: 120,
              height: 40,
            });
          } catch (sigErr) {
            this.logger.warn(`Could not render signature image: ${sigErr}`);
          }
        }

        doc.font('Helvetica-Bold').fontSize(11).text(managerName);
        doc.font('Helvetica').fontSize(10).text(managerTitle);
        doc.text(managerOffice);

        doc.moveDown(1.5);

        // --- DIVIDER LINES ---
        const startX = doc.page.margins.left;
        const endX = doc.page.width - doc.page.margins.right;
        let currentY = doc.y;

        doc
          .strokeColor('#333333')
          .lineWidth(0.8)
          .dash(4, { space: 2 })
          .moveTo(startX, currentY)
          .lineTo(endX, currentY)
          .stroke();

        currentY += 4;
        doc
          .moveTo(startX, currentY)
          .lineTo(endX, currentY)
          .stroke();

        doc.undash();
        doc.y = currentY + 12;

        // --- RETURN SLIP SECTION ---
        doc
          .font('Helvetica-Bold')
          .fontSize(11.5)
          .text('R E T U R N   S L I P', { align: 'center', characterSpacing: 2 });
        doc.moveDown(1.2);

        const slipX = startX + 10;
        doc.fontSize(10).font('Helvetica');

        doc.text('Name of Student:   ', slipX, doc.y, { continued: true });
        doc.font('Helvetica-Bold').text(studentName);
        doc.moveDown(0.4);

        doc.font('Helvetica').text('Name of Company:   ', slipX, doc.y, { continued: true });
        doc.font('Helvetica-Bold').text(companyName);
        doc.moveDown(0.6);

        doc.font('Helvetica').text('Action Taken:', slipX);
        doc.moveDown(0.4);

        const checkIndent = slipX + 30;
        doc.text('(   )  Qualified for Internship in this company/organization', checkIndent);
        doc.moveDown(0.3);
        doc.text('(   )  For further evaluation/under process', checkIndent);
        doc.moveDown(0.3);
        doc.text('(   )  Not qualified', checkIndent);

        doc.moveDown(2);

        // Signature line on bottom-right
        const sigLineY = doc.y + 15;
        const sigLineStartX = doc.page.width - doc.page.margins.right - 230;
        const sigLineEndX = doc.page.width - doc.page.margins.right - 10;

        doc
          .strokeColor('#000000')
          .lineWidth(0.8)
          .moveTo(sigLineStartX, sigLineY)
          .lineTo(sigLineEndX, sigLineY)
          .stroke();

        doc
          .fontSize(9.5)
          .font('Helvetica-Oblique')
          .text(
            'Name and Signature of HR Officer',
            sigLineStartX,
            sigLineY + 5,
            { width: sigLineEndX - sigLineStartX, align: 'center' },
          );

        doc.end();

        writeStream.on('finish', () => {
          resolvePromise();
        });

        writeStream.on('error', (err) => {
          rejectPromise(err);
        });
      } catch (err) {
        rejectPromise(err);
      }
    });
  }
}
