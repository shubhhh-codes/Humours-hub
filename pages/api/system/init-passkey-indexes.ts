/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * GET /api/system/init-passkey-indexes
 * One-time setup: creates a TTL index on the passkey_challenges collection
 * so expired challenges are automatically deleted by MongoDB after 5 minutes.
 *
 * Call this once after deployment or run it manually.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // TTL index: auto-delete challenges older than 5 minutes (300 seconds)
    await db.collection('passkey_challenges').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 300, name: 'passkey_challenges_ttl' }
    );

    // Sparse index on credentialID for fast lookups during authentication
    await db.collection('admin_passkeys').createIndex(
      { credentialID: 1 },
      { name: 'admin_passkeys_credentialID', unique: false }
    );

    return res.status(200).json({
      success: true,
      message: 'Passkey indexes created successfully',
    });
  } catch (err: any) {
    // Index may already exist — that's fine
    if (err.code === 85 || err.code === 86) {
      return res.status(200).json({ success: true, message: 'Indexes already exist' });
    }
    console.error('[init-passkey-indexes]', err);
    return res.status(500).json({ error: err.message || 'Failed to create indexes' });
  }
}
