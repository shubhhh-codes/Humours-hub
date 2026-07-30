/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * POST /api/auth/passkey/authenticate-options
 * Public — no session required (this is part of the login flow).
 * Returns authentication options for @simplewebauthn/browser → startAuthentication()
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { Binary } from 'mongodb';
import clientPromise from '@/lib/mongodb';

function toBuffer(val: any): Buffer {
  if (val instanceof Binary) return Buffer.from(val.buffer);
  if (Buffer.isBuffer(val)) return val;
  return Buffer.from(val);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = await clientPromise;
    const db = client.db();

    // Load all registered credentials so we can pass allowedCredentials
    const existingPasskeys = await db.collection('admin_passkeys').find({}).toArray();

    if (existingPasskeys.length === 0) {
      return res.status(404).json({ error: 'No passkeys registered on this account' });
    }

    const rpID = process.env.PASSKEY_RP_ID || 'localhost';

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: existingPasskeys.map((pk) => ({
        id: toBuffer(pk.credentialID).toString('base64url'),
        transports: pk.transports,
      })),
      userVerification: 'preferred',
    });

    // Delete any old authentication challenges & store new challenge in DB
    await db.collection('passkey_challenges').deleteMany({ type: 'authenticate' });
    await db.collection('passkey_challenges').insertOne({
      challenge: options.challenge,
      type: 'authenticate',
      createdAt: new Date(),
    });

    return res.status(200).json(options);
  } catch (err: any) {
    console.error('[passkey/authenticate-options]', err);
    return res.status(500).json({ error: 'Failed to generate authentication options' });
  }
}
