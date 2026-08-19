export const MAX_REQUESTS_PER_MINUTE = 1_000_000;

export type RequestsPerMinuteError = 'integer' | 'max';

const INTEGER_PATTERN = /^\d+$/;

export const validateRequestsPerMinuteText = (value: string): RequestsPerMinuteError | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!INTEGER_PATTERN.test(trimmed)) return 'integer';

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed)) return 'integer';
  return parsed > MAX_REQUESTS_PER_MINUTE ? 'max' : null;
};

export const parseRequestsPerMinuteText = (value: string): number | undefined => {
  if (validateRequestsPerMinuteText(value)) return undefined;
  const trimmed = value.trim();
  return trimmed ? Number.parseInt(trimmed, 10) : undefined;
};

export const readRequestsPerMinute = (value: unknown): number | undefined => {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
  return parseRequestsPerMinuteText(text);
};
