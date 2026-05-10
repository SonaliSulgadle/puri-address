# Puri (풀이) — Korean Address Converter

> Convert any Korean address format instantly into a Naver Map and Kakao Map ready address.

**Live app → [puri-address.vercel.app](https://puri-address.vercel.app)**

Built as a companion web tool to the Puri app — a daily life assistant for foreigners living in South Korea.

---

## What it does

Foreigners in Korea frequently receive addresses in formats that don't paste cleanly into navigation apps — old 지번 lot numbers, English romanizations, building names, subway exit references, or mixed Korean/English. This tool normalizes any of them into a verified 도로명주소 (road name address) ready for Naver Map and Kakao Map.

### Supported input formats

| Format | Example |
|--------|---------|
| 지번 (land lot) | 서울 마포구 서교동 395-166 |
| 도로명 (road name) | 서울 마포구 와우산로29길 17 |
| English / romanized | 17, Wausan-ro 29-gil, Mapo-gu, Seoul |
| Google Maps format | Seoul, Gangnam District, Seolleung-ro, 551 |
| Building / landmark | 홍대입구역 2번출구 스타벅스 |
| Subway exit | 2호선 홍대입구역 9번 출구 |
| Informal / vague | 홍대 근처 GS25 편의점 옆 |
| Phonetic Korean | Mapo-goo Hongdae, Itaewon-dong |

### Output

- Normalized Korean 도로명주소
- Shorter form optimized for map search
- Location detail (floor, unit, building name) extracted separately
- Confidence level: HIGH / MEDIUM / LOW
- Caveat note when address is ambiguous
- One-tap buttons to open in Naver Map and Kakao Map
- Copy to clipboard

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | Google Gemini 2.5 Flash-Lite |
| Deployment | Vercel |

**Security:** The Gemini API key is server-side only — it lives in a Next.js API route and is never exposed to the browser.

**Rate limiting:** 10 conversions per hour per IP address (in-memory store).

**Input validation:** Empty input rejected, 500-character maximum enforced server-side. Coordinate input detected and rejected with a helpful message directing users to paste the place name instead.

---

## Running locally

**Prerequisites:** Node.js v18+, a [Gemini API key](https://aistudio.google.com)

```bash
git clone https://github.com/SonaliSulgadle/puri-address.git
cd puri-address
npm install
```

Create `.env.local` in the project root:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
puri-address/
├── app/
│   ├── page.tsx                 # Main page — state management and layout
│   ├── layout.tsx               # Root layout, metadata, Vercel Analytics
│   ├── globals.css              # Tailwind imports
│   └── api/
│       └── convert/
│           └── route.ts         # Server-side API — Gemini call + rate limiting
├── components/
│   ├── AddressInput.tsx         # Textarea, submit button, example chips
│   ├── AddressResult.tsx        # Result card, map buttons, copy button
│   ├── LoadingState.tsx         # Animated loading indicator
│   └── ErrorState.tsx           # Error display with retry
└── lib/
    ├── gemini.ts                # Gemini API call with full few-shot prompt
    └── addressParser.ts         # Parse structured text response into typed object
```

---

## Architecture

The Gemini API key lives exclusively in `app/api/convert/route.ts`, which runs as a Vercel serverless function. The browser never sees the key — it only calls `/api/convert` and receives a JSON result.

```
Browser                          Vercel Serverless Function
──────────────────────           ──────────────────────────
page.tsx                         app/api/convert/route.ts
AddressInput.tsx  → POST ──────► reads GEMINI_API_KEY
AddressResult.tsx ← JSON ◄────── calls Google Gemini API
                                 returns parsed result
```

This pattern (Next.js API route as a secure proxy) is the standard approach for keeping third-party API keys safe in frontend-focused apps.

---

## Known limitations

- **Coordinate input is blocked** — GPS coordinates require a dedicated reverse geocoding service. Users are prompted to paste the place name instead. Planned for v2 using Kakao Local API.
- **Obscure building names** without a road number return MEDIUM confidence — the AI normalizes what it can and flags ambiguity honestly.
- **AI-based conversion** means accuracy depends on input quality. Well-formed addresses with a road name and number return HIGH confidence. Vague or informal inputs return LOW confidence with a note to verify on arrival.

---

## Roadmap

- [ ] Kakao Local API integration for GPS coordinate → address conversion
- [ ] Recent search history (last 5 addresses, stored locally)
- [ ] Share result as a copy-paste card
- [ ] Korean UI language toggle

---

## Part of the Puri ecosystem

Puri (풀이 — meaning "explanation" or "solution" in Korean) is a suite of tools helping foreigners navigate everyday life in South Korea. The Android app handles photo-based situation explanations in real time; this web tool handles address conversion for users who don't have the app installed yet.

---

*Built by Sonali Sulgadle · Seoul, South Korea*