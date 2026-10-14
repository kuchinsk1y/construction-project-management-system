import { BadRequestException } from '@nestjs/common';

// Relations needed to build each top-level key of the integration project view.
export const PROJECT_FIELD_GROUPS = {
  id: [],
  name: [],
  status: [],
  type: [],
  location: ['country', 'city', 'latitude', 'longitude'],
  dates: ['contractStart', 'contractEnd', 'factStart', 'factEnd'],
  financials: ['netValue', 'currency'],
  contractor: ['id', 'name'],
  manager: ['id', 'firstName', 'lastName', 'email'],
  power: [],
  milestones: [],
  works: [],
  plannedExpenses: [],
  departments: [],
} as const satisfies Record<string, readonly string[]>;

export type ProjectFieldGroup = keyof typeof PROJECT_FIELD_GROUPS;

export const ALLOWED_PROJECT_FIELDS: string[] = Object.entries(
  PROJECT_FIELD_GROUPS,
).flatMap(([group, leaves]) => [
  group,
  ...leaves.map((leaf) => `${group}.${leaf}`),
]);

export function parseProjectFields(raw?: string): string[] | undefined {
  if (raw === undefined) return undefined;

  const fields = [
    ...new Set(
      raw
        .split(',')
        .map((field) => field.trim())
        .filter((field) => field.length > 0),
    ),
  ];
  if (fields.length === 0) {
    throw new BadRequestException('Query parameter "fields" must not be empty');
  }

  const unknown = fields.filter(
    (field) => !ALLOWED_PROJECT_FIELDS.includes(field),
  );
  if (unknown.length > 0) {
    throw new BadRequestException({
      message: `Unknown fields: ${unknown.join(', ')}`,
      allowedFields: ALLOWED_PROJECT_FIELDS,
    });
  }

  return fields;
}

export function fieldGroups(fields?: string[]): Set<ProjectFieldGroup> {
  const groups = fields
    ? fields.map((field) => field.split('.')[0])
    : Object.keys(PROJECT_FIELD_GROUPS);
  return new Set(groups as ProjectFieldGroup[]);
}

export function pickFields(
  source: Record<string, any>,
  fields: string[],
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const field of fields) {
    const [group, leaf] = field.split('.');
    const value = source[group];

    if (leaf === undefined || value == null) {
      result[group] = value ?? null;
    } else if (result[group] !== value) {
      result[group] = { ...result[group], [leaf]: value[leaf] ?? null };
    }
  }

  return result;
}
