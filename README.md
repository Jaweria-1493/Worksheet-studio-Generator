# Worksheet Studio — Dashboard Web App

A full Flask web app version of the "Worksheet Generator" notebook: a
professional dashboard (Home, School Setup, Create Worksheet, AI Assist,
Info/About) that lets a teacher brand a school, build a worksheet from
five question types, preview it, and export to **PDF or Word**, with an
accurate answer key and full Urdu (pure script) support.

## Project layout

```
worksheet_dashboard/
├── app.py            # Flask routes + API endpoints
├── engine.py          # Core generation engine (theme, HTML, PDF/DOCX export)
├── requirements.txt
├── templates/          # Dashboard pages (Jinja2)
└── static/
    ├── css/style.css
    └── js/              # question builder, setup, AI assist logic
```

## Running locally

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open **http://localhost:5000**.

### WeasyPrint system dependencies (needed for PDF export)

WeasyPrint needs Pango/Cairo/GDK-Pixbuf on the OS itself (this cannot be
installed via pip alone):

- **Ubuntu/Debian:** `sudo apt-get install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev`
- **macOS (Homebrew):** `brew install pango`
- **Windows:** install GTK3 runtime, or run the app inside WSL/Docker for simplicity.

If you only need Word (.docx) export, you can remove `weasyprint` from
`requirements.txt` and the PDF option — DOCX export (`python-docx`) has
no system dependencies.

## How it's wired together

- **School Setup** (`/setup`) saves branding (name, logo, colors, cover
  style) to the browser's `localStorage` — nothing is sent to the server
  until you generate a file.
- **Create Worksheet** (`/create`) is the question builder. Every
  question you add is kept in `localStorage` too, so it survives page
  reloads. "Preview" posts your current questions + layout to
  `/api/preview`, which returns rendered HTML shown in an iframe.
  "Generate" posts the same payload to `/api/generate`, which builds the
  PDF/DOCX server-side (via `engine.py`) and returns a download link.
- **AI Assist** (`/ai-assist`) offers two paths:
  - **Free parsing** — no API key needed. It looks for numbered
    questions (`1.`, `2)` ...), optional `a) b) c) d)` options, and a
    trailing `Answers:` section.
  - **AI generation** — sends your pasted text + your own Anthropic API
    key to `/api/ai-generate`, which calls the Claude API server-side
    and returns structured questions. The key is used for that one
    request only and is never written to disk.
- Generated questions from AI Assist can be sent straight into the
  Create Worksheet builder with one click.

## Extending it

- To persist school setup/questions server-side per user, swap the
  `localStorage` calls in `static/js/*.js` for real accounts + a
  database, and move the payload building into `app.py` routes that
  read from the DB.
- To add Method 1/2 style "upload a file, auto-generate a worksheet",
  extend `/api/ai-generate` to accept a file upload and extract text
  from it (e.g. with `pypdf`/`python-docx`) before sending to Claude.
