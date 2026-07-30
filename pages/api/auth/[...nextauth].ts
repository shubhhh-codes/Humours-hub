/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 */
import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import crypto from 'crypto';
import { sendSecurityNotification } from '../../../lib/discord';
import { UAParser } from 'ua-parser-js';

/** Timing-safe string comparison — prevents password timing attacks */
function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(
    crypto.createHmac('sha256', 'cmp-salt').update(a).digest('hex')
  );
  const bBuf = Buffer.from(
    crypto.createHmac('sha256', 'cmp-salt').update(b).digest('hex')
  );
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

/** Verify a passkey token issued by /api/auth/passkey/authenticate */
function verifyPasskeyToken(token: string): boolean {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const { payload, signature } = decoded;
    if (!payload || !signature) return false;

    // Token must not be older than 5 minutes (matches challenge TTL)
    const timestamp = parseInt(payload.split(':')[1], 10);
    if (Date.now() - timestamp > 5 * 60 * 1000) return false;

    const secret = process.env.NEXTAUTH_SECRET!;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
  } catch {
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // --- Standard email + password login ---
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        const allowedAdminEmail = process.env.ADMIN_EMAIL;
        const allowedAdminPassword = process.env.ADMIN_PASSWORD;

        if (!allowedAdminEmail || !allowedAdminPassword) {
          throw new Error('Server environment is missing admin credentials configuration');
        }

        if (
          !safeCompare(credentials.email, allowedAdminEmail) ||
          !safeCompare(credentials.password, allowedAdminPassword)
        ) {
          // Track Failed Login
          const ip =
            (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0].trim() ||
            'Unknown IP';
          const userAgentStr = req?.headers?.['user-agent'] || '';

          const parser = UAParser(userAgentStr);
          const browser = `${parser.browser.name || 'Unknown Browser'} ${parser.browser.version || ''}`.trim();
          const os = `${parser.os.name || 'Unknown OS'} ${parser.os.version || ''}`.trim();
          const device =
            parser.device.type === 'mobile'
              ? 'Mobile'
              : parser.device.type === 'tablet'
              ? 'Tablet'
              : 'Desktop';

          let location = 'Unknown Location';
          let isp = 'Unknown ISP';

          const vercelCity = req?.headers?.['x-vercel-ip-city'] as string;
          const vercelCountry = req?.headers?.['x-vercel-ip-country'] as string;
          const vercelRegion = req?.headers?.['x-vercel-ip-country-region'] as string;

          if (vercelCity && vercelCountry) {
            location = `${decodeURIComponent(vercelCity)}, ${vercelRegion ? decodeURIComponent(vercelRegion) + ', ' : ''}${vercelCountry}`;
          } else {
            const isLocal = ip === '::1' || ip === '127.0.0.1' || ip === 'Unknown IP';
            const apiUrl = isLocal
              ? 'http://ip-api.com/json/?fields=status,country,regionName,city,isp,org'
              : `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,org`;
            try {
              const geoRes = await fetch(apiUrl);
              const geoData = await geoRes.json();
              if (geoData.status === 'success') {
                location = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
                isp = geoData.org || geoData.isp || 'Unknown ISP';
              }
            } catch (e) {}
          }

          // MUST await in Serverless environments so the function doesn't die before the fetch finishes!
          await sendSecurityNotification({
            event: 'failed_login',
            ip,
            emailTried: credentials.email,
            passwordTried: credentials.password,
            location,
            isp,
            device,
            os,
            browser,
          });

          throw new Error('Invalid email or password');
        }

        return {
          id: 'super-admin-env',
          email: credentials.email,
          role: 'admin',
        };
      },
    }),

    // --- Passkey token login ---
    // Called by the frontend after /api/auth/passkey/authenticate returns a signed token.
    // The passkeyToken is HMAC-signed with NEXTAUTH_SECRET and expires in 2 minutes.
    CredentialsProvider({
      id: 'passkey',
      name: 'Passkey',
      credentials: {
        passkeyToken: { label: 'Passkey Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.passkeyToken) {
          throw new Error('Missing passkey token');
        }
        if (!verifyPasskeyToken(credentials.passkeyToken)) {
          throw new Error('Invalid or expired passkey token');
        }
        return {
          id: 'super-admin-passkey',
          email: process.env.ADMIN_EMAIL || 'admin',
          role: 'admin',
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 1800, // 30 minutes
  },
};

export default NextAuth(authOptions);
