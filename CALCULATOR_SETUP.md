# Financial Freedom Calculator — Setup & Deployment Guide

This guide walks you through setting up and deploying the passwordless email authentication system for the Financial Freedom Calculator.

## Features

- **Passwordless Email Auth**: Magic link authentication - no passwords required
- **Cloud Plan Storage**: Auto-save plans to Supabase
- **Multiple Plans**: Users can create and manage multiple plans per email
- **Auto-Save**: Changes saved automatically to cloud
- **PDF Export**: Download plans as professional PDFs
- **Session Management**: 24-hour browser session with email-based access
- **No Admin Approval**: Public calculator - no approval workflow needed

## Database Setup

### 1. Create Supabase Tables

Run the SQL migration in your Supabase dashboard:

```bash
# Open Supabase dashboard → SQL Editor → New Query
# Copy and paste the contents of: supabase/calculator-schema.sql
```

This creates:
- `calculator_plans` - Stores user plans
- `calculator_auth_tokens` - Magic link tokens
- `calculator_subscribers` - Optional for email list

### 2. Enable Row Level Security (RLS)

All tables have RLS enabled with public policies. Users can:
- View/create/update/delete their own plans by email
- Create/use auth tokens
- Subscribe to mailing list (optional)

## Environment Variables

No new env vars needed - uses existing Supabase instance:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Dependencies

Added to `package.json`:
- `html2canvas` - HTML to image conversion for PDFs
- `jspdf` - PDF generation

Install with:
```bash
npm install
```

## File Structure

```
app/
├── calculator/
│   ├── page.tsx           # Main calculator page (handles auth state)
│   └── auth/
│       └── page.tsx       # Magic link redirect handler
├── api/calculator/
│   ├── send-magic-link/route.ts  # Generate magic link
│   └── plans/route.ts            # CRUD for plans

components/
├── CalculatorAuth.tsx                    # Email login form
└── FinancialFreedomCalculator.tsx        # Main calculator UI

lib/
├── calculator-pdf.ts     # PDF generation utility
└── supabase/
    ├── server.ts         # Server-side client
    └── client.ts         # Client-side client

supabase/
└── calculator-schema.sql # Database migrations
```

## How It Works

### Authentication Flow

1. **Login**: User enters email on `/calculator`
2. **Magic Link**: (Backend would email link in production)
   - Currently returns link for testing
   - In production: Use Resend or SendGrid
3. **Redirect**: Click link → `/calculator/auth?token=...`
   - Validates token
   - Sets `sessionStorage['calculator_email']`
   - Redirects to calculator
4. **Session**: 24-hour browser session
   - Persists via `sessionStorage`
   - Auto-logout after 24 hours

### Plan Storage

1. **Load Plans**: On mount, fetch all plans for email from Supabase
2. **Auto-Save**: Debounced saves (1s) on any input change
3. **Multiple Plans**: Create/switch/delete plans as needed
4. **PDF Export**: Client-side generation using html2canvas + jsPDF

## API Endpoints

### POST `/api/calculator/send-magic-link`
Send magic link email to user.

```json
Request:
{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Magic link created",
  "magicLink": "https://yoursite.com/calculator/auth?token=..." // Remove in production
}
```

### GET `/api/calculator/plans?email=...`
Fetch all plans for an email.

```json
Response:
{
  "plans": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Plan 1",
      "planData": {...},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/api/calculator/plans`
Create new plan.

```json
Request:
{
  "email": "user@example.com",
  "name": "My Plan",
  "planData": {
    "homePrice": 450000,
    "downPaymentPercent": 20,
    "interestRate": 6.75,
    "loanTermYears": 30,
    "savingsGoal": 50000,
    "yearsToFreedom": 10
  }
}

Response:
{
  "success": true,
  "plan": {...}
}
```

### PUT `/api/calculator/plans`
Update existing plan.

```json
Request:
{
  "id": "plan-uuid",
  "email": "user@example.com",
  "name": "My Updated Plan",
  "planData": {...}
}
```

### DELETE `/api/calculator/plans`
Delete a plan.

```json
Request:
{
  "id": "plan-uuid",
  "email": "user@example.com"
}
```

