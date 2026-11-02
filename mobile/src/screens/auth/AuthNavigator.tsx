import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthNavigationState } from './types';
import { WelcomeScreen } from './WelcomeScreen';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { GoogleCompletionScreen } from './GoogleCompletionScreen';
import { OtpVerificationScreen } from './OtpVerificationScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { RegisterSuccessScreen } from './RegisterSuccessScreen';
import { PasswordResetSuccessScreen } from './PasswordResetSuccessScreen';

interface Props {
  onLoginSuccess: (token: string, refreshToken: string, user: any) => void;
}

export const AuthNavigator: React.FC<Props> = ({ onLoginSuccess }) => {
  const [navState, setNavState] = useState<AuthNavigationState>({
    screen: 'welcome'
  });

  const handleNavigate = (newState: AuthNavigationState) => {
    setNavState(newState);
  };

  return (
    <View style={styles.container}>
      {navState.screen === 'welcome' && (
        <WelcomeScreen onNavigate={handleNavigate} />
      )}

      {navState.screen === 'login' && (
        <LoginScreen onLoginSuccess={onLoginSuccess} onNavigate={handleNavigate} />
      )}

      {navState.screen === 'register' && (
        <RegisterScreen onNavigate={handleNavigate} onLoginSuccess={onLoginSuccess} />
      )}

      {navState.screen === 'google_completion' && (
        <GoogleCompletionScreen
          registrationId={navState.registrationId || ''}
          googleProfile={navState.googleProfile}
          onNavigate={handleNavigate}
        />
      )}

      {navState.screen === 'otp_verify' && (
        <OtpVerificationScreen
          email={navState.email || ''}
          registrationId={navState.registrationId}
          purpose={navState.otpPurpose || 'email_verification'}
          devCodeHint={navState.devCodeHint}
          onNavigate={handleNavigate}
        />
      )}

      {navState.screen === 'forgot_password' && (
        <ForgotPasswordScreen
          initialEmail={navState.email}
          onNavigate={handleNavigate}
        />
      )}

      {navState.screen === 'reset_password' && (
        <ResetPasswordScreen
          email={navState.email || ''}
          resetAuthorizationToken={navState.resetAuthorizationToken || ''}
          onNavigate={handleNavigate}
        />
      )}

      {navState.screen === 'register_success' && (
        <RegisterSuccessScreen
          message={navState.successMessage}
          onNavigate={handleNavigate}
        />
      )}

      {navState.screen === 'password_reset_success' && (
        <PasswordResetSuccessScreen onNavigate={handleNavigate} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00C48C'
  }
});
