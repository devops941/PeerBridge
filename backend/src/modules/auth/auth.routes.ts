import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../../models/User';
import { OAuthAccount } from '../../models/OAuthAccount';
import { PendingRegistration } from '../../models/PendingRegistration';
import { VerificationChallenge } from '../../models/VerificationChallenge';
import { RefreshTokenSession } from '../../models/RefreshTokenSession';
import { ENV } from '../../config/env';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { securityService } from '../../services/security.service';
import { sendOtpEmail, sendPasswordChangedNotification } from '../../services/email.service';
import { verifyGoogleToken } from '../../services/google.service';
import {
  otpGenerationLimiter,
  otpVerificationLimiter,
  authGeneralLimiter
} from '../../middleware/rateLimiter';

const router = Router();

const isDev = ENV.NODE_ENV === 'development';

// Helper to sanitize user object for client responses
const sanitizeUser = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  userType: user.userType || 'student',
  headline: user.headline || '',
  avatar: user.avatar || '',
  college: user.college || '',
  department: user.department || '',
  yearOfStudy: user.yearOfStudy,
  semester: user.semester,
  studentId: user.studentId || '',
  campusLocation: user.campusLocation || '',
  bio: user.bio || '',
  education: user.education || [],
  experience: user.experience || [],
  projects: user.projects || [],
  skills: user.skills || [],
  subjects: user.subjects || [],
  learningInterests: user.learningInterests || [],
  canExplainSubjects: user.canExplainSubjects || [],
  preferredLanguage: user.preferredLanguage || 'English',
  learningGoals: user.learningGoals || '',
  learningCredits: user.learningCredits || 0,
  rating: user.rating || 5.0,
  reviewCount: user.reviewCount || 0,
  coursesCount: user.coursesCount || 0,
  studentsCount: user.studentsCount || 0,
  isEmailVerified: user.isEmailVerified
});

// Helper to issue access & refresh tokens
const issueAuthTokens = async (user: IUser, req: Request) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    ENV.JWT_ACCESS_SECRET,
    { expiresIn: '30d' } // 30-day session token for seamless mobile usage
  );

  const rawRefreshToken = securityService.generateSecureToken(48);
  const refreshTokenHash = securityService.hashToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30-day session

  await RefreshTokenSession.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    userAgent: req.headers['user-agent'] || 'PeerBridge Mobile Client',
    ipAddress: req.ip || req.socket.remoteAddress,
    expiresAt
  });

  return { accessToken, refreshToken: rawRefreshToken };
};

// =========================================================================
// 1. Google OAuth 2.0 Sign-In & Onboarding Flow
// =========================================================================

/**
 * Step 1: Verify Google ID token and check whether user already has an active account.
 * - If yes: authenticates immediately.
 * - If no: creates a staged pending onboarding session and returns user profile for completion.
 */
