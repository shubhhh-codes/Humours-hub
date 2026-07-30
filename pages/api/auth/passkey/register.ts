/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * POST /api/auth/passkey/register
 * Protected: requires valid admin session.
 * Verifies the browser's registration response and saves the credential to MongoDB.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { authOptions } from '../[...nextauth]';
import clientPromise from '@/lib/mongodb';
import { UAParser } from 'ua-parser-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // Retrieve stored challenge (newest first)
    const challengeDoc = await db
      .collection('passkey_challenges')
      .findOne({ type: 'register' }, { sort: { createdAt: -1 } });
    if (!challengeDoc) {
      return res.status(400).json({ error: 'No active registration challenge found. Please try again.' });
    }

    // Check challenge is not older than 5 minutes
    const challengeAge = Date.now() - new Date(challengeDoc.createdAt).getTime();
    if (challengeAge > 5 * 60 * 1000) {
      await db.collection('passkey_challenges').deleteOne({ _id: challengeDoc._id });
      return res.status(400).json({ error: 'Registration challenge expired. Please try again.' });
    }

    const rpID = process.env.PASSKEY_RP_ID || 'localhost';
    const origin = process.env.PASSKEY_ORIGIN || 'http://localhost:3000';

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Passkey verification failed' });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Detect device name from user-agent
    const ua = req.headers['user-agent'] || '';
    const parser = UAParser(ua);
    const browserName = parser.browser.name || 'Unknown Browser';
    const osName = parser.os.name || 'Unknown OS';
    const deviceName = `${browserName} on ${osName}`;

    // Save passkey to MongoDB
    await db.collection('admin_passkeys').insertOne({
      credentialID: Buffer.from(credential.id, 'base64url'),
      credentialPublicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      credentialDeviceType,
      credentialBackedUp,
      deviceName,
      transports: credential.transports || [],
      createdAt: new Date(),
      lastUsedAt: new Date(),
    });

    // Clean up used challenge
    await db.collection('passkey_challenges').deleteOne({ _id: challengeDoc._id });

    return res.status(200).json({ verified: true, deviceName });
  } catch (err: any) {
    console.error('[passkey/register]', err);
    return res.status(500).json({ error: err.message || 'Failed to register passkey' });
  }
}
