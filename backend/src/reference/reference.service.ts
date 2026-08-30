import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Industry } from '../users/entities/account.entities';

export interface IndustryItemDto {
  industryId: number;
  industryName: string;
  isCustomText: boolean;
}

@Injectable()
export class ReferenceService {
  constructor(
    @InjectRepository(Industry)
    private readonly industryRepository: Repository<Industry>,
  ) {}

  async getIndustries(): Promise<IndustryItemDto[]> {
    const industries = await this.industryRepository.find({
      order: { industryName: 'ASC' },
    });
    return industries.map((ind) => ({
      industryId: ind.industryId,
      industryName: ind.industryName,
      isCustomText: ind.isCustomText,
    }));
  }
}