## Email Integration (Production)

Currently returns magic link for testing. For production:

1. **Install Resend**: `npm install resend`

2. **Update Send Magic Link API** (`app/api/calculator/send-magic-link/route.ts`):

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Replace test return with:
await resend.emails.send({
  from: 'calculator@yourdomain.com',
  to: email,
  subject: 'Load Your Financial Freedom Plan',
  html: `
    <h1>Your Magic Link</h1>
    <p>Click the link below to load your plan:</p>
    <a href="${magicLink}">Load My Plan</a>
    <p>Link expires in 24 hours.</p>
  `
})
```

3. **Set env vars**:
   - `RESEND_API_KEY` - From Resend dashboard

## Styling Customization

All components use inline styles with a consistent color scheme:

```typescript
const C = {
  navy: '#0A2540',       // Primary brand
  accent: '#5BCBF5',     // Highlights
  white: '#fff',
  bg: '#F4F6F8',
  border: '#E4E8EC',
  muted: '#858889',
  dim: '#5C6570',
  text: '#26303B',
  green: '#16a34a',
  red: '#dc2626',
}
```

Update these hex codes to match your brand guidelines.

## Deployment to Vercel

### 1. Install Dependencies

```bash
cd finfree-team-hq
npm install
```

### 2. Push to GitHub

```bash
git add .
git commit -m "Add Financial Freedom Calculator with passwordless auth"
git push origin main
```

### 3. Deploy via Vercel

```bash
vercel deploy
```

Or push to GitHub and auto-deploy via Vercel dashboard.

### 4. Test in Production

1. Visit `https://yoursite.com/calculator`
2. Enter email
3. Copy magic link from console
4. Click link to validate flow
5. Create/save plans

## Testing Checklist

- [ ] Login flow works (email → calculator)
- [ ] Plans auto-save on input change
- [ ] Multiple plans can be created
- [ ] Plans can be deleted
- [ ] PDF downloads correctly
- [ ] Logout clears session
- [ ] 24-hour session expires
- [ ] Session survives page reload
- [ ] Mobile responsive design

## Troubleshooting

### Plans not saving?
- Check Supabase connection in browser DevTools Network tab
- Verify RLS policies allow inserts (`calculator_plans`)
- Check console for API errors

### PDF not generating?
- `html2canvas` may have CORS issues with images
- Ensure all image URLs are same-origin or have CORS headers
- Check browser console for rendering errors

### Magic link not working?
- Check token in database (Supabase → Data)
- Verify token hasn't expired (24 hours)
- Check token was marked `used_at` after first use
- Validate email matches in token and request

### Session expires unexpectedly?
- Check browser `sessionStorage` in DevTools
- Verify 24-hour timestamp is current
- Try incognito mode to test (no cached data)

## Performance Optimizations

### Already Implemented
- Auto-save debounced (1s delay prevents excessive saves)
- Plans loaded once, switched via state
- PDF generated client-side (no server resources)
- RLS policies prevent unauthorized access

### Future Enhancements
- Add offline support (Service Worker)
- Implement real-time sync (Supabase Realtime)
- Add plan templates
- Export to multiple formats (Excel, CSV)
- Share plans via link
- Email results to user

## Security Notes

### Current Implementation
- Emails stored lowercase in database
- RLS policies enforce email-based access
- Auth tokens marked used after consumption
- Session stored in `sessionStorage` (cleared on tab close)
- 24-hour token expiration
- No sensitive data logged

### Recommendations
- Add rate limiting to API endpoints
- Implement CSRF protection
- Add optional password protection for shared links
- Monitor for abuse via email frequency
- Implement email verification flow

## Support & Maintenance

### Monitoring
- Check Supabase database size monthly
- Monitor API response times
- Track error rates via Vercel logs

### Cleanup
- Add script to delete expired auth tokens
- Archive old plans (optional)
- Monitor storage costs

### Updates
- Keep Supabase, Next.js, and dependencies updated
- Review security advisories monthly
- Test all features after updates

## Questions or Issues?

Refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [jsPDF Documentation](https://github.com/paralleldrive/jsPDF)
- [html2canvas Documentation](https://github.com/niklasvh/html2canvas)
