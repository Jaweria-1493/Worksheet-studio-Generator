let questions = [];
let qCounter = 0;

const TYPE_LABELS = {
  mcq: "Multiple Choice",
  fill_blank: "Fill in the Blank",
  match_column: "Match the Column",
  short: "Short Question",
  detailed: "Detailed Question",
};

document.addEventListener("DOMContentLoaded", () => {
  questions = WS.getQuestions();
  renderQuestions();

  document.querySelectorAll(".type-chip").forEach((btn) => {
    btn.addEventListener("click", () => addQuestion(btn.dataset.type));
  });

  document.getElementById("preview_btn").addEventListener("click", doPreview);
  document.getElementById("generate_btn").addEventListener("click", doGenerate);

  // restore worksheet detail fields if previously saved
  const saved = JSON.parse(localStorage.getItem("ws_details") || "{}");
  if (saved.title) document.getElementById("ws_title").value = saved.title;
  if (saved.grade) document.getElementById("ws_grade").value = saved.grade;
  if (saved.subject) document.getElementById("ws_subject").value = saved.subject;
  if (saved.lang) document.getElementById("ws_lang").value = saved.lang;
});

function addQuestion(type) {
  qCounter += 1;
  const q = { _id: qCounter, type, text: "" };
  if (type === "mcq") { q.options = ["", "", "", ""]; q.answer = ""; }
  if (type === "fill_blank") { q.blanks = 1; q.answer = ""; }
  if (type === "match_column") { q.left = ["", ""]; q.right = ["", ""]; }
  if (type === "short") { q.lines = 3; q.answer = ""; }
  if (type === "detailed") { q.lines = 6; q.answer = ""; }
  questions.push(q);
  persistQuestions();
  renderQuestions();
}

function removeQuestion(id) {
  questions = questions.filter((q) => q._id !== id);
  persistQuestions();
  renderQuestions();
}

function persistQuestions() {
  WS.saveQuestions(questions);
}

function renderQuestions() {
  const list = document.getElementById("questions_list");
  const hint = document.getElementById("no_q_hint");
  list.innerHTML = "";
  hint.style.display = questions.length ? "none" : "block";

  questions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "q-card";
    card.innerHTML = `
      <button class="remove-q" data-id="${q._id}">✕ remove</button>
      <span class="q-tag">${idx + 1}. ${TYPE_LABELS[q.type]}</span>
      <div class="field" style="margin-bottom:10px;">
        <label>Question text</label>
        <input type="text" class="q-text" data-id="${q._id}" value="${escapeAttr(q.text)}" placeholder="Type the question...">
      </div>
      ${renderTypeFields(q)}
    `;
    list.appendChild(card);
  });

  // wire events
  list.querySelectorAll(".remove-q").forEach((b) =>
    b.addEventListener("click", () => removeQuestion(parseInt(b.dataset.id, 10)))
  );
  list.querySelectorAll(".q-text").forEach((inp) =>
    inp.addEventListener("input", () => {
      findQ(inp.dataset.id).text = inp.value;
      persistQuestions();
    })
  );
  wireTypeFieldEvents(list);
}

function renderTypeFields(q) {
  if (q.type === "mcq") {
    const opts = q.options
      .map(
        (o, i) => `<div class="opt-row"><input type="text" class="mcq-opt" data-id="${q._id}" data-idx="${i}" value="${escapeAttr(o)}" placeholder="Option ${String.fromCharCode(97 + i)}"></div>`
      )
      .join("");
    return `
      <div class="field" style="margin-bottom:8px;"><label>Options</label>${opts}</div>
      <div class="field"><label>Correct answer (must match one option's text)</label>
        <input type="text" class="mcq-answer" data-id="${q._id}" value="${escapeAttr(q.answer)}"></div>
    `;
  }
  if (q.type === "fill_blank") {
    return `
      <div class="field-row">
        <div class="field"><label>Number of blanks</label>
          <input type="number" class="fb-blanks" data-id="${q._id}" min="1" value="${q.blanks}"></div>
        <div class="field"><label>Answer</label>
          <input type="text" class="fb-answer" data-id="${q._id}" value="${escapeAttr(q.answer)}"></div>
      </div>`;
  }
  if (q.type === "match_column") {
    const rows = q.left
      .map(
        (l, i) => `<div class="opt-row">
          <input type="text" class="mc-left" data-id="${q._id}" data-idx="${i}" value="${escapeAttr(l)}" placeholder="Left ${i + 1}">
          <input type="text" class="mc-right" data-id="${q._id}" data-idx="${i}" value="${escapeAttr(q.right[i] || "")}" placeholder="Matches with...">
        </div>`
      )
      .join("");
    return `
      <div class="field" style="margin-bottom:8px;"><label>Pairs</label>${rows}</div>
      <button type="button" class="btn btn-ghost add-pair" data-id="${q._id}" style="padding:6px 12px;font-size:12.5px;">+ Add pair</button>
    `;
  }
  // short / detailed
  return `
    <div class="field-row">
      <div class="field"><label>Answer space (lines)</label>
        <input type="number" class="sd-lines" data-id="${q._id}" min="1" value="${q.lines}"></div>
      <div class="field"><label>Model / expected answer</label>
        <input type="text" class="sd-answer" data-id="${q._id}" value="${escapeAttr(q.answer)}"></div>
    </div>`;
}

