(function (global) {
  "use strict";

  let els = {};

  function layoutConfig() {
    return {
      active: "settings",
      title: "Settings",
      subtitle: "Manage your profile, preferences and demo integration."
    };
  }

  function init() {
    if (!Auth.isAuthenticated()) return;
    UI.initLayout(layoutConfig());
    cacheElements();
    const user = Auth.getUser();
    if (!user) return;
    fillProfile(user);
    fillPreferences();
    fillIntegration();
    bindEvents();
  }

  function cacheElements() {
    els.profile = document.getElementById("settings-profile");
    els.form = document.getElementById("profile-form");
    els.name = document.getElementById("profile-name");
    els.email = document.getElementById("profile-email");
    els.role = document.getElementById("profile-role");
    els.department = document.getElementById("profile-department");
    els.save = document.getElementById("profile-save");
    els.reset = document.getElementById("profile-reset");
    els.compact = document.getElementById("pref-compact");
    els.banner = document.getElementById("pref-banner");
    els.emailNotifications = document.getElementById("pref-email");
    els.desktopNotifications = document.getElementById("pref-desktop");
    els.apiUrl = document.getElementById("api-base-url");
    els.apiTimeout = document.getElementById("api-timeout");
    els.copy = document.getElementById("copy-api-url");
    els.resetDemo = document.getElementById("reset-demo");
  }

  function fillProfile(user) {
    const roleLabel = (UI.ROLE_META[user.role] || {}).label || user.role || "Member";
    els.profile.innerHTML =
      UI.avatar(user.name, user.id, "lg") +
      "<div><h3>" + UI.escapeHtml(user.name) + "</h3><p>" + UI.escapeHtml(roleLabel) +
      " · " + UI.escapeHtml(user.department || "Operations") + "</p></div>";
    els.name.value = user.name || "";
    els.email.value = user.email || "";
    els.role.value = roleLabel;
    els.department.value = user.department || "—";
    UI.icons();
  }

  function fillPreferences() {
    const prefs = UI.settings();
    els.compact.checked = Boolean(prefs.compactSidebar);
    els.banner.checked = Boolean(prefs.showDemoBanner);
    els.emailNotifications.checked = Boolean(prefs.emailNotifications);
    els.desktopNotifications.checked = Boolean(prefs.desktopNotifications);
  }

  function fillIntegration() {
    const config = OMS.apiConfig || {};
    els.apiUrl.value = config.baseUrl || "http://localhost:8000/api/v1";
    els.apiTimeout.textContent = (config.timeout || 12000) + " ms";
  }

  function bindEvents() {
    els.form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors();
      const user = Auth.getUser();
      if (!user) return;

      let valid = true;
      if (!els.name.value.trim() || els.name.value.trim().length < 2) {
        els.name.setAttribute("aria-invalid", "true");
        document.getElementById("profile-name-error").textContent = "Enter your full name.";
        valid = false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(els.email.value.trim())) {
        els.email.setAttribute("aria-invalid", "true");
        document.getElementById("profile-email-error").textContent = "Enter a valid email address.";
        valid = false;
      }
      if (!valid) return;

      UI.setButtonLoading(els.save, true);
      Api.users
        .update(user.id, { name: els.name.value.trim(), email: els.email.value.trim() })
        .then(function (saved) {
          Auth.updateProfile(saved);
          fillProfile(Auth.getUser());
          UI.initLayout(layoutConfig());
          UI.toast("Profile updated.", "success", "Changes saved");
        })
        .catch(function (error) {
          UI.toast(error.message || "Unable to update your profile.", "error", "Update failed");
        })
        .finally(function () {
          UI.setButtonLoading(els.save, false);
        });
    });

    els.reset.addEventListener("click", function () {
      const user = Auth.getUser();
      if (!user) return;
      clearErrors();
      els.name.value = user.name || "";
      els.email.value = user.email || "";
      UI.toast("Unsaved profile changes were reset.", "info", "Form reset");
    });

    els.compact.addEventListener("change", function () {
      UI.saveSettings({ compactSidebar: els.compact.checked });
      document.body.classList.toggle("sidebar-collapsed", els.compact.checked);
      UI.toast(
        els.compact.checked ? "Sidebar will stay collapsed on desktop." : "Sidebar will show full labels.",
        "info",
        "Preference saved"
      );
    });

    els.banner.addEventListener("change", function () {
      UI.saveSettings({ showDemoBanner: els.banner.checked });
      UI.initLayout(layoutConfig());
      UI.toast(
        els.banner.checked ? "Demo notice is visible." : "Demo notice is hidden.",
        "info",
        "Preference saved"
      );
    });

    els.emailNotifications.addEventListener("change", function () {
      UI.saveSettings({ emailNotifications: els.emailNotifications.checked });
      UI.toast("Email notification preference saved.", "success", "Preference saved");
    });

    els.desktopNotifications.addEventListener("change", function () {
      UI.saveSettings({ desktopNotifications: els.desktopNotifications.checked });
      UI.toast(
        els.desktopNotifications.checked
          ? "Desktop notifications are enabled for this demo."
          : "Desktop notifications are disabled.",
        "info",
        "Preference saved"
      );
    });

    els.copy.addEventListener("click", copyApiUrl);
    els.resetDemo.addEventListener("click", resetDemoData);
  }

  function clearErrors() {
    els.name.removeAttribute("aria-invalid");
    els.email.removeAttribute("aria-invalid");
    document.getElementById("profile-name-error").textContent = "";
    document.getElementById("profile-email-error").textContent = "";
  }

  function copyApiUrl() {
    const value = els.apiUrl.value;
    function fallback() {
      els.apiUrl.focus();
      els.apiUrl.select();
      let copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }
      if (copied) UI.toast("API base URL copied to clipboard.", "success", "Copied");
      else UI.toast("Select the URL and copy it manually.", "warning", "Copy unavailable");
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(function () { UI.toast("API base URL copied to clipboard.", "success", "Copied"); })
        .catch(fallback);
    } else {
      fallback();
    }
  }

  async function resetDemoData() {
    const confirmed = await UI.confirm({
      title: "Reset demo data?",
      message:
        "All tasks, users and activity logs will be restored to the seeded demo dataset. Your session and preferences will be kept.",
      confirmText: "Reset demo data",
      cancelText: "Cancel"
    });
    if (!confirmed) return;
    UI.setButtonLoading(els.resetDemo, true);
    try {
      await Api.demo.reset();
      UI.toast("Demo data restored. Reloading…", "success", "Reset complete");
      setTimeout(function () { location.reload(); }, 700);
    } catch (error) {
      UI.setButtonLoading(els.resetDemo, false);
      UI.toast(error.message || "Unable to reset demo data.", "error", "Reset failed");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
