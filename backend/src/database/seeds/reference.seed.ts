import type { DataSource, EntityManager } from 'typeorm';

export const REQUIRED_INDUSTRIES = [
  'Accounting/ Finance',
  'Customer Service/ Retail',
  'Engineering',
  'Healthcare',
  'Hospitality/ Tourism',
  'Human Resources',
  'Information Technology',
  'Office Administration',
] as const;

export const REQUIRED_REQUIREMENT_TYPES = [
  'Proof of Residency',
  'Latest Credential',
  'Curriculum Vitae/ Resume',
  'Letter of Intent',
  'Recommendation Letter/ Registration Form',
] as const;

export interface ReferenceSeedResult {
  industriesInserted: number;
  industriesCanonicalized: number;
  requirementTypesInserted: number;
  requirementTypesCanonicalized: number;
}

interface IndustryRow {
  industry_id: number;
  industry_name: string;
  is_custom_text: boolean;
}

interface RequirementTypeRow {
  requirement_type_id: number;
  requirement_type_name: string;
}

async function seedIndustry(
  manager: EntityManager,
  industryName: string,
): Promise<'inserted' | 'canonicalized' | 'unchanged'> {
  const existing = await manager.query<IndustryRow[]>(
    `SELECT industry_id, industry_name, is_custom_text
       FROM public.industry
      WHERE lower(industry_name) = lower($1)
      FOR UPDATE`,
    [industryName],
  );

  if (existing.length > 1) {
    throw new Error(
      `Reference industry ${industryName} has multiple case-insensitive matches.`,
    );
  }

  if (existing[0]) {
    if (existing[0].is_custom_text) {
      throw new Error(
        `Reference industry ${industryName} already exists as the student-only custom industry.`,
      );
    }
    if (existing[0].industry_name !== industryName) {
      await manager.query(
        `UPDATE public.industry
            SET industry_name = $1
          WHERE industry_id = $2`,
        [industryName, existing[0].industry_id],
      );
      return 'canonicalized';
    }
    return 'unchanged';
  }

  await manager.query(
    `INSERT INTO public.industry (industry_name, is_custom_text)
     VALUES ($1, false)`,
    [industryName],
  );
  return 'inserted';
}

async function seedRequirementType(
  manager: EntityManager,
  requirementTypeName: string,
): Promise<'inserted' | 'canonicalized' | 'unchanged'> {
  const existing = await manager.query<RequirementTypeRow[]>(
    `SELECT requirement_type_id, requirement_type_name
       FROM public.requirement_type
      WHERE lower(requirement_type_name) = lower($1)
      FOR UPDATE`,
    [requirementTypeName],
  );

  if (existing.length > 1) {
    throw new Error(
      `Reference requirement type ${requirementTypeName} has multiple case-insensitive matches.`,
    );
  }

  if (existing[0]) {
    if (existing[0].requirement_type_name !== requirementTypeName) {
      await manager.query(
        `UPDATE public.requirement_type
            SET requirement_type_name = $1
          WHERE requirement_type_id = $2`,
        [requirementTypeName, existing[0].requirement_type_id],
      );
      return 'canonicalized';
    }
    return 'unchanged';
  }

  await manager.query(
    `INSERT INTO public.requirement_type (requirement_type_name)
     VALUES ($1)`,
    [requirementTypeName],
  );
  return 'inserted';
}

export async function seedReferenceData(
  dataSource: DataSource,
): Promise<ReferenceSeedResult> {
  return dataSource.transaction(async (manager) => {
    await manager.query(
      `SELECT pg_advisory_xact_lock(hashtext('internet.reference-seed.v1'))`,
    );

    const result: ReferenceSeedResult = {
      industriesInserted: 0,
      industriesCanonicalized: 0,
      requirementTypesInserted: 0,
      requirementTypesCanonicalized: 0,
    };

    for (const industryName of REQUIRED_INDUSTRIES) {
      const outcome = await seedIndustry(manager, industryName);
      if (outcome === 'inserted') result.industriesInserted += 1;
      if (outcome === 'canonicalized') result.industriesCanonicalized += 1;
    }

    for (const requirementTypeName of REQUIRED_REQUIREMENT_TYPES) {
      const outcome = await seedRequirementType(manager, requirementTypeName);
      if (outcome === 'inserted') result.requirementTypesInserted += 1;
      if (outcome === 'canonicalized') {
        result.requirementTypesCanonicalized += 1;
      }
    }

    return result;
  });
}
