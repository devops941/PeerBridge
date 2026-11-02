import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_ID = '362181837457-i3tj8e66mm4mpraqc7l761q948jmvkb6.apps.googleusercontent.com';

export interface GoogleAuthResult {
  success: boolean;
  idToken?: string;
  accessToken?: string;
  user?: {
    email: string;
    name: string;
    avatar?: string;
    sub?: string;
  };
  error?: string;
}

const getRedirectUri = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'peerbridge://';
};

const extractParamFromUrl = (url: string, param: string): string | null => {
  if (!url) return null;
  // Match either #param=value or ?param=value or &param=value
  const regex = new RegExp(`[#?&]${param}=([^&#]+)`);
  const match = url.match(regex);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
};

export const promptGoogleOAuth = async (): Promise<GoogleAuthResult> => {
  try {
    // 1. Generate clean deep link redirect URI
    const redirectUri = getRedirectUri();

    console.log('[Google Auth] Redirect URI:', redirectUri);

    // 2. Build Google OAuth authorization URL
    const nonce = Math.random().toString(36).substring(2);
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=${encodeURIComponent('token id_token')}` +
      `&scope=${encodeURIComponent('openid profile email')}` +
      `&nonce=${encodeURIComponent(nonce)}` +
      `&prompt=select_account`;

    // 3. Open native browser session (safely intercepts redirect URL)
    console.log('[Google Auth] Opening AuthSession...');
    const authSessionResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
      showInRecents: true,
      createTask: false
    });

    console.log('[Google Auth] AuthSession Result:', authSessionResult.type);

    if (authSessionResult.type === 'success' && authSessionResult.url) {
      const callbackUrl = authSessionResult.url;
      const accessToken = extractParamFromUrl(callbackUrl, 'access_token');
      const idToken = extractParamFromUrl(callbackUrl, 'id_token');

      let profileUser: any = undefined;

      // If access token is returned, fetch live user profile from Google UserInfo endpoint
      if (accessToken) {
        try {
          const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (userInfoRes.ok) {
            const googleData = await userInfoRes.json();
            profileUser = {
              email: googleData.email?.trim().toLowerCase(),
              name: googleData.name || googleData.given_name || 'Google Learner',
              avatar: googleData.picture,
              sub: googleData.sub || googleData.id
            };
          }
        } catch (fetchErr) {
          console.warn('[Google Auth] Could not fetch Google userinfo directly:', fetchErr);
        }
      }

      return {
        success: true,
        idToken: idToken || undefined,
        accessToken: accessToken || undefined,
        user: profileUser
      };
    }

    if (authSessionResult.type === 'cancel' || authSessionResult.type === 'dismiss') {
      return {
        success: false,
        error: 'Sign-in cancelled'
      };
    }

    // Fallback for custom browsers
    return {
      success: false,
      error: 'Google Sign-In was not completed. Please try again.'
    };
  } catch (error: any) {
    console.error('[Google Auth Error]:', error);
    return {
      success: false,
      error: error.message || 'Unable to open Google sign-in window.'
    };
  }
};
