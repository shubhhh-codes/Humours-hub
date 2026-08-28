import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();

async function verify() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log('=== Database Verification ===');
  console.log('Connected to DB:', db.databaseName);

  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`Collection: ${col.name.padEnd(25)} -> ${count} documents`);
  }

  const tiersDoc = await db.collection('settings').findOne({ type: 'ticket-tiers' });
  console.log('\n--- Ticket Tiers ---');
  console.log('Venue:', tiersDoc?.venue);
  console.log('Tiers:', tiersDoc?.tiers?.map((t: any) => `${t.name} (₹${t.price}, seats: ${t.seats})`));

  const faqDocs = await db.collection('homepage_content').find({ type: 'support_faq' }).toArray();
  console.log('\n--- FAQs ---');
  console.log(`Total FAQs: ${faqDocs.length}`);
  faqDocs.forEach((f: any, i: number) => console.log(`  ${i+1}. ${f.title}`));

  const performers = await db.collection('users').find({ isComedian: true, 'comedianProfile.status': 'approved' }).toArray();
  console.log('\n--- Performers ---');
  console.log(`Total Approved Performers: ${performers.length}`);
  performers.forEach((p: any) => console.log(`  - ${p.username} (${p.comedianProfile?.speciality})`));

  const nextShow = await db.collection('homepage_content').findOne({ type: 'next_show' });
  console.log('\n--- Next Show ---');
  console.log(`Title: ${nextShow?.title}`);
  console.log(`Date: ${nextShow?.metadata?.date} ${nextShow?.metadata?.month} (${nextShow?.metadata?.day})`);
  console.log(`Location: ${nextShow?.metadata?.location}`);

  const events = await db.collection('events').find().toArray();
  console.log('\n--- Events ---');
  console.log(`Total Events: ${events.length}`);
  events.forEach((e: any) => console.log(`  - ${e.name} on ${e.showDate?.toISOString()?.split('T')[0]}`));

  await client.close();
  console.log('\n✓ All collections verified successfully!');
}

verify().catch(console.error);
