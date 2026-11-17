(function (global) {
  "use strict";

  const OMS = (global.OMS = global.OMS || {});

  const NAV_ITEMS = [
    { key: "dashboard", label: "Overview", icon: "layout-dashboard", href: "dashboard.html" },
    { key: "tasks", label: "Tasks", icon: "list-todo", href: "tasks.html" },
    { key: "users", label: "Users", icon: "users", href: "users.html" },
    { key: "logs", label: "Activity Logs", icon: "scroll-text", href: "activity-logs.html" },
    { key: "health", label: "System Health", icon: "activity", href: "system-health.html" }
  ];

  const STATUS_META = {
    pending: { label: "Pending", badge: "badge-warning" },
    in_progress: { label: "In Progress", badge: "badge-primary" },
    completed: { label: "Completed", badge: "badge-success" },
    cancelled: { label: "Cancelled", badge: "badge-neutral" }
  };

  const PRIORITY_META = {
    low: { label: "Low", badge: "badge-neutral" },
    medium: { label: "Medium", badge: "badge-warning" },
    high: { label: "High", badge: "badge-danger" },
    critical: { label: "Critical", badge: "badge-critical" }
  };

  const SEVERITY_META = {
    info: { label: "Info", badge: "badge-info", icon: "info" },
    success: { label: "Success", badge: "badge-success", icon: "check-circle-2" },
    warning: { label: "Warning", badge: "badge-warning", icon: "alert-triangle" },
    critical: { label: "Critical", badge: "badge-danger", icon: "shield-alert" }
  };

  const ROLE_META = {
    administrator: { label: "Administrator", badge: "badge-primary" },
    manager: { label: "Manager", badge: "badge-info" },
    employee: { label: "Employee", badge: "badge-neutral" }
  };

  const LOG_TYPE_ICONS = {
    auth: "log-in",
    task: "clipboard-list",
    user: "user-cog",
    system: "server"
  };

  const ICON_TYPES = {
    success: "check-circle-2",
    error: "x-circle",
    warning: "alert-triangle",
    info: "info"
  };

  const DATE_FORMAT = { month: "short", day: "numeric", year: "numeric" };

  function settings() {
    try {
      return Object.assign(
        {
          compactSidebar: false,
          showDemoBanner: true,
          emailNotifications: true,
          desktopNotifications: false
        },
        JSON.parse(localStorage.getItem(OMS.storage.settings) || "{}")
      );
    } catch (error) {
      return { compactSidebar: false, showDemoBanner: true, emailNotifications: true, desktopNotifications: false };
    }
  }

  function saveSettings(patch) {
    const next = Object.assign(settings(), patch);
    localStorage.setItem(OMS.storage.settings, JSON.stringify(next));
    return next;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function icon(name, className) {
    return '<i data-lucide="' + name + '" class="' + (className || "icon") + '"></i>';
  }

  function refreshIcons() {
    if (global.lucide && typeof global.lucide.createIcons === "function") {
      global.lucide.createIcons();
    }
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, DATE_FORMAT);
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return (
      date.toLocaleDateString(undefined, DATE_FORMAT) +
      ", " +
      date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  }

  function timeAgo(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 45) return "Just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + "m ago";
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours + "h ago";
    const days = Math.round(hours / 24);
    if (days < 8) return days + "d ago";
    return formatDate(value);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
  }

  function initials(name) {
    return String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0); })
      .join("")
      .toUpperCase();
  }

  function avatarClass(seed) {
    const classes = ["", "green", "amber", "rose", "sky", "slate"];
    const value = String(seed || "");
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) % 997;
    }
    return classes[hash % classes.length];
  }

  function avatar(name, seed, size) {
    const cls = ["avatar", avatarClass(seed || name), size || ""].filter(Boolean).join(" ");
    return '<span class="' + cls + '" aria-hidden="true">' + escapeHtml(initials(name)) + "</span>";
  }

  function statusBadge(status) {
    const meta = STATUS_META[status] || { label: status || "Unknown", badge: "badge-neutral" };
    return '<span class="badge ' + meta.badge + '">' + escapeHtml(meta.label) + "</span>";
  }

  function priorityBadge(priority) {
    const meta = PRIORITY_META[priority] || { label: priority || "Unknown", badge: "badge-neutral" };
    return '<span class="badge ' + meta.badge + '">' + escapeHtml(meta.label) + "</span>";
  }

  function severityBadge(severity) {
    const meta = SEVERITY_META[severity] || SEVERITY_META.info;
    return '<span class="badge ' + meta.badge + '">' + escapeHtml(meta.label) + "</span>";
  }

  function roleBadge(role) {
    const meta = ROLE_META[role] || { label: role || "Unknown", badge: "badge-neutral" };
    return '<span class="badge ' + meta.badge + ' no-dot">' + escapeHtml(meta.label) + "</span>";
  }

  function userStatusBadge(status) {
    return status === "active"
      ? '<span class="badge badge-success">Active</span>'
      : '<span class="badge badge-neutral">Inactive</span>';
  }

  function logIcon(type, severity) {
    const iconName = LOG_TYPE_ICONS[type] || "activity";
    const tone = severity === "critical" ? "danger" : severity === "warning" ? "warning" : severity === "success" ? "success" : "info";
    return '<span class="activity-icon ' + tone + '">' + icon(iconName) + "</span>";
  }

  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      const context = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, wait || 250);
    };
  }

  function toastContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
    return container;
  }

  function toast(message, type, title) {
    const tone = ICON_TYPES[type] ? type : "info";
    const container = toastContainer();
    const node = document.createElement("div");
    node.className = "toast toast-" + tone;
    node.setAttribute("role", "status");
    node.innerHTML =
      '<span class="toast-icon">' + icon(ICON_TYPES[tone]) + "</span>" +
      '<div class="toast-content">' +
      '<strong class="toast-title">' + escapeHtml(title || { success: "Success", error: "Error", warning: "Warning", info: "Notice" }[tone]) + "</strong>" +
      '<span class="toast-message">' + escapeHtml(message) + "</span>" +
      "</div>" +
      '<button class="toast-close" type="button" aria-label="Dismiss notification">' + icon("x", "icon") + "</button>";
    container.appendChild(node);
    refreshIcons();

    let timer = setTimeout(dismiss, 4600);

    function dismiss() {
      clearTimeout(timer);
      if (!node.isConnected) return;
      node.classList.add("removing");
      setTimeout(function () { node.remove(); }, 170);
    }

    node.querySelector(".toast-close").addEventListener("click", dismiss);
    node.addEventListener("mouseenter", function () { clearTimeout(timer); });
    node.addEventListener("mouseleave", function () {
      timer = setTimeout(dismiss, 2200);
    });

    while (container.children.length > 4) {
      container.firstElementChild.remove();
    }
  }

  function openModal(options) {
    const config = options || {};
    const root = document.getElementById("modal-root") || document.body;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal ' + (config.size || "") + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-header">' +
      (config.icon
        ? '<span class="modal-header-icon ' + (config.iconTone || "") + '">' + icon(config.icon) + "</span>"
        : "") +
      '<div class="modal-header-text">' +
      '<h2 id="modal-title">' + escapeHtml(config.title || "") + "</h2>" +
      (config.subtitle ? "<p>" + escapeHtml(config.subtitle) + "</p>" : "") +
      "</div>" +
      '<button class="icon-btn modal-close" type="button" data-modal-close aria-label="Close dialog">' + icon("x") + "</button>" +
      "</div>" +
      '<div class="modal-body" data-modal-body></div>' +
      (config.footer ? '<div class="modal-footer" data-modal-footer></div>' : "") +
      "</div>";

    const body = overlay.querySelector("[data-modal-body]");
    const footer = overlay.querySelector("[data-modal-footer]");
    if (config.body instanceof Node) body.appendChild(config.body);
    else body.innerHTML = config.body || "";
    if (config.footer && footer) {
      if (config.footer instanceof Node) footer.appendChild(config.footer);
      else footer.innerHTML = config.footer;
    }

    root.appendChild(overlay);
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let closed = false;

    function focusables() {
      return Array.from(
        overlay.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(function (element) {
        return element.offsetParent !== null;
      });
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function close() {
      if (closed) return;
      closed = true;
      overlay.classList.remove("open");
      document.removeEventListener("keydown", onKeydown);
      setTimeout(function () {
        overlay.remove();
        document.body.style.overflow = previousOverflow;
        if (trigger && typeof trigger.focus === "function") trigger.focus();
        if (typeof config.onClose === "function") config.onClose();
      }, 170);
    }

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target.closest("[data-modal-close]")) {
        close();
      }
    });
    document.addEventListener("keydown", onKeydown);
    requestAnimationFrame(function () {
      overlay.classList.add("open");
      const preferred = overlay.querySelector("[autofocus]") || focusables()[0];
      if (preferred) preferred.focus();
    });
    refreshIcons();

    if (typeof config.onMount === "function") config.onMount(overlay, close);
    return { close: close, element: overlay, body: body, footer: footer };
  }

  function confirmDialog(options) {
    const config = options || {};
    return new Promise(function (resolve) {
      let confirmed = false;
      const modal = openModal({
        title: config.title || "Are you sure?",
        subtitle: config.subtitle || "",
        icon: config.icon || "alert-triangle",
        iconTone: config.danger === false ? "" : "danger",
        size: "sm",
        body:
          '<p class="modal-message">' +
          escapeHtml(config.message || "This action cannot be undone.") +
          "</p>",
        footer:
          '<button type="button" class="btn btn-secondary" data-modal-close>' +
          escapeHtml(config.cancelText || "Cancel") +
          "</button>" +
          '<button type="button" class="btn ' +
          (config.danger === false ? "btn-primary" : "btn-danger") +
          '" data-confirm-action>' +
          escapeHtml(config.confirmText || "Confirm") +
          "</button>",
        onClose: function () {
          resolve(confirmed);
        }
      });
      const confirmButton = modal.element.querySelector("[data-confirm-action]");
      if (confirmButton) {
        confirmButton.addEventListener("click", function () {
          confirmed = true;
          modal.close();
        });
      }
    });
  }

  function bindPasswordToggles(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-password-toggle]").forEach(function (button) {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";
      const input = document.getElementById(button.getAttribute("data-password-toggle"));
      if (!input) return;
      button.addEventListener("click", function () {
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        button.setAttribute("aria-pressed", String(!visible));
        button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
        button.innerHTML = icon(visible ? "eye" : "eye-off");
        refreshIcons();
      });
    });
  }

  function setButtonLoading(button, loading) {
    if (!button) return;
    if (loading) {
      button.dataset.originalHtml = button.innerHTML;
      button.classList.add("btn-loading");
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    } else {
      button.classList.remove("btn-loading");
      button.disabled = false;
      button.removeAttribute("aria-busy");
      if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    }
  }

  function renderPagination(container, options) {
    if (!container) return;
    const page = options.page;
    const totalPages = options.totalPages;
    const onChange = options.onChange;
    const pages = [];
    for (let index = 1; index <= totalPages; index += 1) {
      if (index === 1 || index === totalPages || Math.abs(index - page) <= 1) {
        pages.push(index);
      } else if (pages[pages.length - 1] !== "…") {
        pages.push("…");
      }
    }
    container.innerHTML =
      '<button type="button" class="page-btn" data-page="' + (page - 1) + '"' + (page <= 1 ? " disabled" : "") + ' aria-label="Previous page">' +
      icon("chevron-left") +
      "</button>" +
      pages
        .map(function (item) {
          if (item === "…") return '<span class="page-btn" aria-hidden="true">…</span>';
          return (
            '<button type="button" class="page-btn' + (item === page ? " active" : "") + '" data-page="' + item + '"' +
            (item === page ? ' aria-current="page"' : "") + ">" + item + "</button>"
          );
        })
        .join("") +
      '<button type="button" class="page-btn" data-page="' + (page + 1) + '"' + (page >= totalPages ? " disabled" : "") + ' aria-label="Next page">' +
      icon("chevron-right") +
      "</button>";

    container.querySelectorAll("[data-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        const nextPage = Number(button.getAttribute("data-page"));
        if (!nextPage || nextPage === page) return;
        onChange(nextPage);
      });
    });
    refreshIcons();
  }

  function renderSidebar(active) {
    const user = Auth.getUser() || { name: "Demo User", role: "employee", email: "" };
    const nav = NAV_ITEMS.map(function (item) {
      return (
        '<a class="nav-item' + (item.key === active ? " active" : "") + '" href="' + item.href + '"' +
        ' aria-label="' + item.label + '" title="' + item.label + '"' +
        (item.key === active ? ' aria-current="page"' : "") + ">" +
        icon(item.icon) +
        '<span class="nav-text">' + item.label + "</span>" +
        "</a>"
      );
    }).join("");

    return (
      '<div class="sidebar-brand">' +
      '<span class="brand-mark">' + icon("blocks", "icon-lg") + "</span>" +
      '<span class="brand-text"><strong>OpsDesk</strong><span>Operations Hub</span></span>' +
      '<button type="button" class="icon-btn sidebar-collapse" data-action="collapse-sidebar" aria-label="Collapse sidebar" title="Collapse sidebar">' +
      icon("chevrons-left") +
      "</button>" +
      "</div>" +
      '<nav class="sidebar-nav" aria-label="Primary navigation">' +
      '<p class="nav-label">Workspace</p>' +
      nav +
      '<p class="nav-label">System</p>' +
      '<a class="nav-item' + (active === "settings" ? " active" : "") + '" href="settings.html"' +
      ' aria-label="Settings" title="Settings"' +
      (active === "settings" ? ' aria-current="page"' : "") + ">" +
      icon("settings") +
      '<span class="nav-text">Settings</span>' +
      "</a>" +
      '<button type="button" class="nav-item" data-action="logout" aria-label="Logout" title="Logout">' +
      icon("log-out") +
      '<span class="nav-text">Logout</span>' +
      "</button>" +
      "</nav>" +
      '<div class="sidebar-foot">' +
      '<div class="profile-card">' +
      avatar(user.name, user.id, "sm") +
      '<div class="profile-meta"><strong>' + escapeHtml(user.name) + "</strong><span>" +
      escapeHtml(user.role || "employee") +
      "</span></div>" +
      '<button type="button" class="icon-btn sm" data-action="logout" aria-label="Log out" title="Log out">' +
      icon("log-out") +
      "</button>" +
      "</div></div>"
    );
  }

  function renderTopbar(config) {
    const user = Auth.getUser() || { name: "Demo User", role: "employee", email: "" };
    return (
      '<div class="topbar-left">' +
      '<button type="button" class="icon-btn bordered mobile-menu-btn" data-action="open-sidebar" aria-label="Open navigation" aria-controls="sidebar">' +
      icon("menu") +
      "</button>" +
      '<div class="page-heading">' +
      "<h1>" + escapeHtml(config.title) + "</h1>" +
      (config.subtitle ? "<p>" + escapeHtml(config.subtitle) + "</p>" : "") +
      "</div></div>" +
      '<div class="topbar-actions">' +
      '<span class="demo-chip" title="This frontend is running with local mock data.">' +
      icon("flask-conical") +
      "<span>Demo Mode</span></span>" +
      '<div class="user-menu" data-user-menu>' +
      '<button type="button" class="user-menu-trigger" data-action="toggle-user-menu" aria-haspopup="true" aria-expanded="false">' +
      avatar(user.name, user.id, "sm") +
      '<span class="user-menu-name">' + escapeHtml(user.name) + "</span>" +
      icon("chevron-down", "icon icon-sm chevron") +
      "</button>" +
      '<div class="user-dropdown" role="menu">' +
      '<div class="dropdown-header"><strong>' + escapeHtml(user.name) + "</strong><span>" +
      escapeHtml(user.email || "Signed in") +
      "</span></div>" +
      '<a class="dropdown-item" role="menuitem" href="settings.html">' + icon("user") + "Account settings</a>" +
      '<a class="dropdown-item" role="menuitem" href="system-health.html">' + icon("activity") + "System health</a>" +
      '<div class="divider"></div>' +
      '<button type="button" class="dropdown-item danger" role="menuitem" data-action="logout">' +
      icon("log-out") +
      "Sign out</button>" +
      "</div></div></div>"
    );
  }

  function renderBanner() {
    return (
      '<div class="demo-banner" role="note">' +
      icon("flask-conical") +
      "<div><strong>Demo mode.</strong> Authentication, data and metrics are simulated in your browser. " +
      'Connect the FastAPI backend in <a href="settings.html#integration">Settings</a> when it is ready.</div>' +
      '<span class="banner-spacer"></span>' +
      '<button type="button" class="banner-dismiss" data-action="dismiss-demo-banner" aria-label="Dismiss demo notice">' +
      icon("x", "icon icon-sm") +
      "</button></div>"
    );
  }

  function ensureSkipLink() {
    if (document.querySelector(".skip-link")) return;
    const link = document.createElement("a");
    link.className = "skip-link";
    link.href = "#page-content";
    link.textContent = "Skip to main content";
    document.body.prepend(link);
  }

  function ensureOverlay() {
    if (document.querySelector(".sidebar-overlay")) return;
    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "sidebar-overlay";
    overlay.setAttribute("aria-label", "Close navigation");
    overlay.addEventListener("click", function () {
      document.body.classList.remove("sidebar-open");
    });
    document.body.appendChild(overlay);
  }

  function closeMobileSidebar() {
    document.body.classList.remove("sidebar-open");
  }

  function initLayout(config) {
    ensureSkipLink();
    const settingsValue = settings();
    if (settingsValue.compactSidebar) {
      document.body.classList.add("sidebar-collapsed");
    }

    const sidebar = document.getElementById("sidebar");
    const topbar = document.getElementById("topbar");
    const banner = document.getElementById("demo-banner");

    if (sidebar) sidebar.innerHTML = renderSidebar(config.active);
    if (topbar) topbar.innerHTML = renderTopbar(config);
    if (banner) {
      banner.innerHTML = settingsValue.showDemoBanner ? renderBanner() : "";
      banner.hidden = !settingsValue.showDemoBanner;
    }
    ensureOverlay();
    bindPasswordToggles(document);
    refreshIcons();
    wireLayout();
  }

  function wireLayout() {
    if (document.body.dataset.layoutWired === "true") return;
    document.body.dataset.layoutWired = "true";

    document.addEventListener("click", function (event) {
      const trigger = event.target.closest("[data-action]");
      if (!trigger) {
        const menu = document.querySelector(".user-menu.open");
        if (menu) closeUserMenu(menu);
        return;
      }
      const action = trigger.getAttribute("data-action");
      if (action === "open-sidebar") {
        document.body.classList.add("sidebar-open");
        const firstLink = document.querySelector(".sidebar-nav .nav-item");
        if (firstLink) firstLink.focus();
      } else if (action === "close-sidebar") {
        closeMobileSidebar();
      } else if (action === "collapse-sidebar") {
        if (window.matchMedia("(max-width: 1024px)").matches) {
          closeMobileSidebar();
        } else {
          document.body.classList.toggle("sidebar-collapsed");
          saveSettings({ compactSidebar: document.body.classList.contains("sidebar-collapsed") });
        }
      } else if (action === "toggle-user-menu") {
        event.stopPropagation();
        const menu = trigger.closest(".user-menu");
        const open = menu.classList.contains("open");
        document.querySelectorAll(".user-menu.open").forEach(closeUserMenu);
        if (!open) {
          menu.classList.add("open");
          trigger.setAttribute("aria-expanded", "true");
        }
      } else if (action === "logout") {
        Auth.logout();
      } else if (action === "dismiss-demo-banner") {
        const banner = document.getElementById("demo-banner");
        if (banner) {
          banner.innerHTML = "";
          banner.hidden = true;
        }
        saveSettings({ showDemoBanner: false });
        toast("Demo notice hidden. You can re-enable it in Settings.", "info", "Notice hidden");
      }
    });

    document.querySelectorAll(".sidebar-nav a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 1024px)").matches) closeMobileSidebar();
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMobileSidebar();
        const menu = document.querySelector(".user-menu.open");
        if (menu) closeUserMenu(menu);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024) closeMobileSidebar();
    });
  }

  function closeUserMenu(menu) {
    menu.classList.remove("open");
    const trigger = menu.querySelector("[data-action='toggle-user-menu']");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function getQueryParam(name) {
    return new URLSearchParams(location.search).get(name);
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindPasswordToggles(document);
    refreshIcons();
  });

  global.UI = {
    icon: icon,
    icons: refreshIcons,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    timeAgo: timeAgo,
    formatNumber: formatNumber,
    initials: initials,
    avatar: avatar,
    avatarClass: avatarClass,
    statusBadge: statusBadge,
    priorityBadge: priorityBadge,
    severityBadge: severityBadge,
    roleBadge: roleBadge,
    userStatusBadge: userStatusBadge,
    logIcon: logIcon,
    toast: toast,
    openModal: openModal,
    confirm: confirmDialog,
    setButtonLoading: setButtonLoading,
    renderPagination: renderPagination,
    initLayout: initLayout,
    bindPasswordToggles: bindPasswordToggles,
    settings: settings,
    saveSettings: saveSettings,
    debounce: debounce,
    getQueryParam: getQueryParam,
    STATUS_META: STATUS_META,
    PRIORITY_META: PRIORITY_META,
    SEVERITY_META: SEVERITY_META,
    ROLE_META: ROLE_META
  };
})(window);
