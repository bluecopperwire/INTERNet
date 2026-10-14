import type { SelectHTMLAttributes } from 'react';
import { DISTRICT_OPTIONS, normalizeDistrictOption } from '../utils/district';

interface DistrictSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'children'> {
  value: string | null | undefined;
}

export function DistrictSelect({ value, ...props }: DistrictSelectProps) {
  return (
    <select {...props} required value={normalizeDistrictOption(value)}>
      <option value="" disabled>Select district</option>
      {DISTRICT_OPTIONS.map((district) => (
        <option key={district} value={district}>{district}</option>
      ))}
    </select>
  );
}
