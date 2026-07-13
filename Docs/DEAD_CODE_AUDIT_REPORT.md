# Dead Code Audit Report

**Date of audit:** 2026-07-13
**Auditor:** Antigravity (AI)
**Scope:** Full codebase — `components/`, `hooks/`, `lib/`, `models/`, `pages/`, `scripts/`, `styles/`, `types/`, `utils/`

---

## Summary

| Category | Count |
|---|---|
| Files deleted | 5 |
| npm dependencies removed | 2 (`@tsparticles/react`, `@tsparticles/slim`) — 41 transitive packages |
| `console.log` lines stripped | 16 across 7 files |
| Unused exports/functions cleaned | 0 (all active exports confirmed live) |
| Duplicate logic merged | 0 (none found safe to merge in this pass) |

---

## Files Deleted

| File path | Reason it was dead | Confirmed 0 references |
|---|---|---|
| `utils/mongodb.ts` | Duplicate DB connection helper; the canonical version used by the entire codebase is `lib/mongodb.ts`. `utils/mongodb.ts` exported `connectToDatabase()` / `disconnectFromDatabase()` — neither function was imported anywhere. | grep: `utils/mongodb` -> 0 results across all source directories |
| `lib/getTicketPrice.ts` | Exported `getTicketPrice(): Promise<number>` which fetched ticket price from the CMS. This function was never called — price fetching is handled inline inside each route that needs it (e.g. `pages/api/payments/create-order.ts` queries `settings.tiers` directly). | grep: `getTicketPrice` -> only definition in the file itself, zero callers |
| `components/Avatar.tsx` | Exported a React avatar component with fallback initials. No page, component, or layout ever imported it. | grep: `import.*Avatar` -> 0 results; grep `Avatar` -> only definition lines in the file itself |
| `models/Show.ts` | Orphaned model file exporting the stub `TicketTier` interface. No file imported it; all consumers defined local `TicketTier` shapes or used `any`. | grep: `models/Show` -> 0 results across all source files |
| `pages/api/test-error.ts` | Developer/debug test endpoint which throws an error on demand to test logging. No active frontend or integration tests call it. | grep: `test-error` -> 0 results across all source files |

---

## Dependencies Removed

| Package | Why unused |
|---|---|
| `@tsparticles/react` (v4.2.1) | Zero imports in any `.ts`/`.tsx`/`.js` file. Particle animations were previously used but removed; the dependency was left as a stale artefact in `package.json`. |
| `@tsparticles/slim` (v4.2.1) | Companion to `@tsparticles/react`. Same situation — zero code references. |

> **Impact:** `npm uninstall` removed 41 packages total from `node_modules`.

---

## Console.logs Removed

All removed statements were debug-level logs leaking internal state (record counts, IDs, partial API keys) to server stdout in production.
All `console.error` statements in `catch` blocks were deliberately **kept**.
The one surviving `console.log` in `components/admin/QRScanner.tsx:256` is correctly guarded by `if (process.env.NODE_ENV !== 'production')` and was intentionally retained.

| File path | Count removed | What was removed |
|---|---|---|
| `pages/api/admin/payments.ts` | 2 | `'Fetched payments: N'`, `'Payment stats: {...}'` |
| `pages/api/payments/verify.ts` | 3 | `'Payment already processed: <orderId>'`, `'Payment record processed: <paymentId>'`, `'Booking updated: <bookingId>'` |
| `pages/api/payments/dismiss.ts` | 2 | `'[PAYMENT_CANCELLED] Alert sent for booking: <id>. Repeat: <bool>'`, `'[PAYMENT_CANCELLED] Booking not found for: <id>'` |
| `pages/api/payments/create-order.ts` | 2 | `'Creating Razorpay order with options: {...}'` (leaked partial key_id + environment), `'Order created successfully: {...}'` |
| `pages/api/generate-ticket.ts` | 3 | `'[generate-ticket] Evicting stale browser...'`, `'[generate-ticket] Browser launched'`, `'[generate-ticket] Cache HIT for <bookingId>'` |
| `pages/api/admin/cms/content.ts` | 2 | `'Failed auth check in content.ts. Email: <email> Role: <role>'`, `'User not found in DB, auto-creating admin...'` |
| `pages/api/admin/cms/content/[id].ts` | 2 | `'Failed auth check in [id].ts. Email: <email> Role: <role>'`, `'User not found in DB, auto-creating admin...'` |

**Total: 16 console.log statements removed**

---

## Unused Exports / Functions Cleaned (file kept)

None. All exported functions in live files were confirmed to have at least one import reference across the codebase.

---

## Duplicate Logic Merged

None actioned in this pass. See **Notes** section for duplicate candidates.

---

## Notes / Anything Flagged But NOT Removed

### 1. Duplicate `TicketTier` interface definition (flagged, not merged)

The `TicketTier` shape is defined in:
- `pages/book-tickets.tsx:15` — local inline (fields include `key`, `name`, `label`, `price`, `seats`, `badge`, `displayOrder`, `description`, `isActive`, `maxBookings`, `createdAt`)
- Various API routes use `any`-typed tier objects

**Recommendation:** Define a single canonical `TicketTier` interface in `types/index.ts` and update `book-tickets.tsx` to import from there. Not done in this pass to avoid touching business logic.
---


### 4. All runtime dependencies confirmed live

The following runtime dependencies were individually verified via grep as having real import references:

| Package | Confirmed used in |
|---|---|
| `@simplewebauthn/browser` | `pages/auth/login.tsx`, `pages/admin/index.tsx` |
| `@simplewebauthn/server` | `pages/api/auth/webauthn/` routes |
| `@sparticuz/chromium` | `pages/api/generate-ticket.ts` |
| `@tailwindcss/container-queries` | `tailwind.config.js` |
| `@tailwindcss/forms` | `tailwind.config.js` |
| `@vercel/analytics` | `pages/_app.tsx` |
| `@vercel/speed-insights` | `pages/_app.tsx` |
| `bcryptjs` | `pages/api/admin/comedians.ts` |
| `date-fns` | `components/admin/analytics/AnalyticsEngine.ts` |
| `formidable` | `pages/api/admin/cms/upload.ts` |
| `framer-motion` | `Navbar.tsx`, `LoadingSpinner.tsx`, `ErrorBoundary.tsx`, `pages/404.tsx`, `pages/policies.tsx` |
| `html2canvas` | `components/admin/analytics/ExportUtils.ts` |
| `html5-qrcode` | `components/admin/QRScanner.tsx` |
| `jspdf` + `jspdf-autotable` | `components/UserDownloadPDF.tsx` |
| `lucide-react` | Multiple pages and components |
| `mongodb` | `lib/mongodb.ts` |
| `next-auth` | Auth flow throughout |
| `puppeteer-core` | `pages/api/generate-ticket.ts` |
| `qrcode` | `lib/secure-qr.ts` |
| `razorpay` | Payment API routes |
| `react-toastify` | `pages/_app.tsx`, `components/admin/` |
| `recharts` | `components/admin/analytics/Charts.tsx` |
| `sharp` | `pages/api/admin/cms/upload.ts` |
| `ua-parser-js` | `pages/api/analytics/visit.ts`, `pages/api/auth/[...nextauth].ts`, `pages/api/system/activity.ts` |

---

*Report generated after all deletions were applied — reflects the actual final diff.*
