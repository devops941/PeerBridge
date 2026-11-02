import rateLimit from 'express-rate-limit';

export const otpGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 OTP requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests from this device. Please try again after 15 minutes.'
  }
});

export const otpVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Limit verification attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts from this device. Please try again later.'
  }
});

export const authGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication requests. Please try again in a few minutes.'
  }
});
