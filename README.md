# Insole Assessments

Mobile/tablet-first app for custom insole assessments. Next.js 15 · Tailwind 4 · shadcn-style UI · Supabase (Auth, Postgres, Storage).

## Setup

1. **Supabase**: create a project, then run `supabase/migrations/20261119000000_init.sql` in the SQL editor (or `supabase db push`). It creates the tables, seeds Gold/Silver/Bronze (price 0) and default settings, adds RLS, the assessor-PIN functions and the storage buckets (`branding` public, `foam-photos` and `pdfs` private).
2. **One shared login**: Supabase dashboard > Authentication > Users > Add user (email + password). Turn off public sign-ups (Authentication > Providers > Email > disable "Allow new users to sign up").
3. `cp .env.example .env.local` and fill in the Supabase URL, anon key and service-role key.
4. `npm install && npm run dev`, sign in, then in **Settings** add your assessors and upload the logo.

## Google Drive (optional)

Google Cloud Console > APIs & Services: enable the **Google Drive API**, create an **OAuth client (Web application)** with redirect URI `{NEXT_PUBLIC_SITE_URL}/api/google/callback`, put the ID/secret in `.env.local`, then press **Connect Google Drive** in Settings. Files go to `/Insole Orders/{INS-001} - {LastName}/` (PDF, Right.jpg, Left.jpg). A draft's PDF is named `DRAFT - INS-001 - Name.pdf`; converting it updates the same folder and file. The `drive.file` scope is used, so the app only touches files it created. If Drive isn't connected the order still saves and a warning is shown.

## Branding

Everything shown to customers (logo, shop name, address, phone, colours) comes from Settings > Shop Branding and appears on the login screen, header, printed label and PDF. Until a logo is uploaded a "YOUR LOGO" placeholder shows. The migration pre-fills Reagle Menswear's name, address, phone and blue/gold colours, all editable in Settings.

## Printing the label

Paper: **A4 landscape**. The label occupies the left half (148 × 210 mm, portrait); fold on the dashed line to get an A5 portrait label. In the print dialog set margins to "None" and scale 100%.

## Notes

- Drafts print the label immediately and set `label_printed`; converting a draft never prints again.
- The wizard keeps answers (including photos) on the device, so form filling survives going offline; saving needs a connection.
- Photos are compressed to ≤1600 px JPEG before upload.
