/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * POST /api/auth/passkey/register-options
 * Protected: requires valid admin session.
 * Returns registration options for @simplewebauthn/browser → startRegistration()
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { authOptions } from '../[...nextauth]';
import { Binary } from 'mongodb';
import clientPromise from '@/lib/mongodb';

function toBuffer(val: any): Buffer {
  if (val instanceof Binary) return Buffer.from(val.buffer);
  if (Buffer.isBuffer(val)) return val;
  return Buffer.from(val);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // Load any already-registered credentials so we can exclude them
    const existingPasskeys = await db.collection('admin_passkeys').find({}).toArray();

    const rpID = process.env.PASSKEY_RP_ID || 'localhost';
    const rpName = process.env.PASSKEY_RP_NAME || 'The Humours Hub Admin';

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(session.user?.email || 'admin'),
      userName: session.user?.email || 'admin',
      userDisplayName: 'Admin',
      // Prevent registering the same authenticator twice
      excludeCredentials: existingPasskeys.map((pk) => ({
        id: toBuffer(pk.credentialID).toString('base64url'),
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'discouraged',
      },
    });

    // Store challenge in DB with 5-minute TTL
    await db.collection('passkey_challenges').deleteMany({ type: 'register' });
    await db.collection('passkey_challenges').insertOne({
      challenge: options.challenge,
      type: 'register',
      createdAt: new Date(),
    });

    return res.status(200).json(options);
  } catch (err: any) {
    console.error('[passkey/register-options]', err);
    return res.status(500).json({ error: 'Failed to generate registration options' });
  }
}
