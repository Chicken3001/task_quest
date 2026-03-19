# Amazon Affiliates Integration

**IMPORTANT: Must make 3 qualifying sales within first 180 days or account gets deactivated. Save this until the app has enough active users to hit that threshold.**

## Prerequisites
- [ ] Sign up for Amazon Associates (https://affiliate-program.amazon.com)
- [ ] Get Associate Tag (tracking ID)
- [ ] Apply for Product Advertising API access (requires approval + 3 sales first)
- [ ] Sufficient active user base to realistically hit 3 sales in 180 days

## Implementation Plan

### 1. Shopping detection (already designed, was rolled back)
- [ ] `src/lib/shopping.ts` — keyword matching to detect shopping-related tasks
- [ ] `isShoppingTask(title, description)` checks against common shopping terms
- [ ] Per-task localStorage dismissal so users aren't re-prompted

### 2. API route for product search
- [ ] `src/app/api/shopping/search/route.ts`
- [ ] Uses Amazon Product Advertising API (PA-API 5.0)
- [ ] Env vars: `AMAZON_ACCESS_KEY`, `AMAZON_SECRET_KEY`, `AMAZON_ASSOCIATE_TAG`
- [ ] Accepts task title/description, returns relevant product results
- [ ] Returns: title, price, image, affiliate link, rating

### 3. UI in Task Assistant
- [ ] Gentle opt-in banner: "This looks like a shopping task — want to see product suggestions?"
- [ ] "Show me" / "No thanks" — dismissal saved per-task in localStorage
- [ ] Product cards (2x2 grid) with image, title, price, star rating
- [ ] Cards link out with affiliate tag in URL
- [ ] "Hide" button to dismiss after viewing

### 4. Disclosure
- [ ] Add Amazon affiliate disclosure to footer or terms page (FTC requirement)
- [ ] Small "As an Amazon Associate I earn from qualifying purchases" near product cards

## Notes
- PA-API has a free tier but rate limits scale with revenue
- Can start with simple affiliate links (no API needed) using amazon.com/dp/ASIN?tag=YOUR_TAG
- Consider starting with manual curated links before full API integration
