# Search API Research for OC Travel Planner

**Date:** 2026-06-08  
**Purpose:** Pure research — which web search APIs to integrate into OC for travel planning. No code, no config changes.  
**Context:** Two search modalities desired: agent-optimized (structured, fast) AND comprehensive (long-tail, full web).

---

## QUESTION 1 — Google's Current Search API Offerings

### Custom Search JSON API — DYING

- **Status:** Discontinued for new customers as of Jan 2026. Existing customers can continue until **January 1, 2027**. After that date, whole-web search is gone; only engines covering ≤50 domains will work.
- **Pricing (for existing customers):** 100 free queries/day, $5/1000 beyond, hard cap 10k/day
- **Requires:** A Programmable Search Engine (PSE) ID configured first, plus an API key
- **Whole-web search:** Only available to existing PSEs configured before the Jan 2026 cutoff
- **⚠️ LEGACY TRAP:** This is exactly the Directions v1/v2 scenario. Building on this means a forced migration in ~7 months.
- **Source:** https://developers.google.com/custom-search/v1/overview (pricing section explicitly states discontinuation date)

### Programmable Search Engine (PSE)

- **Not a separate product.** PSE is the platform that Custom Search JSON API queries against. "Programmable Search Engine" is the rebrand of what used to be "Google Custom Search Engine." The JSON API is the programmatic interface to it.
- **The PSE control panel** is where you configure the search engine (sites, whole-web, etc.)
- **After Jan 2027:** PSE continues to exist, but limited to ≤50 specified domains. No whole-web option.
- **Source:** https://programmablesearchengine.googleblog.com/2026/01/updates-to-our-web-search-products.html

### Agent Search (formerly Vertex AI Search / Discovery Engine) — THE REPLACEMENT

- **Status:** Active, Google's designated successor for Custom Search JSON API
- **What it is:** Part of Google Cloud's "AI Applications" (formerly Vertex AI Agent Builder). Not the same as the old Custom Search API.
- **Authentication:** OAuth 2.0 (primary) or API key via `searchLite` method
- **Scope:** Site-restricted search (you specify URL patterns to index). NOT whole-web search — this is the key limitation.
- **Advanced features:** AI-generated summaries, extractive answers, follow-up search — but these require domain verification and incur indexing costs
- **Pricing:** Enterprise-grade; the basic search tier is ~$4/1000 queries but advanced indexing, AI summaries etc. add significant cost. Requires enabling the Discovery Engine API in a GCP project.
- **⚠️ NOT A WHOLE-WEB REPLACEMENT.** Agent Search requires you to specify domains upfront. You cannot search "the entire web" like Custom Search JSON API did. This fundamentally does not work for travel planning ("Is Capitol Reef Cathedral Valley road open" could be on any domain).
- **Source:** https://docs.cloud.google.com/generative-ai-app-builder/docs/migrate-from-cse

### Vertex AI Grounding with Google Search

- **What it is:** When using Gemini models through Vertex AI, you can enable "Grounding with Google Search" which gives the model access to Google Search results inline.
- **Pricing:** Per-grounding-request charge on top of Gemini token costs. ~$35/1000 grounding requests (Gemini 2.0 Flash).
- **Limitation:** This is NOT a standalone search API. It's a feature of Gemini model inference — you call Gemini with grounding enabled, Gemini decides when to search, and search results are woven into the model's response. You don't get raw search results to process yourself.
- **Relevance to OC:** This is closer to what Anthropic's web_search tool does. OC already supports this via the `gemini` web search provider (see Q6).
- **Source:** https://cloud.google.com/vertex-ai/generative-ai/pricing (grounding section)

### Summary for Q1

**There is no Google product today that gives you "search the whole web, get JSON results" for new customers.** The Custom Search JSON API did this but is dead-walking (Jan 2027 for existing users, unavailable for new signups). Agent Search is site-restricted. Vertex AI Grounding is model-inference-only, not a raw search API. For whole-web Google results programmatically, you'd need a SERP scraping service like Serper.dev (see Q4).

