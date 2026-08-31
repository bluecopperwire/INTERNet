import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { UpdateEmployerProfileDto } from '../dto';
import { EmployerCompanyResolver } from './company-resolver.service';
import { ProfilePictureStorageService } from '../../storage/profile-picture-storage.service';
import { currentManilaDate } from '../utils/time.utils';

type ProfileRow = Record<string, unknown>;

@Injectable()
export class EmployerProfileService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly companyResolver: EmployerCompanyResolver,
    private readonly profilePictures: ProfilePictureStorageService,
  ) {}

  async getProfile(userAccountId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    const rows: ProfileRow[] = await this.dataSource.query(
      `
        SELECT c.*, i.industry_name
        FROM public.company c
        JOIN public.industry i ON i.industry_id = c.industry_id
        WHERE c.company_id = $1
      `,
      [company.companyId],
    );
    return this.mapProfile(rows[0]);
  }

  async updateProfile(userAccountId: number, dto: UpdateEmployerProfileDto) {
    const company = await this.companyResolver.resolve(userAccountId);
    const currentRows: ProfileRow[] = await this.dataSource.query(
      'SELECT * FROM public.company WHERE company_id = $1',
      [company.companyId],
    );
    const current = currentRows[0];

    let industryId = Number(current.industry_id);
    if (dto.industryName !== undefined) {
      const industries: Array<{ industry_id: number }> =
        await this.dataSource.query(
          `
          SELECT industry_id
          FROM public.industry
          WHERE lower(industry_name) = lower($1)
            AND is_custom_text = false
          ORDER BY industry_id
          LIMIT 1
        `,
          [dto.industryName],
        );
      if (!industries[0]) {
        throw new BadRequestException(
          'industryName must match a standardized industry.',
        );
      }
      industryId = Number(industries[0].industry_id);
    }

    const maxYear = Number(currentManilaDate().slice(0, 4));
    if (dto.yearEstablished !== undefined && dto.yearEstablished !== null) {
      if (dto.yearEstablished > maxYear) {
        throw new BadRequestException(
          'yearEstablished cannot be in the future.',
        );
      }
    }

    await this.dataSource.query(
      `
        UPDATE public.company
        SET industry_id = $2,
            company_name = $3,
            company_type = $4,
            description = $5,
            website_url = $6,
            year_established = $7,
            company_size = $8,
            contact_email = $9,
            contact_number = $10,
            contact_person_first_name = $11,
            contact_person_middle_name = $12,
            contact_person_last_name = $13,
            contact_person_extension_name = $14,
            address_line = $15,
            address_barangay = $16,
            address_district = $17,
            address_city = $18
        WHERE company_id = $1
      `,
      [
        company.companyId,
        industryId,
        dto.companyName ?? current.company_name,
        dto.companyType ?? current.company_type,
        dto.description ?? current.description,
        dto.websiteUrl === undefined ? current.website_url : dto.websiteUrl,
        dto.yearEstablished === undefined
          ? current.year_established
          : dto.yearEstablished,
        dto.companySize === undefined ? current.company_size : dto.companySize,
        dto.contactEmail ?? current.contact_email,
        dto.contactNumber ?? current.contact_number,
        dto.contactPersonFirstName ?? current.contact_person_first_name,
        dto.contactPersonMiddleName === undefined
          ? current.contact_person_middle_name
          : dto.contactPersonMiddleName,
        dto.contactPersonLastName ?? current.contact_person_last_name,
        dto.contactPersonExtensionName === undefined
          ? current.contact_person_extension_name
          : dto.contactPersonExtensionName,
        dto.addressLine ?? current.address_line,
        dto.addressBarangay ?? current.address_barangay,
        dto.addressDistrict === undefined
          ? current.address_district
          : dto.addressDistrict,
        dto.addressCity ?? current.address_city,
      ],
    );
    return this.getProfile(userAccountId);
  }

  async replaceLogo(userAccountId: number, file: Express.Multer.File) {
    const company = await this.companyResolver.resolve(userAccountId);
    const rows: Array<{ logo_file_path: string | null; company_name: string }> =
      await this.dataSource.query(
        'SELECT logo_file_path, company_name FROM public.company WHERE company_id = $1',
        [company.companyId],
      );
    const oldPath = rows[0]?.logo_file_path ?? null;
    const newPath = await this.profilePictures.storeCompany(file, {
      userAccountId,
      companyName: rows[0].company_name,
    });
    try {
      await this.dataSource.query(
        `UPDATE public.company
         SET logo_file_path = $2, updated_at = CURRENT_TIMESTAMP
         WHERE company_id = $1`,
        [company.companyId, newPath],
      );
    } catch (error) {
      if (oldPath !== newPath) await this.profilePictures.delete(newPath);
      throw error;
    }
    if (oldPath !== newPath) {
      try {
        await this.profilePictures.delete(oldPath);
      } catch {
        // The new DB reference remains valid if an obsolete file cannot be removed.
      }
    }
    return { logoFilePath: newPath };
  }

  private mapProfile(row: ProfileRow) {
    return {
      companyId: Number(row.company_id),
      companyName: row.company_name,
      companyType: row.company_type,
      industryId: Number(row.industry_id),
      industryName: row.industry_name,
      description: row.description,
      websiteUrl: row.website_url,
      yearEstablished:
        row.year_established === null ? null : Number(row.year_established),
      companySize: row.company_size === null ? null : Number(row.company_size),
      addressLine: row.address_line,
      addressBarangay: row.address_barangay,
      addressDistrict: row.address_district,
      addressCity: row.address_city,
      contactEmail: row.contact_email,
      contactNumber: row.contact_number,
      contactPersonFirstName: row.contact_person_first_name,
      contactPersonMiddleName: row.contact_person_middle_name,
      contactPersonLastName: row.contact_person_last_name,
      contactPersonExtensionName: row.contact_person_extension_name,
      logoFilePath: row.logo_file_path,
      updatedAt: row.updated_at,
    };
  }
}
