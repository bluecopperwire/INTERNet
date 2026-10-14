import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { EmailService } from './email.service';
import {
  EmailAttachment,
  EmailJob,
  ReferralEmailPayload,
  EmployerCredentialsEmailPayload,
  SendEmailOptions,
} from './email.interfaces';

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private queue: EmailJob[] = [];
  private isProcessing = false;
  private isDestroyed = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    this.logger.log('Email Queue Worker initialized.');
    this.startWorker();
  }

  onModuleDestroy() {
    this.isDestroyed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async enqueue(options: SendEmailOptions): Promise<EmailJob> {
    const maxRetries = this.configService.get<number>(
      'email.maxRetries',
      3,
    );
    const job: EmailJob = {
      id: randomUUID(),
      options,
      status: 'pending',
      attempts: 0,
      maxAttempts: maxRetries,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.queue.push(job);
    this.logger.log(
      `Enqueued email job ${job.id} for "${options.to}" (Queue size: ${this.queue.length})`,
    );

    this.triggerProcessing();
    return job;
  }

  async enqueueReferralEmail(
    payload: ReferralEmailPayload,
  ): Promise<EmailJob> {
    const { subject, text, html } =
      this.emailService.buildReferralCoverLetter(payload);

    const attachments: EmailAttachment[] = [];

    if (payload.referralPdfPath) {
      attachments.push({
        filename:
          payload.referralPdfPath.split(/[/\\]/).pop() || 'Referral_Letter.pdf',
        path: payload.referralPdfPath,
        contentType: 'application/pdf',
      });
    }

    const watermarkRelPath = this.configService.get<string>(
      'email.watermarkPath',
      'uploads/static/qc_peso_seal.png',
    );
    const watermarkAbsPath = resolve(process.cwd(), watermarkRelPath);
    if (existsSync(watermarkAbsPath)) {
      attachments.push({
        filename: 'qc_peso_logo.png',
        path: watermarkAbsPath,
        cid: 'peso_logo',
      });
    }

    return this.enqueue({
      to: payload.companyContactEmail,
      fallbackTo: payload.companyAccountEmail,
      subject,
      text,
      html,
      attachments,
      metadata: {
        type: 'referral_letter',
        opportunityId: payload.opportunityId,
        studentId: payload.studentId,
        companyName: payload.companyName,
      },
    });
  }

  async enqueueEmployerCredentialsEmail(
    payload: EmployerCredentialsEmailPayload,
  ): Promise<EmailJob> {
    const { subject, text, html } =
      this.emailService.buildEmployerCredentialsEmail(payload);

    const attachments: EmailAttachment[] = [];
    const watermarkRelPath = this.configService.get<string>(
      'email.watermarkPath',
      'uploads/static/qc_peso_seal.png',
    );
    const watermarkAbsPath = resolve(process.cwd(), watermarkRelPath);
    if (existsSync(watermarkAbsPath)) {
      attachments.push({
        filename: 'qc_peso_logo.png',
        path: watermarkAbsPath,
        cid: 'peso_logo',
      });
    }

    const contactEmail = payload.contactEmail.trim();
    const accountEmail = payload.accountEmail.trim();
    const isDistinct =
      contactEmail.toLowerCase() !== accountEmail.toLowerCase();

    return this.enqueue({
      to: contactEmail,
      cc: isDistinct ? accountEmail : undefined,
      fallbackTo: accountEmail,
      subject,
      text,
      html,
      attachments,
      metadata: {
        type: 'employer_credentials',
        companyName: payload.companyName,
        accountEmail: payload.accountEmail,
        contactEmail: payload.contactEmail,
      },
    });
  }

  getJob(id: string): EmailJob | undefined {
    return this.queue.find((j) => j.id === id);
  }

  getAllJobs(): EmailJob[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.filter(
      (j) => j.status === 'pending' || j.status === 'processing',
    ).length;
  }

  private triggerProcessing() {
    if (this.isProcessing || this.isDestroyed) return;
    this.startWorker();
  }

  private async startWorker() {
    if (this.isProcessing || this.isDestroyed) return;
    this.isProcessing = true;

    try {
      while (!this.isDestroyed) {
        const nextJob = this.queue.find((j) => j.status === 'pending');
        if (!nextJob) {
          break;
        }

        nextJob.status = 'processing';
        nextJob.attempts += 1;
        nextJob.updatedAt = new Date();

        const delayMs = this.configService.get<number>(
          'email.queueDelayMs',
          2000,
        );

        try {
          this.logger.log(
            `Processing email job ${nextJob.id} (Attempt ${nextJob.attempts}/${nextJob.maxAttempts}) to: ${nextJob.options.to}`,
          );

          const result = await this.emailService.sendDirect(nextJob.options);
          nextJob.status = 'sent';
          nextJob.sentTo = result.recipient;
          nextJob.updatedAt = new Date();
          this.logger.log(
            `Email job ${nextJob.id} completed successfully to: ${result.recipient}`,
          );
        } catch (error: any) {
          nextJob.lastError = error?.message || String(error);
          nextJob.updatedAt = new Date();

          if (nextJob.attempts < nextJob.maxAttempts) {
            nextJob.status = 'pending';
            const backoffMs = Math.min(
              1000 * Math.pow(2, nextJob.attempts) * 2,
              60000,
            );
            this.logger.warn(
              `Email job ${nextJob.id} failed: "${nextJob.lastError}". Retrying in ${backoffMs}ms...`,
            );
            await this.sleep(backoffMs);
          } else {
            nextJob.status = 'failed';
            this.logger.error(
              `[DEAD LETTER] Email job ${nextJob.id} permanently failed after ${nextJob.attempts} attempts. Last error: ${nextJob.lastError}`,
            );
          }
        }

        // Apply inter-job delay to honor Gmail rate limiting
        if (!this.isDestroyed && delayMs > 0) {
          await this.sleep(delayMs);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timer = setTimeout(resolve, ms);
    });
  }
}