---

## QUESTION 2 — Tavily Current State

### Pricing Tiers (as of June 2026)

| Plan | Credits/month | Monthly price | Per-credit cost |
|------|---------------|---------------|-----------------|
| Researcher (Free) | 1,000 | $0 | — |
| Project | 4,000 | $30 | $0.0075 |
| Bootstrap | 15,000 | $100 | $0.0067 |
| Startup | 38,000 | $220 | $0.0058 |
| Growth | 100,000 | $500 | $0.005 |
| Pay-as-you-go | Per usage | $0.008/credit | $0.008 |
| Enterprise | Custom | Custom | Custom |

**Source:** https://docs.tavily.com/documentation/api-credits (verified live)

### Credit Costs

- **Basic search:** 1 credit per request
- **Advanced search:** 2 credits per request
- **Basic extract:** 1 credit per 5 URLs
- **Advanced extract:** 2 credits per 5 URLs

### Free Tier Real Limits

- 1,000 credits/month (1,000 basic searches or 500 advanced)
- No credit card required
- Rate limit on free tier not publicly documented but reportedly lower than paid
- **At 30 searches/day travel planning usage, the free tier lasts ~33 days** — roughly covers it for light use

### API Endpoint & Key

- Base URL: `https://api.tavily.com`
- Endpoints: `/search`, `/extract`, `/map`, `/crawl`, `/research`
- Auth: API key in header (`Authorization: Bearer tvly-...`) or body param
- Key: Generated at https://app.tavily.com

### Response Format (Search)

Tavily returns structured JSON:
```json
{
  "query": "...",
  "answer": "AI-generated summary (optional, if include_answer=true)",
  "results": [
    {
      "title": "...",
      "url": "...",
      "content": "relevant extracted text snippet",
      "score": 0.95,
      "raw_content": null
    }
  ],
  "response_time": 1.2
}
```
The `content` field is NOT a raw snippet — Tavily pre-processes and extracts relevant text, optimized for LLM consumption.

### Recency

Tavily does not maintain its own index. It queries underlying search engines (reportedly Bing-based) and then processes/enriches results. Recency depends on the upstream index. `time_range` parameter filters by day/week/month/year.

### Reputation

- Widely adopted in the LangChain/LlamaIndex/CrewAI ecosystem
- Default search tool in many agent frameworks
- No major outage reports found
- Some complaints about advanced search being slow (2-5 seconds)
- Free tier is generous for prototyping

**Source:** https://tavily.com/pricing, https://docs.tavily.com/documentation/api-credits

---

## QUESTION 3 — Brave Search API

### Pricing (as of June 2026)

| Endpoint | Per 1,000 requests | Free credit |
|----------|-------------------|-------------|
| **Web Search** | $5.00 | $5/month (=1,000 queries free) |
| **LLM Context** (Answer) | $4.00/1K queries + $5/1M input tokens + $5/1M output tokens | $5/month |
| **Spellcheck/Autosuggest** | $0.50/1K | $5/month |

- **Free tier:** $5/month in credits auto-applied to every account. At $5/1K for web search, that's exactly **1,000 free queries/month**.
- **Rate limit:** 50 requests/second on Web Search; 2 req/sec on LLM Context
- **No credit card required** for the free tier

### Response Format

```json
{
  "web": {
    "results": [
      {
        "title": "...",
        "url": "...",
        "description": "snippet text",
        "extra_snippets": ["additional context..."],
        "age": "2 days ago"
      }
    ]
  },
  "news": { ... },
  "videos": { ... }
}
```

Standard web search returns traditional snippets (title, URL, description). **LLM Context mode** returns pre-extracted text chunks optimized for grounding — similar to Tavily but from Brave's own independent index.

### Brave vs Tavily

