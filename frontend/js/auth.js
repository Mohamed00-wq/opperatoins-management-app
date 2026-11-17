(function (global) {
  "use strict";

  const OMS = (global.OMS = global.OMS || {});
  const STORAGE_KEY = OMS.storage.auth;
  const REMEMBER_KEY = "oms.remembered.email.v1";

  function readSession() {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function storeSession(session, remember) {
    const serialized = JSON.stringify(session);
    if (remember) {
      localStorage.setItem(STORAGE_KEY, serialized);
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, serialized);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function loginPath() {
    return location.pathname.indexOf("/pages/") !== -1 ? "../login.html" : "login.html";
  }

  function dashboardPath() {
    return location.pathname.indexOf("/pages/") !== -1 ? "dashboard.html" : "pages/dashboard.html";
  }

  const Auth = {
    getSession: readSession,

    getUser: function () {
      const session = readSession();
      return session && session.user ? session.user : null;
    },

    isAuthenticated: function () {
      const session = readSession();
      return Boolean(session && session.token && session.user);
    },

    login: function (email, password, remember) {
      return Api.auth.login({ email: email, password: password }).then(function (session) {
        storeSession(session, Boolean(remember));
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, email);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
        return session;
      });
    },

    register: function (payload) {
      return Api.auth.register(payload).then(function (session) {
        storeSession(session, true);
        return session;
      });
    },

    updateProfile: function (patch) {
      const session = readSession();
      if (!session) return null;
      const remember = Boolean(localStorage.getItem(STORAGE_KEY));
      const updated = Object.assign({}, session, {
        user: Object.assign({}, session.user, patch)
      });
      storeSession(updated, remember);
      return updated.user;
    },

    logout: function () {
      clearSession();
      location.replace(loginPath() + "?logged_out=1");
    },

    redirectIfAuthenticated: function () {
      if (Auth.isAuthenticated()) {
        location.replace(dashboardPath());
        return true;
      }
      return false;
    },

    requireAuth: function () {
      if (!Auth.isAuthenticated()) {
        const next = encodeURIComponent(location.pathname.split("/").pop() || "dashboard.html");
        location.replace(loginPath() + "?next=" + next);
        return false;
      }
      return true;
    },

    rememberedEmail: function () {
      return localStorage.getItem(REMEMBER_KEY) || "";
    }
  };

  function fieldError(input, message) {
    if (!input) return;
    const id = input.id;
    const error = document.querySelector('[data-error-for="' + id + '"]');
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (error) error.textContent = message;
    } else {
      input.removeAttribute("aria-invalid");
      if (error) error.textContent = "";
    }
  }

  function clearFormErrors(form) {
    form.querySelectorAll("[aria-invalid]").forEach(function (input) {
      input.removeAttribute("aria-invalid");
    });
    form.querySelectorAll("[data-error-for]").forEach(function (error) {
      error.textContent = "";
    });
  }

  function setButtonLoading(button, loading, label) {
    if (!button) return;
    if (loading) {
      button.dataset.defaultLabel = button.dataset.defaultLabel || button.innerHTML;
      button.classList.add("btn-loading");
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      if (label) button.setAttribute("aria-label", label);
    } else {
      button.classList.remove("btn-loading");
      button.disabled = false;
      button.removeAttribute("aria-busy");
      if (button.dataset.defaultLabel) {
        button.innerHTML = button.dataset.defaultLabel;
      }
    }
  }

  function showAlert(element, message) {
    if (!element) return;
    element.querySelector("[data-alert-message]").textContent = message;
    element.hidden = false;
  }

  function hideAlert(element) {
    if (element) element.hidden = true;
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function passwordScore(value) {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    if (value.length >= 12 && score >= 3) score = 4;
    return Math.min(score, 4);
  }

  function initStrength(input, container) {
    const bars = Array.from(container.querySelectorAll(".strength-bar"));
    const label = container.querySelector("[data-strength-label]");
    const labels = ["Enter a password", "Weak", "Fair", "Good", "Strong"];
    const classes = ["", "weak", "fair", "good", "strong"];
    input.addEventListener("input", function () {
      const value = input.value;
      const score = passwordScore(value);
      bars.forEach(function (bar, index) {
        bar.className = "strength-bar" + (index < score ? " filled " + classes[score] : "");
      });
      label.textContent = labels[score];
      label.className = "strength-value";
      if (value) label.dataset.strength = classes[score] || "weak";
    });
  }

  function initLoginPage() {
    const form = document.getElementById("login-form");
    if (!form) return;
    if (Auth.redirectIfAuthenticated()) return;

    const email = document.getElementById("login-email");
    const password = document.getElementById("login-password");
    const remember = document.getElementById("remember-me");
    const submit = document.getElementById("login-submit");
    const alert = document.getElementById("login-alert");
    const demoButton = document.getElementById("use-demo-credentials");
    const remembered = Auth.rememberedEmail();

    if (remembered) {
      email.value = remembered;
      remember.checked = true;
    }

    if (new URLSearchParams(location.search).get("logged_out") === "1") {
      UI.toast("You have been signed out.", "info", "Session ended");
    }

    if (demoButton) {
      demoButton.addEventListener("click", function () {
        email.value = "admin@opsdesk.io";
        password.value = "Admin@123";
        remember.checked = true;
        fieldError(email, "");
        fieldError(password, "");
        hideAlert(alert);
        password.focus();
        UI.toast("Demo credentials filled in. Sign in to explore.", "info", "Demo account");
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFormErrors(form);
      hideAlert(alert);

      let valid = true;
      if (!email.value.trim()) {
        fieldError(email, "Email is required.");
        valid = false;
      } else if (!validEmail(email.value.trim())) {
        fieldError(email, "Enter a valid email address.");
        valid = false;
      }
      if (!password.value) {
        fieldError(password, "Password is required.");
        valid = false;
      }
      if (!valid) return;

      setButtonLoading(submit, true, "Signing in");
      Auth.login(email.value.trim(), password.value, remember.checked)
        .then(function (session) {
          UI.toast("Welcome back, " + session.user.name.split(" ")[0] + ".", "success", "Signed in");
          const next = new URLSearchParams(location.search).get("next");
          const target =
            next && /^[a-z0-9-]+\.html$/i.test(next) ? "pages/" + next : "pages/dashboard.html";
          location.replace(target);
        })
        .catch(function (error) {
          showAlert(alert, error.message || "Unable to sign in. Please try again.");
          setButtonLoading(submit, false);
          password.focus();
        });
    });
  }

  function initRegisterPage() {
    const form = document.getElementById("register-form");
    if (!form) return;
    if (Auth.redirectIfAuthenticated()) return;

    const name = document.getElementById("register-name");
    const email = document.getElementById("register-email");
    const password = document.getElementById("register-password");
    const confirm = document.getElementById("register-confirm");
    const submit = document.getElementById("register-submit");
    const alert = document.getElementById("register-alert");
    const strength = document.getElementById("password-strength");

    if (strength) initStrength(password, strength);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearFormErrors(form);
      hideAlert(alert);

      let valid = true;
      if (!name.value.trim() || name.value.trim().length < 2) {
        fieldError(name, "Enter your full name.");
        valid = false;
      }
      if (!email.value.trim()) {
        fieldError(email, "Email is required.");
        valid = false;
      } else if (!validEmail(email.value.trim())) {
        fieldError(email, "Enter a valid email address.");
        valid = false;
      }
      if (!password.value) {
        fieldError(password, "Password is required.");
        valid = false;
      } else if (password.value.length < 8) {
        fieldError(password, "Use at least 8 characters.");
        valid = false;
      }
      if (!confirm.value) {
        fieldError(confirm, "Confirm your password.");
        valid = false;
      } else if (confirm.value !== password.value) {
        fieldError(confirm, "Passwords do not match.");
        valid = false;
      }
      if (!valid) return;

      setButtonLoading(submit, true, "Creating account");
      Auth.register({
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value
      })
        .then(function (session) {
          UI.toast("Account created for " + session.user.name.split(" ")[0] + ".", "success", "Welcome");
          location.replace("pages/dashboard.html?welcome=1");
        })
        .catch(function (error) {
          showAlert(alert, error.message || "Unable to create your account.");
          setButtonLoading(submit, false);
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.dataset.page;

    if (page === "landing") {
      location.replace(Auth.isAuthenticated() ? "pages/dashboard.html" : "login.html");
      return;
    }
    if (page === "protected") {
      Auth.requireAuth();
      return;
    }
    if (page === "login") {
      initLoginPage();
      return;
    }
    if (page === "register") {
      initRegisterPage();
    }
  });

  global.Auth = Auth;
  OMS.passwordScore = passwordScore;
})(window);
