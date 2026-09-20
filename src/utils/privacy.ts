/**
 * Privacy and data sanitization utilities for production AI observability.
 */

/**
 * Masks a full name for privacy compliance while keeping logs recognizable.
 * Example: "Carlos Mendoza" -> "C***** M******"
 */
export function maskName(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((word) => (word.length <= 1 ? word : `${word[0]}${'*'.repeat(word.length - 1)}`))
    .join(' ');
}

/**
 * Redacts personal identifiers such as email addresses and numerical IDs.
 */
export function sanitizeUserNotes(notes: string): string {
  return notes
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/\b\d{8,16}\b/g, '[REDACTED_ID]');
}
