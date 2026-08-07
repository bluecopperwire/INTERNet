import type { DataSource, EntityManager } from 'typeorm';

export const APPROVED_INDUSTRIES = [
  'Accounting/ Finance',
  'Customer Service/ Retail',
  'Engineering',
  'Healthcare',
  'Hospitality/ Tourism',
  'Human Resources',
  'Information Technology',
  'Office Administration',
] as const;

export type ReferenceSeedResult = {
  industryName: string;
  outcome: 'inserted' | 'already existed' | 'safely corrected';
};

async function seedIndustry(
  manager: EntityManager,
  approvedName: string,
): Promise<ReferenceSeedResult> {
  const matches = await manager.query(
    `SELECT industry_id, industry_name, is_custom_text
     FROM public.industry
     WHERE lower(industry_name) = lower($1)
     FOR UPDATE`,
    [approvedName],
  );

  if (matches.length > 1) {
    throw new Error(
      `Cannot safely seed ${approvedName}: multiple case-insensitive matches exist.`,
    );
  }

  if (matches.length === 0) {
    await manager.query(
      `INSERT INTO public.industry (industry_name, is_custom_text)
       VALUES ($1, false)`,
      [approvedName],
    );
    return { industryName: approvedName, outcome: 'inserted' };
  }

  const existing = matches[0];
  if (
    existing.industry_name === approvedName &&
    existing.is_custom_text === false
  ) {
    return { industryName: approvedName, outcome: 'already existed' };
  }

  await manager.query(
    `UPDATE public.industry
     SET industry_name = $1, is_custom_text = false
     WHERE industry_id = $2`,
    [approvedName, existing.industry_id],
  );
  return { industryName: approvedName, outcome: 'safely corrected' };
}

export async function seedReferenceData(
  dataSource: DataSource,
): Promise<ReferenceSeedResult[]> {
  return dataSource.transaction(async (manager) => {
    const results: ReferenceSeedResult[] = [];
    for (const industryName of APPROVED_INDUSTRIES) {
      results.push(await seedIndustry(manager, industryName));
    }
    return results;
  });
}

export function printReferenceSeedResults(
  results: ReferenceSeedResult[],
): void {
  console.log('Reference industry seed results:');
  for (const result of results) {
    console.log(`- ${result.industryName}: ${result.outcome}`);
  }
}
