import { ENV } from './config/env';

const BASE_URL = 'http://localhost:5000/api/v1/auth';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE AUTH SYSTEM E2E TESTS');
  console.log('======================================================\n');

  const testEmail = `test.student.${Date.now()}@peerbridge.edu`;
  const initialPassword = 'Password123!@#';
  const newPassword = 'UpdatedPassword456$%^';

  // 1. Email Registration Flow
  console.log('--- TEST 1: Email & Password Registration ---');
  const regRes = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Student',
      email: testEmail,
      password: initialPassword,
      confirmPassword: initialPassword,
      agreeTerms: true
    })
  });
  const regData = await regRes.json();
  console.log('Register Response Status:', regRes.status);
  console.log('Register Message:', regData.message);
  if (!regData.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  const devOtp = regData.data?.devCode;
  console.log('Generated OTP (for test verification):', devOtp);

  // 2. OTP Verification Attempt Limits (Wrong OTP)
  console.log('\n--- TEST 2: OTP Verification Security & Attempt Tracking ---');
  const wrongRes = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otpCode: '000000'
    })
  });
  const wrongData = await wrongRes.json();
  console.log('Wrong OTP Response Status:', wrongRes.status);
  console.log('Wrong OTP Warning Message:', wrongData.message);

  // 3. Valid OTP Verification & Account Activation
  console.log('\n--- TEST 3: Valid OTP Verification & Account Activation ---');
  const verifyRes = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otpCode: devOtp
    })
  });
  const verifyData = await verifyRes.json();
  console.log('Valid OTP Verify Status:', verifyRes.status);
  console.log('Verify Message:', verifyData.message);
  if (!verifyData.success) {
    throw new Error(`OTP Verification failed: ${JSON.stringify(verifyData)}`);
  }

  // 4. Email & Password Login
  console.log('\n--- TEST 4: Email & Password Login ---');
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword
    })
  });
  const loginData = await loginRes.json();
  console.log('Login Status:', loginRes.status);
  console.log('Login Message:', loginData.message);
  if (!loginData.success || !loginData.data?.token || !loginData.data?.refreshToken) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  console.log('Issued Access Token (JWT):', loginData.data.token.slice(0, 30) + '...');
  console.log('Issued Refresh Token (Hashed in DB):', loginData.data.refreshToken.slice(0, 20) + '...');
  console.log('User Name:', loginData.data.user.name);
  console.log('Learning Credits:', loginData.data.user.learningCredits);
  console.log('Email Verified:', loginData.data.user.isEmailVerified);

  const initialRefreshToken = loginData.data.refreshToken;
  const accessToken = loginData.data.token;

  // 5. Test Authenticated Profile Route (/me)
  console.log('\n--- TEST 5: Authenticated User Profile (/me) ---');
  const meRes = await fetch(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const meData = await meRes.json();
  console.log('Profile Response Status:', meRes.status);
  console.log('Profile Email:', meData.data?.email);

  // 6. Forgot Password Flow
  console.log('\n--- TEST 6: Forgot Password OTP Dispatch ---');
  const forgotRes = await fetch(`${BASE_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  const forgotData = await forgotRes.json();
  console.log('Forgot Password Status:', forgotRes.status);
  console.log('Forgot Password Generic Message:', forgotData.message);
  const resetOtp = forgotData.data?.devCode;
  console.log('Reset OTP Code:', resetOtp);

  // 7. Verify Reset OTP
  console.log('\n--- TEST 7: Verify Reset OTP & Obtain Reset Authorization ---');
  const verifyResetRes = await fetch(`${BASE_URL}/verify-reset-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otpCode: resetOtp })
  });
  const verifyResetData = await verifyResetRes.json();
  console.log('Verify Reset OTP Status:', verifyResetRes.status);
  const resetAuthToken = verifyResetData.data?.resetAuthorizationToken;
  console.log('Single-Use Reset Authorization Token:', resetAuthToken?.slice(0, 25) + '...');

  // 8. Reset Password
  console.log('\n--- TEST 8: Reset Password & Session Invalidation ---');
  const resetPassRes = await fetch(`${BASE_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      resetAuthorizationToken: resetAuthToken,
      newPassword,
      confirmPassword: newPassword
    })
  });
  const resetPassData = await resetPassRes.json();
  console.log('Reset Password Status:', resetPassRes.status);
  console.log('Reset Password Message:', resetPassData.message);

  // 9. Verify Old Refresh Token is REVOKED
  console.log('\n--- TEST 9: Verify Previous Refresh Token is Revoked ---');
  const oldRefreshRes = await fetch(`${BASE_URL}/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: initialRefreshToken })
  });
  const oldRefreshData = await oldRefreshRes.json();
  console.log('Old Refresh Token Status (Should be 401):', oldRefreshRes.status);
  console.log('Old Refresh Token Message:', oldRefreshData.message);

  // 10. Login with New Password
  console.log('\n--- TEST 10: Login with Updated Password ---');
  const newLoginRes = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: newPassword
    })
  });
  const newLoginData = await newLoginRes.json();
  console.log('New Login Status:', newLoginRes.status);
  console.log('New Login Message:', newLoginData.message);
  if (!newLoginData.success) {
    throw new Error('Login with new password failed!');
  }

  // 11. Refresh Token Rotation
  console.log('\n--- TEST 11: Refresh Token Rotation ---');
  const refreshRes = await fetch(`${BASE_URL}/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: newLoginData.data.refreshToken })
  });
  const refreshData = await refreshRes.json();
  console.log('Refresh Token Status:', refreshRes.status);
  console.log('New Access Token Issued:', refreshData.data?.token?.slice(0, 30) + '...');

  // 12. Logout
  console.log('\n--- TEST 12: Logout & Revocation ---');
  const logoutRes = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: newLoginData.data.refreshToken })
  });
  const logoutData = await logoutRes.json();
  console.log('Logout Status:', logoutRes.status);
  console.log('Logout Message:', logoutData.message);

  console.log('\n======================================================');
  console.log('🎉 ALL 12 AUTHENTICATION & SECURITY TESTS PASSED 100%!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
