/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * Performer Image Seeder
 * ─────────────────────
 * Downloads real portrait-style photos from Picsum Photos (free, no auth needed)
 * and uploads them into MongoDB GridFS as WebP images.
 * Then updates each performer's `comedianProfile.photoId` with the resulting ObjectId.
 *
 * Usage:  npx ts-node scripts/seed-performer-images.ts
 * NPM:    npm run seed:images
 */

import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import * as https from 'https';
import * as http from 'http';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not defined');

// ─────────────────────────────────────────────────────────────────────────────
// Performer → image URL mapping
// Using Picsum Photos with fixed seeds so images are stable across re-runs.
// Each seed produces a consistent portrait-style square image.
// ─────────────────────────────────────────────────────────────────────────────
const PERFORMER_IMAGES: Array<{ email: string; name: string; imageUrl: string }> = [
  {
    email: 'aarav.mehta@example.com',
    name: 'Aarav Mehta',
    imageUrl: 'https://picsum.photos/seed/aarav/400/400',
  },
  {
    email: 'priya.shah@example.com',
    name: 'Priya Shah',
    imageUrl: 'https://picsum.photos/seed/priya/400/400',
  },
  {
    email: 'rohan.trivedi@example.com',
    name: 'Rohan Trivedi',
    imageUrl: 'https://picsum.photos/seed/rohan/400/400',
  },
  {
    email: 'harshil.patel@example.com',
    name: 'Harshil Patel',
    imageUrl: 'https://picsum.photos/seed/harshil/400/400',
  },
  {
    email: 'mansi.joshi@example.com',
    name: 'Mansi Joshi',
    imageUrl: 'https://picsum.photos/seed/mansi/400/400',
  },
  {
    email: 'kavya.nair@example.com',
    name: 'Kavya Nair',
    imageUrl: 'https://picsum.photos/seed/kavya/400/400',
  },
  {
    email: 'dhruvil.shah@example.com',
    name: 'Dhruvil Shah',
    imageUrl: 'https://picsum.photos/seed/dhruvil/400/400',
  },
  {
    email: 'riya.kapoor@example.com',
    name: 'Riya Kapoor',
    imageUrl: 'https://picsum.photos/seed/riya/400/400',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HTTP/HTTPS fetch helper (follows redirects — Picsum redirects to the real CDN)
// ─────────────────────────────────────────────────────────────────────────────
function fetchImageBuffer(url: string, maxRedirects = 5): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      // Follow redirects (Picsum uses 302)
      if (
        (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) &&
        res.headers.location &&
        maxRedirects > 0
      ) {
        return fetchImageBuffer(res.headers.location, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}: HTTP ${res.statusCode}`));
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload a buffer into GridFS and return the ObjectId
// ─────────────────────────────────────────────────────────────────────────────
function uploadToGridFS(
  bucket: GridFSBucket,
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<ObjectId> {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        uploadedAt: new Date(),
        contentType,
        mimeType: contentType,
        width: 400,
        height: 400,
        size: buffer.length,
        originalFilename: filename,
        uploadedBy: 'seeder',
      },
    });

    uploadStream.on('finish', () => resolve(uploadStream.id as ObjectId));
    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function seedPerformerImages() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   PERFORMER IMAGE SEEDER — The Humours Hub          ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db();

  // Create the GridFS bucket (same bucket name as the app: "images")
  const bucket = new GridFSBucket(db, { bucketName: 'images' });

  let successCount = 0;
  let failCount = 0;

  for (const performer of PERFORMER_IMAGES) {
    process.stdout.write(`  → ${performer.name.padEnd(20)}`);

    try {
      // 1. Check if performer exists
      const user = await db.collection('users').findOne({ email: performer.email });
      if (!user) {
        console.log(`  SKIP (performer not found in DB)`);
        failCount++;
        continue;
      }

      // 2. Delete any old image this performer already has (idempotent re-runs)
      const existingPhotoId = user.comedianProfile?.photoId;
      if (existingPhotoId) {
        try {
          await bucket.delete(new ObjectId(existingPhotoId.toString()));
        } catch (_) {
          // Old file may not exist — that's fine
        }
      }

      // 3. Download image
      const imageBuffer = await fetchImageBuffer(performer.imageUrl);
      const filename = `${Date.now()}-${performer.email.split('@')[0]}.jpg`;

      // 4. Upload to GridFS
      const imageId = await uploadToGridFS(bucket, imageBuffer, filename, 'image/jpeg');

      // 5. Update performer's photoId
      await db.collection('users').updateOne(
        { email: performer.email },
        {
          $set: {
            'comedianProfile.photoId': imageId,
            updatedAt: new Date(),
          },
        }
      );

      console.log(`  ✓  ID: ${imageId} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);
      successCount++;

      // Small delay to be polite to the image CDN
      await new Promise((r) => setTimeout(r, 200));
    } catch (err: any) {
      console.log(`  ✗  ERROR: ${err.message}`);
      failCount++;
    }
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log(`  ✓  ${successCount} performer images uploaded to GridFS`);
  if (failCount > 0) console.log(`  ✗  ${failCount} failed`);
  console.log('─────────────────────────────────────────────────────\n');

  // Quick sanity check
  const totalGridFSFiles = await db.collection('images.files').countDocuments();
  console.log(`  GridFS "images" bucket now has ${totalGridFSFiles} files total\n`);

  await client.close();
}

seedPerformerImages().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
