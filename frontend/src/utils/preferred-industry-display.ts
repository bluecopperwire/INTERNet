export function formatPreferredIndustries(
  preferredIndustries: string[],
  otherPreferredField?: string,
): string {
  const customField = otherPreferredField?.trim();
  return preferredIndustries
    .map((industry) =>
      industry === 'Other' && customField ? customField : industry,
    )
    .join(', ');
}