router.post('/google/verify-intent', authGeneralLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      res.status(400).json({ success: false, message: 'Google ID token is required' });
      return;
    }

    const googlePayload = await verifyGoogleToken(idToken);
    if (!googlePayload) {
      res.status(401).json({ success: false, message: 'Invalid or expired Google ID token' });
      return;
    }

    const { sub, email, name, picture, emailVerified } = googlePayload;

    // 1. Check if an OAuthAccount already links this Google subject ID
    const existingOAuth = await OAuthAccount.findOne({ provider: 'google', providerId: sub });
    if (existingOAuth) {
      const user = await User.findById(existingOAuth.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'Linked user account not found' });
        return;
      }
      if (user.status !== 'active') {
        res.status(403).json({ success: false, message: 'Account is suspended or inactive.' });
        return;
      }

      user.lastLoginAt = new Date();
      await user.save();

      const { accessToken, refreshToken } = await issueAuthTokens(user, req);

      res.json({
        success: true,
        isNewUser: false,
        message: 'Signed in with Google successfully',
        data: {
          token: accessToken,
          refreshToken,
          user: sanitizeUser(user)
        }
      });
      return;
    }

    // 2. Check if a User exists with this verified email
    if (emailVerified) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // Link Google OAuth account to existing user safely
        await OAuthAccount.create({
          userId: existingUser._id,
          provider: 'google',
          providerId: sub,
          email
        });

        if (!existingUser.isEmailVerified) {
          existingUser.isEmailVerified = true;
        }
        existingUser.lastLoginAt = new Date();
        await existingUser.save();

        const { accessToken, refreshToken } = await issueAuthTokens(existingUser, req);

        res.json({
          success: true,
          isNewUser: false,
          message: 'Google account linked to your existing profile successfully!',
          data: {
            token: accessToken,
            refreshToken,
            user: sanitizeUser(existingUser)
          }
        });
        return;
      }
    }

    // 3. User is brand new:
    // If autoRegister is requested or if frictionless one-tap is enabled, create user directly!
    const shouldAutoRegister = req.body.autoRegister === true || req.body.autoRegister === 'true';
    if (shouldAutoRegister) {
      const newUser = await User.create({
        name: name || 'Google Learner',
        email,
        role: 'student',
        userType: 'student',
        status: 'active',
        isEmailVerified: true,
        avatar: picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        college: 'Engineering College',
        department: 'General Studies',
        yearOfStudy: 1,
        learningCredits: 50,
        hourlyRateCredits: 15,
        rating: 5.0,
        reviewCount: 0,
        coursesCount: 0,
        studentsCount: 0
      });

      await OAuthAccount.create({
        userId: newUser._id,
        provider: 'google',
        providerId: sub,
        email
      });

      const { accessToken, refreshToken } = await issueAuthTokens(newUser, req);

      res.status(201).json({
        success: true,
        isNewUser: false,
        message: 'Account created with Google successfully! +50 Learning Credits added.',
        data: {
          token: accessToken,
          refreshToken,
          user: sanitizeUser(newUser)
        }
      });
      return;
    }

    // Otherwise, create a staged pending registration (valid for 15 mins) for completion screen
    const registrationId = securityService.generateSecureToken(24);
    await PendingRegistration.deleteMany({ email, type: 'google_oauth' });

    await PendingRegistration.create({
      registrationId,
      type: 'google_oauth',
      email,
      name,
      googleSub: sub,
      googleAvatar: picture,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    res.json({
      success: true,
      isNewUser: true,
      message: 'New Google user. Please complete registration onboarding.',
      data: {
        registrationId,
        profile: {
          email,
          name,
          avatar: picture
        }
      }
    });
  } catch (err: any) {
    console.error('[Google Verify Intent Error]:', err);
    res.status(500).json({ success: false, message: 'Google authentication failed. Please try again.' });
  }
});

/**
 * Step 2: Complete Google Registration onboarding with mandatory university details.
 */
router.post('/google/complete-register', authGeneralLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { registrationId, name, college, department, yearOfStudy, role, agreeTerms } = req.body;

    if (!registrationId) {
      res.status(400).json({ success: false, message: 'Registration session identifier is required' });
      return;
    }

    if (!agreeTerms) {
      res.status(400).json({ success: false, message: 'You must accept the Terms & Conditions.' });
      return;
    }

    if (!college || !department) {
      res.status(400).json({ success: false, message: 'College and Department are mandatory fields.' });
      return;
    }

    const pending = await PendingRegistration.findOne({
      registrationId,
      type: 'google_oauth'
    });

    if (!pending) {
      res.status(400).json({
        success: false,
        message: 'Onboarding session expired or invalid. Please sign in with Google again.'
      });
      return;
    }

    // Prevent duplicate user creation
    const existing = await User.findOne({ email: pending.email });
    if (existing) {
      await PendingRegistration.deleteOne({ _id: pending._id });
      res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      return;
    }

    // Create user record
    const newUser = await User.create({
      name: name?.trim() || pending.name || 'Google Learner',
      email: pending.email,
      avatar: pending.googleAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      role: role && ['student', 'tutor', 'both'].includes(role) ? role : 'both',
      college: college.trim(),
      department: department.trim(),
      yearOfStudy: Number(yearOfStudy) || 3,
      isEmailVerified: true,
      status: 'active',
      learningCredits: 50 // +50 Welcome learning credits
    });

    // Create linked OAuthAccount with verified Google sub
    if (pending.googleSub) {
      await OAuthAccount.create({
        userId: newUser._id,
        provider: 'google',
        providerId: pending.googleSub,
        email: pending.email
      });
    }

    // Invalidate pending onboarding
    await PendingRegistration.deleteOne({ _id: pending._id });

    // Per specifications: redirect to login page for supported Google sign-in flow
    res.status(201).json({
      success: true,
      message: 'Account registration completed successfully! Please sign in with Google to continue.'
    });
  } catch (err: any) {
    console.error('[Google Complete Registration Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to complete registration.' });
  }
});

