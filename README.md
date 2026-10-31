# Ankur Roy Chowdhury · Product portfolio

Live at **https://ankurroychowdhury.vercel.app**

A static site: plain HTML, two stylesheets, two scripts, charts drawn as inline SVG. No build step on Vercel; the pages are generated locally by a small Python script.

## Design

- **Home page in ISB's brand:** Legacy Blue `#192890` for headlines, Innovation Blue `#245BFF` for anything you can act on, Future Green `#BFFF87` only as highlighter lines and sticky-note text. Type: Inter and Newsreader.
- **Each case study wears its product's own theme** (`assets/case.css`, generated per product, light and dark):

| Page | Theme | Where the colours come from |
| --- | --- | --- |
| Curio | Cream, deep green, teal, rose; Instrument Serif and DM Sans | Curio's own design tokens |
| Fold, Prioritization | Cool grey ground, white cards, navy, sync-status greens and reds; Kalam for hand-drawn notes | Sampled from the Fold app |
| Competitors | CRED black stage; each app keeps its own colour | Fold's navy from its app, CRED's black; INDmoney's teal is only to tell it apart |
| Amazon | Squid ink, orange, CTA yellow, link teal | Amazon's product page |
| Kite | Zerodha blue and the Kite logo's orange-red | Sampled from Kite screenshots; text blues darkened to pass contrast |
| Tagger | A passbook: navy print on pale blue | Bank statements, which is what it reads |

- **Same structure on every case page,** so a reader learns it once: a product-coloured hero with one live demo, an **At a glance** strip of the key numbers, **The short version** in three cards, then sections colour-coded by kind (problem, evidence, decision, build, result, next) on a spine, with a matching table of contents.
- **Live demos:** swipe Curio's real seed cards; drag a slider to watch a Fold bank go quiet, with and without the fix; watch Amazon's 24 blocks reorder into the redesign; replay the 19-screen Kite sign-up against its step counter; see statement lines get stamped by keywords, AI and your rules.
- **The Fold PRD is a one-page sheet** with requirements, scope, timeline and metric tiles. Save as PDF prints it on one A4 page. The A/B plan has a live sample-size calculator.
- Haptics on phones (with an off switch), reduced motion, keyboard use and screen readers are supported; axe reports no issues.

## Pages

| Page | What it is |
| --- | --- |
| `index.html` | Home: evidence notes, featured Curio, the Fold story, more work, about, contact |
| `curio.html` | Curio case study: a live AI learning feed, 120 users |
| `fold.html` | Fold: review analysis, one-page PRD and A/B test plan |
| `prioritization.html` | 10 ideas for Fold by impact and effort |
| `competitors.html` | Fold vs INDmoney vs CRED Money |
| `amazon.html` | Amazon product page teardown and redesign (concept, not affiliated) |
| `kite.html` | Zerodha Kite onboarding audit |
| `tagger.html` | Working AI prototype: a transaction tagger that learns |

## Deploy

The repo is connected to Vercel (project `ankurroychowdhury`), so every push to `main` goes live in about a minute.

Optional, to switch on the tagger's AI step: add `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) under Project Settings → Environment Variables, then redeploy. Without a key the tagger still works; only the AI button is off. `api/tag.js` is the only server code. It accepts at most 25 payee names, 60 characters each, and returns only whitelisted categories.

## Privacy

No personal screenshots from Fold or Kite are published. The Amazon screenshots have the delivery address hidden, and image metadata is stripped.

## Fonts

Inter, Newsreader, Instrument Serif, DM Sans and Kalam, all self-hosted under the SIL Open Font License (licences in `assets/fonts`).
