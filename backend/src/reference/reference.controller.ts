import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReferenceService, IndustryItemDto } from './reference.service';

@Controller('reference')
@UseGuards(JwtAuthGuard)
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get('industries')
  async getIndustries(): Promise<IndustryItemDto[]> {
    return this.referenceService.getIndustries();
  }
}
