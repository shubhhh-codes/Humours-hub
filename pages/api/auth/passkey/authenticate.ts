/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * POST /api/auth/passkey/authenticate
 * Public — no session required (this completes the passkey login flow).
 * Verifies the browser's authentication response, then returns a signed
 * token that the frontend uses with NextAuth signIn('credentials') to
 * establish a real session.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { Binary } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';

/**
 * Safely converts a value stored by MongoDB (BSON Binary, Buffer, or Uint8Array)
 * into a proper Node.js Buffer for use with @simplewebauthn/server.
 * MongoDB driver returns Binary objects, not raw Buffers, so the naive
 * `.buffer || val` pattern silently produces wrong bytes.
 */
function toBuffer(val: Binary | Buffer | Uint8Array | any): Buffer {
  if (val instanceof Binary) return Buffer.from(val.buffer);
  if (Buffer.isBuffer(val)) return val;
  return Buffer.from(val);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = await clientPromise;
    const db = client.db();

    // Find the most recent stored challenge
    const challengeDoc = await db
      .collection('passkey_challenges')
      .findOne({ type: 'authenticate' }, { sort: { createdAt: -1 } });
    if (!challengeDoc) {
      return res.status(400).json({ error: 'No active authentication challenge. Please try again.' });
    }

    // Check challenge age (5 min max)
    const challengeAge = Date.now() - new Date(challengeDoc.createdAt).getTime();
    if (challengeAge > 5 * 60 * 1000) {
      await db.collection('passkey_challenges').deleteOne({ _id: challengeDoc._id });
      return res.status(400).json({ error: 'Authentication challenge expired. Please try again.' });
    }

    // Find the passkey that matches the credential id in the response
    const responseCredentialID = req.body.id;
    const allPasskeys = await db.collection('admin_passkeys').find({}).toArray();

    const passkey = allPasskeys.find((pk) => {
      const storedId = toBuffer(pk.credentialID).toString('base64url');
      return storedId === responseCredentialID;
    });

    if (!passkey) {
      return res.status(400).json({ error: 'Passkey not found. It may have been removed.' });
    }

    const rpID = process.env.PASSKEY_RP_ID || 'localhost';
    const origin = process.env.PASSKEY_ORIGIN || 'http://localhost:3000';

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: toBuffer(passkey.credentialID).toString('base64url'),
        publicKey: new Uint8Array(toBuffer(passkey.credentialPublicKey)),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return res.status(401).json({ error: 'Passkey authentication failed' });
    }

    // Update counter in DB to prevent replay attacks
    await db.collection('admin_passkeys').updateOne(
      { _id: passkey._id },
      {
        $set: {
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        },
      }
    );

    // Clean up used challenge
    await db.collection('passkey_challenges').deleteOne({ _id: challengeDoc._id });

    // Create a short-lived signed token that the frontend will use with NextAuth's
    // CredentialsProvider to get a proper session. This token proves the passkey
    // auth succeeded without exposing the actual admin password.
    const secret = process.env.NEXTAUTH_SECRET!;
    const payload = `passkey-auth:${Date.now()}:${passkey._id}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const passkeyToken = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');

    return res.status(200).json({ verified: true, passkeyToken });
  } catch (err: any) {
    console.error('[passkey/authenticate]', err);
    return res.status(500).json({ error: err.message || 'Authentication failed' });
  }
}
