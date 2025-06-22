import { createHash } from 'crypto';

/**
 * Checks if the input is a valid, non-empty string.
 * @param {string} string
 * @returns {boolean}
 */
export function isValidString(string) {
  return typeof string === 'string' && string.trim() !== '';
}

/**
 * Validates if a string is in YYYY-MM-DD date format and is a valid date.
 * @param {string} string
 * @returns {boolean}
 */
export function isValidDate(string) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!string || !dateRegex.test(string)) {
    return false;
  }
  const [year, month, day] = string.split('-').map(Number);
  const isValidYear = year >= 1000 && year <= 9999;
  const isValidMonth = month >= 1 && month <= 12;
  const isValidDay = day >= 1 && day <= new Date(year, month, 0).getDate();

  return isValidYear && isValidMonth && isValidDay;
}

/**
 * Checks if a password is valid: non-empty string and at least 7 characters.
 * @param {string} password
 * @returns {boolean}
 */
export function isValidPassword(password) {
  return isValidString(password) && password.length >= 7;
}

/**
 * Validates an email address format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if the username is valid: string, 4-16 chars, no spaces.
 * @param {string} username
 * @returns {boolean}
 */
export function isValidUsername(username) {
  if (typeof username !== 'string') return false;
  if (username.length < 4 || username.length > 16) return false;
  if (username.includes(' ')) return false;
  return true;
}

/**
 * Generates MD5 hash from a string.
 * @param {string} str - String to hash
 * @returns {string} MD5 hash
 */
export function getMD5(str) {
  return createHash('md5').update(str).digest('hex');
}

/**
 * Generates a random integer between min and max (inclusive).
 * If min > max, they are swapped.
 * @param {number} min
 * @param {number} max
 * @returns {Promise<number>}
 */
export async function getRandomInt(min, max) {
  if (min > max) [min, max] = [max, min];
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