| Dimension | Brave | Tavily |
|-----------|-------|--------|
| **Own index** | Yes (independent crawler) | No (uses Bing/Google under the hood) |
| **Free tier** | 1,000/month | 1,000/month |
| **Cost per search** | $0.005 | $0.008 (basic), $0.016 (advanced) |
| **LLM-optimized mode** | LLM Context ($0.004/query + tokens) | Default (all results are pre-processed) |
| **Domain filtering** | No | Yes (include/exclude domains) |
| **Rate limit** | 50 req/sec | Not publicly documented |
| **OC integration** | Bundled, first in auto-detect order | Bundled, order 70 in auto-detect |

**For "give me a clean answer" use case:** Brave LLM Context mode is cheaper and has its own index. Tavily has better LLM-optimized extraction and domain filtering. Both work well for agent use. Brave's independent index is a differentiator for coverage diversity.

**Source:** https://api-dashboard.search.brave.com/documentation/pricing (verified live)

---

## QUESTION 4 — Other Agent-Optimized Search APIs

### Perplexity Sonar API — REAL, PRODUCTION

- **What it is:** Perplexity exposes their search-augmented LLM as an API
- **Two products:**
  - **Search API:** Raw web search results, structured. $5/1K requests. No token costs.
  - **Sonar API:** AI-generated answers with web grounding. Token costs + per-request fee.
- **Sonar pricing (per 1K requests):**

| Model | Input $/1M | Output $/1M | Low context | Medium context | High context |
|-------|-----------|------------|-------------|----------------|--------------|
| Sonar | $1 | $1 | $5/1K | $8/1K | $12/1K |
| Sonar Pro | $3 | $15 | $6/1K | $10/1K | $14/1K |
| Sonar Reasoning Pro | $2 | $8 | $6/1K | $10/1K | $14/1K |

- **OC integration:** Bundled as `perplexity` web search provider (order 50). Supports native Search API (structured results) or Sonar/OpenRouter compatibility (synthesized answers).
- **Strengths:** High-quality synthesis, domain filtering, content budget controls
- **Cost:** More expensive per-query than Brave/Tavily when using Sonar (token costs compound)
- **Source:** https://docs.perplexity.ai/docs/getting-started/pricing

### Serper.dev — GOOGLE SCRAPER, CHEAP

- **What it is:** Scrapes Google SERPs and returns structured JSON. Not an independent index.
- **Pricing:** Starting at **$0.30/1K queries** — dramatically cheaper than everything else
- **Free tier:** 2,500 queries on signup (one-time, not monthly)
- **Response:** Mirrors Google SERP structure: organic results, knowledge graph, "people also ask", etc.
- **Strengths:** You get actual Google results at 1/17th the price of Google's own (now-dead) API
- **Risks:** Scraping service — depends on Google not blocking them. TOS gray area. Could break.
- **OC integration:** NOT bundled. Would need custom plugin or use as external service.
- **Source:** https://serper.dev

### You.com API — NICHE

- **What it is:** Search API from You.com, positions as "AI-optimized search"
- **Pricing:** $5/1K for Web Search API. RAG API at $0.50/request.
- **Free tier:** Limited, details vary
- **OC integration:** NOT bundled
- **Source:** https://you.com/resources/lower-search-api-cost

### SearXNG — SELF-HOSTED METASEARCH

- **What it is:** Open-source metasearch engine you host yourself. Aggregates Google, Bing, DuckDuckGo, and 70+ other engines.
- **Pricing:** Free (self-hosted). You pay for compute only.
- **Strengths:** No API key needed. Aggregates multiple engines for coverage. Privacy-first.
- **Weaknesses:** Self-hosted means you maintain it. Quality varies. No LLM-optimized output — raw aggregated snippets.
- **OC integration:** Bundled as `searxng` provider (order 200, last in auto-detect). Needs `SEARXNG_BASE_URL`.
- **Source:** https://github.com/searxng/searxng