// =========================================================================
// 2. Email & Password Registration with OTP
// =========================================================================

/**
 * Step 1: Submit name, email, password -> Validate -> Create pending registration & send 6-digit OTP
 */
router.post('/register', otpGenerationLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, confirmPassword, agreeTerms } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Full name is required.' });
      return;
    }

    if (!email || !email.includes('@')) {
      res.status(400).json({ success: false, message: 'A valid email address is required.' });
      return;
    }

    if (!agreeTerms) {
      res.status(400).json({ success: false, message: 'Please accept the Terms & Conditions.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Password confirmation does not match.' });
      return;
    }

    // Password strength check
    const passwordValidation = securityService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({ success: false, message: passwordValidation.message });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if account already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'An account with this email is already registered. Please log in.'
      });
      return;
    }

    // Hash password securely (Argon2 / Bcrypt 12 rounds)
    const passwordHash = await securityService.hashPassword(password);

    // Create or refresh pending registration
    const registrationId = securityService.generateSecureToken(24);
    await PendingRegistration.deleteMany({ email: cleanEmail, type: 'email_password' });

    await PendingRegistration.create({
      registrationId,
      type: 'email_password',
      email: cleanEmail,
      name: name.trim(),
      passwordHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    // Invalidate existing OTP challenges for this email
    await VerificationChallenge.deleteMany({ email: cleanEmail, purpose: 'email_verification' });

    // Generate cryptographically secure 6-digit OTP
    const otpCode = securityService.generateOtp();
    const otpHash = securityService.hashOtp(otpCode);

    // Save challenge with 5-minute expiry & 60-second cooldown
    await VerificationChallenge.create({
      email: cleanEmail,
      purpose: 'email_verification',
      otpHash,
      attempts: 0,
      resendAvailableAt: new Date(Date.now() + 60 * 1000),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    // Send email with OTP via SMTP
    const sent = await sendOtpEmail(cleanEmail, otpCode, 'email_verification');

    res.status(200).json({
      success: true,
      message: sent
        ? `A 6-digit verification code has been sent to ${cleanEmail}.`
        : `Verification code generated for ${cleanEmail} (Delivery queued).`,
      data: {
        registrationId,
        email: cleanEmail,
        devCode: isDev ? otpCode : undefined
      }
    });
  } catch (err: any) {
    console.error('[Registration Error]:', err);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

/**
 * Step 2: Verify registration OTP and activate user account
 */
router.post('/verify-otp', otpVerificationLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { registrationId, email, otpCode } = req.body;

    if (!email || !otpCode) {
      res.status(400).json({ success: false, message: 'Email and verification code are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find active verification challenge
    const challenge = await VerificationChallenge.findOne({
      email: cleanEmail,
      purpose: 'email_verification',
      isConsumed: false
    });

    if (!challenge) {
      res.status(400).json({
        success: false,
        message: 'Verification code expired or not found. Please request a new code.'
      });
      return;
    }

    // Check maximum attempts limit (max 5)
    if (challenge.attempts >= 5) {
      await VerificationChallenge.deleteOne({ _id: challenge._id });
      res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please restart registration.'
      });
      return;
    }

    // Verify OTP hash securely
    const isValid = securityService.verifyOtpHash(otpCode, challenge.otpHash);
    if (!isValid) {
      challenge.attempts += 1;
      await challenge.save();
      const remaining = 5 - challenge.attempts;
      res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
      return;
    }

    // Mark challenge as consumed & remove
    await VerificationChallenge.deleteOne({ _id: challenge._id });

    // Retrieve pending registration
    const pending = await PendingRegistration.findOne({
      email: cleanEmail,
      type: 'email_password'
    });

    if (!pending) {
      res.status(400).json({
        success: false,
        message: 'Registration session expired. Please start registration again.'
      });
      return;
    }

    // Check if user account was somehow already created
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: pending.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: pending.passwordHash,
        role: 'both',
        isEmailVerified: true,
        status: 'active',
        learningCredits: 50
      });
    } else {
      user.isEmailVerified = true;
      user.status = 'active';
      if (pending.passwordHash) user.password = pending.passwordHash;
      await user.save();
    }

    // Invalidate pending registration
    await PendingRegistration.deleteOne({ _id: pending._id });

    res.status(200).json({
      success: true,
      message: 'Email verified and account activated successfully! Please log in.'
    });
  } catch (err: any) {
    console.error('[Verify OTP Error]:', err);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
});

/**
 * Resend OTP with 60-second cooldown enforcement
 */
router.post('/resend-otp', otpGenerationLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, purpose = 'email_verification' } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing challenge cooldown
    const existing = await VerificationChallenge.findOne({
      email: cleanEmail,
      purpose,
      isConsumed: false
    });

    if (existing && existing.resendAvailableAt > new Date()) {
      const remainingSeconds = Math.ceil((existing.resendAvailableAt.getTime() - Date.now()) / 1000);
      res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'} before requesting a new code.`,
        cooldownRemaining: remainingSeconds
      });
      return;
    }

    // Invalidate old challenges
    await VerificationChallenge.deleteMany({ email: cleanEmail, purpose });

    // Generate new OTP
    const otpCode = securityService.generateOtp();
    const otpHash = securityService.hashOtp(otpCode);

    await VerificationChallenge.create({
      email: cleanEmail,
      purpose,
      otpHash,
      attempts: 0,
      resendAvailableAt: new Date(Date.now() + 60 * 1000),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    const sent = await sendOtpEmail(cleanEmail, otpCode, purpose);

    res.status(200).json({
      success: true,
      message: sent
        ? `A fresh verification code has been dispatched to ${cleanEmail}.`
        : `Verification code generated for ${cleanEmail}.`,
      data: {
        email: cleanEmail,
        devCode: isDev ? otpCode : undefined
      }
    });
  } catch (err: any) {
    console.error('[Resend OTP Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to resend verification code.' });
  }
});

