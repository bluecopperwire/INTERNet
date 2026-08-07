import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { PesoPersonnel } from './peso-personnel.entity';
import { Student } from './student.entity';
import { AccountStatus, UserAccount, UserRole } from './user-account.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserAccount)
    private readonly accountRepository: Repository<UserAccount>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(PesoPersonnel)
    private readonly pesoPersonnelRepository: Repository<PesoPersonnel>,
  ) {}

  findByEmail(
    email: string,
    includePassword = false,
  ): Promise<UserAccount | null> {
    const query = this.accountRepository
      .createQueryBuilder('account')
      .where('lower(account.email) = lower(:email)', { email: email.trim() });

    if (includePassword) {
      query.addSelect('account.passwordHash');
    }

    return query.getOne();
  }

  findByEmailIncludingDeleted(
    email: string,
    includePassword = false,
  ): Promise<UserAccount | null> {
    const query = this.accountRepository
      .createQueryBuilder('account')
      .withDeleted()
      .where('lower(account.email) = lower(:email)', { email: email.trim() });

    if (includePassword) {
      query.addSelect('account.passwordHash');
    }

    return query.getOne();
  }

  findById(
    userAccountId: number,
    includePassword = false,
  ): Promise<UserAccount | null> {
    const query = this.accountRepository
      .createQueryBuilder('account')
      .where('account.userAccountId = :userAccountId', { userAccountId });

    if (includePassword) {
      query.addSelect('account.passwordHash');
    }

    return query.getOne();
  }

  findByIdIncludingDeleted(userAccountId: number): Promise<UserAccount | null> {
    return this.accountRepository
      .createQueryBuilder('account')
      .withDeleted()
      .where('account.userAccountId = :userAccountId', { userAccountId })
      .getOne();
  }

  async getMe(userAccountId: number) {
    const account = await this.findById(userAccountId);
    if (!account || account.accountStatus !== AccountStatus.ACTIVE) {
      return null;
    }

    let profile: Record<string, unknown> | null = null;
    if (account.userRole === UserRole.STUDENT) {
      const student = await this.studentRepository.findOneBy({ userAccountId });
      profile = student
        ? {
            studentId: student.studentId,
            firstName: student.firstName,
            middleName: student.middleName,
            lastName: student.lastName,
            extensionName: student.extensionName,
            photoFilePath: student.photoFilePath,
          }
        : null;
    } else if (account.userRole === UserRole.COMPANY) {
      const company = await this.companyRepository.findOneBy({ userAccountId });
      profile = company
        ? {
            companyId: company.companyId,
            companyName: company.companyName,
            logoFilePath: company.logoFilePath,
          }
        : null;
    } else if (account.userRole === UserRole.PESO_PERSONNEL) {
      const personnel = await this.pesoPersonnelRepository.findOneBy({
        userAccountId,
      });
      profile = personnel
        ? {
            pesoPersonnelId: personnel.pesoPersonnelId,
            employeeId: personnel.employeeId,
            firstName: personnel.firstName,
            middleName: personnel.middleName,
            lastName: personnel.lastName,
            extensionName: personnel.extensionName,
          }
        : null;
    }

    return {
      userAccountId: account.userAccountId,
      email: account.email,
      userRole: account.userRole,
      accountStatus: account.accountStatus,
      profile,
    };
  }
}