### Bing Web Search API (Microsoft Azure)

- **Status:** Still available through Azure Marketplace
- **Pricing:** $3/1K for standard tier (S1), with free tier of 1K transactions/month
- **OC integration:** NOT directly bundled as a named provider, though could be wired through SearXNG or a custom plugin
- **Note:** Microsoft has been pushing Bing into Copilot; standalone API status is stable but not a growth area

### Anthropic's Web Search Tool — THE WILDCARD

- **Status:** Production, GA. Available as a server-side tool in the Claude API.
- **Tool versions:** `web_search_20250305` (basic), `web_search_20260209` (with dynamic filtering via code execution)
- **How it works:** You pass `web_search` as a tool in your API request. Claude decides when to search. Searches execute server-side, results are woven into Claude's response with citations.
- **Pricing:** Per-search charge added to your Anthropic API bill. Pricing not explicitly broken out on the docs page reviewed — it's folded into the model's token usage + a per-search surcharge.
- **Supported models:** Claude Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 4.6, Mythos Preview
- **Features:** domain allow/block lists, `max_uses` cap, user location for local results, dynamic filtering (code execution post-processing)
- **Relevance to OC:** This is what Claude.ai uses internally for web search. However, it only works when you're calling the Anthropic Messages API directly with tool_use. OC already has its own `web_search` tool pipeline — Anthropic's server-side tool would be a separate integration path (the model calls it, not OC).
- **⚠️ Key distinction:** This is NOT an API you call to get search results. It's a capability you give to Claude models during inference. Claude decides when/what to search. You don't control the queries directly.
- **Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool

### Exa — NEURAL SEARCH

- **OC bundled** as `exa` provider (order 65)
- Neural + keyword hybrid search with content extraction
- $3.50/1K searches (neural), $1/1K (keyword)
- Differentiator: neural search understands meaning, not just keywords. Can find conceptually related content even with different terminology.
- **Source:** OC docs at /tools/exa-search

### DuckDuckGo — KEY-FREE FALLBACK

- **OC bundled** (order 100). Key-free, no account needed.
- Unofficial HTML-based integration (not a real API)
- No rate limit guarantees, no SLA
- Currently what Rover's OC uses (no search API key configured)

---

## QUESTION 5 — Long-Tail Coverage

### No Published Benchmarks Found

There is no public benchmark comparing Tavily/Brave/Perplexity/Google on obscure long-tail travel queries. The agent-search comparison articles (apipick.com, etc.) compare features and pricing, not result quality on niche queries.

### What We Know About Indexing

| API | Index source | Long-tail implications |
|-----|-------------|----------------------|
| **Google Custom Search** | Google's index (the best for long-tail) | DYING — moot point |
| **Serper.dev** | Scrapes Google | Gets Google's long-tail coverage, via scraping |
| **Brave** | Own independent crawler | Growing but smaller than Google. May miss obscure blog posts. Unknown coverage of niche travel forums. |
| **Tavily** | Reportedly Bing-based | Bing's index is decent but historically weaker on long-tail than Google |
| **Perplexity Search API** | Unknown (likely Bing + their own) | Good for synthesized answers, unclear on raw coverage of obscure pages |
| **SearXNG** | Aggregates multiple engines | Best coverage by aggregation (Google + Bing + DDG + others) |
| **DuckDuckGo** | Bing-based with some extras | Same Bing limitations |

### The Travel Planning Problem

For queries like:
- "Is Capitol Reef Cathedral Valley road open in November 2026"
- "Burr Trail switchbacks current status"
- "Photographers tips for Mesa Arch sunrise timing"
- "Trip reports for White Rim road this season"

The answers typically live on: personal blogs, Reddit threads, AllTrails, NPS.gov, photography forums (Fred Miranda, DPReview), trip planning sites (iOverlander), local FB groups.

**Google's index is strongest here.** Brave and Bing may miss the personal blog that documented their Cathedral Valley drive last November.

