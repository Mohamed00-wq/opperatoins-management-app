(function (global) {
  "use strict";

  const state = {
    data: null,
    range: 14
  };

  let els = {};

  function init() {
    if (!Auth.isAuthenticated()) return;
    UI.initLayout({
      active: "dashboard",
      title: "Overview",
      subtitle: "Operational performance and workload at a glance."
    });
    cacheElements();
    bindEvents();
    renderSkeletons();

    if (UI.getQueryParam("welcome") === "1") {
      const user = Auth.getUser();
      UI.toast("Your demo workspace is ready" + (user ? ", " + user.name.split(" ")[0] : "") + ".", "success", "Welcome");
    }

    loadDashboard();
  }

  function cacheElements() {
    els.stats = document.getElementById("stat-grid");
    els.activityChart = document.getElementById("task-activity-chart");
    els.statusChart = document.getElementById("status-chart");
    els.userChart = document.getElementById("user-activity-chart");
    els.statusList = document.getElementById("system-status-list");
    els.statusSummary = document.getElementById("system-status-summary");
    els.recentActivity = document.getElementById("recent-activity");
    els.recentTasks = document.getElementById("recent-tasks");
    els.range = document.getElementById("activity-range");
  }

  function bindEvents() {
    els.range.addEventListener("change", function () {
      state.range = Number(els.range.value);
      if (state.data) renderActivityChart();
    });
  }

  function renderSkeletons() {
    const skeleton = Array.from({ length: 6 })
      .map(function () {
        return (
          '<article class="stat-card">' +
          '<div class="stat-card-top"><span class="stat-icon"><span class="spinner"></span></span></div>' +
          '<div><p class="stat-label">Loading metric</p><p class="stat-value">—</p></div>' +
          '<p class="stat-foot">Fetching demo data…</p></article>'
        );
      })
      .join("");
    els.stats.innerHTML = skeleton;
    els.stats.setAttribute("aria-busy", "true");
  }

  async function loadDashboard() {
    try {
      const data = await Api.dashboard.get();
      state.data = data;
      render(data);
    } catch (error) {
      UI.toast(error.message || "Unable to load the dashboard.", "error", "Dashboard unavailable");
      els.stats.setAttribute("aria-busy", "false");
      els.stats.innerHTML =
        '<article class="card empty-state stat-error">' +
        '<span class="empty-state-icon">' + UI.icon("wifi-off") + "</span>" +
        "<h3>Dashboard unavailable</h3><p>" + UI.escapeHtml(error.message || "Try again shortly.") + "</p>" +
        '<button class="btn btn-secondary btn-sm" type="button" id="dashboard-retry">Try again</button></article>';
      const retry = document.getElementById("dashboard-retry");
      if (retry) retry.addEventListener("click", function () { renderSkeletons(); loadDashboard(); });
      UI.icons();
    }
  }

  function render(data) {
    els.stats.setAttribute("aria-busy", "false");
    renderStats(data.stats);
    renderActivityChart();
    Charts.donut(els.statusChart, {
      segments: data.statusDistribution,
      centerValue: data.stats.totalTasks,
      centerLabel: "Tasks",
      ariaLabel: "Task status distribution"
    });
    Charts.bars(els.userChart, {
      labels: data.userActivity.map(function (point) { return point.label; }),
      series: [
        {
          name: "Active users",
          color: Charts.colors.info,
          data: data.userActivity.map(function (point) { return point.active; })
        }
      ],
      showLegend: false,
      height: 240,
      ariaLabel: "Distinct active users per day"
    });
    renderSystemStatus(data);
    renderRecentActivity(data.recentLogs);
    renderRecentTasks(data.recentTasks);
    UI.icons();
  }

  function renderStats(stats) {
    const completion = stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
    const activeShare = stats.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;
    const cards = [
      {
        label: "Total users",
        value: stats.totalUsers,
        iconName: "users",
        tone: "",
        foot: stats.activeUsers + " active account" + (stats.activeUsers === 1 ? "" : "s")
      },
      {
        label: "Active users",
        value: stats.activeUsers,
        iconName: "user-check",
        tone: "success",
        foot: activeShare + "% of the workspace"
      },
      {
        label: "Total tasks",
        value: stats.totalTasks,
        iconName: "clipboard-list",
        tone: "info",
        foot: stats.pendingTasks + " awaiting action"
      },
      {
        label: "Completed tasks",
        value: stats.completedTasks,
        iconName: "check-circle-2",
        tone: "success",
        foot: completion + "% completion rate"
      },
      {
        label: "Pending tasks",
        value: stats.pendingTasks,
        iconName: "clock",
        tone: "warning",
        foot: "Currently in the backlog"
      },
      {
        label: "Failed operations",
        value: stats.failedOperations,
        iconName: "alert-octagon",
        tone: "danger",
        foot: "Critical events recorded"
      }
    ];

    els.stats.innerHTML = cards
      .map(function (card) {
        return (
          '<article class="stat-card">' +
          '<div class="stat-card-top">' +
          '<span class="stat-icon ' + card.tone + '">' + UI.icon(card.iconName) + "</span>" +
          (card.label === "Failed operations"
            ? '<span class="stat-delta ' + (card.value ? "down" : "neutral") + '">' +
              (card.value ? "Needs review" : "Clear") + "</span>"
            : "") +
          "</div>" +
          '<div><p class="stat-label">' + card.label + '</p><p class="stat-value">' + card.value + "</p></div>" +
          '<p class="stat-foot">' + card.foot + "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderActivityChart() {
    if (!state.data) return;
    const activity = state.data.taskActivity.slice(-state.range);
    Charts.line(els.activityChart, {
      labels: activity.map(function (point) { return point.label; }),
      series: [
        {
          name: "Created",
          color: Charts.colors.primary,
          data: activity.map(function (point) { return point.created; })
        },
        {
          name: "Completed",
          color: Charts.colors.success,
          data: activity.map(function (point) { return point.completed; })
        }
      ],
      height: 258,
      ariaLabel: "Tasks created and completed over the selected range"
    });
  }

  function renderSystemStatus(data) {
    const items = [
      {
        name: "API gateway",
        value: data.systemStatus.api === "operational" ? "Operational" : "Degraded",
        tone: data.systemStatus.api === "operational" ? "" : "warning"
      },
      {
        name: "PostgreSQL",
        value: data.systemStatus.database === "operational" ? "Operational" : "Degraded",
        tone: data.systemStatus.database === "operational" ? "" : "warning"
      },
      {
        name: "Background jobs",
        value: data.systemStatus.backgroundJobs === "operational" ? "Operational" : "Degraded",
        tone: data.systemStatus.backgroundJobs === "operational" ? "" : "warning"
      },
      {
        name: "CPU usage",
        value: data.systemStatus.cpu + "%",
        tone: data.systemStatus.cpu > 75 ? "warning" : ""
      },
      {
        name: "Memory usage",
        value: data.systemStatus.memory + "%",
        tone: data.systemStatus.memory > 80 ? "warning" : ""
      }
    ];

    els.statusList.innerHTML = items
      .map(function (item) {
        return (
          '<div class="system-status-row">' +
          '<span class="status-dot ' + item.tone + '"></span>' +
          '<span class="status-name">' + UI.escapeHtml(item.name) + "</span>" +
          '<span class="status-value">' + UI.escapeHtml(item.value) + "</span>" +
          "</div>"
        );
      })
      .join("");

    const healthy = items.every(function (item) {
      return item.value === "Operational" || item.tone !== "warning";
    });
    els.statusSummary.className = "system-status-summary" + (healthy ? "" : " degraded");
    els.statusSummary.innerHTML =
      UI.icon(healthy ? "shield-check" : "alert-triangle") +
      "<span>" + (healthy ? "All core services are operational." : "One or more services need attention.") +
      "</span>";
  }

  function renderRecentActivity(logs) {
    if (!logs || !logs.length) {
      els.recentActivity.innerHTML =
        '<div class="empty-state"><span class="empty-state-icon">' + UI.icon("scroll-text") + "</span>" +
        "<h3>No recent activity</h3><p>Workspace events will appear here.</p></div>";
      return;
    }
    els.recentActivity.innerHTML = logs
      .map(function (log) {
        return (
          '<div class="activity-item">' +
          UI.logIcon(log.type, log.severity) +
          '<div class="activity-content">' +
          "<p><strong>" + UI.escapeHtml(log.userName) + "</strong> " + UI.escapeHtml(log.action) + "</p>" +
          '<div class="activity-meta"><span>' + UI.timeAgo(log.timestamp) + "</span>" +
          '<span class="dot-sep"></span><span>' + UI.escapeHtml(log.type) + "</span></div>" +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderRecentTasks(tasks) {
    if (!tasks || !tasks.length) {
      els.recentTasks.innerHTML =
        '<div class="empty-state"><span class="empty-state-icon">' + UI.icon("clipboard-list") + "</span>" +
        "<h3>No tasks yet</h3><p>Create a task to see it here.</p></div>";
      return;
    }
    els.recentTasks.innerHTML = tasks
      .map(function (task) {
        return (
          '<div class="mini-task">' +
          '<div class="mini-task-main"><strong>' + UI.escapeHtml(task.title) + "</strong>" +
          "<span>" + UI.escapeHtml(task.assignee) + " · due " + UI.formatDate(task.dueDate) + "</span></div>" +
          UI.statusBadge(task.status) +
          "</div>"
        );
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
