import os
import uuid
import zipfile

from flask import Flask, render_template, request, jsonify, send_file, abort

import engine

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 20 MB (logo uploads etc.)


# ------------------------------------------------------------
# Dashboard pages
# ------------------------------------------------------------

@app.route("/")
def home():
    return render_template("home.html", active="home")


@app.route("/setup")
def setup():
    return render_template("setup.html", active="setup")


@app.route("/create")
def create():
    return render_template("create.html", active="create")


@app.route("/ai-assist")
def ai_assist():
    return render_template("ai_assist.html", active="ai")


@app.route("/about")
def about():
    return render_template("about.html", active="about")


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def _payload_to_args(data):
    config = data.get("config", {}) or {}
    layout = data.get("layout", {}) or {}
    return dict(
        config=config,
        questions=data.get("questions", []) or [],
        worksheet_title=data.get("worksheet_title") or "Worksheet",
        grade=data.get("grade", 3),
        subject=data.get("subject") or "General",
        lang=data.get("lang", "en"),
        theme=(None if (data.get("theme") in (None, "auto")) else data.get("theme")),
        questions_per_page=int(layout.get("questions_per_page", 0) or 0),
        question_spacing_px=int(layout.get("question_spacing_px", 18) or 18),
        num_copies=max(1, int(layout.get("num_copies", 1) or 1)),
        randomize_mode=layout.get("randomize_mode", "same"),
        binding_gap_px=int(layout.get("binding_gap_px", 0) or 0),
        answer_key_mode=data.get("answer_key_mode", "separate"),
    )


# ------------------------------------------------------------
# API: live preview
# ------------------------------------------------------------

@app.route("/api/preview", methods=["POST"])
def api_preview():
    data = request.get_json(force=True, silent=True) or {}
    args = _payload_to_args(data)
    if not args["questions"]:
        return jsonify({"error": "Add at least one question first."}), 400
    result = engine.build_full_worksheet_html(**args)
    return jsonify(result)


# ------------------------------------------------------------
# API: generate + download (PDF or DOCX, zipped if 2 files)
# ------------------------------------------------------------

@app.route("/api/generate", methods=["POST"])
def api_generate():
    data = request.get_json(force=True, silent=True) or {}
    args = _payload_to_args(data)
    fmt = data.get("format", "pdf")

    if not args["questions"]:
        return jsonify({"error": "Add at least one question first."}), 400

    job_id = uuid.uuid4().hex[:10]
    base_name = f"worksheet_{job_id}"

    if fmt == "pdf":
        html_dict = engine.build_full_worksheet_html(**args)
        base_filepath = os.path.join(OUTPUT_DIR, base_name)
        files = engine.export_worksheet_pdf(html_dict, base_filepath)
    else:
        docx_args = dict(
            config=args["config"], questions=args["questions"],
            worksheet_title=args["worksheet_title"], grade=args["grade"],
            subject=args["subject"], num_copies=args["num_copies"],
            randomize_mode=args["randomize_mode"], lang=args["lang"],
            answer_key_mode=args["answer_key_mode"],
            filepath=os.path.join(OUTPUT_DIR, base_name + ".docx"),
        )
        files = engine.export_to_docx(**docx_args)

    student_file = files["student_file"]
    teacher_file = files.get("teacher_file")

    if teacher_file:
        zip_path = os.path.join(OUTPUT_DIR, base_name + "_bundle.zip")
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.write(student_file, os.path.basename(student_file))
            zf.write(teacher_file, os.path.basename(teacher_file))
        download_name = zip_path
    else:
        download_name = student_file

    token = os.path.basename(download_name)
    return jsonify({"download_url": f"/api/download/{token}"})


@app.route("/api/download/<token>")
def api_download(token):
    safe_name = os.path.basename(token)
    path = os.path.join(OUTPUT_DIR, safe_name)
    if not os.path.exists(path):
        abort(404)
    return send_file(path, as_attachment=True)


# ------------------------------------------------------------
# API: free text -> questions (no AI, no API key needed)
# ------------------------------------------------------------

@app.route("/api/parse-text", methods=["POST"])
def api_parse_text():
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text", "")
    questions = engine.parse_questions_from_text(text)
    return jsonify({"questions": questions})


# ------------------------------------------------------------
# API: AI-assisted question generation (needs the user's own
# Anthropic API key — sent per-request, never stored on disk)
# ------------------------------------------------------------

@app.route("/api/ai-generate", methods=["POST"])
def api_ai_generate():
    data = request.get_json(force=True, silent=True) or {}
    api_key = data.get("api_key", "").strip()
    if not api_key:
        return jsonify({"error": "Apna Anthropic API key daalein (Settings/AI Assist page par)."}), 400

    try:
        import anthropic
    except ImportError:
        return jsonify({"error": "Server par 'anthropic' package install nahi hai. requirements.txt install karein."}), 500

    source_text = data.get("source_text", "")
    grade = data.get("grade", 3)
    subject = data.get("subject", "General")
    num_questions = int(data.get("num_questions", 6) or 6)
    q_types = data.get("question_types") or ["mcq", "fill_blank", "short"]
    lang = data.get("lang", "en")

    lang_note = "Pure Urdu script (never Roman Urdu)." if lang == "ur" else "English."

    prompt = f"""You are creating exam-style worksheet questions for Grade {grade}, subject: {subject}.
Language: {lang_note}
Allowed question types: {', '.join(q_types)}
Generate exactly {num_questions} questions based on this source material (or the general topic if source is short):
---
{source_text[:6000]}
---

Return ONLY a raw JSON array (no markdown fences, no commentary). Each item must follow one of these shapes:
{{"type":"mcq","text":"...","options":["...","...","...","..."],"answer":"the correct option text"}}
{{"type":"fill_blank","text":"... ______ ...","blanks":1,"answer":"..."}}
{{"type":"match_column","text":"Match the following:","left":["..."],"right":["..."]}}
{{"type":"short","text":"...","lines":3,"answer":"model answer"}}
{{"type":"detailed","text":"...","lines":6,"answer":"model answer"}}
"""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = "".join(block.text for block in message.content if getattr(block, "type", "") == "text")
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw
        import json
        questions = json.loads(raw)
        return jsonify({"questions": questions})
    except Exception as e:
        return jsonify({"error": f"AI generate nahi ho saka: {e}"}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
