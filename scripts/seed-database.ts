/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * Comprehensive Database Seeder for The Humours Hub
 * Restores and seeds all collections, schemas, indexes, and content into MongoDB.
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

const client = new MongoClient(uri);

async function seedDatabase() {
  console.log(' Connecting to MongoDB cluster...');
  await client.connect();
  const db = client.db();
  console.log(` Connected successfully to database: "${db.databaseName}"`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CREATE COLLECTIONS & INDEXES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. Initializing Collections & Indexes ---');

  // Bookings collection validation & indexes
  try {
    await db.createCollection('bookings', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'fullName', 'email', 'status', 'createdAt', 'updatedAt'],
          properties: {
            userId: { bsonType: 'string' },
            fullName: { bsonType: 'string' },
            email: { bsonType: 'string' },
            phone: { bsonType: 'string' },
            numberOfTickets: { bsonType: 'int', minimum: 1, maximum: 50 },
            status: { enum: ['pending', 'approved', 'declined', 'cancelled'] },
            isComedianBooking: { bsonType: 'bool' },
            comedianProfile: {
              bsonType: 'object',
              properties: {
                comedianType: { bsonType: 'string' },
                bio: { bsonType: 'string' },
                speciality: { bsonType: 'string' },
                videoUrl: { bsonType: 'string' },
                experience: { bsonType: 'string' }
              }
            },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });
    console.log('✓ Created "bookings" collection with validation schema');
  } catch (err: any) {
    if (err.codeName !== 'NamespaceExists') {
      console.warn('Note on bookings collection:', err.message);
    }
  }

  await db.collection('bookings').createIndexes([
    { key: { email: 1 } },
    { key: { status: 1 } },
    { key: { createdAt: -1 } },
    { key: { userId: 1 } },
    { key: { bookingId: 1 } }
  ]);
  console.log('✓ Created indexes for "bookings"');

  await db.collection('homepage_content').createIndexes([
    { key: { type: 1 } },
    { key: { displayOrder: 1 } },
    { key: { isVisible: 1 } },
    { key: { isDeleted: 1 } }
  ]);
  console.log('✓ Created indexes for "homepage_content"');

  await db.collection('users').createIndexes([
    { key: { email: 1 }, unique: true, sparse: true },
    { key: { isComedian: 1 } },
    { key: { 'comedianProfile.status': 1 } },
    { key: { 'comedianProfile.isFeatured': 1 } },
    { key: { 'comedianProfile.displayOrder': 1 } }
  ]);
  console.log('✓ Created indexes for "users"');

  await db.collection('distributions').createIndexes([
    { key: { eventId: 1 } },
    { key: { showDate: -1 } }
  ]);
  console.log('✓ Created indexes for "distributions"');

  // Passkey challenges TTL index (5 min expiry) & admin passkeys
  try {
    await db.collection('passkey_challenges').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 300, name: 'passkey_challenges_ttl' }
    );
    await db.collection('admin_passkeys').createIndex(
      { credentialID: 1 },
      { name: 'admin_passkeys_credentialID', unique: false }
    );
    console.log('✓ Created passkey challenges TTL & credential indexes');
  } catch (err: any) {
    if (err.code !== 85 && err.code !== 86) {
      console.warn('Note on passkey indexes:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SEED SETTINGS (TICKET TIERS & VENUE INFO)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Seeding Settings & Ticket Tiers ---');

  const ticketTiersData = {
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
        description: 'This ticket admits 1 person of any gender.'
      },
      {
        key: 'duo',
        name: 'Love Birds Special',
        label: 'LOVE BIRDS SPECIAL',
        price: 279,
        seats: 2,
        badge: 'MOST POPULAR',
        displayOrder: 2,
        description: 'Love Birds Special admits exactly 1 man and 1 woman (total 2 people).'
      },
      {
        key: 'squad',
        name: 'Squad Pass',
        label: 'SQUAD PASS',
        price: 499,
        seats: 4,
        badge: 'BEST VALUE',
        displayOrder: 3,
        description: 'Group of 4 admits any 4 people. This is our best value package, coming out to less than a movie ticket per person!'
      }
    ],
    earlyBird: {
      isActive: false,
      price: 119,
      maxBookings: 30,
      createdAt: new Date()
    },
    updatedAt: new Date()
  };

  await db.collection('settings').updateOne(
    { type: 'ticket-tiers' },
    { $set: ticketTiersData },
    { upsert: true }
  );
  console.log('✓ Seeded ticket tiers settings (Solo @ ₹149, Love Birds @ ₹279, Squad @ ₹499)');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SEED INVENTORY (VENUE CAPACITY)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Seeding Inventory (Venue Capacity) ---');

  // Count existing approved bookings to set bookedSeats accurately
  const existingApprovedBookings = await db.collection('bookings').find({ status: 'approved' }).toArray();
  const bookedSeatsCount = existingApprovedBookings.reduce((sum, b) => sum + (b.numberOfTickets || 1), 0);

  await db.collection('inventory').updateOne(
    { type: 'venue_capacity' },
    {
      $set: {
        type: 'venue_capacity',
        maxCapacity: 150,
        bookedSeats: bookedSeatsCount
      }
    },
    { upsert: true }
  );
  console.log(`✓ Seeded venue capacity (max: 150, booked: ${bookedSeatsCount})`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. SEED COUNTERS (BOOKING SEQUENCE)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Seeding Counters ---');
  await db.collection('counters').updateOne(
    { _id: 'bookingId_2026' as any },
    { $setOnInsert: { seq: Math.max(1, existingApprovedBookings.length) } },
    { upsert: true }
  );
  console.log('✓ Initialized bookingId_2026 counter');

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. SEED HOMEPAGE_CONTENT (CMS)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Seeding Homepage Content (CMS) ---');

  // Clear existing CMS content to prevent duplicates and ensure clean sync
  await db.collection('homepage_content').deleteMany({});

  const cmsDocs: any[] = [
    // Next Show (Hero / Upcoming)
    {
      type: 'next_show',
      title: 'The Ahmedabad Comedy Showcase Vol. 4',
      imageUrl: 'https://images.unsplash.com/photo-1589189280918-cc442edfc628?q=80&w=2670&auto=format&fit=crop',
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
        whatsappUrl: 'https://wa.me/919033195187'
      }
    },

    // Shows Page Hero
    {
      type: 'shows_hero',
      title: 'Every show is a one-time thing.',
      subtitle: 'Same venue. Different night. Different crowd. No two shows are ever the same.',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    },

    // Past Shows
    {
      type: 'past_shows',
      title: 'Midnight Comedy Jam #12',
      content: 'A packed house of 150+ comedy lovers, 6 stand-up comics, and an unforgettable late-night acoustic session.',
      imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800',
      displayOrder: 12,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date('2026-08-10'),
      metadata: {
        date: 'Aug 2026',
        venue: 'The Hub Attic, Navrangpura'
      }
    },
    {
      type: 'past_shows',
      title: 'Monsoon Chai & Poetry Night',
      content: 'Soul-stirring poetry, shayari, and heartfelt acoustic chords as the rain poured over Ahmedabad.',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
      displayOrder: 11,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date('2026-07-20'),
      metadata: {
        date: 'Jul 2026',
        venue: 'The Hub Attic, Navrangpura'
      }
    },
    {
      type: 'past_shows',
      title: 'Gujju Stand-up Special #10',
      content: 'Non-stop Gujarati observational humor, relatable family punchlines, and high-energy crowd work.',
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
      displayOrder: 10,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date('2026-06-15'),
      metadata: {
        date: 'Jun 2026',
        venue: 'The Hub Attic, Navrangpura'
      }
    },

    // Perform With Us Hero
    {
      type: 'perform_hero',
      title: 'Give your art\nan audience.',
      subtitle: "We're always looking for fresh voices, seasoned comics, and unique performers to hit our stage.",
      content: 'Manch tumhara, mic tumhara.',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    },

    // Support FAQs
    {
      type: 'support_faq',
      title: 'Where exactly is the venue in Ahmedabad?',
      content: 'We primarily host shows at The Hub Attic in Navrangpura. The exact Google Maps location is sent in your booking confirmation email and is also visible on your digital ticket.',
      displayOrder: 1,
      isVisible: true,
      createdAt: new Date()
    },
    {
      type: 'support_faq',
      title: "Do you allow 'on-the-spot' registrations for open mics?",
      content: "To maintain show quality, we don't take walk-in performers. Please apply through our [Perform With Us](/perform-with-us) page at least 3 days before a show. Our creative team reviews all clips before shortlisting.",
      displayOrder: 2,
      isVisible: true,
      createdAt: new Date()
    },
    {
      type: 'support_faq',
      title: 'Is there an age restriction for the shows?',
      content: "Most of our shows are 18+ due to the nature of the content. For specific family-friendly events, we explicitly mention 'All Ages' on the event poster and booking page.",
      displayOrder: 3,
      isVisible: true,
      createdAt: new Date()
    },
    {
      type: 'support_faq',
      title: 'Can I bring my own food or drinks?',
      content: "Outside food and drinks aren't allowed inside the auditorium. However, the venue has a cafe area where you can grab snacks and chai before the show or during the intermission.",
      displayOrder: 4,
      isVisible: true,
      createdAt: new Date()
    },
    {
      type: 'support_faq',
      title: 'What time should I reach the venue?',
      content: "Gates open 30 minutes before the show start time. We follow a strict 'No Entry' policy once the first act begins to ensure zero disturbance for the performers and audience.",
      displayOrder: 5,
      isVisible: true,
      createdAt: new Date()
    },
    {
      type: 'support_faq',
      title: 'I missed the show, can I use my ticket for the next one?',
      content: 'Tickets are only valid for the specific date and time booked. Since we have limited seating (150 capacity), we cannot carry forward missed tickets to future shows.',
      displayOrder: 6,
      isVisible: true,
      createdAt: new Date()
    },
    {
      type: 'support_faq',
      title: 'Is there parking available at the venue?',
      content: "Yes, there is limited two-wheeler and four-wheeler parking available on a first-come, first-served basis. We recommend reaching 20 minutes early if you're bringing a car.",
      displayOrder: 7,
      isVisible: true,
      createdAt: new Date()
    },
    {
      type: 'support_faq',
      title: 'Do you offer group discounts for college students?',
      content: 'We love the student energy! For groups of 10 or more, reach out to us directly on WhatsApp with your student IDs for a special community discount code.',
      displayOrder: 8,
      isVisible: true,
      createdAt: new Date()
    },

    // Gallery Items
    {
      type: 'gallery',
      title: 'Spotlight on Stage',
      category: 'Stage',
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    },
    {
      type: 'gallery',
      title: 'Full House Laughter',
      category: 'Crowd',
      imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800',
      displayOrder: 2,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    },
    {
      type: 'gallery',
      title: 'Acoustic Jam Finale',
      category: 'Performers',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
      displayOrder: 3,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    },
    {
      type: 'gallery',
      title: 'Backstage Warmup',
      category: 'Backstage',
      imageUrl: 'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&q=80&w=800',
      displayOrder: 4,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    },
    {
      type: 'gallery',
      title: 'Punchline Delivery',
      category: 'Stage',
      imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&q=80&w=800',
      displayOrder: 5,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    },
    {
      type: 'gallery',
      title: 'The Front Row Energy',
      category: 'Crowd',
      imageUrl: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&q=80&w=800',
      displayOrder: 6,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    },

    // Policies
    {
      type: 'policy',
      title: 'Ticket Booking & Entry Policy',
      category: 'terms',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      content: '<p>All tickets booked through The Humours Hub website or authorized ticketing partners are digital. Please present your booking confirmation email, QR code, or SMS at the venue box office.</p><p><strong>Entry Timings:</strong> Gates open 30 minutes prior to the scheduled showtime. To preserve the live performance atmosphere and avoid interrupting the artists, entry may be restricted once the performance begins.</p><p><strong>Age Restriction:</strong> Standard shows are 18+ unless explicitly marked as All-Ages on the event poster.</p>'
    },
    {
      type: 'policy',
      title: 'Cancellation & Refund Policy',
      category: 'refunds',
      displayOrder: 2,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      content: '<p>Tickets once booked are strictly non-refundable and non-transferable to other dates, as venue capacity is strictly capped at 150 seats.</p><p>In the unlikely event that a show is cancelled or rescheduled by The Humours Hub, full refunds will be processed automatically within 5-7 business days to the original payment method.</p>'
    },
    {
      type: 'policy',
      title: 'Code of Conduct & Venue Rules',
      category: 'terms',
      displayOrder: 3,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      content: '<p>We are dedicated to providing a safe, welcoming, and enjoyable comedy experience for everyone.</p><p><strong>Zero Tolerance:</strong> Heckling, abusive behavior, unauthorized video recording of full sets, or disturbing fellow audience members will result in immediate escort from the venue without refund.</p><p><strong>Food & Beverages:</strong> Outside food and alcoholic beverages are strictly prohibited inside the main auditorium.</p>'
    },
    {
      type: 'policy',
      title: 'Privacy & Data Protection',
      category: 'privacy',
      displayOrder: 4,
      isVisible: true,
      isDeleted: false,
      createdAt: new Date(),
      content: '<p>We collect essential information (Name, Email, Phone number) solely to process your ticket bookings, issue digital entry passes, and deliver critical event updates via SMS or WhatsApp.</p><p>We do not sell, rent, or trade your personal information to third-party marketing brokers. All payment transactions are securely handled via Razorpay with industry-standard 256-bit encryption.</p>'
    },

    // Footer Settings
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
        address: 'The Hub Attic, Navrangpura, Ahmedabad, Gujarat 380009'
      }
    },

    // Profile & 404 Wrappers
    {
      type: 'profile',
      title: 'Performer Profile',
      content: 'Manage your performer details, stage bio, and social links.',
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    },
    {
      type: '404',
      title: 'Punchline Not Found',
      content: 'Looks like you took a wrong turn at the comedy club. The page you are looking for does not exist.',
      isVisible: true,
      isDeleted: false,
      createdAt: new Date()
    }
  ];

  const cmsResult = await db.collection('homepage_content').insertMany(cmsDocs);
  console.log(`✓ Inserted ${cmsResult.insertedCount} homepage_content documents (Next Show, Shows Hero, Past Shows, FAQs, Gallery, Policies, Footer)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. SEED USERS & PERFORMERS (COMEDIANS)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Seeding Performers & Comedians ---');

  const defaultPasswordHash = await bcrypt.hash('HumoursHub2026!', 12);

  const performers = [
    {
      userId: 'HH-PRF-0001',
      username: 'Aarav Mehta',
      email: 'aarav.mehta@example.com',
      password: defaultPasswordHash,
      phone: '9876543210',
      isComedian: true,
      comedianProfile: {
        speciality: 'Stand-up Comedy & Crowd Work',
        tagline: 'Gujarati observational humor with sharp wit',
        bio: 'Performing across Gujarat for 4+ years. Regular at Ahmedabad comedy clubs.',
        instagramUrl: 'https://instagram.com/aaravmehta_comedy',
        photoId: null,
        displayOrder: 1,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 3000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      userId: 'HH-PRF-0002',
      username: 'Priya Shah',
      email: 'priya.shah@example.com',
      password: defaultPasswordHash,
      phone: '9876543211',
      isComedian: true,
      comedianProfile: {
        speciality: 'Storytelling & Stand-up',
        tagline: 'Relatable dating stories & family chaos',
        bio: 'Ahmedabad-based comic and writer bringing fresh perspectives to the stage.',
        instagramUrl: 'https://instagram.com/priyashah_laughs',
        photoId: null,
        displayOrder: 2,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 2500
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      userId: 'HH-PRF-0003',
      username: 'Rohan Trivedi',
      email: 'rohan.trivedi@example.com',
      password: defaultPasswordHash,
      phone: '9876543212',
      isComedian: true,
      comedianProfile: {
        speciality: 'Shayari & Urdu Poetry',
        tagline: 'Dil se nikli shayari aur geet',
        bio: 'Spoken word artist and Urdu poetry enthusiast performing across western India.',
        instagramUrl: 'https://instagram.com/rohan_trivedi_kavita',
        photoId: null,
        displayOrder: 3,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 2000
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      userId: 'HH-PRF-0004',
      username: 'Harshil Patel',
      email: 'harshil.patel@example.com',
      password: defaultPasswordHash,
      phone: '9876543213',
      isComedian: true,
      comedianProfile: {
        speciality: 'Acoustic Guitar & Vocals',
        tagline: 'Indie melodies & acoustic singalongs',
        bio: 'Singer-songwriter creating warm acoustic evenings for comedy and music lovers.',
        instagramUrl: 'https://instagram.com/harshil_acoustic',
        photoId: null,
        displayOrder: 4,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 2500
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      userId: 'HH-PRF-0005',
      username: 'Mansi Joshi',
      email: 'mansi.joshi@example.com',
      password: defaultPasswordHash,
      phone: '9876543214',
      isComedian: true,
      comedianProfile: {
        speciality: 'Improv & Musical Comedy',
        tagline: 'Unscripted chaos and spontaneous songs',
        bio: 'Theatre actor and improv performer turning audience prompts into instant hits.',
        instagramUrl: 'https://instagram.com/mansi_laughs',
        photoId: null,
        displayOrder: 5,
        isFeatured: true,
        status: 'approved',
        pricePerShow: 2500
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const performer of performers) {
    await db.collection('users').updateOne(
      { email: performer.email },
      { $set: performer },
      { upsert: true }
    );
  }
  console.log(`✓ Seeded ${performers.length} featured approved performers in "users" collection`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. SEED EVENTS & DISTRIBUTIONS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Seeding Events & Distribution Workspaces ---');

  const events = [
    {
      name: 'The Ahmedabad Comedy Showcase Vol. 4',
      showDate: new Date('2026-10-15T20:30:00.000Z'),
      venueName: 'The Hub Attic, Navrangpura, Ahmedabad',
      capacity: 150,
      artists: ['Aarav Mehta', 'Priya Shah', 'Rohan Trivedi', 'Harshil Patel'],
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Unfiltered Open Mic Night',
      showDate: new Date('2026-10-22T20:00:00.000Z'),
      venueName: 'The Hub Attic, Navrangpura, Ahmedabad',
      capacity: 150,
      artists: ['Local Talent', 'Aarav Mehta'],
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Acoustic & Comedy Jams',
      showDate: new Date('2026-10-29T20:30:00.000Z'),
      venueName: 'The Hub Attic, Navrangpura, Ahmedabad',
      capacity: 150,
      artists: ['Harshil Patel', 'Mansi Joshi', 'Priya Shah'],
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await db.collection('events').deleteMany({});
  await db.collection('distributions').deleteMany({});

  const distributionChannels = [
    { id: 'instagram', tasks: ['Feed', 'Reel', 'Story', 'Highlight', 'Carousel', 'Collaborator', 'Location', 'Hashtags', 'CTA', 'Ticket Link'] },
    { id: 'whatsapp', tasks: ['Poster', 'Story', 'Caption', 'QR', 'Ticket Link', 'Broadcast', 'Community Share'] },
    { id: 'bms', tasks: ['Listing', 'Images', 'Description', 'Artists', 'Pricing', 'Venue', 'Publish'] },
    { id: 'google', tasks: ['Business Profile', 'Event Schema', 'Maps Verification'] },
    { id: 'website', tasks: ['Event Published', 'SEO', 'Sitemap', 'Metadata'] },
    { id: 'repeat', tasks: ['30 Days Before', '21 Days Before', '14 Days Before', '7 Days Before', '3 Days Before', '1 Day Before', 'Event Day', 'Post Event'] }
  ];

  for (const ev of events) {
    const eventInsert = await db.collection('events').insertOne(ev);
    const eventId = eventInsert.insertedId.toString();

    const checklist: Record<string, Record<string, boolean>> = {};
    distributionChannels.forEach(channel => {
      checklist[channel.id] = {};
      channel.tasks.forEach(task => {
        checklist[channel.id][task] = false;
      });
    });

    const distributionDoc = {
      eventId,
      eventName: ev.name,
      showDate: ev.showDate,
      status: ev.status,
      checklist,
      assets: { posters: [], reels: [], stories: [] },
      generatedCopy: {
        instagramFeed: `Exciting news! We are bringing ${ev.name} to ${ev.venueName} on ${ev.showDate.toLocaleDateString('en-IN')}. Get your tickets now!`,
        whatsapp: `Hey everyone! Catch ${ev.name} live at ${ev.venueName}. Book your tickets today: https://humourshub.shubhhh.in/book-tickets`
      },
      links: {
        bookingUrl: 'https://humourshub.shubhhh.in/book-tickets',
        shortUrl: '',
        utmInstagram: 'https://humourshub.shubhhh.in/book-tickets?utm_source=instagram',
        utmWhatsApp: 'https://humourshub.shubhhh.in/book-tickets?utm_source=whatsapp'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('distributions').insertOne(distributionDoc);
  }
  console.log(`✓ Seeded ${events.length} events and corresponding distribution workspaces`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. SEED FEEDBACKS & CONTACT MESSAGES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Seeding Feedbacks & Contact Messages ---');

  const feedbacks = [
    {
      fullName: 'Devansh Parikh',
      email: 'devansh.p@example.com',
      category: 'Show Experience',
      vibe: 'Super energetic & hilarious',
      comment: 'The comedy night was absolutely fantastic! Aarav and Priya killed it on stage. The crowd interaction was spot on.',
      createdAt: new Date('2026-08-20')
    },
    {
      fullName: 'Ananya Desai',
      email: 'ananya.d@example.com',
      category: 'Performances',
      vibe: 'Soulful & heartwarming',
      comment: 'Loved the acoustic jam session right after the stand-up comedy sets. Very unique format for Ahmedabad!',
      createdAt: new Date('2026-08-22')
    },
    {
      fullName: 'Keval Shah',
      email: 'keval.shah@example.com',
      category: 'Venue & Hospitality',
      vibe: 'Comfortable & clean',
      comment: 'Great seating, clean venue, and seamless ticket verification at the door. Definitely coming again with friends.',
      createdAt: new Date('2026-08-25')
    }
  ];

  await db.collection('feedbacks').deleteMany({});
  await db.collection('feedbacks').insertMany(feedbacks);
  console.log(`✓ Seeded ${feedbacks.length} audience feedbacks`);

  const contactMessages = [
    {
      name: 'Riddhi Patel',
      email: 'riddhi.patel@example.com',
      phone: '9898989898',
      subject: 'Private Corporate Comedy Night Booking',
      message: 'Hello team, we are organizing our annual startup meet in Navrangpura and would love to book a 45-minute stand-up comedy slot. Please share availability.',
      status: 'read',
      createdAt: new Date('2026-08-18')
    },
    {
      name: 'Tanmay Bhattacharya',
      email: 'tanmay.b@example.com',
      phone: '9723456789',
      subject: 'College Fest Comedy Showcase Collaboration',
      message: 'Hi The Humours Hub, our college cultural committee is hosting a festival in October and we would like to invite your performers for a live showcase.',
      status: 'unread',
      createdAt: new Date('2026-08-26')
    }
  ];

  await db.collection('contact_messages').deleteMany({});
  await db.collection('contact_messages').insertMany(contactMessages);
  console.log(`✓ Seeded ${contactMessages.length} contact messages`);

  console.log('\n========================================');
  console.log(' ALL DATA IMPORTED & SEEDED SUCCESSFULLY!');
  console.log('========================================\n');
}

seedDatabase()
  .catch((err) => {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });
