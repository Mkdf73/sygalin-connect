import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Valide si un numéro de téléphone est un format valide pour le Cameroun.
 * Formats acceptés : 
 * - 9 chiffres commençant par 6 (ex: 699000000)
 * - 237 suivi de 9 chiffres (ex: 237699000000)
 * - +237 suivi de 9 chiffres (ex: +237699000000)
 */
export function isValidCameroonPhone(phone: string): boolean {
  if (!phone) return false;
  
  // Supprimer tout ce qui n'est pas un chiffre ou le signe +
  const clean = phone.replace(/[^\d+]/g, '');
  
  // Format local : 9 chiffres commençant par 6
  if (/^6\d{8}$/.test(clean)) return true;
  
  // Format international : +2376... ou 2376...
  if (/^(\+?237)6\d{8}$/.test(clean)) return true;
  
  return false;
}

/**
 * Valide un numéro de carte bancaire via l'algorithme de Luhn.
 */
export function isValidCardNumber(number: string): boolean {
  const clean = number.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  
  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i));
    if (shouldDouble) {
      if ((digit *= 2) > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/**
 * Valide une date d'expiration au format MM/YY.
 */
export function isValidExpiryDate(expiry: string): boolean {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return false;
  const [month, year] = expiry.split('/').map(Number);
  if (month < 1 || month > 12) return false;
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear() % 100; // Get last 2 digits
  
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  
  return true;
}

/**
 * Valide un code CVV (3 ou 4 chiffres).
 */
export function isValidCvv(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}
