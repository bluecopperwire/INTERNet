import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { setStatusActor } from '../database/status-actor.transaction';
import { StorageService } from '../storage/private-file-storage';
import {
  AccountStatus,
  Company,
  Industry,
  LocalAuthenticationCredential,
  PersonnelVerificationStatus,
  PesoPersonnel,
  UserAccount,
  UserRole,
} from './entities/account.entities';
import {
  CorrectPesoPersonnelDto,
  CreateCompanyAccountDto,
  CreatePesoPersonnelAccountDto,
} from './dto/account-management.dto';

@Injectable()
export class AccountManagementService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async createCompany(
    dto: CreateCompanyAccountDto,
  ): Promise<{ userAccountId: number; companyId: number }> {
    return this.dataSource.transaction(async (manager) => {
      const industry = await manager.findOne(Industry, {
        where: { industryId: dto.industryId },
      });
      if (!industry || industry.isCustomText)
        throw new ConflictException(
          'Company requires a valid non-custom industry',
        );
      const existing = await manager
        .getRepository(UserAccount)
        .createQueryBuilder('a')
        .where('lower(a.email)=lower(:email)', { email: dto.email })
        .getOne();
      if (existing) throw new ConflictException('Email already in use');
      const account = await manager.save(
        UserAccount,
        manager.create(UserAccount, {
          email: dto.email.toLowerCase(),
          userRole: UserRole.COMPANY,
          accountStatus: AccountStatus.ACTIVE,
          deletedAt: null,
        }),
      );
      await manager.save(
        LocalAuthenticationCredential,
        manager.create(LocalAuthenticationCredential, {
          userAccountId: account.userAccountId,
          passwordHash: await bcrypt.hash(dto.password, 10),
          passwordChangedAt: new Date(),
        }),
      );
      const company = await manager.save(
        Company,
        manager.create(Company, {
          userAccountId: account.userAccountId,
          industryId: dto.industryId,
          companyName: dto.companyName,
          companyType: dto.companyType,
          description: dto.description,
          websiteUrl: dto.websiteUrl ?? null,
          yearEstablished: dto.yearEstablished ?? null,
          companySize: dto.companySize ?? null,
          contactEmail: dto.contactEmail,
          contactNumber: dto.contactNumber,
          contactPersonFirstName: dto.contactPersonFirstName,
          contactPersonMiddleName: dto.contactPersonMiddleName ?? null,
          contactPersonLastName: dto.contactPersonLastName,
          contactPersonExtensionName: dto.contactPersonExtensionName ?? null,
          addressLine: dto.addressLine,
          addressBarangay: dto.addressBarangay,
          addressDistrict: dto.addressDistrict ?? null,
          addressCity: dto.addressCity,
          logoFilePath: dto.logoFilePath,
        }),
      );
      return {
        userAccountId: account.userAccountId,
        companyId: company.companyId,
      };
    });
  }

  async verificationStatus(userAccountId: number): Promise<PesoPersonnel> {
    const personnel = await this.dataSource
      .getRepository(PesoPersonnel)
      .findOne({ where: { userAccountId } });
    if (!personnel) throw new NotFoundException('QC PESO profile not found');
    return personnel;
  }

  pendingVerifications(): Promise<PesoPersonnel[]> {
    return this.dataSource.getRepository(PesoPersonnel).find({
      where: { verificationStatus: PersonnelVerificationStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async decideVerification(
    pesoPersonnelId: number,
    adminAccountId: number,
    status:
      | PersonnelVerificationStatus.APPROVED
      | PersonnelVerificationStatus.REJECTED,
    remark?: string,
  ): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await setStatusActor(runner, adminAccountId);
      const result = await runner.manager.update(
        PesoPersonnel,
        {
          pesoPersonnelId,
          verificationStatus: PersonnelVerificationStatus.PENDING,
        },
        {
          verificationStatus: status,
          reviewedAt: new Date(),
          reviewedByUserAccountId: adminAccountId,
          verificationRemark: remark?.trim() || null,
        },
      );
      if (!result.affected)
        throw new ConflictException('Verification is not pending');
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async correctRejected(
    userAccountId: number,
    dto: CorrectPesoPersonnelDto,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(PesoPersonnel);
    const current = await repo.findOne({ where: { userAccountId } });
    if (
      !current ||
      current.verificationStatus !== PersonnelVerificationStatus.REJECTED
    ) {
      throw new ForbiddenException(
        'Corrections are available only after rejection',
      );
    }
    let newKey: string | undefined;
    if (dto.employeeIdFileBase64 && dto.employeeIdFileMimeType) {
      newKey = await this.storage.storeEmployeeId({
        data: Buffer.from(dto.employeeIdFileBase64, 'base64'),
        mimeType: dto.employeeIdFileMimeType,
        originalName: dto.employeeIdFileName,
      });
    }
    try {
      await repo.update(
        { pesoPersonnelId: current.pesoPersonnelId },
        {
          ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
          ...(dto.position ? { position: dto.position } : {}),
          ...(dto.department ? { department: dto.department } : {}),
          ...(dto.contactNumber ? { contactNumber: dto.contactNumber } : {}),
          ...(dto.addressLine ? { addressLine: dto.addressLine } : {}),
          ...(dto.addressBarangay
            ? { addressBarangay: dto.addressBarangay }
            : {}),
          ...(dto.addressDistrict
            ? { addressDistrict: dto.addressDistrict }
            : {}),
          ...(dto.addressCity ? { addressCity: dto.addressCity } : {}),
          ...(newKey ? { employeeIdFilePath: newKey } : {}),
        },
      );
      if (newKey) await this.storage.delete(current.employeeIdFilePath);
    } catch (error) {
      if (newKey) await this.storage.delete(newKey);
      throw error;
    }
  }

  async resubmit(userAccountId: number): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await setStatusActor(runner, userAccountId);
      const result = await runner.manager.update(
        PesoPersonnel,
        {
          userAccountId,
          verificationStatus: PersonnelVerificationStatus.REJECTED,
        },
        {
          verificationStatus: PersonnelVerificationStatus.PENDING,
          reviewedAt: null,
          reviewedByUserAccountId: null,
          verificationRemark: null,
        },
      );
      if (!result.affected)
        throw new ConflictException(
          'Only a rejected verification can be resubmitted',
        );
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async createPesoPersonnel(
    dto: CreatePesoPersonnelAccountDto,
    adminAccountId: number,
  ): Promise<{ userAccountId: number; pesoPersonnelId: number }> {
    const fileKey = await this.storage.storeEmployeeId({
      data: Buffer.from(dto.employeeIdFileBase64, 'base64'),
      mimeType: dto.employeeIdFileMimeType,
      originalName: dto.employeeIdFileName,
    });
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existing = await manager
          .getRepository(UserAccount)
          .createQueryBuilder('a')
          .where('lower(a.email)=lower(:email)', { email: dto.email })
          .getOne();
        if (existing) throw new ConflictException('Email already in use');

        const account = await manager.save(
          UserAccount,
          manager.create(UserAccount, {
            email: dto.email.trim().toLowerCase(),
            userRole: UserRole.PESO_PERSONNEL,
            accountStatus: AccountStatus.ACTIVE,
            deletedAt: null,
          }),
        );
        await manager.save(
          LocalAuthenticationCredential,
          manager.create(LocalAuthenticationCredential, {
            userAccountId: account.userAccountId,
            passwordHash: await bcrypt.hash(dto.password, 10),
            passwordChangedAt: new Date(),
          }),
        );
        const personnel = await manager.save(
          PesoPersonnel,
          manager.create(PesoPersonnel, {
            userAccountId: account.userAccountId,
            firstName: dto.firstName,
            middleName: dto.middleName ?? null,
            lastName: dto.lastName,
            extensionName: dto.extensionName ?? null,
            sex: dto.sex,
            birthDate: dto.birthDate,
            addressLine: dto.addressLine,
            addressBarangay: dto.addressBarangay,
            addressDistrict: dto.addressDistrict,
            addressCity: dto.addressCity,
            contactNumber: dto.contactNumber,
            contactEmail: account.email,
            employeeId: dto.employeeId,
            position: dto.position,
            department: dto.department,
            employeeIdFilePath: fileKey,
            photoFilePath: dto.photoFilePath ?? null,
            verificationStatus: PersonnelVerificationStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedByUserAccountId: adminAccountId,
            verificationRemark: null,
          }),
        );
        return {
          userAccountId: account.userAccountId,
          pesoPersonnelId: personnel.pesoPersonnelId,
        };
      });
    } catch (error) {
      await this.storage.delete(fileKey);
      throw error;
    }
  }
}
