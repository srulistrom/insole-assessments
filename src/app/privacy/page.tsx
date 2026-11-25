import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSettings } from "@/lib/public-settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the insole assessment app handles customer information and Google Drive access.",
};

export const dynamic = "force-dynamic";

const UPDATED = "25 November 2026";

/** Public page (no sign-in): Google requires a privacy policy address before an app can be published. */
export default async function PrivacyPage() {
  const s = await getPublicSettings();
  const shop = s.shop_name || "Reagle Menswear";
  const contact = [s.shop_address, s.shop_phone].filter(Boolean).join(" · ");

  const h2 = "mt-9 text-xl font-extrabold tracking-tight";
  const p = "mt-3 text-[16px] leading-relaxed text-ink/90";
  const li = "mt-2 text-[16px] leading-relaxed text-ink/90";

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-primary px-5 py-6 text-primary-foreground">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wider opacity-75">{shop}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="mt-1 text-sm font-medium opacity-75">Insole Assessments app · Last updated {UPDATED}</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-2">
        <h2 className={h2}>Who we are</h2>
        <p className={p}>
          The Insole Assessments app is a private tool used by the staff of <b>{shop}</b> to record custom insole and arch assessments, send orders to our
          supplier, and keep a copy of each order. It is not a public service and is not offered to the general public.
          {contact ? <> You can contact us at: {contact}.</> : null}
        </p>

        <h2 className={h2}>What information we keep</h2>
        <p className={p}>When our staff record an assessment for a customer, the app stores:</p>
        <ul className="mt-1 list-disc pl-6">
          <li className={li}>the customer&apos;s name, phone number and, if given, email address;</li>
          <li className={li}>shoe size, the reason for the visit, and any notes our staff add;</li>
          <li className={li}>pictures of the foam impressions taken during the assessment;</li>
          <li className={li}>the order details: insole type, price, deposit, how the deposit was paid, and the order status.</li>
        </ul>
        <p className={p}>Staff sign in to the app with a shop login. We do not use advertising, tracking or analytics cookies in this app.</p>

        <h2 className={h2}>How we use it</h2>
        <p className={p}>
          We use this information only to make and deliver the customer&apos;s insoles: to place the order with our supplier, to contact the customer when
          the order is ready to collect, and to keep a record of the order. We do not sell personal information and we do not use it for marketing.
        </p>

        <h2 className={h2}>Who it is shared with</h2>
        <ul className="mt-1 list-disc pl-6">
          <li className={li}>
            <b>Our supplier</b>, who receives the order details and foam pictures (usually by WhatsApp) so that the insoles can be made.
          </li>
          <li className={li}>
            <b>Our hosting providers</b>: the app and its database and file storage run on secure cloud services (Vercel and Supabase) that process the data
            on our behalf.
          </li>
          <li className={li}>
            <b>Google Drive</b>, only if the shop has connected it (see below).
          </li>
        </ul>

        <h2 className={h2}>Google Drive</h2>
        <p className={p}>
          The shop owner can connect a Google account so that a copy of each order (a PDF and the pictures) is saved to a folder called &ldquo;Insole
          Orders&rdquo; in that account&apos;s Google Drive. This is optional.
        </p>
        <ul className="mt-1 list-disc pl-6">
          <li className={li}>
            The app asks only for the <b>drive.file</b> permission. This lets the app create and update <b>only the files and folders it creates itself</b>. It
            cannot see, open, change or delete any of your other Drive files.
          </li>
          <li className={li}>The app also reads the connected account&apos;s email address, only to show in Settings which account is connected.</li>
          <li className={li}>
            The connection is stored securely on our server and is used only to save order files. It is never shared and never used for anything else.
          </li>
          <li className={li}>
            You can disconnect at any time with the <b>Disconnect</b> button in the app&apos;s Settings, or by removing the app in your Google Account under
            &ldquo;Third-party apps &amp; services&rdquo;.
          </li>
        </ul>
        <p className={p}>
          The app&apos;s use and transfer of information received from Google APIs adheres to the{" "}
          <a className="font-bold text-primary underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>

        <h2 className={h2}>How long we keep it</h2>
        <p className={p}>
          We keep order records for as long as we need them to look after the customer&apos;s order and for our normal business records. If you would like
          your information deleted or corrected, please contact the shop using the details above and we will deal with your request.
        </p>

        <h2 className={h2}>Changes to this policy</h2>
        <p className={p}>If we change how the app handles information, we will update this page and the date at the top.</p>

        <p className="mt-12 text-sm font-semibold text-muted">
          <Link href="/login" className="text-primary underline">
            Back to the app
          </Link>
        </p>
      </main>
    </div>
  );
}
