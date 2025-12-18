/**
 * Date utilities for parsing and formatting dates from various sources
 */

/**
 * Parse Hostaway submittedAt timestamp to ISO string
 * 
 * Input format: 'YYYY-MM-DD HH:mm:ss' (e.g., '2024-12-15 14:30:45')
 * Output format: ISO 8601 string (e.g., '2024-12-15T14:30:45.000Z')
 * 
 * IMPORTANT: The input is treated as UTC time to avoid timezone surprises.
 * Hostaway API returns timestamps without timezone information, so we assume UTC
 * to ensure consistent behavior across different server/client timezones.
 * 
 * @param s - The Hostaway timestamp string in format 'YYYY-MM-DD HH:mm:ss'
 * @returns ISO 8601 formatted string with UTC timezone
 * @throws Error if the input format is invalid or the date is invalid
 */
export function parseHostawaySubmittedAt(s: string): string {
  if (!s || typeof s !== 'string') {
    throw new Error('Invalid input: expected a non-empty string');
  }

  // Validate format: YYYY-MM-DD HH:mm:ss
  const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  if (!pattern.test(s)) {
    throw new Error(
      `Invalid date format: expected 'YYYY-MM-DD HH:mm:ss', got '${s}'`
    );
  }

  // Split date and time components
  const [datePart, timePart] = s.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);

  // Validate date component ranges
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month} (must be 1-12)`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day} (must be 1-31)`);
  }
  if (hours < 0 || hours > 23) {
    throw new Error(`Invalid hours: ${hours} (must be 0-23)`);
  }
  if (minutes < 0 || minutes > 59) {
    throw new Error(`Invalid minutes: ${minutes} (must be 0-59)`);
  }
  if (seconds < 0 || seconds > 59) {
    throw new Error(`Invalid seconds: ${seconds} (must be 0-59)`);
  }

  // Create UTC date by using Date.UTC() to avoid local timezone interpretation
  const timestamp = Date.UTC(year, month - 1, day, hours, minutes, seconds);

  // Validate that the date is valid (e.g., not Feb 31)
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: '${s}' does not represent a valid date`);
  }

  // Verify the date components match (catches invalid dates like Feb 31)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date: '${s}' is not a valid calendar date`);
  }

  return date.toISOString();
}