### Recommendation for Testing

**We need to test ourselves.** Suggest:
1. Pick 10 representative long-tail travel queries
2. Run each through Brave, Tavily, Perplexity, and Serper
3. Compare: does the obscure blog post / Reddit thread / forum answer appear?
4. Score coverage empirically

This is the only way to know which APIs actually surface the niche content travel planning needs.

---

## QUESTION 6 — Multi-Tool Selection in OC

### How OC Handles Multiple Search Providers

**It's tool-description driven, but only one `web_search` provider is active at a time.**

OC's `web_search` tool routes through a single configured provider. The auto-detection order (from OC docs, verified from `/usr/lib/node_modules/openclaw/docs/tools/web.md`):

1. Brave (order 10)
2. MiniMax (15)
3. Gemini (20)
4. Grok (30)
5. Kimi (40)
6. Perplexity (50)
7. Firecrawl (60)
8. Exa (65)
9. Tavily (70)
10. DuckDuckGo (100, key-free fallback)
11. Ollama (110)
12. SearXNG (200)

You can pin a provider with `tools.web.search.provider: "brave"` (or tavily, perplexity, etc.), or let auto-detect pick the first one with a valid API key.

### Dedicated Plugin Tools

Some providers expose **dedicated tools** in addition to the generic `web_search`:
- **Tavily:** `tavily_search` (with search_depth, topic, domain filters, AI answer) + `tavily_extract` (URL content extraction)
- **Exa:** Neural/keyword mode, content extraction
- **Firecrawl:** `firecrawl_search` + `firecrawl_scrape`

When both `web_search` (generic) and `tavily_search` (dedicated) are available, **the agent decides which to call based on the tool descriptions.** The generic `web_search` description says "search the web" while `tavily_search` says it has "search depth, topic filtering, and AI-generated answer summaries."

### How to Get Two Search Tools

**Option A: Use `web_search` with one provider + a dedicated tool from another.**
Example: `web_search` backed by Brave + `tavily_search`/`tavily_extract` available as dedicated tools. The agent sees both tools and picks based on the query. This is the intended multi-search pattern in OC.

**Option B: Use Perplexity as the `web_search` provider (structured results with domain filtering + content extraction controls) alongside Brave's LLM Context or Tavily's dedicated tools.**

### Current Rover Config

Rover has NO search API keys configured. `web_search` falls through to DuckDuckGo (key-free HTML scraping). This is why web searches sometimes fail or return weak results.

---

## QUESTION 7 — Pricing at Real Usage

### Usage Tiers

| Day type | Searches | Frequency |
|----------|----------|-----------|
| Light (chatting about trip) | 5 | ~20/month |
| Active planning | 30 | ~8/month |
| On-the-road | 50 | ~14/month (2-week trip) |
| Aggressive | 100 | ~2/month |

**Estimated monthly total:** (20×5) + (8×30) + (14×50) + (2×100) = 100 + 240 + 700 + 200 = **~1,240 searches/month**

### Cost Comparison

| Provider | Free tier | Cost at 1,240/mo | Cost at 3,000/mo (heavy) | Notes |
|----------|-----------|-------------------|--------------------------|-------|
| **Brave Web Search** | 1,000/mo | $1.20 | $10.00 | $5/1K, first 1K free |
| **Brave LLM Context** | 1,000/mo | ~$1.00 + tokens | ~$8 + tokens | $4/1K + token costs |
| **Tavily Basic** | 1,000/mo | $1.92 | $16.00 | $0.008/credit PAYG |
| **Tavily Project** | 4,000/mo | $30 flat | $30 flat | Overkill for this volume |
| **Perplexity Search API** | None stated | $6.20 | $15.00 | $5/1K |
| **Perplexity Sonar** | None stated | ~$10-20 | ~$25-50 | Tokens + request fees compound |
| **Serper.dev** | 2,500 one-time | $0.37/mo after | $0.90/mo | $0.30/1K — cheapest by far |
| **DuckDuckGo** | Unlimited | $0 | $0 | No SLA, unofficial, weak results |
| **SearXNG** | Unlimited | $0 (self-host) | $0 (self-host) | Maintenance cost is time |
| **Google CSE (legacy)** | 100/day | $6.20 | $15.00 | DEAD for new customers |

