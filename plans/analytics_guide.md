# SuperIcons Analytics Guide

## Platform: Umami Cloud (Free Tier)
- **Dashboard:** [cloud.umami.is](https://cloud.umami.is)
- **Login:** mrcurlymole@gmail.com
- **Data Region:** United States
- **Limit:** 10,000 pageviews/month (free tier)

## What Is Being Tracked

### Automatic (built-in, no code needed)
| Metric | Description |
|---|---|
| Page views | Total and unique page loads |
| Visitors | Unique visitors (cookie-free, IP-based) |
| Bounce rate | % who leave without interaction |
| Referrers | Where traffic comes from (Google, Reddit, Twitter, etc.) |
| Countries | Visitor geography |
| Devices | Desktop vs mobile vs tablet |
| Browsers | Chrome, Firefox, Safari breakdown |
| OS | Windows, Mac, Linux, iOS, Android |
| Screen sizes | Resolution distribution |
| Real-time | Live active visitors count |

### Custom Events (coded into main.js)
| Event Name | When It Fires | Data Fields |
|---|---|---|
| `search` | User types 2+ characters in search | `query` (search text), `results` (count) |
| `icon-copy` | SVG or component code copied | `lib` (library), `id` (icon name), `format` (svg/react/vue/svelte) |
| `icon-download` | SVG file downloaded | `lib` (library), `id` (icon name), `format` (svg) |
| `contact-submit` | Contact form sent successfully | (none) |

## How to Access Stats

### Quick Overview
1. Go to [cloud.umami.is](https://cloud.umami.is)
2. Click **Supericons** in the website list
3. Top bar shows: visitors, page views, bounce rate, avg time

### Custom Events
1. In the Supericons dashboard, click the **Events** tab
2. See counts for each event type over time
3. Click an event to expand its data fields (e.g., click `icon-copy` to see which icons and formats are most popular)

### Key Questions You Can Answer

| Question | Where to Look |
|---|---|
| How many visitors today/this week? | Dashboard overview |
| Where do visitors come from? | Referrers tab |
| What do people search for? | Events > search > query field |
| Which icons are most copied? | Events > icon-copy > id field |
| React or Vue? | Events > icon-copy > format field |
| Which library is most popular? | Events > icon-copy > lib field |
| How many contact form submissions? | Events > contact-submit count |

## Technical Implementation

### Script Tag (index.html)
```html
<script defer src="https://cloud.umami.is/script.js" data-website-id="66fb1c0e-d0dd-4637-8cf7-cdca6cee1e3c"></script>
```

### Event Tracking (main.js)
All events use optional chaining so the site works if Umami fails:
```javascript
window.umami?.track('event-name', { key: 'value' });
```

## Limits and Upgrade Path
- **Free:** 10K pageviews/month, 3 websites, 1 year retention
- **Growth ($9/mo):** 100K pageviews, 10 websites, unlimited retention
- **Business ($29/mo):** 1M pageviews, 100 websites, team access

Upgrade only when you consistently exceed 10K views/month.

## Trending Leaderboard (Feature Flag)

The sidebar has a hidden "Trending" section showing top 10 most-used icons. It is controlled by a feature flag in `main.js`:

```javascript
const FEATURE_FLAGS = {
  leaderboard: false, // change to true to show
};
```

Data is captured from day 1 regardless of the flag. When you have enough stats to show users, flip it to `true`, rebuild, and redeploy.

## Supabase Icon Stats (Internal Tracking)

Every copy/download is also recorded to the CML Supabase `icon_stats` table for leaderboard data.

| Column | Example |
|---|---|
| icon_id | "heart" |
| lib | "lucide" |
| action | "copy" or "download" |
| format | "svg", "react", "vue", "svelte" |
| created_at | auto timestamp |

**To view raw data:** Supabase dashboard > Table Editor > `icon_stats`
