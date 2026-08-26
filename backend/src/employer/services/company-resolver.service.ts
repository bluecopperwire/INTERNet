import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, QueryRunner } from 'typeorm';
import type { CompanyIdentity } from '../types/employer.types';

type QueryExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

@Injectable()
export class EmployerCompanyResolver {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resolve(
    userAccountId: number,
    executor: QueryExecutor = this.dataSource,
  ): Promise<CompanyIdentity> {
    const rows: Array<{ company_id: number; user_account_id: number }> =
      await executor.query(
        `
          SELECT company_id, user_account_id
          FROM public.company
          WHERE user_account_id = $1
        `,
        [userAccountId],
      );
    const company = rows[0];
    if (!company) {
      throw new NotFoundException('Company profile not found');
    }
    return {
      companyId: Number(company.company_id),
      userAccountId: Number(company.user_account_id),
    };
  }
}
