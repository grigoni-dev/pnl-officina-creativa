# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: **Astro** with a server adapter (hybrid output). Marketing pages (home, event albums) are static for speed and SEO. Membership signup, payment webhooks and the status check run as server endpoints. Why: the content is mostly static and image-heavy, so it should ship close to zero JS, while the membership portal needs a small, secure server side. Deploy: **Vercel**. Data: **Supabase** (Postgres + Storage + Auth for admins). Payments: **SumUp** (online payments, card widget on our own page). Email: **Resend**. Album photos are uploaded from `/admin`, not kept in the repository. See SETUP.md.

## Users

- **Young people (18–35).** They discover events, decide whether to come, and join the association. They're mostly on phones, often arriving from social links.
- **The local community.** Residents who follow what happens in town.
- **Public bodies (Comune, Regione, local institutions) and sponsors.** They assess whether PNL is credible, active and worth funding or partnering with. They need proof that the association is real and active, at its actual (small) scale.
- **Artists and volunteers.** They want to perform, collaborate or help out.
- **Existing members.** They need to check whether their card is active.

## Product Purpose

The official site of **PNL Officina Creativa**, a youth-run, non-profit cultural association (*associazione culturale*) It's small: **three or four events a year, mostly private** (parties and evenings by invitation, not big public events). The site must never present it as a busy promoter with a packed calendar.

The site has four jobs:

1. **Strong visual and energetic impact.** It should feel like the association's events.
2. **Albums of past events.** Not a mixed photo gallery: a collection of albums, one per event, each holding all the photos of that event. People who were there come back to find themselves; for sponsors and public bodies it's also proof that the association is real.
3. **An online membership portal (*tesseramento*).** Join as a member and pay online.
4. **A membership status check.** A member verifies whether their card is active.

Success looks like this: members join online without paper forms or cash, sponsors and institutions leave convinced the association is active and well run, and young people find the next event and show up.

## Positioning

PNL is a group of creative people who like to have fun and make others have fun. It isn't a commercial promoter or an institution, and it doesn't take itself seriously: see the slogan.

## Operating Context

- Visitors mostly arrive on mobile from social media (Instagram, Facebook, TikTok).
- Sponsors and public bodies are evaluated around funding calls, sponsorship deals and event planning, sometimes on desktop and sometimes from a shared link.
- Membership signup happens at any time, including at events (a phone in hand, often a QR code at the venue).
- The association is run by volunteers, so admin work (confirming bank transfers, managing members) must be light.

## Capabilities and Constraints

**Membership (*tesseramento*)**
- Membership is **permanent**. It stays valid until the member formally withdraws (*recesso*). There is no annual expiry.
- Status is only **attivo** or **receduto**. There is no annual renewal and no expiry.
- **Fee (*quota associativa*): €5, paid once** at signup. There is one card type.
- Signup collects the data an Italian *associazione culturale* needs for its member register (*libro soci*). The exact fields are to be confirmed with the association's statute.

**Payments.** No provider exists yet. Proposed setup, not yet confirmed:
- **SumUp** online payments (2.5% fee): cards, plus Apple Pay and Google Pay once SumUp enables them. Chosen over Stripe for lower fees on small amounts; the association already uses SumUp at events.
- **PayPal** as a separate option.
- **Bank transfer (*bonifico*)**. The signup is recorded as "pending" and a volunteer confirms it by hand once the transfer arrives.

**Member register.** None exists yet. It needs a small database and a simple admin view to confirm transfers, see members and record withdrawals.

**Status check**
- A member looks up their status by card number and/or email or *codice fiscale*. It returns only the status, never other personal data.
- It's a public endpoint, so it needs rate limiting and must not allow listing members.

**Legal and privacy.** It must comply with GDPR, with a privacy notice, consent at signup and minimal data. Non-profit status affects how fees are described (*quota associativa*, not a "purchase").

## Brand Commitments

- **Name:** PNL Officina Creativa. The site doesn't mention the town.
- **Language:** Italian only.
- **Binding direction from the association:** a strong visual and energetic impact in a contemporary **urban / festival** style.
- The association has an existing logo and brand material. These are not yet in the project folder and must be used once provided.

## Evidence on Hand

The association has all of the following, but **none of it is in the repository yet**:
- logo and brand material;
- photographs of past events, grouped per event (permission to publish needs confirming, especially since most events are private);
- a list of past events with names, dates, places and data (attendance, partners, sponsors);
- social profiles and/or an existing site to draw content from.

Until these arrive, no events, figures, sponsors, partners, testimonials or attendance numbers may be invented. Use clearly marked client slots instead.

## Product Principles

1. **Proof over promises.** Real past events, real places and real photos carry the credibility, for sponsors and institutions above all.
2. **Joining takes a minute on a phone.** Membership signup and payment must be finishable on mobile, at an event, without help.
3. **Light on volunteers.** Every admin step that can be automated is automated, and manual steps (bank transfer confirmation) are one click.
4. **Members' data stays private.** Collect the minimum, expose nothing publicly, and the status check reveals only status.
5. **Say little.** Few sections, short copy; nothing that makes the association look bigger or busier than it is.

## Accessibility & Inclusion

Target WCAG 2.2 AA, especially for the membership and payment flows. The energetic visual style must not cost legibility or contrast on mobile in bright outdoor light.

## Voice (updated 6 Nov 2026)

- Don't anchor the identity to Oderzo or any place: the client asked to leave it out.
- Self-description: "un gruppo di persone creative a cui piace divertirsi e far divertire". Ironic, unpretentious; not a list of activities.
- Slogan: "In un mondo che ci obbliga all'eccellenza, fare schifo è un gesto rivoluzionario."
