/**
 * @copyright (c) 2024 - Present
 * @author github.com/shubhhh-codes
 * @license MIT
 *
 * Dummy Ticket & Payment Data Seeder for Admin Section Analytics
 * Populates realistic bookings, payments, and capacity metrics to fill:
 * - Pricing Performance KPIs (Revenue, Tickets, Avg Rev/Ticket, Revenue Lift, Fill Rate, Squad Adoption, Daily Velocity, Est. Sell Out)
 * - Revenue Trend Area Chart
 * - Ticket Sales by Tier Pie Chart (SOLO, DUO, SQUAD)
 * - Before vs After Pricing Update Bar Chart (Old vs New Cohorts)
 * - Bookings Management Tab (with Pending, Approved, Cancelled, Complimentary, Attended)
 * - Payments Tab (with Completed, Pending, and Failed transactions)
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

export interface DummyBookingDef {
  bookingId: string;
  fullName: string;
  email: string;
  phone: string;
  bookingType: 'paid' | 'complimentary';
  status: 'approved' | 'pending' | 'cancelled';
  cart?: Array<{
    tierKey: string;
    units: number;
    seats: number;
    price: number;
  }>;
  numberOfTickets: number;
  attended: boolean;
  checkedInCount?: number;
  dateOffsetDays: number; // days before today (can be negative or fraction for today)
  timeStr: string; // HH:mm:ss
}

export async function seedTicketsData(client?: MongoClient) {
  let shouldClose = false;
  if (!client) {
    client = new MongoClient(uri!);
    await client.connect();
    shouldClose = true;
  }

  const db = client.db();
  console.log(`\n--- Seeding Dummy Ticket Data into "${db.databaseName}" ---`);

  // Current reference date: 2026-09-17
  const baseToday = new Date('2026-09-17T00:00:00.000Z');

  function makeDate(daysAgo: number, timeStr: string): Date {
    const d = new Date(baseToday);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    d.setUTCHours(hours || 12, minutes || 0, seconds || 0, 0);
    return d;
  }

  // 48 Realistic Bookings spanning:
  // 1. Pre-rollout cohort (before 2026-06-27): 12 bookings (May - June 2026)
  // 2. Last 30 Days (August 2026 - early Sep): 17 bookings
  // 3. Last 7 Days (Sep 11 - Sep 16, 2026): 15 bookings
  // 4. Today (Sep 17, 2026): 4 bookings
  const bookingDefinitions: DummyBookingDef[] = [
    // ── COHORT 1: OLD PRICING (Before June 27, 2026 rollout) ───────────────────
    // Old single tier model: ₹499 flat rate per ticket, 0% squad adoption
    {
      bookingId: 'HH-2026-000001',
      fullName: 'Aarav Patel',
      email: 'aarav.patel@example.com',
      phone: '9825011111',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 120, // ~May 20, 2026
      timeStr: '14:30:00'
    },
    {
      bookingId: 'HH-2026-000002',
      fullName: 'Riya Shah',
      email: 'riya.shah@example.com',
      phone: '9825022222',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 116,
      timeStr: '16:15:00'
    },
    {
      bookingId: 'HH-2026-000003',
      fullName: 'Parth Joshi',
      email: 'parth.j@example.com',
      phone: '9825033333',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 110,
      timeStr: '18:40:00'
    },
    {
      bookingId: 'HH-2026-000004',
      fullName: 'Sneha Mehta',
      email: 'sneha.m@example.com',
      phone: '9825044444',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 104,
      timeStr: '11:20:00'
    },
    {
      bookingId: 'HH-2026-000005',
      fullName: 'Harshil Desai',
      email: 'harshil.d@example.com',
      phone: '9825055555',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 98,
      timeStr: '15:10:00'
    },
    {
      bookingId: 'HH-2026-000006',
      fullName: 'Priya Trivedi',
      email: 'priya.t@example.com',
      phone: '9825066666',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 94,
      timeStr: '17:35:00'
    },
    {
      bookingId: 'HH-2026-000007',
      fullName: 'Devansh Modi',
      email: 'devansh.modi@example.com',
      phone: '9825077777',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 91,
      timeStr: '19:00:00'
    },
    {
      bookingId: 'HH-2026-000008',
      fullName: 'Ananya Pandya',
      email: 'ananya.p@example.com',
      phone: '9825088888',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 89,
      timeStr: '13:45:00'
    },
    {
      bookingId: 'HH-2026-000009',
      fullName: 'Rohan Dave',
      email: 'rohan.d@example.com',
      phone: '9825099999',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 87,
      timeStr: '16:50:00'
    },
    {
      bookingId: 'HH-2026-000010',
      fullName: 'Keval Bhatt',
      email: 'keval.b@example.com',
      phone: '9825100000',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 85,
      timeStr: '14:20:00'
    },
    {
      bookingId: 'HH-2026-000011',
      fullName: 'Mansi Raval',
      email: 'mansi.r@example.com',
      phone: '9825111111',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 499 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 84, // June 25, 2026
      timeStr: '18:15:00'
    },
    {
      bookingId: 'HH-2026-000012',
      fullName: 'Tanmay Shukla',
      email: 'tanmay.s@example.com',
      phone: '9825122222',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 499 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 83, // June 26, 2026
      timeStr: '20:30:00'
    },

    // ── COHORT 2: NEW PRICING (Post June 27, 2026 rollout) ──────────────────────
    // Tiers: Solo (₹149, 1 seat), Duo / Love Birds (₹279, 2 seats), Squad (₹499, 4 seats)

    // August 2026
    {
      bookingId: 'HH-2026-000013',
      fullName: 'Vikram Rathore',
      email: 'vikram.r@example.com',
      phone: '9825133333',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 32, // Aug 16
      timeStr: '10:30:00'
    },
    {
      bookingId: 'HH-2026-000014',
      fullName: 'Ishita Shah',
      email: 'ishita.s@example.com',
      phone: '9825144444',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 30, // Aug 18
      timeStr: '12:45:00'
    },
    {
      bookingId: 'HH-2026-000015',
      fullName: 'Aditya Vora',
      email: 'aditya.v@example.com',
      phone: '9825155555',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 4,
      cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }],
      attended: true,
      checkedInCount: 4,
      dateOffsetDays: 28, // Aug 20
      timeStr: '15:20:00'
    },
    {
      bookingId: 'HH-2026-000016',
      fullName: 'Pooja Gandhi',
      email: 'pooja.g@example.com',
      phone: '9825166666',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 26, // Aug 22
      timeStr: '17:10:00'
    },
    {
      bookingId: 'HH-2026-000017',
      fullName: 'Siddharth Sen',
      email: 'sid.sen@example.com',
      phone: '9825177777',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 24, // Aug 24
      timeStr: '11:00:00'
    },
    {
      bookingId: 'HH-2026-000018',
      fullName: 'Neha Kothari',
      email: 'neha.k@example.com',
      phone: '9825188888',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 4,
      cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }],
      attended: true,
      checkedInCount: 4,
      dateOffsetDays: 22, // Aug 26
      timeStr: '14:40:00'
    },
    {
      bookingId: 'HH-2026-000019',
      fullName: 'Kunal Mehta',
      email: 'kunal.m@example.com',
      phone: '9825199999',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 20, // Aug 28
      timeStr: '16:30:00'
    },
    {
      bookingId: 'HH-2026-000020',
      fullName: 'Roshni Soni',
      email: 'roshni.s@example.com',
      phone: '9825200000',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 149 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 18, // Aug 30
      timeStr: '19:15:00'
    },

    // Early September (Sep 1 - Sep 10, 2026)
    {
      bookingId: 'HH-2026-000021',
      fullName: 'Chirag Parikh',
      email: 'chirag.p@example.com',
      phone: '9825211111',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 16, // Sep 1
      timeStr: '10:15:00'
    },
    {
      bookingId: 'HH-2026-000022',
      fullName: 'Forum Vyas',
      email: 'forum.v@example.com',
      phone: '9825222222',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 4,
      cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }],
      attended: true,
      checkedInCount: 4,
      dateOffsetDays: 15, // Sep 2
      timeStr: '13:50:00'
    },
    {
      bookingId: 'HH-2026-000023',
      fullName: 'Hardik Patel',
      email: 'hardik.p@example.com',
      phone: '9825233333',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 14, // Sep 3
      timeStr: '15:30:00'
    },
    {
      bookingId: 'HH-2026-000024',
      fullName: 'Shruti Zaveri',
      email: 'shruti.z@example.com',
      phone: '9825244444',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 13, // Sep 4
      timeStr: '18:00:00'
    },
    {
      bookingId: 'HH-2026-000025',
      fullName: 'Mohit Agarwal',
      email: 'mohit.a@example.com',
      phone: '9825255555',
      bookingType: 'paid',
      status: 'cancelled', // Cancelled booking for testing lost revenue
      numberOfTickets: 4,
      cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 12, // Sep 5
      timeStr: '11:45:00'
    },
    {
      bookingId: 'HH-2026-000026',
      fullName: 'Payal Chauhan',
      email: 'payal.c@example.com',
      phone: '9825266666',
      bookingType: 'complimentary', // VIP complimentary pass
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 0 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 11, // Sep 6
      timeStr: '14:20:00'
    },
    {
      bookingId: 'HH-2026-000027',
      fullName: 'Darshan Thakkar',
      email: 'darshan.t@example.com',
      phone: '9825277777',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 9, // Sep 8
      timeStr: '16:40:00'
    },
    {
      bookingId: 'HH-2026-000028',
      fullName: 'Kinjal Somani',
      email: 'kinjal.s@example.com',
      phone: '9825288888',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 8, // Sep 9
      timeStr: '18:15:00'
    },
    {
      bookingId: 'HH-2026-000029',
      fullName: 'Yashraj Vaghela',
      email: 'yashraj.v@example.com',
      phone: '9825299999',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 4,
      cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }],
      attended: true,
      checkedInCount: 4,
      dateOffsetDays: 7, // Sep 10
      timeStr: '19:50:00'
    },

    // Last 7 Days (Sep 11 - Sep 16, 2026)
    {
      bookingId: 'HH-2026-000030',
      fullName: 'Deepali Rawal',
      email: 'deepali.r@example.com',
      phone: '9825300000',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: true,
      checkedInCount: 2,
      dateOffsetDays: 6, // Sep 11
      timeStr: '11:10:00'
    },
    {
      bookingId: 'HH-2026-000031',
      fullName: 'Ankit Solanki',
      email: 'ankit.s@example.com',
      phone: '9825311111',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: true,
      checkedInCount: 1,
      dateOffsetDays: 6, // Sep 11
      timeStr: '15:25:00'
    },
    {
      bookingId: 'HH-2026-000032',
      fullName: 'Maitri Barot',
      email: 'maitri.b@example.com',
      phone: '9825322222',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 4,
      cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }],
      attended: false, // upcoming event check-in
      checkedInCount: 0,
      dateOffsetDays: 5, // Sep 12
      timeStr: '10:45:00'
    },
    {
      bookingId: 'HH-2026-000033',
      fullName: 'Rahul Panchal',
      email: 'rahul.p@example.com',
      phone: '9825333333',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 5, // Sep 12
      timeStr: '14:30:00'
    },
    {
      bookingId: 'HH-2026-000034',
      fullName: 'Bhavna Mistry',
      email: 'bhavna.m@example.com',
      phone: '9825344444',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 4, // Sep 13
      timeStr: '09:50:00'
    },
    {
      bookingId: 'HH-2026-000035',
      fullName: 'Jigar Oza',
      email: 'jigar.o@example.com',
      phone: '9825355555',
      bookingType: 'paid',
      status: 'cancelled', // Cancelled booking for testing
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 4, // Sep 13
      timeStr: '16:00:00'
    },
    {
      bookingId: 'HH-2026-000036',
      fullName: 'Kruti Shah',
      email: 'kruti.s@example.com',
      phone: '9825366666',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 4,
      cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 3, // Sep 14
      timeStr: '11:20:00'
    },
    {
      bookingId: 'HH-2026-000037',
      fullName: 'Pratik Dave',
      email: 'pratik.d@example.com',
      phone: '9825377777',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 3, // Sep 14
      timeStr: '17:40:00'
    },
    {
      bookingId: 'HH-2026-000038',
      fullName: 'Shaili Upadhyay',
      email: 'shaili.u@example.com',
      phone: '9825388888',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 2, // Sep 15
      timeStr: '10:05:00'
    },
    {
      bookingId: 'HH-2026-000039',
      fullName: 'Bhavik Prajapati',
      email: 'bhavik.p@example.com',
      phone: '9825399999',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 2, // Sep 15
      timeStr: '13:30:00'
    },
    {
      bookingId: 'HH-2026-000040',
      fullName: 'Nirali Kapadia',
      email: 'nirali.k@example.com',
      phone: '9825400000',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 4,
      cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 2, // Sep 15
      timeStr: '18:50:00'
    },
    {
      bookingId: 'HH-2026-000041',
      fullName: 'Sagar Maniar',
      email: 'sagar.m@example.com',
      phone: '9825411111',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 1, // Sep 16
      timeStr: '09:15:00'
    },
    {
      bookingId: 'HH-2026-000042',
      fullName: 'Dhwani Parekh',
      email: 'dhwani.p@example.com',
      phone: '9825422222',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 1, // Sep 16
      timeStr: '12:00:00'
    },
    {
      bookingId: 'HH-2026-000043',
      fullName: 'Meet Soni',
      email: 'meet.s@example.com',
      phone: '9825433333',
      bookingType: 'complimentary', // Guest comic complimentary pass
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'solo', units: 2, seats: 2, price: 0 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 1, // Sep 16
      timeStr: '15:45:00'
    },
    {
      bookingId: 'HH-2026-000044',
      fullName: 'Nidhi Trivedi',
      email: 'nidhi.t@example.com',
      phone: '9825444444',
      bookingType: 'paid',
      status: 'pending', // Pending booking for testing pending filter & actions
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 1, // Sep 16
      timeStr: '21:10:00'
    },

    // Today (Sep 17, 2026)
    {
      bookingId: 'HH-2026-000045',
      fullName: 'Urvish Pandya',
      email: 'urvish.p@example.com',
      phone: '9825455555',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 4,
      cart: [{ tierKey: 'squad', units: 1, seats: 4, price: 499 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 0, // Today
      timeStr: '08:30:00'
    },
    {
      bookingId: 'HH-2026-000046',
      fullName: 'Hetal Sanghavi',
      email: 'hetal.s@example.com',
      phone: '9825466666',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 0, // Today
      timeStr: '09:50:00'
    },
    {
      bookingId: 'HH-2026-000047',
      fullName: 'Jaydeep Vora',
      email: 'jaydeep.v@example.com',
      phone: '9825477777',
      bookingType: 'paid',
      status: 'approved',
      numberOfTickets: 1,
      cart: [{ tierKey: 'solo', units: 1, seats: 1, price: 149 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 0, // Today
      timeStr: '11:15:00'
    },
    {
      bookingId: 'HH-2026-000048',
      fullName: 'Aakash Bahl',
      email: 'aakash.b@example.com',
      phone: '9825488888',
      bookingType: 'paid',
      status: 'pending', // Pending payment/verification
      numberOfTickets: 2,
      cart: [{ tierKey: 'duo', units: 1, seats: 2, price: 279 }],
      attended: false,
      checkedInCount: 0,
      dateOffsetDays: 0, // Today
      timeStr: '11:40:00'
    }
  ];

  // Helper for random string ID
  const randomAlnum = (len: number) => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Build the MongoDB documents
  const bookingDocs: any[] = [];
  const paymentDocs: any[] = [];

  let totalApprovedSeats = 0;
  let maxSeq = 48;

  for (const item of bookingDefinitions) {
    const createdAt = makeDate(item.dateOffsetDays, item.timeStr);
    const updatedAt = new Date(createdAt);

    let paymentId = '';
    let orderId = '';
    let totalRevenue = 0;

    if (item.cart && item.cart.length > 0) {
      totalRevenue = item.cart.reduce((sum, c) => sum + (c.price * c.units), 0);
    } else {
      totalRevenue = item.numberOfTickets * 499;
    }

    if (item.bookingType === 'paid') {
      orderId = `order_${randomAlnum(14)}`;
      paymentId = `pay_${randomAlnum(14)}`;

      let paymentStatus = 'completed';
      if (item.status === 'cancelled') {
        paymentStatus = 'failed';
      } else if (item.status === 'pending') {
        paymentStatus = 'pending';
      }

      paymentDocs.push({
        orderId,
        paymentId,
        signature: `sig_${randomAlnum(32)}`,
        bookingId: item.bookingId,
        amount: totalRevenue * 100, // Amount in paise for Razorpay
        status: paymentStatus,
        type: 'ticket_booking',
        createdAt,
        updatedAt,
        bookingDetails: {
          numberOfTickets: item.numberOfTickets,
          fullName: item.fullName,
          email: item.email,
          phone: item.phone,
        }
      });
    }

    if (item.status === 'approved') {
      totalApprovedSeats += item.numberOfTickets;
    }

    bookingDocs.push({
      bookingId: item.bookingId,
      fullName: item.fullName,
      email: item.email.toLowerCase().trim(),
      phone: item.phone.trim(),
      numberOfTickets: item.numberOfTickets,
      bookingType: item.bookingType,
      status: item.status,
      cart: item.cart,
      paymentStatus: item.bookingType === 'paid' ? (item.status === 'approved' ? 'completed' : item.status) : 'n/a',
      paymentId: paymentId || null,
      attended: item.attended,
      attendedAt: item.attended ? createdAt : null,
      checkedInCount: item.attended ? (item.checkedInCount ?? item.numberOfTickets) : 0,
      createdAt,
      updatedAt
    });
  }

  // Clear existing bookings and payments to prevent duplicates
  await db.collection('bookings').deleteMany({});
  await db.collection('payments').deleteMany({});

  // Insert Bookings
  const insertBookingsResult = await db.collection('bookings').insertMany(bookingDocs);
  console.log(`✓ Seeded ${insertBookingsResult.insertedCount} bookings`);

  // Insert Payments
  const insertPaymentsResult = await db.collection('payments').insertMany(paymentDocs);
  console.log(`✓ Seeded ${insertPaymentsResult.insertedCount} payments`);

  // Update Inventory Venue Capacity
  await db.collection('inventory').updateOne(
    { type: 'venue_capacity' },
    {
      $set: {
        type: 'venue_capacity',
        maxCapacity: 150,
        bookedSeats: totalApprovedSeats,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );
  console.log(`✓ Updated venue capacity: 150 max, ${totalApprovedSeats} booked seats`);

  // Update Counters for Booking Sequence
  await db.collection('counters').updateOne(
    { _id: 'bookingId_2026' as any },
    { $set: { seq: maxSeq + 10 } },
    { upsert: true }
  );
  console.log(`✓ Updated counter bookingId_2026 to sequence: ${maxSeq + 10}`);

  console.log('\n=============================================================');
  console.log(`✓ TICKET ANALYTICS DATA SEEDING COMPLETE!`);
  console.log(`  - Total Bookings: ${bookingDocs.length}`);
  console.log(`  - Approved Bookings: ${bookingDocs.filter(b => b.status === 'approved').length}`);
  console.log(`  - Total Tickets: ${totalApprovedSeats} (Fill Rate: ${((totalApprovedSeats / 150) * 100).toFixed(1)}%)`);
  console.log(`  - Total Payments: ${paymentDocs.length} (${paymentDocs.filter(p => p.status === 'completed').length} completed)`);
  console.log(`  - Cohort Old Pricing: 12 bookings (Pre-2026-06-27)`);
  console.log(`  - Cohort New Pricing: 36 bookings (Post-2026-06-27)`);
  console.log('=============================================================\n');

  if (shouldClose && client) {
    await client.close();
  }
}

seedTicketsData()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error seeding ticket data:', err);
    process.exit(1);
  });

