export type AuthScreenType =
  | 'welcome'
  | 'login'
  | 'register'
  | 'google_completion'
  | 'otp_verify'
  | 'forgot_password'
  | 'reset_password'
  | 'register_success'
  | 'password_reset_success';

export interface GoogleProfileData {
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthNavigationState {
  screen: AuthScreenType;
  email?: string;
  registrationId?: string;
  resetAuthorizationToken?: string;
  googleProfile?: GoogleProfileData;
  otpPurpose?: 'email_verification' | 'password_reset';
  devCodeHint?: string;
  successMessage?: string;
}
