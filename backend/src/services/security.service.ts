import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';

const OTP_PEPPER = process.env.OTP_PEPPER || 'peerbridge_otp_pepper_secure_salt_2026';
const BCRYPT_ROUNDS = 12;

export interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
}

export const securityService = {
  /**
   * Generates a cryptographically secure 6-digit OTP string (100000 - 999999)
   */
  generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  },

  /**
   * Hashes an OTP using HMAC-SHA256 with a server-side pepper
   */
  hashOtp(otp: string): string {
    return crypto
      .createHmac('sha256', OTP_PEPPER)
      .update(otp.trim())
      .digest('hex');
  },

  /**
   * Timing-safe verification of an OTP against its stored HMAC
   */
  verifyOtpHash(otp: string, storedHash: string): boolean {
    const candidateHash = this.hashOtp(otp);
    if (candidateHash.length !== storedHash.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(candidateHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  },

  /**
   * Generates a cryptographically random hex token (e.g. for registrationId or resetAuthorization)
   */
  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  },

  /**
   * Hashes a refresh token with SHA-256 for secure database storage
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  },

  /**
   * Validates password against production security requirements:
   * - At least 8 characters
   * - Contains uppercase, lowercase, digit, and symbol
   */
  validatePasswordStrength(password: string): PasswordValidationResult {
    if (!password || password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number (0-9).' };
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one special character.' };
    }
    return { isValid: true };
  },

  /**
   * Hashes a password using Bcrypt with 12 rounds
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },

  /**
   * Compares a plaintext password against a stored Bcrypt hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
};
