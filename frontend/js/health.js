(function (global) {
  "use strict";

  const state = {
    data: null,
    timer: null,
    autoRefresh: true,
    requestId: 0,
    hasLoaded: false
  };

  let els = {};

  function init() {
    if (!Auth.isAuthenticated()) return;
    UI.initLayout({
      active: "health",
      title: "System Health",
      subtitle: "Monitor service signals and simulated infrastructure metrics."
    });
    cacheElements();
    bindEvents();
    loadHealth().then(startAutoRefresh);
  }

  function cacheElements() {
    els.services = document.getElementById("health-services");
    els.stats = document.getElementById("health-stats");
    els.requestsChart = document.getElementById("requests-chart");
    els.responseChart = document.getElementById("response-chart");
    els.checks = document.getElementById("health-checks");
    els.runtime = document.getElementById("runtime-details");
    els.updated = document.getElementById("health-updated");
    els.refresh = document.getElementById("refresh-health");
    els.autoRefresh = document.getElementById("auto-refresh");
    els.overallDot = document.getElementById("overall-dot");
  }

  function bindEvents() {
    els.refresh.addEventListener("click", function () {
      loadHealth(true);
    });
    els.autoRefresh.addEventListener("change", function () {
      state.autoRefresh = els.autoRefresh.checked;
      if (state.autoRefresh) {
        startAutoRefresh();
        UI.toast("Simulated metrics will refresh every 5 seconds.", "info", "Auto-refresh enabled");
      } else {
        stopAutoRefresh();
        UI.toast("Automatic metric refresh paused.", "info", "Auto-refresh disabled");
      }
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && state.autoRefresh) loadHealth();
    });
    window.addEventListener("pagehide", stopAutoRefresh);
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    if (!state.autoRefresh) return;
    state.timer = setInterval(function () {
      if (document.hidden) return;
      loadHealth();
    }, 5000);
  }

  function stopAutoRefresh() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  async function loadHealth(manual) {
    const requestId = ++state.requestId;
    if (manual) UI.setButtonLoading(els.refresh, true);
    try {
      const data = await Api.health.get();
      if (requestId !== state.requestId) return;
      state.data = data;
      state.hasLoaded = true;
      render(data);
      if (manual) UI.toast("Simulated metrics refreshed.", "success", "Health check complete");
    } catch (error) {
      if (requestId !== state.requestId) return;
      els.overallDot.className = "status-dot danger";
      els.updated.textContent = "Unable to refresh metrics";
      UI.toast(error.message || "Unable to load system health.", "error", "Health check failed");
    } finally {
      if (manual) UI.setButtonLoading(els.refresh, false);
    }
  }

  function render(data) {
    const operational = data.status === "operational";
    els.overallDot.className = "status-dot" + (operational ? "" : " warning");

    renderServices(data.services);
    renderStats(data.metrics);
    renderChecks(data.checks, data.services);
    renderRuntime(data);

    Charts.line(els.requestsChart, {
      labels: data.requestsSeries.map(function (point) { return point.label; }),
      series: [
        {
          name: "Requests",
          color: Charts.colors.primary,
          data: data.requestsSeries.map(function (point) { return point.value; })
        }
      ],
      showLegend: false,
      height: 250,
      ariaLabel: "Simulated request volume over 24 hours"
    });

    Charts.line(els.responseChart, {
      labels: data.responseSeries.map(function (point) { return point.label; }),
      series: [
        {
          name: "Response time",
          color: Charts.colors.success,
          data: data.responseSeries.map(function (point) { return point.value; })
        }
      ],
      showLegend: false,
      height: 250,
      ariaLabel: "Simulated average response time"
    });

    const updated = new Date(data.updatedAt);
    els.updated.textContent =
      "Updated " + updated.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    els.updated.title = UI.formatDateTime(data.updatedAt);
    UI.icons();
  }

  function renderServices(services) {
    const icons = { "API Gateway": "server", PostgreSQL: "database", "Task Queue": "workflow" };
    els.services.innerHTML = services
      .map(function (service) {
        const tone = service.status === "operational" ? "success" : service.status === "degraded" ? "warning" : "danger";
        const badge = service.status === "operational" ? "badge-success" : service.status === "degraded" ? "badge-warning" : "badge-danger";
        const label = service.status === "operational" ? "Operational" : service.status === "degraded" ? "Degraded" : "Down";
        return (
          '<div class="health-service">' +
          '<span class="icon-box ' + (tone === "success" ? "" : tone) + '">' + UI.icon(icons[service.name] || "server") + "</span>" +
          '<div class="health-service-text"><strong>' + UI.escapeHtml(service.name) + "</strong><span>" +
          UI.escapeHtml(service.detail) + " · " + service.latency + " ms</span></div>" +
          '<span class="badge ' + badge + '">' + label + "</span></div>"
        );
      })
      .join("");
  }

  function meterMarkup(value, tone) {
    const width = Math.max(2, Math.min(100, value));
    return (
      '<svg class="meter-svg" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect class="meter-track" x="0" y="0" width="100" height="6" rx="3"></rect>' +
      '<rect class="meter-fill ' + tone + '" x="0" y="0" width="' + width + '" height="6" rx="3"></rect>' +
      "</svg>"
    );
  }

  function toneForUsage(value) {
    if (value >= 80) return "danger";
    if (value >= 65) return "warning";
    return "success";
  }

  function renderStats(metrics) {
    const cards = [
      {
        label: "CPU usage",
        value: metrics.cpu + "%",
        iconName: "cpu",
        tone: toneForUsage(metrics.cpu),
        foot: "Average across API nodes",
        meter: metrics.cpu
      },
      {
        label: "Memory usage",
        value: metrics.memory + "%",
        iconName: "memory-stick",
        tone: toneForUsage(metrics.memory),
        foot: "Working set utilization",
        meter: metrics.memory
      },
      {
        label: "Requests",
        value: UI.formatNumber(metrics.requests),
        iconName: "network",
        tone: "info",
        foot: "Last 24 hours"
      },
      {
        label: "Error rate",
        value: metrics.errorRate.toFixed(2) + "%",
        iconName: "triangle-alert",
        tone: metrics.errorRate > 0.5 ? "warning" : "success",
        foot: "Target below 0.50%"
      },
      {
        label: "Response time",
        value: metrics.responseTime + " ms",
        iconName: "timer",
        tone: metrics.responseTime > 200 ? "warning" : "info",
        foot: "Average across endpoints"
      }
    ];

    els.stats.innerHTML = cards
      .map(function (card) {
        return (
          '<article class="stat-card">' +
          '<div class="stat-card-top">' +
          '<span class="stat-icon ' + card.tone + '">' + UI.icon(card.iconName) + "</span>" +
          '<span class="stat-delta neutral">Simulated</span>' +
          "</div>" +
          '<div><p class="stat-label">' + card.label + '</p><p class="stat-value">' + card.value + "</p></div>" +
          (card.meter != null ? meterMarkup(card.meter, card.tone) : "") +
          '<p class="stat-foot">' + card.foot + "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderChecks(checks, services) {
    const serviceRows = services.map(function (service) {
      return {
        name: service.name,
        value: service.status === "operational" ? "Healthy" : "Degraded",
        detail: "Response " + service.latency + " ms",
        tone: service.status === "operational" ? "" : "warning"
      };
    });
    els.checks.innerHTML = serviceRows
      .concat(checks)
      .map(function (check) {
        const degraded = /degraded|down/i.test(check.value);
        return (
          '<div class="health-list-row">' +
          '<span class="status-dot' + (degraded ? " warning" : "") + '"></span>' +
          '<span class="name">' + UI.escapeHtml(check.name) + "</span>" +
          '<span class="value">' + UI.escapeHtml(check.value) + "<span>" + UI.escapeHtml(check.detail) + "</span></span>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderRuntime(data) {
    const apiBase = (OMS.apiConfig && OMS.apiConfig.baseUrl) || "http://localhost:8000/api/v1";
    const rows = [
      { name: "Environment", value: "Demo", detail: "No production access" },
      { name: "Data source", value: "Local mock layer", detail: "Stored in this browser" },
      { name: "Uptime", value: data.metrics.uptime, detail: "Simulated 30-day window" },
      { name: "API base URL", value: apiBase, detail: "Used when mock mode is disabled" },
      { name: "Last checked", value: UI.timeAgo(data.updatedAt), detail: UI.formatDateTime(data.updatedAt) }
    ];
    els.runtime.innerHTML = rows
      .map(function (row) {
        return (
          '<div class="health-list-row">' +
          '<span class="name">' + UI.escapeHtml(row.name) + "</span>" +
          '<span class="value">' + UI.escapeHtml(row.value) + "<span>" + UI.escapeHtml(row.detail) + "</span></span>" +
          "</div>"
        );
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
