/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * GET /api/auth/passkey/list
 * Protected: requires valid admin session.
 * Returns all registered passkeys for the admin dashboard Security section.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const passkeys = await db
      .collection('admin_passkeys')
      .find({})
      .project({ credentialPublicKey: 0 }) // Never send public key to frontend
      .sort({ createdAt: -1 })
      .toArray();

    // Convert ObjectId and Buffer to serializable forms
    const serialized = passkeys.map((pk) => ({
      id: pk._id.toString(),
      deviceName: pk.deviceName,
      credentialDeviceType: pk.credentialDeviceType,
      credentialBackedUp: pk.credentialBackedUp,
      createdAt: pk.createdAt,
      lastUsedAt: pk.lastUsedAt,
    }));

    return res.status(200).json({ passkeys: serialized });
  } catch (err: any) {
    console.error('[passkey/list]', err);
    return res.status(500).json({ error: 'Failed to list passkeys' });
  }
}
