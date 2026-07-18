type CanonicalValue =
  null | boolean | number | string | CanonicalValue[] | CanonicalObject;

declare const canonicalObjectBrand: unique symbol;

interface CanonicalObject extends Record<string, CanonicalValue> {
  readonly [canonicalObjectBrand]?: never;
}

const sortedStringArrayKeys = new Set([
  'activeCaseIds',
  'activeDomainIds',
  'activeSkillIds',
  'allCaseIds',
  'applicableVersions',
  'behaviorPatterns',
  'correctOptionIds',
  'criticalErrorOptionIds',
  'domains',
  'environments',
  'evidenceIds',
  'hazardousOptionIds',
  'lifecycleStages',
  'priorityOptionIds',
  'riskTypes',
  'skills',
  'technicalLayers',
]);

const sortedObjectArrayKeys = new Set([
  'activeCases',
  'cases',
  'domains',
  'skills',
]);

function isPlainObject(
  value: CanonicalValue | undefined,
): value is CanonicalObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function identityPart(
  value: CanonicalValue | undefined,
  fallback: string,
): string {
  if (value === null || value === undefined) return fallback;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

function stableObjectIdentity(value: CanonicalObject) {
  const id = value.id ?? value.caseId ?? value.domainId ?? '';
  const version =
    value.version ??
    (isPlainObject(value.metadata) ? value.metadata.version : undefined) ??
    0;
  const path = value.path ?? '';
  return `${identityPart(id, '')}\0${identityPart(version, '0').padStart(16, '0')}\0${identityPart(path, '')}`;
}

function normalizeArray(key: string | undefined, values: CanonicalValue[]) {
  if (
    key !== undefined &&
    sortedStringArrayKeys.has(key) &&
    values.every((value) => typeof value === 'string')
  ) {
    return [...values].sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
  }
  if (
    key !== undefined &&
    sortedObjectArrayKeys.has(key) &&
    values.every(isPlainObject)
  ) {
    return [...values].sort((left, right) =>
      stableObjectIdentity(left).localeCompare(stableObjectIdentity(right)),
    );
  }
  return values;
}

function normalize(value: unknown, key?: string): CanonicalValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical content numbers must be finite.');
    }
    return value;
  }
  if (Array.isArray(value)) {
    return normalizeArray(
      key,
      value.map((entry) => normalize(entry)),
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(
      entries.map(([entryKey, entry]) => [
        entryKey,
        normalize(entry, entryKey),
      ]),
    );
  }
  throw new TypeError(`Unsupported canonical content value: ${typeof value}.`);
}

export function canonicalizeContent(value: unknown): string {
  return JSON.stringify(normalize(value));
}
