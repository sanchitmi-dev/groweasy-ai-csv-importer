# GrowEasy AI CSV Importer

AI-powered CSV importer that maps arbitrary lead CSV exports into GrowEasy CRM format.

## Features

- Drag and drop CSV upload plus file picker.
- Client-side CSV preview before any AI call.
- Responsive preview and result tables with sticky headers and scrolling.
- Confirm-before-import workflow.
- Express API that accepts CSV uploads, parses records, processes batches, retries failed AI calls, and returns structured JSON.
- OpenAI extraction with strict CRM rules and a deterministic fallback for demos without an API key.
- Parsed/skipped record tables with totals.
- Dark mode, progress indicators, unit tests, Docker setup, and production-ready README.

## CRM Rules Implemented

- Extracts `created_at`, `name`, `email`, `country_code`, `mobile_without_country_code`, `company`, `city`, `state`, `country`, `lead_owner`, `crm_status`, `crm_note`, `data_source`, `possession_time`, and `description`.
- Restricts `crm_status` to `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, or `SALE_DONE`.
- Restricts `data_source` to `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, or `sarjapur_plots`.
- Skips rows with neither email nor mobile number.
- Adds extra emails, extra mobile numbers, remarks, comments, and unmatched useful details to `crm_note`.
- Keeps records CSV-compatible by escaping line breaks.

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The app works without `OPENAI_API_KEY` by using a deterministic fallback extractor. Add an OpenAI key to enable AI batch extraction:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

## Scripts

```bash
npm run dev        # Next.js frontend and Express API
npm run test       # Unit tests
npm run build      # Production build
npm start          # Production server on PORT, default 4000
```

## API

`POST /api/import`

Multipart form field:

- `file`: CSV file

Response:

```json
{
  "crmFields": ["created_at", "name", "email"],
  "records": [],
  "skipped": [],
  "totalImported": 0,
  "totalSkipped": 0,
  "provider": "openai"
}
```

## Docker

```bash
docker build -t groweasy-ai-csv-importer .
docker run -p 4000:4000 --env-file .env.local groweasy-ai-csv-importer
```

## Deployment Notes

This project is suitable for a free Node hosting platform that supports Docker or a long-running Node process, such as Render, Railway, or Fly.io. Set:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `PORT` if required by the host

For frontend-to-backend split deployments, set `NEXT_PUBLIC_API_URL` to the backend URL.
