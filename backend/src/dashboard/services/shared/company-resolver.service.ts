import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class CompanyResolverService {
  constructor(private readonly dataSource: DataSource) {}

  async resolveCompanyId(userAccountId: number): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT company_id FROM public.company WHERE user_account_id = $1`,
      [userAccountId],
    );

    if (!rows || rows.length === 0) {
      throw new ForbiddenException(
        'User is not associated with an active company profile.',
      );
    }

    return Number(rows[0].company_id);
  }
}