function wireTypeFieldEvents(list) {
  list.querySelectorAll(".mcq-opt").forEach((inp) =>
    inp.addEventListener("input", () => {
      const q = findQ(inp.dataset.id);
      q.options[parseInt(inp.dataset.idx, 10)] = inp.value;
      persistQuestions();
    })
  );
  list.querySelectorAll(".mcq-answer").forEach((inp) =>
    inp.addEventListener("input", () => { findQ(inp.dataset.id).answer = inp.value; persistQuestions(); })
  );
  list.querySelectorAll(".fb-blanks").forEach((inp) =>
    inp.addEventListener("input", () => { findQ(inp.dataset.id).blanks = parseInt(inp.value, 10) || 1; persistQuestions(); })
  );
  list.querySelectorAll(".fb-answer").forEach((inp) =>
    inp.addEventListener("input", () => { findQ(inp.dataset.id).answer = inp.value; persistQuestions(); })
  );
  list.querySelectorAll(".mc-left").forEach((inp) =>
    inp.addEventListener("input", () => { findQ(inp.dataset.id).left[parseInt(inp.dataset.idx, 10)] = inp.value; persistQuestions(); })
  );
  list.querySelectorAll(".mc-right").forEach((inp) =>
    inp.addEventListener("input", () => { findQ(inp.dataset.id).right[parseInt(inp.dataset.idx, 10)] = inp.value; persistQuestions(); })
  );
  list.querySelectorAll(".add-pair").forEach((btn) =>
    btn.addEventListener("click", () => {
      const q = findQ(btn.dataset.id);
      q.left.push(""); q.right.push("");
      persistQuestions();
      renderQuestions();
    })
  );
  list.querySelectorAll(".sd-lines").forEach((inp) =>
    inp.addEventListener("input", () => { findQ(inp.dataset.id).lines = parseInt(inp.value, 10) || 1; persistQuestions(); })
  );
  list.querySelectorAll(".sd-answer").forEach((inp) =>
    inp.addEventListener("input", () => { findQ(inp.dataset.id).answer = inp.value; persistQuestions(); })
  );
}

function findQ(id) {
  return questions.find((q) => q._id === parseInt(id, 10));
}

function escapeAttr(v) {
  return (v || "").toString().replace(/"/g, "&quot;");
}

function collectPayload() {
  const details = {
    title: document.getElementById("ws_title").value,
    grade: document.getElementById("ws_grade").value,
    subject: document.getElementById("ws_subject").value,
    lang: document.getElementById("ws_lang").value,
  };
  localStorage.setItem("ws_details", JSON.stringify(details));

  const cleanQuestions = questions.map(({ _id, ...rest }) => rest);

  return {
    config: WS.getConfig(),
    worksheet_title: details.title || "Worksheet",
    grade: parseInt(details.grade, 10) || 3,
    subject: details.subject || "General",
    lang: details.lang || "en",
    theme: WS.getConfig().theme_mode,
    questions: cleanQuestions,
    layout: {
      questions_per_page: parseInt(document.getElementById("qpp").value, 10) || 0,
      question_spacing_px: parseInt(document.getElementById("spacing").value, 10) || 18,
      num_copies: parseInt(document.getElementById("copies").value, 10) || 1,
      randomize_mode: document.getElementById("randomize").value,
      binding_gap_px: parseInt(document.getElementById("binding_gap").value, 10) || 0,
    },
    answer_key_mode: document.getElementById("answer_key_mode").value,
  };
}

async function doPreview() {
  const statusEl = document.getElementById("gen_status");
  try {
    const payload = collectPayload();
    const data = await WS.postJSON("/api/preview", payload);
    const frame = document.getElementById("preview_frame");
    frame.srcdoc = data.student_html;
  } catch (e) {
    WS.showStatus(statusEl, e.message, false);
  }
}

async function doGenerate() {
  const statusEl = document.getElementById("gen_status");
  const btn = document.getElementById("generate_btn");
  btn.disabled = true;
  btn.textContent = "Generating...";
  try {
    const payload = collectPayload();
    payload.format = document.getElementById("export_format").value;
    const data = await WS.postJSON("/api/generate", payload);
    WS.showStatus(statusEl, `✅ Ready — <a href="${data.download_url}" target="_blank">Download your file</a>`);
  } catch (e) {
    WS.showStatus(statusEl, e.message, false);
  } finally {
    btn.disabled = false;
    btn.textContent = "📄 Generate Worksheet";
  }
}
