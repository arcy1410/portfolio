# Ankur Roy Chowdhury · Product portfolio

A static site: plain HTML, one stylesheet, one script, charts drawn as inline SVG. No build step.

## Design

- **Colours from ISB's brand:** Legacy Blue `#192890` for headlines, Innovation Blue `#245BFF` for anything you can act on, Future Green `#BFFF87` only as highlighter lines and sticky-note text, cool greys for body copy and rules. Dark mode is a deep navy.
- **Type:** Inter (ISB's body face) and Newsreader (a free stand-in for ISB's licensed Reckless serif), both self-hosted under the SIL Open Font License.
- **Interaction:** the home page's evidence notes flip from a piece of evidence to the fix; project titles grow into the next page's headline (cross-document View Transitions, Chrome and Safari 18.2+); the theme switch wipes in from the button; charts reveal the evidence behind each mark; haptics on phones (Vibration API on Android, the switch-control haptic on iOS 18+), with an off switch.
- Reduced motion, keyboard use and screen readers are supported; axe reports no serious issues.

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

## Deploy on Vercel

1. Import this repo at vercel.com/new. Framework preset: **Other**. No build command, no output directory.
2. Optional, to switch on the tagger's AI step: add `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) under Project Settings → Environment Variables, then redeploy. Without a key the tagger still works; only the AI button is off.
3. Once the site has its final URL, make `og:image` absolute (`https://<domain>/assets/img/og.png`) so LinkedIn and WhatsApp previews show the share card.

`api/tag.js` is the only server code. It accepts at most 25 payee names, 60 characters each, and returns only whitelisted categories.

## Privacy

No personal screenshots from Fold or Kite are published. The Amazon screenshots have the delivery address hidden, and image metadata is stripped.
