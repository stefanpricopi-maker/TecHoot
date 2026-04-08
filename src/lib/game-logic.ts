import { randomInt } from "node:crypto";

/**
 * Generează un cod numeric de **6 cifre** (inclusiv zerouri la început, ex. `004521`).
 * Unicitatea în baza de date se asigură la inserare (reîncercare la coliziune pe `sessions.pin`).
 */
export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Normalizează PIN-ul introdus de jucător: doar cifre, completare la 6 caractere.
 * Returnează `null` dacă intrarea nu poate fi un PIN valid.
 */
export function normalizeJoinPin(raw: string): string | null {
  const digits = raw.trim().replace(/\D/g, "");
  if (digits.length < 4 || digits.length > 6) {
    return null;
  }
  const normalized =
    digits.length < 6 ? digits.padStart(6, "0") : digits;
  if (normalized.length !== 6) {
    return null;
  }
  return normalized;
}
