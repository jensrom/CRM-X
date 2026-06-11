/**
 * CRM-X — Password Policy
 *
 * Compliance:
 *   - GDPR Art. 32 (Security of processing)
 *   - ISO 27001 A.5.17 (Authentication information)
 *   - SOC 2 CC6.1 (Logical access controls)
 *
 * NIST SP 800-63B inspireret:
 *   - Min 12 tegn (over NIST-minimum på 8 for konsulentvirksomheds-data)
 *   - Skal indeholde mindst 3 af 4 karakterklasser
 *   - Tjek mod en lille liste af kendte svage passwords
 *   - INGEN tvungen rotation (NIST anbefaler det ikke længere)
 */

export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireClasses: 3, // af 4: lowercase, uppercase, digit, symbol
  bcryptCost: 12, // ~250ms ved moderne CPU
} as const;

// Top-30 mest brugte passwords + obvious patterns. Udvid efter behov eller skift til
// HaveIBeenPwned API senere.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd",
  "123456", "12345678", "123456789", "1234567890",
  "qwerty", "qwerty123", "qwertyuiop",
  "letmein", "welcome", "welcome1", "admin", "admin123", "administrator",
  "iloveyou", "monkey", "dragon", "master", "sunshine",
  "skiftmigstraks", "skiftmigstraks!", "kodeord", "adgangskode",
]);

export interface PasswordCheckResult {
  ok: boolean;
  errors: string[];
}

export function checkPassword(password: string, userContext?: {
  email?: string;
  name?: string;
}): PasswordCheckResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Adgangskoden skal være mindst ${PASSWORD_POLICY.minLength} tegn`);
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Adgangskoden må højst være ${PASSWORD_POLICY.maxLength} tegn`);
  }

  const hasLower = /[a-zæøå]/.test(password);
  const hasUpper = /[A-ZÆØÅ]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-ZæøåÆØÅ0-9]/.test(password);
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (classes < PASSWORD_POLICY.requireClasses) {
    errors.push(
      `Adgangskoden skal indeholde mindst ${PASSWORD_POLICY.requireClasses} af: ` +
        "små bogstaver, store bogstaver, tal, specialtegn"
    );
  }

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    errors.push("Adgangskoden er for almindelig. Vælg noget mere unikt.");
  }

  // Adgangskoden må ikke indeholde brugerens email-navn eller eget navn
  if (userContext?.email) {
    const emailUser = userContext.email.split("@")[0]?.toLowerCase();
    if (emailUser && emailUser.length >= 4 && lower.includes(emailUser)) {
      errors.push("Adgangskoden må ikke indeholde dit email-navn");
    }
  }
  if (userContext?.name) {
    const firstName = userContext.name.split(" ")[0]?.toLowerCase();
    if (firstName && firstName.length >= 3 && lower.includes(firstName)) {
      errors.push("Adgangskoden må ikke indeholde dit navn");
    }
  }

  // Sekvenser
  if (/(.)\1{3,}/.test(password)) {
    errors.push("Adgangskoden må ikke have 4+ ens tegn i træk");
  }
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer)/i.test(password)) {
    errors.push("Adgangskoden må ikke indeholde simple sekvenser");
  }

  return { ok: errors.length === 0, errors };
}
