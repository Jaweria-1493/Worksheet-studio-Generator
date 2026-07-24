// Shared helpers for Worksheet Studio dashboard

const WS = {
  CONFIG_KEY: "ws_config",
  QUESTIONS_KEY: "ws_questions",

  defaultConfig() {
    return {
      school_name: "",
      school_logo_base64: null,
      logo_size_px: 70,
      theme_mode: "auto",
      primary_color: "#2E86AB",
      accent_color: "#F6C90E",
      cover_page_style: "modern",
    };
  },

  getConfig() {
    try {
      const raw = localStorage.getItem(this.CONFIG_KEY);
      return raw ? JSON.parse(raw) : this.defaultConfig();
    } catch (e) {
      return this.defaultConfig();
    }
  },

  saveConfig(cfg) {
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(cfg));
  },

  getQuestions() {
    try {
      const raw = localStorage.getItem(this.QUESTIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveQuestions(qs) {
    localStorage.setItem(this.QUESTIONS_KEY, JSON.stringify(qs));
  },

  async postJSON(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  },

  showStatus(el, message, ok = true) {
    el.innerHTML = `<div class="status-msg ${ok ? "ok" : "err"}">${message}</div>`;
  },
};
