document.addEventListener("DOMContentLoaded", () => {
  const cfg = WS.getConfig();

  const schoolName = document.getElementById("school_name");
  const logoFile = document.getElementById("logo_file");
  const logoSize = document.getElementById("logo_size");
  const logoSizeVal = document.getElementById("logo_size_val");
  const logoPreview = document.getElementById("logo_preview");
  const themeMode = document.getElementById("theme_mode");
  const coverStyle = document.getElementById("cover_style");
  const primaryColor = document.getElementById("primary_color");
  const accentColor = document.getElementById("accent_color");
  const statusEl = document.getElementById("setup_status");

  // Populate from saved config
  schoolName.value = cfg.school_name || "";
  logoSize.value = cfg.logo_size_px || 70;
  logoSizeVal.textContent = logoSize.value;
  themeMode.value = cfg.theme_mode || "auto";
  coverStyle.value = cfg.cover_page_style || "modern";
  primaryColor.value = cfg.primary_color || "#2E86AB";
  accentColor.value = cfg.accent_color || "#F6C90E";
  if (cfg.school_logo_base64) {
    logoPreview.src = cfg.school_logo_base64;
    logoPreview.style.display = "inline-block";
  }

  logoSize.addEventListener("input", () => (logoSizeVal.textContent = logoSize.value));

  let pendingLogoBase64 = cfg.school_logo_base64 || null;
  logoFile.addEventListener("change", () => {
    const file = logoFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pendingLogoBase64 = reader.result; // data:image/...;base64,...
      logoPreview.src = pendingLogoBase64;
      logoPreview.style.display = "inline-block";
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("save_setup_btn").addEventListener("click", () => {
    if (!schoolName.value.trim()) {
      WS.showStatus(statusEl, "Please enter the school name — it's required.", false);
      return;
    }
    const newCfg = {
      school_name: schoolName.value.trim(),
      school_logo_base64: pendingLogoBase64,
      logo_size_px: parseInt(logoSize.value, 10),
      theme_mode: themeMode.value,
      cover_page_style: coverStyle.value,
      primary_color: primaryColor.value,
      accent_color: accentColor.value,
    };
    WS.saveConfig(newCfg);
    WS.showStatus(statusEl, "✅ School setup saved.");
  });
});
