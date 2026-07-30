/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * GET /api/auth/passkey/has-passkeys
 * Public — no session required.
 * Returns whether any passkeys exist in the DB so the login page can decide
 * whether to show the "Sign in with Passkey" button — without exposing any
 * credential data to unauthenticated callers.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = await clientPromise;
    const db = client.db();

    const count = await db.collection('admin_passkeys').countDocuments();

    return res.status(200).json({ hasPasskeys: count > 0 });
  } catch (err: any) {
    console.error('[passkey/has-passkeys]', err);
    // On DB error, return false so the login page degrades gracefully
    return res.status(200).json({ hasPasskeys: false });
  }
}