// =========================================================================
// 3. Email & Password Login
// =========================================================================

router.post('/login', authGeneralLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Non-sensitive error response to prevent email enumeration
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // If user has no password (e.g., pure Google sign-up)
    if (!user.password) {
      res.status(400).json({
        success: false,
        message: 'This account is linked with Google Sign-In. Please click "Continue with Google".'
      });
      return;
    }

    // Verify password hash
    const isPasswordValid = await securityService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // Check email verification status
    if (!user.isEmailVerified) {
      res.status(403).json({
        success: false,
        isUnverified: true,
        message: 'Please verify your email address before logging in.',
        data: { email: cleanEmail }
      });
      return;
    }

    // Check account status
    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Your account is currently suspended or disabled. Please contact support.'
      });
      return;
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Issue tokens
    const { accessToken, refreshToken } = await issueAuthTokens(user, req);

    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        token: accessToken,
        refreshToken,
        user: sanitizeUser(user)
      }
    });
  } catch (err: any) {
    console.error('[Login Error]:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// =========================================================================
// 4. Forgot & Reset Password Flow
// =========================================================================

/**
 * Step 1: Request Password Reset OTP.
 * Always returns a generic response to prevent email enumeration.
 */
router.post('/forgot-password', otpGenerationLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    let devCode: string | undefined = undefined;

    // Only dispatch OTP if user actually exists and is active
    if (user && user.status === 'active') {
      await VerificationChallenge.deleteMany({ email: cleanEmail, purpose: 'password_reset' });

      const otpCode = securityService.generateOtp();
      const otpHash = securityService.hashOtp(otpCode);

      await VerificationChallenge.create({
        email: cleanEmail,
        purpose: 'password_reset',
        otpHash,
        attempts: 0,
        resendAvailableAt: new Date(Date.now() + 60 * 1000),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      await sendOtpEmail(cleanEmail, otpCode, 'password_reset');
      if (isDev) devCode = otpCode;
    }

    // Generic safe response
    res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a 6-digit recovery code has been sent.',
      data: {
        email: cleanEmail,
        devCode
      }
    });
  } catch (err: any) {
    console.error('[Forgot Password Error]:', err);
    res.status(500).json({ success: false, message: 'Password reset request failed.' });
  }
});

