let generatedQuestions = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("free_parse_btn").addEventListener("click", freeParse);
  document.getElementById("ai_generate_btn").addEventListener("click", aiGenerate);
  document.getElementById("send_to_builder_btn").addEventListener("click", sendToBuilder);
});

async function freeParse() {
  const text = document.getElementById("source_text").value;
  const statusEl = document.getElementById("ai_status");
  if (!text.trim()) {
    WS.showStatus(statusEl, "Paste some text first.", false);
    return;
  }
  try {
    const data = await WS.postJSON("/api/parse-text", { text });
    generatedQuestions = data.questions || [];
    renderGenerated();
    WS.showStatus(statusEl, `✅ ${generatedQuestions.length} question(s) parsed (free, no API used).`);
  } catch (e) {
    WS.showStatus(statusEl, e.message, false);
  }
}

async function aiGenerate() {
  const statusEl = document.getElementById("ai_status");
  const apiKey = document.getElementById("api_key").value.trim();
  const btn = document.getElementById("ai_generate_btn");
  btn.disabled = true;
  btn.textContent = "Generating...";
  try {
    const payload = {
      api_key: apiKey,
      source_text: document.getElementById("source_text").value,
      grade: document.getElementById("ai_grade").value,
      subject: document.getElementById("ai_subject").value,
      num_questions: document.getElementById("num_questions").value,
      lang: document.getElementById("ai_lang").value,
      question_types: ["mcq", "fill_blank", "short", "detailed", "match_column"],
    };
    const data = await WS.postJSON("/api/ai-generate", payload);
    generatedQuestions = data.questions || [];
    renderGenerated();
    WS.showStatus(statusEl, `✅ ${generatedQuestions.length} question(s) generated.`);
  } catch (e) {
    WS.showStatus(statusEl, e.message, false);
  } finally {
    btn.disabled = false;
    btn.textContent = "✨ Generate with AI";
  }
}

function renderGenerated() {
  const box = document.getElementById("ai_questions_preview");
  if (!generatedQuestions.length) {
    box.innerHTML = `<p class="helper-note">Nothing generated yet.</p>`;
    return;
  }
  box.innerHTML = generatedQuestions
    .map((q, i) => `<div class="q-card"><span class="q-tag">${i + 1}. ${q.type}</span><p>${(q.text || "").replace(/</g, "&lt;")}</p></div>`)
    .join("");
}

function sendToBuilder() {
  if (!generatedQuestions.length) return;
  const existing = WS.getQuestions();
  let counter = existing.length ? Math.max(...existing.map((q) => q._id || 0)) : 0;
  const withIds = generatedQuestions.map((q) => ({ ...q, _id: ++counter }));
  WS.saveQuestions([...existing, ...withIds]);
  window.location.href = "/create";
}