### Verdict on Free Tiers

**Brave free tier (1,000/mo) nearly covers the estimated 1,240/mo.** The overage is $1.20. Tavily free tier same — covers most of it.

**For dual-provider setup (Brave for general + Tavily for deep extraction):** If usage splits roughly 70/30 between generic search and Tavily-specific, both free tiers together could cover it with minimal overage.

**Serper is absurdly cheap** if you want Google-quality results: $0.37/month at 1,240 queries. But it's a scraping service with inherent risk.

---

## QUESTION 8 — Google Cloud Integration

### Can We Reuse mini-oc-travel?

**For Agent Search (the Custom Search replacement):** Yes, it runs in a GCP project. You would enable the Discovery Engine API in the mini-oc-travel project, create an Agent Search app, and use the same service account. Same billing envelope.

**But Agent Search is site-restricted** — you'd have to specify domains upfront. Not viable for whole-web travel queries (see Q1).

**For Vertex AI Grounding with Google Search:** Yes, same GCP project. You'd call Gemini with grounding enabled. This works through OC's `gemini` web search provider already — set `plugins.entries.google.config.webSearch.apiKey` to the Gemini API key.

**For the Gemini web search provider in OC:**
- Uses Gemini Flash to perform grounded search
- Returns AI-synthesized answers with citations
- Reuses `GEMINI_API_KEY` or `models.providers.google.apiKey`
- Same project, same key, single budget envelope ✓
- Cost: ~$35/1K grounding requests (significant vs Brave's $5/1K)

**Auth pattern:** Gemini API key (simple), or service account JSON (for Vertex AI path). Both work from the mini-oc-travel project. Same API key file pattern as existing Google integrations.

### Summary

- **Agent Search:** Same project ✓, site-restricted only ✗ (dealbreaker for travel)
- **Vertex AI Grounding/Gemini:** Same project ✓, whole-web ✓, expensive ($35/1K) ✗
- **Brave/Tavily/Serper:** Separate accounts, separate API keys, separate billing — but cheap

---

## KEY FLAGS AND AMBIGUITIES

1. **Google Custom Search JSON API is dead for new customers and dying for existing ones (Jan 1, 2027).** Do not build on it. This is the Directions legacy-vs-v2 scenario you want to avoid.

2. **There is NO Google product that gives new customers "search the whole web, get JSON results."** Agent Search is site-restricted. Vertex AI Grounding is model-inference-only. Serper.dev scrapes Google but is a third-party service.

3. **Brave has its own independent index.** This is unique among the affordable options. Whether that index is good enough for obscure travel content is unknown — needs testing.

4. **Tavily does NOT have its own index.** It queries upstream engines (reportedly Bing). Quality depends on Bing's coverage.

5. **Anthropic's web_search is a model capability, not a standalone API.** You can't call it independently to get search results. It's a tool Claude invokes during inference. Not directly comparable to Brave/Tavily.

6. **Perplexity has TWO products:** Search API (raw results, $5/1K) vs Sonar API (AI answers, more expensive). The Search API is the better fit for "structured results" use case; Sonar for "give me an answer."

7. **OC already has 12+ search providers bundled.** Brave and Tavily are both first-class. Installing both and letting the agent pick between `web_search` (Brave) and `tavily_search` (dedicated tool) is the intended multi-search pattern. No custom development needed.

8. **Free tiers are real.** 1,000/month from Brave + 1,000/month from Tavily = 2,000 free searches/month, which covers estimated usage at 1,240/month.