/**
 * Step 2: Verify Forgot Password OTP.
 * Issues a single-use, 10-minute password reset authorization token.
 */
router.post('/verify-reset-otp', otpVerificationLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    const challenge = await VerificationChallenge.findOne({
      email: cleanEmail,
      purpose: 'password_reset',
      isConsumed: false
    });

    if (!challenge) {
      res.status(400).json({
        success: false,
        message: 'Reset challenge expired or invalid. Please request a new code.'
      });
      return;
    }

    if (challenge.attempts >= 5) {
      await VerificationChallenge.deleteOne({ _id: challenge._id });
      res.status(429).json({
        success: false,
        message: 'Maximum attempts exceeded. Please initiate a new password reset.'
      });
      return;
    }

    const isValid = securityService.verifyOtpHash(otpCode, challenge.otpHash);
    if (!isValid) {
      challenge.attempts += 1;
      await challenge.save();
      const remaining = 5 - challenge.attempts;
      res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
      return;
    }

    // Grant single-use 10-minute password reset authorization token
    const resetAuthorizationToken = securityService.generateSecureToken(32);
    challenge.resetAuthorizationToken = resetAuthorizationToken;
    challenge.isConsumed = true;
    challenge.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes to finish reset
    await challenge.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      data: {
        resetAuthorizationToken,
        email: cleanEmail
      }
    });
  } catch (err: any) {
    console.error('[Verify Reset OTP Error]:', err);
    res.status(500).json({ success: false, message: 'OTP verification failed.' });
  }
});

/**
 * Step 3: Set New Password using Reset Authorization Token.
 * Revokes all previous active refresh token sessions and sends security confirmation email.
 */
router.post('/reset-password', authGeneralLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, resetAuthorizationToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetAuthorizationToken || !newPassword) {
      res.status(400).json({ success: false, message: 'All fields are required.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Password confirmation does not match.' });
      return;
    }

    const strengthCheck = securityService.validatePasswordStrength(newPassword);
    if (!strengthCheck.isValid) {
      res.status(400).json({ success: false, message: strengthCheck.message });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verify reset authorization token
    const challenge = await VerificationChallenge.findOne({
      email: cleanEmail,
      purpose: 'password_reset',
      resetAuthorizationToken,
      isConsumed: true
    });

    if (!challenge) {
      res.status(400).json({
        success: false,
        message: 'Password reset authorization is invalid or expired. Please start over.'
      });
      return;
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      res.status(404).json({ success: false, message: 'User account not found.' });
      return;
    }

    // Hash new password and update
    const newHash = await securityService.hashPassword(newPassword);
    user.password = newHash;
    user.passwordChangedAt = new Date();
    await user.save();

    // Invalidate the reset challenge immediately
    await VerificationChallenge.deleteOne({ _id: challenge._id });

    // Revoke all existing refresh sessions for this user (Security Mandate)
    await RefreshTokenSession.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    // Send security notification email
    sendPasswordChangedNotification(user.email, user.name);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully! Please log in with your new password.'
    });
  } catch (err: any) {
    console.error('[Reset Password Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

// =========================================================================
// 5. Session Management: Refresh Token & Logout
// =========================================================================

/**
 * Rotate or refresh access token using refresh token
 */
router.post('/refresh-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token is required.' });
      return;
    }

    const tokenHash = securityService.hashToken(refreshToken);

    const session = await RefreshTokenSession.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      res.status(401).json({ success: false, message: 'Session expired or revoked. Please log in again.' });
      return;
    }

    const user = await User.findById(session.userId);
    if (!user || user.status !== 'active') {
      res.status(403).json({ success: false, message: 'User account suspended or not found.' });
      return;
    }

    // Issue fresh access token
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      ENV.JWT_ACCESS_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: {
        token: newAccessToken
      }
    });
  } catch (err: any) {
    console.error('[Refresh Token Error]:', err);
    res.status(500).json({ success: false, message: 'Token refresh failed.' });
  }
});

