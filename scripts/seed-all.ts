/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * MASTER DATABASE SEEDER — The Humours Hub
 * ==========================================
 * Runs ALL seed operations in the correct order:
 *
 *  Phase 1: Indexes & Schema Setup
 *  Phase 2: Settings (Ticket Tiers, Venue Info)
 *  Phase 3: Inventory (Venue Capacity — pre-seeded, updated after bookings)
 *  Phase 4: Counters
 *  Phase 5: CMS / Homepage Content (Next Show, Past Shows, Gallery, FAQs, Policies, Footer)
 *  Phase 6: Performers & Comedians (Users collection)
 *  Phase 7: Events & Distribution Workspaces
 *  Phase 8: Feedbacks & Contact Messages
 *  Phase 9: Ticket Bookings & Payments (dummy analytics data)
 *
 * Usage:  npx ts-node scripts/seed-all.ts
 * NPM:    npm run seed:all
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not defined in environment variables');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Reference "today" for stable dates in dummy data */
const BASE_TODAY = new Date('2026-09-17T00:00:00.000Z');

function daysAgo(days: number, time = '12:00:00'): Date {
  const d = new Date(BASE_TODAY);
  d.setUTCDate(d.getUTCDate() - days);
  const [h, m, s] = time.split(':').map(Number);
  d.setUTCHours(h, m, s, 0);
  return d;
}

function randomAlnum(len: number): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEEDER
// ─────────────────────────────────────────────────────────────────────────────

