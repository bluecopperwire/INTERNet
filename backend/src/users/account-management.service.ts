import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import {
  AccountStatus,
  Company,
  Industry,
  LocalAuthenticationCredential,
  PesoPersonnel,
  UserAccount,
  UserRole,
} from './entities/account.entities';
import {
  CreateCompanyAccountDto,
  CreatePesoPersonnelAccountDto,
} from './dto/account-management.dto';
import { UpdatePesoProfileDto } from './dto/peso-profile.dto';

@Injectable()
export class AccountManagementService {
  constructor(private readonly dataSource: DataSource) {}

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
          logoFilePath: dto.logoFilePath ?? null,
        }),
      );
      return {
        userAccountId: account.userAccountId,
        companyId: company.companyId,
      };
    });
  }

  async createPesoPersonnel(
    dto: CreatePesoPersonnelAccountDto,
    adminAccountId: number,
  ): Promise<{ userAccountId: number; pesoPersonnelId: number }> {
    void adminAccountId;
    return this.dataSource.transaction(async (manager) => {
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
          photoFilePath: dto.photoFilePath ?? null,
        }),
      );
      return {
        userAccountId: account.userAccountId,
        pesoPersonnelId: personnel.pesoPersonnelId,
      };
    });
  }

  async getPesoProfile(userAccountId: number) {
    const pesoRepo = this.dataSource.getRepository(PesoPersonnel);
    const accountRepo = this.dataSource.getRepository(UserAccount);
    const peso = await pesoRepo.findOne({ where: { userAccountId } });
    if (!peso) {
      throw new NotFoundException('PESO personnel profile not found');
    }
    const account = await accountRepo.findOne({ where: { userAccountId } });
    return {
      pesoPersonnelId: peso.pesoPersonnelId,
      userAccountId: peso.userAccountId,
      firstName: peso.firstName,
      middleName: peso.middleName,
      lastName: peso.lastName,
      extensionName: peso.extensionName,
      sex: peso.sex,
      birthDate: peso.birthDate,
      addressLine: peso.addressLine,
      addressBarangay: peso.addressBarangay,
      addressDistrict: peso.addressDistrict,
      addressCity: peso.addressCity,
      contactNumber: peso.contactNumber,
      contactEmail: peso.contactEmail,
      employeeId: peso.employeeId,
      position: peso.position,
      department: peso.department,
      photoFilePath: peso.photoFilePath,
      email: account?.email,
      accountStatus: account?.accountStatus,
    };
  }

  async updatePesoProfile(userAccountId: number, dto: UpdatePesoProfileDto) {
    const pesoRepo = this.dataSource.getRepository(PesoPersonnel);
    const peso = await pesoRepo.findOne({ where: { userAccountId } });
    if (!peso) {
      throw new NotFoundException('PESO personnel profile not found');
    }

    const updates: Partial<PesoPersonnel> = {};
    if (dto.firstName !== undefined) updates.firstName = dto.firstName;
    if (dto.middleName !== undefined)
      updates.middleName = dto.middleName?.trim() || null;
    if (dto.lastName !== undefined) updates.lastName = dto.lastName;
    if (dto.extensionName !== undefined)
      updates.extensionName = dto.extensionName?.trim() || null;
    if (dto.sex !== undefined) updates.sex = dto.sex;
    if (dto.birthDate !== undefined) updates.birthDate = dto.birthDate as any;
    if (dto.addressLine !== undefined) updates.addressLine = dto.addressLine;
    if (dto.addressBarangay !== undefined)
      updates.addressBarangay = dto.addressBarangay;
    if (dto.addressDistrict !== undefined)
      updates.addressDistrict = dto.addressDistrict;
    if (dto.addressCity !== undefined) updates.addressCity = dto.addressCity;
    if (dto.contactNumber !== undefined)
      updates.contactNumber = dto.contactNumber;
    if (dto.contactEmail !== undefined) updates.contactEmail = dto.contactEmail;
    if (dto.employeeId !== undefined) updates.employeeId = dto.employeeId;
    if (dto.position !== undefined) updates.position = dto.position;
    if (dto.department !== undefined) updates.department = dto.department;
    if (dto.photoFilePath !== undefined)
      updates.photoFilePath = dto.photoFilePath;

    await pesoRepo.update({ userAccountId }, updates);
    return this.getPesoProfile(userAccountId);
  }
}