/**
 * Logout and revoke session
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = securityService.hashToken(refreshToken);
      await RefreshTokenSession.updateOne(
        { tokenHash, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
});

/**
 * Fetch authenticated user profile
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({
      success: true,
      data: sanitizeUser(user)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
});

/**
 * Update authenticated user academic and profile details
 */
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      name,
      college,
      department,
      yearOfStudy,
      semester,
      studentId,
      campusLocation,
      bio,
      skills,
      subjects,
      avatar,
      userType,
      headline,
      education,
      experience,
      projects,
      learningInterests,
      canExplainSubjects,
      preferredLanguage,
      learningGoals
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (name) user.name = name.trim();
    if (college) user.college = college.trim();
    if (department) user.department = department.trim();
    if (yearOfStudy !== undefined) user.yearOfStudy = Number(yearOfStudy);
    if (semester !== undefined) user.semester = Number(semester);
    if (studentId !== undefined) user.studentId = studentId.trim();
    if (campusLocation !== undefined) user.campusLocation = campusLocation.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (userType) user.userType = userType;
    if (headline !== undefined) user.headline = headline.trim();
    if (Array.isArray(education)) {
      user.education = education.map((e: any, idx: number) => ({
        id: e.id || `edu_${Date.now()}_${idx}`,
        institution: (e.institution || '').trim(),
        degree: (e.degree || '').trim(),
        fieldOfStudy: (e.fieldOfStudy || '').trim(),
        startYear: (e.startYear || '').trim(),
        endYear: (e.endYear || 'Present').trim(),
        grade: (e.grade || '').trim(),
        description: (e.description || '').trim()
      })).filter((e: any) => e.institution && e.degree);
      user.markModified('education');
    }

    if (Array.isArray(experience)) {
      user.experience = experience.map((exp: any, idx: number) => ({
        id: exp.id || `exp_${Date.now()}_${idx}`,
        title: (exp.title || '').trim(),
        company: (exp.company || '').trim(),
        location: (exp.location || '').trim(),
        startDate: (exp.startDate || '').trim(),
        endDate: (exp.endDate || 'Present').trim(),
        description: (exp.description || '').trim()
      })).filter((exp: any) => exp.title && exp.company);
      user.markModified('experience');
    }

    if (Array.isArray(projects)) {
      user.projects = projects.map((p: any, idx: number) => ({
        id: p.id || `proj_${Date.now()}_${idx}`,
        title: (p.title || '').trim(),
        tag: (p.tag || '').trim(),
        description: (p.description || '').trim(),
        link: (p.link || '').trim(),
        stars: typeof p.stars === 'number' ? p.stars : 0,
        collaborators: typeof p.collaborators === 'number' ? p.collaborators : 1,
        image: p.image || ''
      })).filter((p: any) => p.title);
      user.markModified('projects');
    }

    if (Array.isArray(skills)) {
      const cleanedSkills = Array.from(
        new Set(
          skills
            .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
            .filter((s: string) => s.length > 0)
        )
      );
      user.skills = cleanedSkills;
      user.markModified('skills');
    }

    if (Array.isArray(subjects)) {
      user.subjects = subjects.map((s: any) => String(s).trim()).filter(Boolean);
      user.markModified('subjects');
    }

    if (Array.isArray(learningInterests)) {
      user.learningInterests = learningInterests.map((s: any) => String(s).trim()).filter(Boolean);
      user.markModified('learningInterests');
    }

    if (Array.isArray(canExplainSubjects)) {
      user.canExplainSubjects = canExplainSubjects.map((s: any) => String(s).trim()).filter(Boolean);
      user.markModified('canExplainSubjects');
    }

    if (preferredLanguage !== undefined) user.preferredLanguage = preferredLanguage.trim();
    if (learningGoals !== undefined) user.learningGoals = learningGoals.trim();
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      data: sanitizeUser(user)
    });
  } catch (err: any) {
    console.error('[Update Profile Error]:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update profile details' });
  }
});

export default router;
