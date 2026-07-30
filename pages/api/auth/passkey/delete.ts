/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * DELETE /api/auth/passkey/delete?id=<objectId>
 * Protected: requires valid admin session.
 * Removes a registered passkey from MongoDB.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import { authOptions } from '../[...nextauth]';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user?.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing passkey ID' });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const result = await db
      .collection('admin_passkeys')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Passkey not found' });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[passkey/delete]', err);
    return res.status(500).json({ error: 'Failed to delete passkey' });
  }
}
