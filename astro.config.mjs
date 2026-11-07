import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

// Static by default; pages that read live data (home, album, tesseramento,
// verifica, API) opt out with `export const prerender = false` and run as
// Vercel functions. See SETUP.md for the services behind them.
export default defineConfig({
  adapter: vercel(),
  env: {
    schema: {
      // Public address of the site, for links in emails and Stripe return URLs.
      SITE_URL: envField.string({ context: 'server', access: 'public', optional: true }),
      // Supabase: URL and anon key are public (the browser uses them in /admin, behind RLS).
      PUBLIC_SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      // Server only.
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      // SumUp online payments: API key (sup_sk_…) and merchant code, from me.sumup.com.
      SUMUP_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      SUMUP_MERCHANT_CODE: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Only for tests against a local fake; defaults to https://api.sumup.com.
      SUMUP_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      EMAIL_FROM: envField.string({ context: 'server', access: 'secret', default: 'PNL Officina Creativa <onboarding@resend.dev>' }),
      // Only for tests against a local fake; defaults to https://api.resend.com.
      RESEND_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      EMAIL_REPLY_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      RATE_LIMIT_SALT: envField.string({ context: 'server', access: 'secret', default: 'pnl' }),
      // Signs the personal links in emails (ticket form prefill, unsubscribe). Falls back to the service key.
      LINK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
