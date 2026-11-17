(function (global) {
  "use strict";

  const TYPE_LABELS = {
    auth: "Authentication",
    task: "Task",
    user: "User",
    system: "System"
  };

  const state = {
    search: "",
    severity: "all",
    type: "all",
    page: 1,
    pageSize: 10,
    items: [],
    hasLoaded: false,
    requestId: 0
  };

  let els = {};

  function init() {
    if (!Auth.isAuthenticated()) return;
    UI.initLayout({
      active: "logs",
      title: "Activity Logs",
      subtitle: "Audit user actions, task changes and system events."
    });
    cacheElements();
    bindEvents();
    loadLogs();
  }

  function cacheElements() {
    els.card = document.querySelector(".table-card");
    els.search = document.getElementById("log-search");
    els.severity = document.getElementById("filter-severity");
    els.type = document.getElementById("filter-log-type");
    els.reset = document.getElementById("reset-log-filters");
    els.export = document.getElementById("export-logs");
    els.loading = document.getElementById("logs-loading");
    els.tableWrap = document.getElementById("logs-table-wrap");
    els.tbody = document.getElementById("logs-tbody");
    els.empty = document.getElementById("logs-empty");
    els.emptyTitle = document.getElementById("logs-empty-title");
    els.emptyText = document.getElementById("logs-empty-text");
    els.emptyAction = document.getElementById("logs-empty-action");
    els.footer = document.getElementById("logs-footer");
    els.summary = document.getElementById("logs-summary");
    els.pagination = document.getElementById("logs-pagination");
  }

  function bindEvents() {
    els.search.addEventListener(
      "input",
      UI.debounce(function () {
        state.search = els.search.value;
        state.page = 1;
        loadLogs();
      }, 300)
    );

    els.severity.addEventListener("change", function () {
      state.severity = els.severity.value;
      state.page = 1;
      loadLogs();
    });

    els.type.addEventListener("change", function () {
      state.type = els.type.value;
      state.page = 1;
      loadLogs();
    });

    els.reset.addEventListener("click", resetFilters);
    els.export.addEventListener("click", exportLogs);
    els.emptyAction.addEventListener("click", function () {
      if (els.emptyAction.dataset.mode === "retry") loadLogs();
      else resetFilters();
    });
  }

  function resetFilters() {
    state.search = "";
    state.severity = "all";
    state.type = "all";
    state.page = 1;
    els.search.value = "";
    els.severity.value = "all";
    els.type.value = "all";
    loadLogs();
  }

  function hasFilters() {
    return Boolean(state.search.trim()) || state.severity !== "all" || state.type !== "all";
  }

  async function loadLogs() {
    const requestId = ++state.requestId;
    setLoading(true);
    try {
      const result = await Api.logs.list({
        search: state.search,
        severity: state.severity,
        type: state.type,
        page: state.page,
        pageSize: state.pageSize
      });
      if (requestId !== state.requestId) return;
      state.items = result.items;
      state.page = result.page;
      state.hasLoaded = true;
      renderLogs(result);
    } catch (error) {
      if (requestId !== state.requestId) return;
      renderError(error);
    } finally {
      if (requestId === state.requestId) setLoading(false);
    }
  }

  function setLoading(loading) {
    els.loading.hidden = !loading || state.hasLoaded;
    els.card.classList.toggle("is-loading", loading && state.hasLoaded);
    els.card.setAttribute("aria-busy", String(loading));
    if (!state.hasLoaded) {
      els.tableWrap.hidden = true;
      els.empty.hidden = true;
      els.footer.hidden = true;
    }
  }

  function renderLogs(result) {
    const hasItems = result.total > 0;
    els.tableWrap.hidden = !hasItems;
    els.footer.hidden = !hasItems;
    els.empty.hidden = hasItems;
    els.card.classList.remove("is-loading");

    if (hasItems) {
      els.tbody.innerHTML = result.items.map(renderRow).join("");
      const start = (result.page - 1) * result.pageSize + 1;
      const end = Math.min(result.total, result.page * result.pageSize);
      els.summary.textContent =
        "Showing " + start + "–" + end + " of " + result.total + " event" + (result.total === 1 ? "" : "s");
      UI.renderPagination(els.pagination, {
        page: result.page,
        totalPages: result.totalPages,
        onChange: function (page) {
          state.page = page;
          loadLogs();
          els.card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } else {
      els.empty.hidden = false;
      const filtered = hasFilters();
      els.emptyTitle.textContent = filtered ? "No events match your filters" : "No activity recorded";
      els.emptyText.textContent = filtered
        ? "Try a different search term or clear the active filters."
        : "Workspace events will appear here as actions are performed.";
      els.emptyAction.textContent = filtered ? "Clear filters" : "Refresh";
      els.emptyAction.dataset.mode = filtered ? "clear" : "retry";
    }
    UI.icons();
  }

  function renderError(error) {
    state.hasLoaded = true;
    els.tableWrap.hidden = true;
    els.footer.hidden = true;
    els.empty.hidden = false;
    els.emptyTitle.textContent = "Unable to load activity";
    els.emptyText.textContent = error.message || "Something went wrong while loading activity logs.";
    els.emptyAction.textContent = "Try again";
    els.emptyAction.dataset.mode = "retry";
    UI.icons();
    UI.toast(error.message || "Unable to load activity logs.", "error", "Request failed");
  }

  function renderRow(log) {
    const typeLabel = TYPE_LABELS[log.type] || "Event";
    return (
      "<tr>" +
      '<td class="log-time">' + UI.timeAgo(log.timestamp) +
      "<span>" + UI.formatDateTime(log.timestamp) + "</span></td>" +
      '<td><div class="log-event">' + UI.logIcon(log.type, log.severity) +
      '<div class="log-event-text"><strong>' + UI.escapeHtml(log.action) + "</strong>" +
      "<span>" + UI.escapeHtml(typeLabel) + " · " + UI.escapeHtml(log.id) + "</span></div></div></td>" +
      '<td><div class="user-cell">' + UI.avatar(log.userName, log.userId, "sm") +
      '<span class="user-cell-text"><strong>' + UI.escapeHtml(log.userName) + "</strong></span></div></td>" +
      "<td>" + UI.severityBadge(log.severity) + "</td>" +
      '<td class="hide-md"><span class="mono text-muted">' + UI.escapeHtml(log.ip) + "</span></td>" +
      "</tr>"
    );
  }

  function csvCell(value) {
    return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
  }

  async function exportLogs() {
    UI.setButtonLoading(els.export, true);
    try {
      const result = await Api.logs.list({
        search: state.search,
        severity: state.severity,
        type: state.type,
        page: 1,
        pageSize: 1000
      });
      if (!result.items.length) {
        UI.toast("There are no events to export for the current filters.", "warning", "Nothing to export");
        return;
      }
      const header = ["Timestamp", "Event ID", "User", "Action", "Type", "Severity", "IP Address"];
      const rows = result.items.map(function (log) {
        return [
          new Date(log.timestamp).toISOString(),
          log.id,
          log.userName,
          log.action,
          TYPE_LABELS[log.type] || log.type,
          log.severity,
          log.ip
        ].map(csvCell).join(",");
      });
      const csv = "\ufeff" + [header.map(csvCell).join(",")].concat(rows).join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "activity-logs-" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      UI.toast(result.items.length + " events exported to CSV.", "success", "Export complete");
    } catch (error) {
      UI.toast(error.message || "Unable to export activity logs.", "error", "Export failed");
    } finally {
      UI.setButtonLoading(els.export, false);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
