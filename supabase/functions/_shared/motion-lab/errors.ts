import { buildJsonResponse } from './cors.ts';

export class MotionLabHttpError extends Error {
  status: number;
  code: string;
  hint: string;
  retryable: boolean;
  details: Record<string, unknown>;

  constructor(
    message: string,
    {
      status = 500,
      code = 'motion_lab_service_unavailable',
      hint = 'Retry when the Motion Lab service is available.',
      retryable = status >= 500,
      details = {},
    }: {
      status?: number;
      code?: string;
      hint?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = 'MotionLabHttpError';
    this.status = status;
    this.code = code;
    this.hint = hint;
    this.retryable = retryable;
    this.details = details;
  }
}

export function normalizeMotionLabError(error: unknown) {
  if (error instanceof MotionLabHttpError) {
    return error;
  }

  const message = error instanceof Error ? error.message : 'Motion Lab service unavailable.';
  return new MotionLabHttpError(message, {
    status: 500,
    code: 'motion_lab_service_unavailable',
    hint: 'Retry when the Motion Lab service is available.',
    retryable: true,
  });
}

export function buildMotionLabErrorResponse(error: unknown) {
  const normalized = normalizeMotionLabError(error);
  return buildJsonResponse({
    error: normalized.code,
    message: normalized.message,
    hint: normalized.hint,
    retryable: normalized.retryable,
    ...normalized.details,
  }, normalized.status);
}
