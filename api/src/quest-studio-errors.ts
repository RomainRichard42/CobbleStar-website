import type { ZodError } from 'zod';

/** Include the exact field; a bare regex error is not actionable in the editor. */
export function studioValidationMessage(error: ZodError): string {
  return error.issues.slice(0, 12).map(issue => `${issue.path.join('.') || 'Publication'} : ${issue.message}`).join('\n');
}