async function seedAll() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   THE HUMOURS HUB — MASTER DATABASE SEEDER          ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db();
  console.log(`✓ Connected to database: "${db.databaseName}"\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 1 — INDEXES & SCHEMA
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 1: Indexes & Schema ───────────────────────────');

  try {
    await db.createCollection('bookings', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['fullName', 'email', 'status', 'createdAt', 'updatedAt'],
          properties: {
            fullName: { bsonType: 'string' },
            email: { bsonType: 'string' },
            phone: { bsonType: 'string' },
            numberOfTickets: { bsonType: 'int', minimum: 1, maximum: 50 },
            status: { enum: ['pending', 'approved', 'declined', 'cancelled'] },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
          },
        },
      },
    });
    console.log('  ✓ "bookings" collection created');
  } catch (e: any) {
    if (e.codeName !== 'NamespaceExists') console.warn('  bookings note:', e.message);
  }

  await db.collection('bookings').createIndexes([
    { key: { email: 1 } },
    { key: { status: 1 } },
    { key: { createdAt: -1 } },
    { key: { bookingId: 1 } },
    { key: { email: 1, phone: 1 } },
  ]);

  await db.collection('homepage_content').createIndexes([
    { key: { type: 1 } },
    { key: { displayOrder: 1 } },
    { key: { isVisible: 1 } },
    { key: { isDeleted: 1 } },
  ]);

  await db.collection('users').createIndexes([
    { key: { email: 1 }, unique: true, sparse: true } as any,
    { key: { isComedian: 1 } },
    { key: { 'comedianProfile.status': 1 } },
    { key: { 'comedianProfile.isFeatured': 1 } },
    { key: { 'comedianProfile.displayOrder': 1 } },
  ]);

  await db.collection('distributions').createIndexes([
    { key: { eventId: 1 } },
    { key: { showDate: -1 } },
  ]);

  try {
    await db.collection('passkey_challenges').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 300, name: 'passkey_challenges_ttl' }
    );
    await db.collection('admin_passkeys').createIndex(
      { credentialID: 1 },
      { name: 'admin_passkeys_credentialID', unique: false }
    );
  } catch (e: any) {
    if (e.code !== 85 && e.code !== 86) console.warn('  passkey index note:', e.message);
  }

  console.log('  ✓ All indexes ensured\n');

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 2 — TICKET TIERS SETTINGS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 2: Ticket Tiers & Settings ────────────────────');

  await db.collection('settings').updateOne(
    { type: 'ticket-tiers' },
    {
      $set: {
        type: 'ticket-tiers',
        venue: 'The Hub Attic, Navrangpura, Ahmedabad',
        date: 'Saturday, 15 Oct',
        time: '8:30 PM',
        tiers: [
          {
            key: 'solo',
            name: 'Solo Pass',
            label: 'SOLO PASS',
            price: 149,
            seats: 1,
            badge: null,
            displayOrder: 1,
            description: 'This ticket admits 1 person of any gender.',
          },
          {
            key: 'duo',
            name: 'Love Birds Special',
            label: 'LOVE BIRDS SPECIAL',
            price: 279,
            seats: 2,
            badge: 'MOST POPULAR',
            displayOrder: 2,
            description: 'Love Birds Special admits exactly 1 man and 1 woman (total 2 people).',
          },
          {
            key: 'squad',
            name: 'Squad Pass',
            label: 'SQUAD PASS',
            price: 499,
            seats: 4,
            badge: 'BEST VALUE',
            displayOrder: 3,
            description:
              'Group of 4 admits any 4 people. Best value package — less than a movie ticket per person!',
          },
        ],
        earlyBird: {
          isActive: false,
          price: 119,
          maxBookings: 30,
          createdAt: new Date(),
        },
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log('  ✓ Ticket tiers: Solo ₹149 | Love Birds ₹279 | Squad ₹499\n');

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 3 — INVENTORY (temporary; will be overwritten after booking seed)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 3: Inventory Placeholder ──────────────────────');
  await db.collection('inventory').updateOne(
    { type: 'venue_capacity' },
    { $setOnInsert: { type: 'venue_capacity', maxCapacity: 150, bookedSeats: 0 } },
    { upsert: true }
  );
  console.log('  ✓ Venue capacity placeholder set (150 max)\n');

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 4 — COUNTERS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 4: Counters ────────────────────────────────────');
  await db.collection('counters').updateOne(
    { _id: 'bookingId_2026' as any },
    { $setOnInsert: { seq: 1 } },
    { upsert: true }
  );
  console.log('  ✓ Booking counter initialised\n');

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 5 — CMS / HOMEPAGE CONTENT
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 5: CMS / Homepage Content ─────────────────────');
  await db.collection('homepage_content').deleteMany({});

  const cmsData: any[] = [
    // ── Next Show (Hero) ────────────────────────────────────
    {
      type: 'next_show',
      title: 'The Ahmedabad Comedy Showcase Vol. 4',
      imageUrl:
        'https://images.unsplash.com/photo-1589189280918-cc442edfc628?q=80&w=2670&auto=format&fit=crop',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      metadata: {
        date: '15',
        month: 'OCT',
        day: 'Saturday',
        location: 'The Hub Attic, Navrangpura\nAhmedabad',
        time: '8:30 PM to 10:30 PM\nGates open at 8:00 PM',
        ticketPrice: '₹149',
        bookMyShowUrl: 'https://in.bookmyshow.com/events/the-humours-hub/ET00000000',
        whatsappUrl: 'https://wa.me/919033195187',
      },
    },

    // ── Shows Page Hero ─────────────────────────────────────
    {
      type: 'shows_hero',
      title: 'Every show is a one-time thing.',
      subtitle:
        'Same venue. Different night. Different crowd. No two shows are ever the same.',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },

    // ── Past Shows ───────────────────────────────────────────
    {
      type: 'past_shows',
      title: 'Midnight Comedy Jam #12',
      content:
        'A packed house of 150+ comedy lovers, 6 stand-up comics, and an unforgettable late-night acoustic session.',
      imageUrl:
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800',
      displayOrder: 12,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date('2026-08-10'),
      metadata: { date: 'Aug 2026', venue: 'The Hub Attic, Navrangpura' },
    },
    {
      type: 'past_shows',
      title: 'Monsoon Chai & Poetry Night',
      content:
        'Soul-stirring poetry, shayari, and heartfelt acoustic chords as the rain poured over Ahmedabad.',
      imageUrl:
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
      displayOrder: 11,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date('2026-07-20'),
      metadata: { date: 'Jul 2026', venue: 'The Hub Attic, Navrangpura' },
    },
    {
      type: 'past_shows',
      title: 'Gujju Stand-up Special #10',
      content:
        'Non-stop Gujarati observational humor, relatable family punchlines, and high-energy crowd work.',
      imageUrl:
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
      displayOrder: 10,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date('2026-06-15'),
      metadata: { date: 'Jun 2026', venue: 'The Hub Attic, Navrangpura' },
    },
    {
      type: 'past_shows',
      title: 'Urban Love Stories — Open Mic Vol. 9',
      content:
        'Heartbreak, first dates, and awkward family weddings — all narrated with perfect comic timing by 8 emerging comics.',
      imageUrl:
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=800',
      displayOrder: 9,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date('2026-05-18'),
      metadata: { date: 'May 2026', venue: 'The Hub Attic, Navrangpura' },
    },
    {
      type: 'past_shows',
      title: 'Beats & Banter Night #8',
      content:
        'A fusion night blending live stand-up comedy with indie acoustic performances — the crowd absolutely loved it.',
      imageUrl:
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800',
      displayOrder: 8,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date('2026-04-12'),
      metadata: { date: 'Apr 2026', venue: 'The Hub Attic, Navrangpura' },
    },
    {
      type: 'past_shows',
      title: 'New Year Comedy Kickoff 2026',
      content:
        'We kicked off 2026 with non-stop laughter — 120 attendees, 5 performers, and zero dull moments.',
      imageUrl:
        'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&q=80&w=800',
      displayOrder: 7,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date('2026-01-10'),
      metadata: { date: 'Jan 2026', venue: 'The Hub Attic, Navrangpura' },
    },

    // ── Perform With Us Hero ────────────────────────────────
    {
      type: 'perform_hero',
      title: 'Give your art\nan audience.',
      subtitle:
        "We're always looking for fresh voices, seasoned comics, and unique performers to hit our stage.",
      content: 'Manch tumhara, mic tumhara.',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },

    // ── Support FAQs ─────────────────────────────────────────
    {
      type: 'support_faq',
      title: 'Where exactly is the venue in Ahmedabad?',
      content:
        'We primarily host shows at The Hub Attic in Navrangpura. The exact Google Maps location is sent in your booking confirmation email and is also visible on your digital ticket.',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: "Do you allow 'on-the-spot' registrations for open mics?",
      content:
        "To maintain show quality, we don't take walk-in performers. Please apply through our [Perform With Us](/perform-with-us) page at least 3 days before a show. Our creative team reviews all clips before shortlisting.",
      displayOrder: 2,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'Is there an age restriction for the shows?',
      content:
        "Most of our shows are 18+ due to the nature of the content. For specific family-friendly events, we explicitly mention 'All Ages' on the event poster and booking page.",
      displayOrder: 3,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'Can I bring my own food or drinks?',
      content:
        "Outside food and drinks aren't allowed inside the auditorium. However, the venue has a cafe area where you can grab snacks and chai before the show or during the intermission.",
      displayOrder: 4,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'What time should I reach the venue?',
      content:
        "Gates open 30 minutes before the show start time. We follow a strict 'No Entry' policy once the first act begins to ensure zero disturbance for the performers and audience.",
      displayOrder: 5,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'I missed the show, can I use my ticket for the next one?',
      content:
        'Tickets are only valid for the specific date and time booked. Since we have limited seating (150 capacity), we cannot carry forward missed tickets to future shows.',
      displayOrder: 6,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'Is there parking available at the venue?',
      content:
        "Yes, there is limited two-wheeler and four-wheeler parking available on a first-come, first-served basis. We recommend reaching 20 minutes early if you're bringing a car.",
      displayOrder: 7,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'Do you offer group discounts for college students?',
      content:
        'We love the student energy! For groups of 10 or more, reach out to us directly on WhatsApp with your student IDs for a special community discount code.',
      displayOrder: 8,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'How do I retrieve my ticket if I lose the confirmation email?',
      content:
        'Visit our [Retrieve Tickets](/retrieve-tickets) page and enter the email and phone number you used while booking. Your digital ticket will be shown instantly.',
      displayOrder: 9,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'Can I book tickets for someone else?',
      content:
        "Absolutely! Just enter the attendee's name while booking. The confirmation email will go to the email address provided at checkout, so make sure to forward it to the attendee.",
      displayOrder: 10,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'What if the show gets cancelled or rescheduled?',
      content:
        'In the unlikely event of a cancellation or rescheduling by The Humours Hub, we will notify you via email and process full refunds automatically within 5–7 business days.',
      displayOrder: 11,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'support_faq',
      title: 'Is video recording allowed inside the show?',
      content:
        'Short clips of up to 30 seconds are generally permitted for social sharing. Recording full sets is strictly prohibited out of respect for the performers.',
      displayOrder: 12,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },

    // ── Gallery ──────────────────────────────────────────────
    {
      type: 'gallery',
      title: 'Spotlight on Stage',
      category: 'Stage',
      imageUrl:
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'gallery',
      title: 'Full House Laughter',
      category: 'Crowd',
      imageUrl:
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800',
      displayOrder: 2,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'gallery',
      title: 'Acoustic Jam Finale',
      category: 'Performers',
      imageUrl:
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
      displayOrder: 3,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'gallery',
      title: 'Backstage Warmup',
      category: 'Backstage',
      imageUrl:
        'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&q=80&w=800',
      displayOrder: 4,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'gallery',
      title: 'Punchline Delivery',
      category: 'Stage',
      imageUrl:
        'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&q=80&w=800',
      displayOrder: 5,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'gallery',
      title: 'The Front Row Energy',
      category: 'Crowd',
      imageUrl:
        'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&q=80&w=800',
      displayOrder: 6,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'gallery',
      title: 'Mic Drop Moment',
      category: 'Stage',
      imageUrl:
        'https://images.unsplash.com/photo-1560177086-1c7c5a5e8d30?auto=format&fit=crop&q=80&w=800',
      displayOrder: 7,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: 'gallery',
      title: 'After-Show Portraits',
      category: 'Backstage',
      imageUrl:
        'https://images.unsplash.com/photo-1580130775562-0ef92da028de?auto=format&fit=crop&q=80&w=800',
      displayOrder: 8,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },

    // ── Policies ────────────────────────────────────────────
    {
      type: 'policy',
      title: 'Ticket Booking & Entry Policy',
      category: 'terms',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      content:
        '<p>All tickets booked through The Humours Hub website are digital. Please present your booking confirmation email, QR code, or SMS at the venue box office.</p><p><strong>Entry Timings:</strong> Gates open 30 minutes prior to the scheduled showtime. To preserve the live performance atmosphere and avoid interrupting the artists, entry may be restricted once the performance begins.</p><p><strong>Age Restriction:</strong> Standard shows are 18+ unless explicitly marked as All-Ages on the event poster.</p>',
    },
    {
      type: 'policy',
      title: 'Cancellation & Refund Policy',
      category: 'refunds',
      displayOrder: 2,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      content:
        '<p>Tickets once booked are strictly non-refundable and non-transferable to other dates, as venue capacity is strictly capped at 150 seats.</p><p>In the unlikely event that a show is cancelled or rescheduled by The Humours Hub, full refunds will be processed automatically within 5–7 business days to the original payment method.</p>',
    },
    {
      type: 'policy',
      title: 'Code of Conduct & Venue Rules',
      category: 'terms',
      displayOrder: 3,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      content:
        '<p>We are dedicated to providing a safe, welcoming, and enjoyable comedy experience for everyone.</p><p><strong>Zero Tolerance:</strong> Heckling, abusive behavior, unauthorized video recording of full sets, or disturbing fellow audience members will result in immediate escort from the venue without refund.</p><p><strong>Food & Beverages:</strong> Outside food and alcoholic beverages are strictly prohibited inside the main auditorium.</p>',
    },
    {
      type: 'policy',
      title: 'Privacy & Data Protection',
      category: 'privacy',
      displayOrder: 4,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      content:
        '<p>We collect essential information (Name, Email, Phone number) solely to process your ticket bookings, issue digital entry passes, and deliver critical event updates.</p><p>We do not sell, rent, or trade your personal information to third-party marketing brokers. All payment transactions are securely handled via Razorpay with industry-standard 256-bit encryption.</p>',
    },

    // ── Footer Settings ─────────────────────────────────────
    {
      type: 'footer_settings',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      metadata: {
        instagramUrl: 'https://instagram.com/the.humourshub',
        whatsappUrl: 'https://wa.me/919033195187',
        email: 'thehumourshub@gmail.com',
        phone: '+91 9033195187',
        address: 'The Hub Attic, Navrangpura, Ahmedabad, Gujarat 380009',
      },
    },

    // ── Misc Wrappers ───────────────────────────────────────
    {
      type: 'profile',
      title: 'Performer Profile',
      content: 'Manage your performer details, stage bio, and social links.',
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
    {
      type: '404',
      title: 'Punchline Not Found',
      content:
        "Looks like you took a wrong turn at the comedy club. The page you're looking for doesn't exist.",
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
    },
  ];

  const cmsResult = await db.collection('homepage_content').insertMany(cmsData);
  console.log(
    `  ✓ Inserted ${cmsResult.insertedCount} CMS documents (Show, Past Shows, FAQs ×12, Gallery ×8, Policies, Footer)\n`
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 6 — PERFORMERS / COMEDIANS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 6: Performers & Comedians ─────────────────────');

  const defaultPwd = await bcrypt.hash('HumoursHub2026!', 12);

  const performers = [
    {
      userId: 'HH-PRF-0001',
      username: 'Aarav Mehta',
      email: 'aarav.mehta@example.com',
      password: defaultPwd,
      phone: '9876543210',
      isComedian: true,
      comedianProfile: {
        speciality: 'Stand-up Comedy & Crowd Work',
        tagline: 'Gujarati observational humor with sharp wit',
        bio: 'Performing across Gujarat for 4+ years. Regular at Ahmedabad comedy clubs. Known for his razor-sharp crowd work and relatable Gujarati family jokes.',
        instagramUrl: 'https://instagram.com/aaravmehta_comedy',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        comedianType: 'stand-up',
        experience: 4,
        photoId: null,
        displayOrder: 1,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 3000,
      },
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date(),
    },
    {
      userId: 'HH-PRF-0002',
      username: 'Priya Shah',
      email: 'priya.shah@example.com',
      password: defaultPwd,
      phone: '9876543211',
      isComedian: true,
      comedianProfile: {
        speciality: 'Storytelling & Stand-up',
        tagline: 'Relatable dating stories & family chaos',
        bio: 'Ahmedabad-based comic and writer. Brings fresh, feminine perspectives to the Gujarati comedy stage. Her storytelling bits about "desi aunties" are legendary.',
        instagramUrl: 'https://instagram.com/priyashah_laughs',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        comedianType: 'storytelling',
        experience: 3,
        photoId: null,
        displayOrder: 2,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 2500,
      },
      createdAt: new Date('2026-02-10'),
      updatedAt: new Date(),
    },
    {
      userId: 'HH-PRF-0003',
      username: 'Rohan Trivedi',
      email: 'rohan.trivedi@example.com',
      password: defaultPwd,
      phone: '9876543212',
      isComedian: true,
      comedianProfile: {
        speciality: 'Shayari & Urdu Poetry',
        tagline: 'Dil se nikli shayari aur geet',
        bio: 'Spoken word artist and Urdu poetry enthusiast performing across western India. His performances blend comedy with emotion in the most unexpected ways.',
        instagramUrl: 'https://instagram.com/rohan_trivedi_kavita',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        comedianType: 'spoken-word',
        experience: 5,
        photoId: null,
        displayOrder: 3,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 2000,
      },
      createdAt: new Date('2026-01-20'),
      updatedAt: new Date(),
    },
    {
      userId: 'HH-PRF-0004',
      username: 'Harshil Patel',
      email: 'harshil.patel@example.com',
      password: defaultPwd,
      phone: '9876543213',
      isComedian: true,
      comedianProfile: {
        speciality: 'Acoustic Guitar & Vocals',
        tagline: 'Indie melodies & acoustic singalongs',
        bio: 'Singer-songwriter creating warm acoustic evenings for comedy and music lovers. Known for his spontaneous compositions that hilariously capture everyday Ahmedabad life.',
        instagramUrl: 'https://instagram.com/harshil_acoustic',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        comedianType: 'musical-comedy',
        experience: 6,
        photoId: null,
        displayOrder: 4,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 2500,
      },
      createdAt: new Date('2026-02-05'),
      updatedAt: new Date(),
    },
    {
      userId: 'HH-PRF-0005',
      username: 'Mansi Joshi',
      email: 'mansi.joshi@example.com',
      password: defaultPwd,
      phone: '9876543214',
      isComedian: true,
      comedianProfile: {
        speciality: 'Improv & Musical Comedy',
        tagline: 'Unscripted chaos and spontaneous songs',
        bio: 'Theatre actor and improv performer turning audience prompts into instant comedic gold. Her "Yes And" improv style has audiences doubled over every single time.',
        instagramUrl: 'https://instagram.com/mansi_laughs',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        comedianType: 'improv',
        experience: 7,
        photoId: null,
        displayOrder: 5,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 2500,
      },
      createdAt: new Date('2026-01-25'),
      updatedAt: new Date(),
    },
    // Additional performers with PENDING status (for Admin comedian tab)
    {
      userId: 'HH-PRF-0006',
      username: 'Kavya Nair',
      email: 'kavya.nair@example.com',
      password: defaultPwd,
      phone: '9876543215',
      isComedian: true,
      comedianProfile: {
        speciality: 'Observational Comedy',
        tagline: 'Finding comedy in the mundane',
        bio: 'Mumbai transplant now living in Ahmedabad, finding humor in the cultural differences. Performs open mics across Ahmedabad and Surat.',
        instagramUrl: 'https://instagram.com/kavya_komedy',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        comedianType: 'stand-up',
        experience: 2,
        photoId: null,
        displayOrder: 6,
        isFeatured: false,
        status: 'pending',
        pricePerShow: 1500,
      },
      createdAt: new Date('2026-09-10'),
      updatedAt: new Date(),
    },
    {
      userId: 'HH-PRF-0007',
      username: 'Dhruvil Shah',
      email: 'dhruvil.shah@example.com',
      password: defaultPwd,
      phone: '9876543216',
      isComedian: true,
      comedianProfile: {
        speciality: 'Political Satire & Current Affairs',
        tagline: 'Democracy is a joke, and so is this set',
        bio: 'Journalism grad turned comedian. His sets on Gujarat politics and the startup ecosystem have gone semi-viral on Instagram.',
        instagramUrl: 'https://instagram.com/dhruvil_satirist',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        comedianType: 'stand-up',
        experience: 3,
        photoId: null,
        displayOrder: 7,
        isFeatured: false,
        status: 'pending',
        pricePerShow: 2000,
      },
      createdAt: new Date('2026-09-14'),
      updatedAt: new Date(),
    },
    {
      userId: 'HH-PRF-0008',
      username: 'Riya Kapoor',
      email: 'riya.kapoor@example.com',
      password: defaultPwd,
      phone: '9876543217',
      isComedian: true,
      comedianProfile: {
        speciality: 'Sketch Comedy & Characters',
        tagline: 'A one-woman universe of chaos',
        bio: 'Character comedian with 10+ original personas. Her multi-character solo shows have been performed at college fests and corporate events.',
        instagramUrl: 'https://instagram.com/riyakapoor_characters',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        comedianType: 'character-comedy',
        experience: 4,
        photoId: null,
        displayOrder: 8,
        isFeatured: false,
        status: 'declined',
        pricePerShow: 2200,
      },
      createdAt: new Date('2026-08-30'),
      updatedAt: new Date(),
    },
  ];

  for (const p of performers) {
    await db.collection('users').updateOne({ email: p.email }, { $set: p }, { upsert: true });
  }
  console.log(`  ✓ Seeded ${performers.length} performers (5 approved, 2 pending, 1 declined)\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 7 — EVENTS & DISTRIBUTION WORKSPACES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 7: Events & Distribution ──────────────────────');
  await db.collection('events').deleteMany({});
  await db.collection('distributions').deleteMany({});

  const events = [
    {
      name: 'The Ahmedabad Comedy Showcase Vol. 4',
      showDate: new Date('2026-10-15T20:30:00.000Z'),
      venueName: 'The Hub Attic, Navrangpura, Ahmedabad',
      capacity: 150,
      artists: ['Aarav Mehta', 'Priya Shah', 'Rohan Trivedi', 'Harshil Patel'],
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Unfiltered Open Mic Night',
      showDate: new Date('2026-10-22T20:00:00.000Z'),
      venueName: 'The Hub Attic, Navrangpura, Ahmedabad',
      capacity: 150,
      artists: ['Local Talent', 'Aarav Mehta'],
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Acoustic & Comedy Jams',
      showDate: new Date('2026-10-29T20:30:00.000Z'),
      venueName: 'The Hub Attic, Navrangpura, Ahmedabad',
      capacity: 150,
      artists: ['Harshil Patel', 'Mansi Joshi', 'Priya Shah'],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Diwali Special Comedy Night',
      showDate: new Date('2026-11-08T20:00:00.000Z'),
      venueName: 'The Hub Attic, Navrangpura, Ahmedabad',
      capacity: 150,
      artists: ['Aarav Mehta', 'Mansi Joshi', 'Harshil Patel', 'Priya Shah'],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const distributionChannels = [
    {
      id: 'instagram',
      tasks: ['Feed', 'Reel', 'Story', 'Highlight', 'Carousel', 'Collaborator', 'Location', 'Hashtags', 'CTA', 'Ticket Link'],
    },
    {
      id: 'whatsapp',
      tasks: ['Poster', 'Story', 'Caption', 'QR', 'Ticket Link', 'Broadcast', 'Community Share'],
    },
    {
      id: 'bms',
      tasks: ['Listing', 'Images', 'Description', 'Artists', 'Pricing', 'Venue', 'Publish'],
    },
    { id: 'google', tasks: ['Business Profile', 'Event Schema', 'Maps Verification'] },
    { id: 'website', tasks: ['Event Published', 'SEO', 'Sitemap', 'Metadata'] },
    {
      id: 'repeat',
      tasks: ['30 Days Before', '21 Days Before', '14 Days Before', '7 Days Before', '3 Days Before', '1 Day Before', 'Event Day', 'Post Event'],
    },
  ];

  for (const ev of events) {
    const { insertedId } = await db.collection('events').insertOne(ev);
    const eventId = insertedId.toString();

    const checklist: Record<string, Record<string, boolean>> = {};
    for (const ch of distributionChannels) {
      checklist[ch.id] = {};
      for (const task of ch.tasks) checklist[ch.id][task] = false;
    }

    // Mark first event's Instagram & WhatsApp steps partly done
    if (ev.status === 'published') {
      ['Feed', 'Reel', 'Story'].forEach((t) => (checklist.instagram[t] = true));
      ['Poster', 'Story', 'Caption'].forEach((t) => (checklist.whatsapp[t] = true));
      ['Listing', 'Images', 'Description', 'Artists', 'Pricing', 'Venue', 'Publish'].forEach(
        (t) => (checklist.bms[t] = true)
      );
      ['Event Published', 'SEO', 'Sitemap', 'Metadata'].forEach((t) => (checklist.website[t] = true));
    }

    await db.collection('distributions').insertOne({
      eventId,
      eventName: ev.name,
      showDate: ev.showDate,
      status: ev.status,
      checklist,
      assets: { posters: [], reels: [], stories: [] },
      generatedCopy: {
        instagramFeed: `🎭 ${ev.name} is LIVE! Catch the best comedy night in Ahmedabad at ${ev.venueName}. Book your tickets now — only 150 seats! 🎟️ Link in bio. #HumoursHub #AhmedabadComedy`,
        whatsapp: `Hey everyone! 🎉 Catch ${ev.name} live at ${ev.venueName}. Seats are limited to 150! Book now: https://humourshub.shubhhh.in/book-tickets`,
      },
      links: {
        bookingUrl: 'https://humourshub.shubhhh.in/book-tickets',
        shortUrl: '',
        utmInstagram: 'https://humourshub.shubhhh.in/book-tickets?utm_source=instagram',
        utmWhatsApp: 'https://humourshub.shubhhh.in/book-tickets?utm_source=whatsapp',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  console.log(`  ✓ Seeded ${events.length} events with distribution workspaces\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 8 — FEEDBACKS & CONTACT MESSAGES
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 8: Feedbacks & Contact Messages ────────────────');
  await db.collection('feedbacks').deleteMany({});
  await db.collection('contact_messages').deleteMany({});

  const feedbacks = [
    {
      fullName: 'Devansh Parikh',
      email: 'devansh.p@example.com',
      category: 'Show Experience',
      vibe: 'Super energetic & hilarious',
      comment:
        'The comedy night was absolutely fantastic! Aarav and Priya killed it on stage. The crowd interaction was spot on.',
      createdAt: daysAgo(28, '21:30:00'),
    },
    {
      fullName: 'Ananya Desai',
      email: 'ananya.d@example.com',
      category: 'Performances',
      vibe: 'Soulful & heartwarming',
      comment:
        'Loved the acoustic jam session right after the stand-up comedy sets. Very unique format for Ahmedabad!',
      createdAt: daysAgo(26, '22:00:00'),
    },
    {
      fullName: 'Keval Shah',
      email: 'keval.shah@example.com',
      category: 'Venue & Hospitality',
      vibe: 'Comfortable & clean',
      comment:
        'Great seating, clean venue, and seamless ticket verification at the door. Definitely coming again with friends.',
      createdAt: daysAgo(24, '20:45:00'),
    },
    {
      fullName: 'Riddhi Patel',
      email: 'riddhi.patel@example.com',
      category: 'Show Experience',
      vibe: 'Laugh-out-loud funny',
      comment:
        "Priya Shah's set about desi weddings had me in literal tears. Best ₹149 I've ever spent in my life.",
      createdAt: daysAgo(20, '23:00:00'),
    },
    {
      fullName: 'Yash Trivedi',
      email: 'yash.trivedi@example.com',
      category: 'Booking Experience',
      vibe: 'Smooth & easy',
      comment:
        'The online booking was super smooth. Got the QR code instantly, scan took 2 seconds. Very professional setup.',
      createdAt: daysAgo(18, '10:20:00'),
    },
    {
      fullName: 'Meera Ghosh',
      email: 'meera.ghosh@example.com',
      category: 'Performances',
      vibe: 'Mind-blowing',
      comment:
        "Rohan Trivedi's Urdu shayari section was unexpected and absolutely beautiful. Cried and laughed in the same 10 minutes.",
      createdAt: daysAgo(14, '11:15:00'),
    },
    {
      fullName: 'Siddharth Kumar',
      email: 'sid.kumar@example.com',
      category: 'Venue & Hospitality',
      vibe: 'Cozy atmosphere',
      comment:
        'The Hub Attic is such a great intimate venue. Every seat feels like front row. Will definitely be back for the next show.',
      createdAt: daysAgo(10, '20:50:00'),
    },
    {
      fullName: 'Isha Mehta',
      email: 'isha.mehta@example.com',
      category: 'Show Experience',
      vibe: 'Way exceeded expectations',
      comment:
        "Came for the first time, had zero expectations — left absolutely blown away. Harshil's acoustic set at the end was the perfect cherry on top.",
      createdAt: daysAgo(7, '22:30:00'),
    },
    {
      fullName: 'Chirag Raval',
      email: 'chirag.raval@example.com',
      category: 'Performances',
      vibe: 'Relatable & refreshing',
      comment:
        "Aarav's crowd work bit is unreal. He managed to roast me in front of 150 people and I still laughed hardest of all.",
      createdAt: daysAgo(5, '21:00:00'),
    },
    {
      fullName: 'Pooja Nair',
      email: 'pooja.nair@example.com',
      category: 'Show Experience',
      vibe: 'Perfectly curated',
      comment:
        'The lineup was perfectly curated — variety in styles, no two acts felt the same. This is how comedy nights should be.',
      createdAt: daysAgo(3, '22:45:00'),
    },
  ];

  await db.collection('feedbacks').insertMany(feedbacks);
  console.log(`  ✓ Seeded ${feedbacks.length} audience feedbacks`);

  const contactMessages = [
    {
      name: 'Riddhi Patel',
      email: 'riddhi.patel@example.com',
      phone: '9898989898',
      subject: 'Private Corporate Comedy Night Booking',
      message:
        'Hello team, we are organizing our annual startup meet in Navrangpura and would love to book a 45-minute stand-up comedy slot. Please share availability and pricing.',
      status: 'read',
      createdAt: daysAgo(30, '11:00:00'),
    },
    {
      name: 'Tanmay Bhattacharya',
      email: 'tanmay.b@example.com',
      phone: '9723456789',
      subject: 'College Fest Comedy Showcase Collaboration',
      message:
        'Hi The Humours Hub, our college cultural committee is hosting a festival in October and we would like to invite your performers for a live showcase. Could we discuss a collaboration?',
      status: 'read',
      createdAt: daysAgo(22, '14:30:00'),
    },
    {
      name: 'Neha Sharma',
      email: 'neha.sharma@example.com',
      phone: '9099009900',
      subject: 'Sponsorship Inquiry — Local Brand',
      message:
        "We are a local chai startup in Ahmedabad and would love to sponsor your next comedy night. Is there a sponsorship deck we could look at? We're open to in-kind or monetary support.",
      status: 'read',
      createdAt: daysAgo(15, '10:15:00'),
    },
    {
      name: 'Arjun Kapoor',
      email: 'arjun.k@example.com',
      phone: '9512345678',
      subject: 'Venue Partnership Proposal',
      message:
        "We have an event space in Satellite, Ahmedabad that fits 200 people. Would you be interested in hosting a show at our venue? We can offer great terms.",
      status: 'unread',
      createdAt: daysAgo(8, '16:40:00'),
    },
    {
      name: 'Priyanka Verma',
      email: 'priyanka.v@example.com',
      phone: '9988776655',
      subject: 'Birthday Party Comedy Act Request',
      message:
        "Hi! My husband's 30th birthday is coming up and I'd love to book a comedian for a private 30-minute set for about 25 friends. Can you help arrange this?",
      status: 'unread',
      createdAt: daysAgo(4, '09:50:00'),
    },
    {
      name: 'Amit Joshi',
      email: 'amit.joshi@example.com',
      phone: '9876001234',
      subject: 'Media Coverage — City Magazine',
      message:
        "I'm a writer for an Ahmedabad lifestyle magazine and I'd love to feature The Humours Hub in our October edition. Could we schedule a quick 15-min call with your founder?",
      status: 'unread',
      createdAt: daysAgo(2, '11:30:00'),
    },
  ];

  await db.collection('contact_messages').insertMany(contactMessages);
  console.log(`  ✓ Seeded ${contactMessages.length} contact messages\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 9 — TICKET BOOKINGS & PAYMENTS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 9: Ticket Bookings & Payments ─────────────────');
  await db.collection('bookings').deleteMany({});
  await db.collection('payments').deleteMany({});

  interface BookingDef {
    bookingId: string;
    fullName: string;
    email: string;
    phone: string;
    bookingType: 'paid' | 'complimentary';
    status: 'approved' | 'pending' | 'cancelled';
    cart: Array<{ tierKey: string; units: number; seats: number; price: number }>;
    numberOfTickets: number;
    attended: boolean;
    checkedInCount: number;
    daysAgoVal: number;
    timeStr: string;
  }

  const bookingDefs: BookingDef[] = [
    // ── OLD PRICING COHORT (before rollout at 2026-06-27) ──────────────────
    // ₹499 flat solo tickets
    { bookingId: 'HH-2026-000001', fullName: 'Aarav Patel',    email: 'aarav.patel@example.com',    phone: '9825011111', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 120, timeStr: '14:30:00' },
    { bookingId: 'HH-2026-000002', fullName: 'Riya Shah',      email: 'riya.shah2@example.com',      phone: '9825022222', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 116, timeStr: '16:15:00' },
    { bookingId: 'HH-2026-000003', fullName: 'Parth Joshi',    email: 'parth.j@example.com',         phone: '9825033333', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 110, timeStr: '18:40:00' },
    { bookingId: 'HH-2026-000004', fullName: 'Sneha Mehta',    email: 'sneha.m@example.com',         phone: '9825044444', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 104, timeStr: '11:20:00' },
    { bookingId: 'HH-2026-000005', fullName: 'Harshil Desai',  email: 'harshil.desai@example.com',   phone: '9825055555', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 98,  timeStr: '15:10:00' },
    { bookingId: 'HH-2026-000006', fullName: 'Priya Trivedi',  email: 'priya.trivedi@example.com',   phone: '9825066666', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 94,  timeStr: '17:35:00' },
    { bookingId: 'HH-2026-000007', fullName: 'Devansh Modi',   email: 'devansh.modi@example.com',    phone: '9825077777', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 91,  timeStr: '19:00:00' },
    { bookingId: 'HH-2026-000008', fullName: 'Ananya Pandya',  email: 'ananya.p@example.com',        phone: '9825088888', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 89,  timeStr: '13:45:00' },
    { bookingId: 'HH-2026-000009', fullName: 'Rohan Dave',     email: 'rohan.dave@example.com',      phone: '9825099999', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 87,  timeStr: '16:50:00' },
    { bookingId: 'HH-2026-000010', fullName: 'Keval Bhatt',    email: 'keval.b@example.com',         phone: '9825100000', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 85,  timeStr: '14:20:00' },
    { bookingId: 'HH-2026-000011', fullName: 'Mansi Raval',    email: 'mansi.raval@example.com',     phone: '9825111111', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 84,  timeStr: '18:15:00' },
    { bookingId: 'HH-2026-000012', fullName: 'Tanmay Shukla',  email: 'tanmay.shukla@example.com',   phone: '9825122222', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 83,  timeStr: '20:30:00' },

    // ── NEW PRICING COHORT (post rollout 2026-06-27) ───────────────────────
    // August 2026 – Mix of Solo ₹149, Duo ₹279, Squad ₹499
    { bookingId: 'HH-2026-000013', fullName: 'Vikram Rathore', email: 'vikram.r@example.com',        phone: '9825133333', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 32, timeStr: '10:30:00' },
    { bookingId: 'HH-2026-000014', fullName: 'Ishita Shah',    email: 'ishita.s@example.com',        phone: '9825144444', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 30, timeStr: '12:45:00' },
    { bookingId: 'HH-2026-000015', fullName: 'Aditya Vora',    email: 'aditya.v@example.com',        phone: '9825155555', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }], numberOfTickets: 4, attended: true,  checkedInCount: 4, daysAgoVal: 28, timeStr: '15:20:00' },
    { bookingId: 'HH-2026-000016', fullName: 'Pooja Gandhi',   email: 'pooja.g@example.com',         phone: '9825166666', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 26, timeStr: '17:10:00' },
    { bookingId: 'HH-2026-000017', fullName: 'Siddharth Sen',  email: 'sid.sen@example.com',         phone: '9825177777', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 24, timeStr: '11:00:00' },
    { bookingId: 'HH-2026-000018', fullName: 'Neha Kothari',   email: 'neha.kothari@example.com',    phone: '9825188888', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }], numberOfTickets: 4, attended: true,  checkedInCount: 4, daysAgoVal: 22, timeStr: '14:40:00' },
    { bookingId: 'HH-2026-000019', fullName: 'Kunal Mehta',    email: 'kunal.mehta@example.com',     phone: '9825199999', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 20, timeStr: '16:30:00' },
    { bookingId: 'HH-2026-000020', fullName: 'Roshni Soni',    email: 'roshni.s@example.com',        phone: '9825200000', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 2, seats: 2, price: 149 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 18, timeStr: '19:15:00' },

    // Early September (Sep 1–10, 2026)
    { bookingId: 'HH-2026-000021', fullName: 'Chirag Parikh',  email: 'chirag.p@example.com',        phone: '9825211111', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 16, timeStr: '10:15:00' },
    { bookingId: 'HH-2026-000022', fullName: 'Forum Vyas',     email: 'forum.v@example.com',         phone: '9825222222', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }], numberOfTickets: 4, attended: true,  checkedInCount: 4, daysAgoVal: 15, timeStr: '13:50:00' },
    { bookingId: 'HH-2026-000023', fullName: 'Hardik Patel',   email: 'hardik.patel@example.com',    phone: '9825233333', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 14, timeStr: '15:30:00' },
    { bookingId: 'HH-2026-000024', fullName: 'Shruti Zaveri',  email: 'shruti.z@example.com',        phone: '9825244444', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 13, timeStr: '18:00:00' },
    { bookingId: 'HH-2026-000025', fullName: 'Mohit Agarwal',  email: 'mohit.a@example.com',         phone: '9825255555', bookingType: 'paid', status: 'cancelled', cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }], numberOfTickets: 4, attended: false, checkedInCount: 0, daysAgoVal: 12, timeStr: '11:45:00' },
    { bookingId: 'HH-2026-000026', fullName: 'Payal Chauhan',  email: 'payal.c@example.com',         phone: '9825266666', bookingType: 'complimentary', status: 'approved', cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 0 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 11, timeStr: '14:20:00' },
    { bookingId: 'HH-2026-000027', fullName: 'Darshan Thakkar',email: 'darshan.t@example.com',       phone: '9825277777', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: true,  checkedInCount: 2, daysAgoVal: 9,  timeStr: '16:40:00' },
    { bookingId: 'HH-2026-000028', fullName: 'Kinjal Somani',  email: 'kinjal.s@example.com',        phone: '9825288888', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: true,  checkedInCount: 1, daysAgoVal: 8,  timeStr: '18:15:00' },
    { bookingId: 'HH-2026-000029', fullName: 'Yashraj Vaghela',email: 'yashraj.v@example.com',       phone: '9825299999', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }], numberOfTickets: 4, attended: true,  checkedInCount: 4, daysAgoVal: 7,  timeStr: '19:50:00' },

    // Last 7 Days — Sep 11–16, 2026
    { bookingId: 'HH-2026-000030', fullName: 'Deepali Rawal',  email: 'deepali.r@example.com',       phone: '9825300000', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: false, checkedInCount: 0, daysAgoVal: 6, timeStr: '11:10:00' },
    { bookingId: 'HH-2026-000031', fullName: 'Ankit Solanki',  email: 'ankit.s@example.com',         phone: '9825311111', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: false, checkedInCount: 0, daysAgoVal: 6, timeStr: '15:25:00' },
    { bookingId: 'HH-2026-000032', fullName: 'Maitri Barot',   email: 'maitri.b@example.com',        phone: '9825322222', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }], numberOfTickets: 4, attended: false, checkedInCount: 0, daysAgoVal: 5, timeStr: '10:45:00' },
    { bookingId: 'HH-2026-000033', fullName: 'Rahul Panchal',  email: 'rahul.p@example.com',         phone: '9825333333', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: false, checkedInCount: 0, daysAgoVal: 5, timeStr: '14:30:00' },
    { bookingId: 'HH-2026-000034', fullName: 'Bhavna Mistry',  email: 'bhavna.m@example.com',        phone: '9825344444', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: false, checkedInCount: 0, daysAgoVal: 4, timeStr: '09:50:00' },
    { bookingId: 'HH-2026-000035', fullName: 'Jigar Oza',      email: 'jigar.o@example.com',         phone: '9825355555', bookingType: 'paid', status: 'cancelled', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: false, checkedInCount: 0, daysAgoVal: 4, timeStr: '16:00:00' },
    { bookingId: 'HH-2026-000036', fullName: 'Kruti Shah',     email: 'kruti.s@example.com',         phone: '9825366666', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }], numberOfTickets: 4, attended: false, checkedInCount: 0, daysAgoVal: 3, timeStr: '11:20:00' },
    { bookingId: 'HH-2026-000037', fullName: 'Pratik Dave',    email: 'pratik.d@example.com',        phone: '9825377777', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: false, checkedInCount: 0, daysAgoVal: 3, timeStr: '17:40:00' },
    { bookingId: 'HH-2026-000038', fullName: 'Shaili Upadhyay',email: 'shaili.u@example.com',        phone: '9825388888', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: false, checkedInCount: 0, daysAgoVal: 2, timeStr: '10:05:00' },
    { bookingId: 'HH-2026-000039', fullName: 'Bhavik Prajapati',email: 'bhavik.p@example.com',       phone: '9825399999', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: false, checkedInCount: 0, daysAgoVal: 2, timeStr: '13:30:00' },
    { bookingId: 'HH-2026-000040', fullName: 'Nirali Kapadia', email: 'nirali.k@example.com',        phone: '9825400000', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }], numberOfTickets: 4, attended: false, checkedInCount: 0, daysAgoVal: 2, timeStr: '18:50:00' },
    { bookingId: 'HH-2026-000041', fullName: 'Sagar Maniar',   email: 'sagar.m@example.com',         phone: '9825411111', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: false, checkedInCount: 0, daysAgoVal: 1, timeStr: '09:15:00' },
    { bookingId: 'HH-2026-000042', fullName: 'Dhwani Parekh',  email: 'dhwani.p@example.com',        phone: '9825422222', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: false, checkedInCount: 0, daysAgoVal: 1, timeStr: '12:00:00' },
    { bookingId: 'HH-2026-000043', fullName: 'Meet Soni',      email: 'meet.s@example.com',          phone: '9825433333', bookingType: 'complimentary', status: 'approved', cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 0 }], numberOfTickets: 2, attended: false, checkedInCount: 0, daysAgoVal: 1, timeStr: '15:45:00' },
    { bookingId: 'HH-2026-000044', fullName: 'Nidhi Trivedi',  email: 'nidhi.t@example.com',         phone: '9825444444', bookingType: 'paid', status: 'pending', cart:  [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: false, checkedInCount: 0, daysAgoVal: 1, timeStr: '21:10:00' },

    // Today — Sep 17, 2026
    { bookingId: 'HH-2026-000045', fullName: 'Urvish Pandya',  email: 'urvish.p@example.com',        phone: '9825455555', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }], numberOfTickets: 4, attended: false, checkedInCount: 0, daysAgoVal: 0, timeStr: '08:30:00' },
    { bookingId: 'HH-2026-000046', fullName: 'Hetal Sanghavi', email: 'hetal.s@example.com',         phone: '9825466666', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: false, checkedInCount: 0, daysAgoVal: 0, timeStr: '09:50:00' },
    { bookingId: 'HH-2026-000047', fullName: 'Jaydeep Vora',   email: 'jaydeep.v@example.com',       phone: '9825477777', bookingType: 'paid', status: 'approved', cart: [{ tierKey: 'solo',  units: 1, seats: 1, price: 149 }], numberOfTickets: 1, attended: false, checkedInCount: 0, daysAgoVal: 0, timeStr: '11:15:00' },
    { bookingId: 'HH-2026-000048', fullName: 'Aakash Bahl',    email: 'aakash.b@example.com',        phone: '9825488888', bookingType: 'paid', status: 'pending',  cart: [{ tierKey: 'duo',   units: 1, seats: 2, price: 279 }], numberOfTickets: 2, attended: false, checkedInCount: 0, daysAgoVal: 0, timeStr: '11:40:00' },
  ];

  const bookingDocs: any[] = [];
  const paymentDocs: any[] = [];
  let totalApprovedSeats = 0;

  for (const def of bookingDefs) {
    const createdAt = daysAgo(def.daysAgoVal, def.timeStr);
    const updatedAt = new Date(createdAt);
    const totalRevenue = def.cart.reduce((s, c) => s + c.price * c.units, 0);

    let paymentId = '';
    let orderId = '';

    if (def.bookingType === 'paid') {
      orderId = `order_${randomAlnum(14)}`;
      paymentId = `pay_${randomAlnum(14)}`;
      const payStatus = def.status === 'cancelled' ? 'failed' : def.status === 'pending' ? 'pending' : 'completed';

      paymentDocs.push({
        orderId,
        paymentId,
        signature: `sig_${randomAlnum(32)}`,
        bookingId: def.bookingId,
        amount: totalRevenue * 100,
        status: payStatus,
        type: 'ticket_booking',
        createdAt,
        updatedAt,
        bookingDetails: {
          numberOfTickets: def.numberOfTickets,
          fullName: def.fullName,
          email: def.email,
          phone: def.phone,
        },
      });
    }

    if (def.status === 'approved') totalApprovedSeats += def.numberOfTickets;

    bookingDocs.push({
      bookingId: def.bookingId,
      fullName: def.fullName,
      email: def.email.toLowerCase().trim(),
      phone: def.phone,
      numberOfTickets: def.numberOfTickets,
      bookingType: def.bookingType,
      status: def.status,
      cart: def.cart,
      paymentStatus:
        def.bookingType === 'paid'
          ? def.status === 'approved'
            ? 'completed'
            : def.status
          : 'n/a',
      paymentId: paymentId || null,
      attended: def.attended,
      attendedAt: def.attended ? createdAt : null,
      checkedInCount: def.checkedInCount,
      createdAt,
      updatedAt,
    });
  }

  await db.collection('bookings').insertMany(bookingDocs);
  await db.collection('payments').insertMany(paymentDocs);
  console.log(`  ✓ Seeded ${bookingDocs.length} bookings (${bookingDocs.filter(b => b.status === 'approved').length} approved, ${bookingDocs.filter(b => b.status === 'pending').length} pending, ${bookingDocs.filter(b => b.status === 'cancelled').length} cancelled)`);
  console.log(`  ✓ Seeded ${paymentDocs.length} payments (${paymentDocs.filter(p => p.status === 'completed').length} completed, ${paymentDocs.filter(p => p.status === 'pending').length} pending, ${paymentDocs.filter(p => p.status === 'failed').length} failed)`);

  // Update venue inventory
  await db.collection('inventory').updateOne(
    { type: 'venue_capacity' },
    { $set: { type: 'venue_capacity', maxCapacity: 150, bookedSeats: totalApprovedSeats, updatedAt: new Date() } },
    { upsert: true }
  );
  console.log(`  ✓ Inventory updated: 150 max capacity, ${totalApprovedSeats} booked seats (${((totalApprovedSeats / 150) * 100).toFixed(1)}% fill rate)\n`);

  // Update counter
  await db.collection('counters').updateOne(
    { _id: 'bookingId_2026' as any },
    { $set: { seq: 58 } },
    { upsert: true }
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 10 — PERFORMER IMAGES (GridFS)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('─── Phase 10: Performer Images (GridFS) ─────────────────');
  console.log('  Downloading portrait images from Picsum Photos...\n');

  const { GridFSBucket: GridFS } = await import('mongodb');
  const { default: https } = await import('https');
  const { default: http } = await import('http');

  const performerImages = [
    { email: 'aarav.mehta@example.com',   name: 'Aarav Mehta',   url: 'https://picsum.photos/seed/aarav/400/400' },
    { email: 'priya.shah@example.com',    name: 'Priya Shah',    url: 'https://picsum.photos/seed/priya/400/400' },
    { email: 'rohan.trivedi@example.com', name: 'Rohan Trivedi', url: 'https://picsum.photos/seed/rohan/400/400' },
    { email: 'harshil.patel@example.com', name: 'Harshil Patel', url: 'https://picsum.photos/seed/harshil/400/400' },
    { email: 'mansi.joshi@example.com',   name: 'Mansi Joshi',   url: 'https://picsum.photos/seed/mansi/400/400' },
    { email: 'kavya.nair@example.com',    name: 'Kavya Nair',    url: 'https://picsum.photos/seed/kavya/400/400' },
    { email: 'dhruvil.shah@example.com',  name: 'Dhruvil Shah',  url: 'https://picsum.photos/seed/dhruvil/400/400' },
    { email: 'riya.kapoor@example.com',   name: 'Riya Kapoor',   url: 'https://picsum.photos/seed/riya/400/400' },
  ];

  function fetchBuf(url: string, hops = 5): Promise<Buffer> {
    return new Promise((res, rej) => {
      const mod = url.startsWith('https') ? https : http;
      mod.get(url, (r) => {
        if ([301,302,307].includes(r.statusCode!) && r.headers.location && hops > 0)
          return fetchBuf(r.headers.location, hops - 1).then(res).catch(rej);
        if (r.statusCode !== 200) return rej(new Error(`HTTP ${r.statusCode}`));
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => res(Buffer.concat(chunks)));
        r.on('error', rej);
      }).on('error', rej);
    });
  }

  function gfsUpload(bucket: InstanceType<typeof GridFS>, buf: Buffer, fname: string): Promise<ObjectId> {
    return new Promise((res, rej) => {
      const s = bucket.openUploadStream(fname, {
        metadata: { uploadedAt: new Date(), contentType: 'image/jpeg', mimeType: 'image/jpeg', size: buf.length, uploadedBy: 'seeder' },
      });
      s.on('finish', () => res(s.id as ObjectId));
      s.on('error', rej);
      s.end(buf);
    });
  }

  const imgBucket = new GridFS(db, { bucketName: 'images' });
  let imgOk = 0, imgFail = 0;

  for (const p of performerImages) {
    process.stdout.write(`  → ${p.name.padEnd(20)}`);
    try {
      const user = await db.collection('users').findOne({ email: p.email });
      if (!user) { console.log('SKIP (not in DB)'); imgFail++; continue; }

      // Delete old image if any
      if (user.comedianProfile?.photoId) {
        try { await imgBucket.delete(new ObjectId(user.comedianProfile.photoId.toString())); } catch (_) {}
      }

      const buf = await fetchBuf(p.url);
      const photoId = await gfsUpload(imgBucket, buf, `${Date.now()}-${p.email.split('@')[0]}.jpg`);
      await db.collection('users').updateOne(
        { email: p.email },
        { $set: { 'comedianProfile.photoId': photoId, updatedAt: new Date() } }
      );
      console.log(`  ✓  ${photoId} (${(buf.length / 1024).toFixed(0)} KB)`);
      imgOk++;
      await new Promise((r) => setTimeout(r, 150));
    } catch (err: any) {
      console.log(`  ✗  ${err.message}`);
      imgFail++;
    }
  }

  const totalImgFiles = await db.collection('images.files').countDocuments();
  console.log(`\n  ✓ ${imgOk} images uploaded to GridFS (${imgFail} failed) — ${totalImgFiles} total files in bucket\n`);

  // ───────────────────────────────────────────────────────────────────────────
  // DONE
  // ───────────────────────────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   ✓  ALL DATA SEEDED SUCCESSFULLY!                  ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Ticket Tiers     : Solo ₹149 | Duo ₹279 | Squad ₹499 ║`);
  console.log(`║  CMS Items        : ${cmsData.length.toString().padEnd(3)} (FAQs, Gallery, Policies, Shows) ║`);
  console.log(`║  Performers       : ${performers.length.toString().padEnd(3)} (5 approved, 2 pending, 1 declined) ║`);
  console.log(`║  Performer Images : ${imgOk.toString().padEnd(3)} uploaded to GridFS                    ║`);
  console.log(`║  Events           : ${events.length.toString().padEnd(3)} events + distributions               ║`);
  console.log(`║  Feedbacks        : ${feedbacks.length.toString().padEnd(3)} audience reviews                   ║`);
  console.log(`║  Contact Messages : ${contactMessages.length.toString().padEnd(3)} messages (3 read, 3 unread)  ║`);
  console.log(`║  Bookings         : ${bookingDocs.length.toString().padEnd(3)} (44 approved, 2 pending, 2 cancel)║`);
  console.log(`║  Payments         : ${paymentDocs.length.toString().padEnd(3)} (42 completed, 2 pending, 2 failed)║`);
  console.log(`║  Venue Fill Rate  : ${totalApprovedSeats}/150 seats = ${((totalApprovedSeats / 150) * 100).toFixed(1)}%                    ║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  await client.close();
}

seedAll().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});

