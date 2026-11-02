import { OAuth2Client } from 'google-auth-library';
import { ENV } from '../config/env';

const client = new OAuth2Client(ENV.GOOGLE_CLIENT_ID);

export interface GooglePayload {
  email: string;
  name: string;
  picture?: string;
  sub: string;
  emailVerified: boolean;
}

export const verifyGoogleToken = async (idToken: string): Promise<GooglePayload | null> => {
  if (!idToken) return null;

  // 1. In development mode, allow simulated or test dev tokens
  if (ENV.NODE_ENV === 'development' && (idToken.startsWith('simulated_') || idToken.startsWith('dev_'))) {
    console.log('[Google Service] Using development fallback token payload');
    return {
      email: 'student.peerbridge@gmail.com',
      name: 'PeerBridge Scholar',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      sub: 'google_dev_sub_10928374',
      emailVerified: true
    };
  }

  // 2. Try official Google JWT ID Token verification
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: ENV.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (payload && payload.email && payload.sub) {
      return {
        email: payload.email.toLowerCase().trim(),
        name: payload.name || payload.given_name || 'Google User',
        picture: payload.picture,
        sub: payload.sub,
        emailVerified: Boolean(payload.email_verified)
      };
    }
  } catch (jwtErr: any) {
    console.warn('[Google Service] JWT verifyIdToken failed, trying Google API fallback...', jwtErr.message);
  }

  // 3. Resilient Fallback: Query Google userinfo / tokeninfo endpoint (works with OAuth Access Tokens)
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${idToken}` }
    });

    if (userInfoRes.ok) {
      const data: any = await userInfoRes.json();
      if (data && data.email && (data.sub || data.id)) {
        return {
          email: data.email.toLowerCase().trim(),
          name: data.name || data.given_name || 'Google User',
          picture: data.picture,
          sub: data.sub || data.id,
          emailVerified: Boolean(data.email_verified)
        };
      }
    }
  } catch (apiErr: any) {
    console.warn('[Google Service] Userinfo fallback failed:', apiErr.message);
  }

  // 4. Tokeninfo fallback
  try {
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (tokenInfoRes.ok) {
      const data: any = await tokenInfoRes.json();
      if (data && data.email && data.sub) {
        return {
          email: data.email.toLowerCase().trim(),
          name: data.name || data.given_name || 'Google User',
          picture: data.picture,
          sub: data.sub,
          emailVerified: Boolean(data.email_verified === 'true' || data.email_verified === true)
        };
      }
    }
  } catch (tokenInfoErr: any) {
    console.error('[Google Service] Tokeninfo endpoint error:', tokenInfoErr.message);
  }

  return null;
};
