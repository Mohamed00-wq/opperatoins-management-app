(function (global) {
  "use strict";

  const OMS = global.OMS || {};
  OMS.storage = Object.assign(
    {
      auth: "oms.auth.v1",
      settings: "oms.settings.v1",
      sidebar: "oms.sidebar.v1",
      mockUsers: "oms.mock.users.v1",
      mockTasks: "oms.mock.tasks.v1",
      mockLogs: "oms.mock.logs.v1"
    },
    OMS.storage || {}
  );
  global.OMS = OMS;

  const DAY = 86400000;
  const now = Date.now();

  function daysAgo(days, hour = 10, minute = 0) {
    const date = new Date(now - days * DAY);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }

  function daysAhead(days) {
    const date = new Date(now + days * DAY);
    date.setHours(17, 0, 0, 0);
    return date.toISOString();
  }

  function round(value, decimals = 0) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  function randomBetween(min, max, decimals = 0) {
    return round(min + Math.random() * (max - min), decimals);
  }

  const seedUsers = [
    { id: "USR-001", name: "Amara Okafor", email: "admin@opsdesk.io", password: "Admin@123", role: "administrator", status: "active", department: "Operations", phone: "+1 (415) 555-0112", createdAt: daysAgo(420), lastLogin: daysAgo(0, 8, 42) },
    { id: "USR-002", name: "Daniel Mercer", email: "manager@opsdesk.io", password: "Manager@123", role: "manager", status: "active", department: "Engineering", phone: "+1 (415) 555-0138", createdAt: daysAgo(390), lastLogin: daysAgo(0, 9, 15) },
    { id: "USR-003", name: "Priya Raman", email: "employee@opsdesk.io", password: "Employee@123", role: "employee", status: "active", department: "Support", phone: "+1 (415) 555-0173", createdAt: daysAgo(365), lastLogin: daysAgo(1, 14, 2) },
    { id: "USR-004", name: "Sofia Lindqvist", email: "sofia.lindqvist@opsdesk.io", password: "Password@123", role: "manager", status: "active", department: "Logistics", phone: "+46 8 555 0144", createdAt: daysAgo(312), lastLogin: daysAgo(0, 7, 58) },
    { id: "USR-005", name: "Marcus Chen", email: "marcus.chen@opsdesk.io", password: "Password@123", role: "employee", status: "active", department: "Engineering", phone: "+1 (206) 555-0186", createdAt: daysAgo(298), lastLogin: daysAgo(2, 11, 26) },
    { id: "USR-006", name: "Leila Haddad", email: "leila.haddad@opsdesk.io", password: "Password@123", role: "employee", status: "active", department: "Finance", phone: "+971 4 555 0108", createdAt: daysAgo(245), lastLogin: daysAgo(1, 16, 40) },
    { id: "USR-007", name: "Tomás Ferreira", email: "tomas.ferreira@opsdesk.io", password: "Password@123", role: "employee", status: "inactive", department: "Support", phone: "+351 21 555 0119", createdAt: daysAgo(233), lastLogin: daysAgo(38, 10, 12) },
    { id: "USR-008", name: "Hannah Weiss", email: "hannah.weiss@opsdesk.io", password: "Password@123", role: "manager", status: "active", department: "People Operations", phone: "+49 30 555 0177", createdAt: daysAgo(210), lastLogin: daysAgo(3, 9, 5) },
    { id: "USR-009", name: "Owen Gallagher", email: "owen.gallagher@opsdesk.io", password: "Password@123", role: "employee", status: "active", department: "Logistics", phone: "+353 1 555 0152", createdAt: daysAgo(188), lastLogin: daysAgo(0, 12, 34) },
    { id: "USR-010", name: "Nadia Petrova", email: "nadia.petrova@opsdesk.io", password: "Password@123", role: "employee", status: "inactive", department: "Finance", phone: "+7 495 555 0165", createdAt: daysAgo(164), lastLogin: daysAgo(61, 13, 20) },
    { id: "USR-011", name: "Ethan Brooks", email: "ethan.brooks@opsdesk.io", password: "Password@123", role: "employee", status: "active", department: "Engineering", phone: "+1 (512) 555 0194", createdAt: daysAgo(120), lastLogin: daysAgo(2, 8, 50) },
    { id: "USR-012", name: "Yuki Tanaka", email: "yuki.tanaka@opsdesk.io", password: "Password@123", role: "manager", status: "active", department: "Operations", phone: "+81 3 555 0126", createdAt: daysAgo(86), lastLogin: daysAgo(0, 10, 8) }
  ];

  const taskTitles = [
    "Q3 vendor contract renewal",
    "Rotate production API keys",
    "Onboard new logistics partner",
    "Audit warehouse access permissions",
    "Update incident response runbook",
    "Migrate billing exports to new schema",
    "Review weekly operations report",
    "Provision laptops for new hires",
    "Reconcile inventory discrepancies",
    "Patch staging database cluster",
    "Approve pending time-off requests",
    "Validate backup restoration test",
    "Refresh customer SLA documentation",
    "Investigate payment gateway latency",
    "Schedule quarterly fire drill",
    "Consolidate duplicate supplier records",
    "Update onboarding checklist",
    "Run month-end close checklist",
    "Configure alert thresholds",
    "Review support escalation queue",
    "Decommission legacy reporting job",
    "Renew TLS certificates",
    "Optimize order routing rules",
    "Conduct safety compliance review",
    "Clean up inactive user accounts",
    "Finalize disaster recovery plan",
    "QA release candidate 4.8",
    "Archive completed project files",
    "Coordinate maintenance window",
    "Prepare executive ops briefing"
  ];

  const taskDescriptions = [
    "Confirm terms with procurement and route the final package for signature.",
    "Rotate credentials across production services and update the secret store.",
    "Complete integration checks and exchange onboarding documentation.",
    "Review role assignments and remove access that is no longer required.",
    "Document escalation paths and update the on-call contact matrix.",
    "Map legacy fields to the new schema and validate a sample export.",
    "Summarize throughput, delays and open incidents for leadership review.",
    "Prepare devices, accounts and access badges for the incoming cohort.",
    "Investigate stock variance and reconcile records with the warehouse team.",
    "Apply the latest security patches during the approved maintenance window.",
    "Review coverage requirements and approve or reschedule each request.",
    "Run a controlled restore and confirm recovery time objectives are met.",
    "Align target response times with current contractual commitments.",
    "Trace latency spikes and confirm failover behavior with the provider.",
    "Book facilities, notify floor wardens and confirm attendance.",
    "Deduplicate supplier records and preserve the canonical identifiers.",
    "Refresh the first-week checklist and add the new tooling steps.",
    "Complete reconciliation tasks and collect sign-off from finance.",
    "Tune thresholds to reduce noise while preserving critical coverage.",
    "Triage the oldest tickets and reassign anything that is stalled.",
    "Confirm no downstream consumers remain and archive the configuration.",
    "Install renewed certificates and verify the full chain.",
    "Adjust routing rules to reduce delivery time in priority regions.",
    "Walk the floor with compliance and close any open observations.",
    "Disable dormant accounts after a final access review.",
    "Document recovery sequencing and validate contact details.",
    "Execute the regression suite and log any release blockers.",
    "Move finished project material into the long-term archive.",
    "Notify stakeholders and confirm rollback resources are available.",
    "Compile the operating summary and prepare the leadership narrative."
  ];

  const statusSequence = [
    "completed", "in_progress", "pending", "pending", "completed", "cancelled",
    "in_progress", "pending", "completed", "pending", "pending", "completed",
    "in_progress", "pending", "cancelled", "completed", "pending", "in_progress",
    "completed", "pending", "cancelled", "completed", "in_progress", "pending",
    "completed", "pending", "in_progress", "pending", "pending", "completed"
  ];

  const prioritySequence = [
    "high", "critical", "medium", "high", "low", "medium",
    "high", "low", "critical", "medium", "low", "high",
    "medium", "critical", "low", "medium", "high", "high",
    "low", "medium", "low", "high", "medium", "low",
    "critical", "high", "medium", "low", "high", "critical"
  ];

  function buildSeedTasks() {
    return taskTitles.map(function (title, index) {
      const assignee = seedUsers[(index + 2) % seedUsers.length];
      const createdAt = daysAgo(28 - index, 9 + (index % 8), (index * 7) % 60);
      const status = statusSequence[index];
      const completedAt = status === "completed" ? daysAgo((index % 12) + 1, 15, 10) : null;
      return {
        id: "TSK-" + (1001 + index),
        title: title,
        description: taskDescriptions[index],
        assigneeId: assignee.id,
        assignee: assignee.name,
        priority: prioritySequence[index],
        status: status,
        createdDate: createdAt,
        dueDate: daysAhead((index % 6) - 1 + Math.floor(index / 7) * 3),
        completedAt: completedAt
      };
    });
  }

  const logActions = [
    { type: "auth", severity: "success", action: "Signed in to the workspace" },
    { type: "task", severity: "success", action: "Created task \"Review weekly operations report\"" },
    { type: "task", severity: "info", action: "Updated task \"Q3 vendor contract renewal\"" },
    { type: "task", severity: "warning", action: "Deleted task \"Archive completed project files\"" },
    { type: "user", severity: "info", action: "Updated role for Nadia Petrova" },
    { type: "system", severity: "info", action: "Scheduled backup completed successfully" },
    { type: "system", severity: "critical", action: "Database connection pool exhausted" },
    { type: "system", severity: "warning", action: "High memory usage detected on API node 2" },
    { type: "auth", severity: "warning", action: "Failed sign-in attempt from an unknown device" },
    { type: "task", severity: "success", action: "Completed task \"Validate backup restoration test\"" },
    { type: "user", severity: "success", action: "Activated user account for Ethan Brooks" },
    { type: "system", severity: "success", action: "Deployed API release 2.4.1 to production" },
    { type: "task", severity: "info", action: "Assigned task \"Configure alert thresholds\" to Marcus Chen" },
    { type: "auth", severity: "success", action: "Password changed successfully" },
    { type: "user", severity: "warning", action: "Deactivated user account for Tomás Ferreira" },
    { type: "system", severity: "info", action: "Rotated the primary database replica" }
  ];

  function buildSeedLogs() {
    return logActions.map(function (entry, index) {
      const user = seedUsers[(index * 3) % seedUsers.length];
      return {
        id: "LOG-" + (2001 + index),
        userId: user.id,
        userName: user.name,
        action: entry.action,
        type: entry.type,
        severity: entry.severity,
        ip: "10.24." + (index % 9) + "." + (20 + index * 3),
        timestamp: daysAgo(index * 0.32, 9 + (index % 10), (index * 11) % 60)
      };
    });
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureSeeded() {
    if (!localStorage.getItem(OMS.storage.mockUsers)) {
      write(OMS.storage.mockUsers, seedUsers);
    }
    if (!localStorage.getItem(OMS.storage.mockTasks)) {
      write(OMS.storage.mockTasks, buildSeedTasks());
    }
    if (!localStorage.getItem(OMS.storage.mockLogs)) {
      write(OMS.storage.mockLogs, buildSeedLogs());
    }
  }

  function getUsers() {
    return read(OMS.storage.mockUsers, []);
  }

  function saveUsers(users) {
    write(OMS.storage.mockUsers, users);
  }

  function getTasksRaw() {
    return read(OMS.storage.mockTasks, []);
  }

  function saveTasks(tasks) {
    write(OMS.storage.mockTasks, tasks);
  }

  function getLogsRaw() {
    return read(OMS.storage.mockLogs, []);
  }

  function saveLogs(logs) {
    write(OMS.storage.mockLogs, logs);
  }

  function sanitizeUser(user) {
    if (!user) return null;
    const copy = Object.assign({}, user);
    delete copy.password;
    return copy;
  }

  function nextId(prefix, items) {
    const highest = items.reduce(function (max, item) {
      const value = Number(String(item.id).replace(/\D/g, ""));
      return Number.isFinite(value) && value > max ? value : max;
    }, 0);
    return prefix + (highest + 1);
  }

  function currentActor() {
    const session = read(OMS.storage.auth, null);
    if (session && session.user) {
      return { id: session.user.id, name: session.user.name };
    }
    return { id: "USR-SYSTEM", name: "System" };
  }

  function addLog(entry) {
    const actor = currentActor();
    const logs = getLogsRaw();
    const log = {
      id: nextId("LOG-", logs),
      userId: entry.userId || actor.id,
      userName: entry.userName || actor.name,
      action: entry.action,
      type: entry.type || "system",
      severity: entry.severity || "info",
      ip: entry.ip || "10.24.0.1",
      timestamp: new Date().toISOString()
    };
    logs.unshift(log);
    saveLogs(logs.slice(0, 500));
    return log;
  }

  function delay(ms) {
    const wait = ms || randomBetween(240, 430);
    return new Promise(function (resolve) {
      setTimeout(resolve, wait);
    });
  }

  function fail(message) {
    const error = new Error(message);
    error.name = "ApiError";
    return error;
  }

  function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  function dayKey(value) {
    return new Date(value).toISOString().slice(0, 10);
  }

  function priorityRank(priority) {
    return { critical: 0, high: 1, medium: 2, low: 3 }[priority] ?? 4;
  }

  function statusRank(status) {
    return { pending: 0, in_progress: 1, completed: 2, cancelled: 3 }[status] ?? 4;
  }

  const MockService = {
    delay: delay,

    login: function (payload) {
      return delay().then(function () {
        const users = getUsers();
        const email = String(payload.email || "").trim().toLowerCase();
        const user = users.find(function (item) {
          return item.email.toLowerCase() === email;
        });
        if (!user || user.password !== payload.password) {
          throw fail("Invalid email or password. Try one of the demo accounts below.");
        }
        if (user.status !== "active") {
          throw fail("This account is deactivated. Contact an administrator for access.");
        }
        const loggedIn = Object.assign({}, user, { lastLogin: new Date().toISOString() });
        saveUsers(users.map(function (item) {
          return item.id === user.id ? loggedIn : item;
        }));
        addLog({
          userId: user.id,
          userName: user.name,
          type: "auth",
          severity: "success",
          action: "Signed in to the workspace"
        });
        return {
          token: "demo-" + user.id + "-" + Date.now(),
          user: sanitizeUser(loggedIn)
        };
      });
    },

    register: function (payload) {
      return delay().then(function () {
        const users = getUsers();
        const email = String(payload.email || "").trim().toLowerCase();
        if (users.some(function (item) { return item.email.toLowerCase() === email; })) {
          throw fail("An account with this email already exists.");
        }
        const user = {
          id: nextId("USR-", users),
          name: String(payload.name || "").trim(),
          email: email,
          password: payload.password,
          role: "employee",
          status: "active",
          department: "Operations",
          phone: "",
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        users.push(user);
        saveUsers(users);
        addLog({
          userId: user.id,
          userName: user.name,
          type: "user",
          severity: "success",
          action: "Created a new account through self-service registration"
        });
        return {
          token: "demo-" + user.id + "-" + Date.now(),
          user: sanitizeUser(user)
        };
      });
    },

    getTasks: function (params) {
      const options = params || {};
      return delay().then(function () {
        let tasks = getTasksRaw();
        const search = String(options.search || "").trim().toLowerCase();
        if (search) {
          tasks = tasks.filter(function (task) {
            return [task.id, task.title, task.description, task.assignee]
              .join(" ")
              .toLowerCase()
              .includes(search);
          });
        }
        if (options.status && options.status !== "all") {
          tasks = tasks.filter(function (task) { return task.status === options.status; });
        }
        if (options.priority && options.priority !== "all") {
          tasks = tasks.filter(function (task) { return task.priority === options.priority; });
        }
        const sort = options.sort || "createdDate";
        const direction = options.dir === "asc" ? 1 : -1;
        tasks = tasks.slice().sort(function (a, b) {
          let result = 0;
          if (sort === "priority") {
            result = priorityRank(a.priority) - priorityRank(b.priority);
          } else if (sort === "status") {
            result = statusRank(a.status) - statusRank(b.status);
          } else if (sort === "title" || sort === "assignee" || sort === "id") {
            result = String(a[sort]).localeCompare(String(b[sort]), undefined, { numeric: true });
          } else {
            result = new Date(a[sort]).getTime() - new Date(b[sort]).getTime();
          }
          return result * direction;
        });
        const pageSize = Math.max(1, Number(options.pageSize) || 8);
        const total = tasks.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, Number(options.page) || 1), totalPages);
        const start = (page - 1) * pageSize;
        return {
          items: tasks.slice(start, start + pageSize),
          total: total,
          page: page,
          pageSize: pageSize,
          totalPages: totalPages
        };
      });
    },

    createTask: function (payload) {
      return delay().then(function () {
        if (!String(payload.title || "").trim()) throw fail("Task title is required.");
        const tasks = getTasksRaw();
        const users = getUsers();
        const assignee = users.find(function (user) { return user.id === payload.assigneeId; });
        if (!assignee) throw fail("Select a valid assignee.");
        const task = {
          id: nextId("TSK-", tasks),
          title: String(payload.title).trim(),
          description: String(payload.description || "").trim(),
          assigneeId: assignee.id,
          assignee: assignee.name,
          priority: payload.priority || "medium",
          status: payload.status || "pending",
          createdDate: new Date().toISOString(),
          dueDate: payload.dueDate || daysAhead(7),
          completedAt: payload.status === "completed" ? new Date().toISOString() : null
        };
        tasks.unshift(task);
        saveTasks(tasks);
        addLog({
          type: "task",
          severity: "success",
          action: "Created task \"" + task.title + "\""
        });
        return task;
      });
    },

    updateTask: function (id, payload) {
      return delay().then(function () {
        const tasks = getTasksRaw();
        const index = tasks.findIndex(function (task) { return task.id === id; });
        if (index === -1) throw fail("Task not found.");
        const users = getUsers();
        const current = tasks[index];
        const assignee = payload.assigneeId
          ? users.find(function (user) { return user.id === payload.assigneeId; })
          : users.find(function (user) { return user.id === current.assigneeId; });
        if (!assignee) throw fail("Select a valid assignee.");
        const nextStatus = payload.status || current.status;
        const updated = Object.assign({}, current, {
          title: payload.title != null ? String(payload.title).trim() : current.title,
          description: payload.description != null ? String(payload.description).trim() : current.description,
          assigneeId: assignee.id,
          assignee: assignee.name,
          priority: payload.priority || current.priority,
          status: nextStatus,
          dueDate: payload.dueDate || current.dueDate,
          completedAt:
            nextStatus === "completed"
              ? current.completedAt || new Date().toISOString()
              : null
        });
        tasks[index] = updated;
        saveTasks(tasks);
        addLog({
          type: "task",
          severity: nextStatus === "completed" ? "success" : "info",
          action:
            nextStatus === "completed" && current.status !== "completed"
              ? "Completed task \"" + updated.title + "\""
              : "Updated task \"" + updated.title + "\""
        });
        return updated;
      });
    },

    deleteTask: function (id) {
      return delay().then(function () {
        const tasks = getTasksRaw();
        const task = tasks.find(function (item) { return item.id === id; });
        if (!task) throw fail("Task not found.");
        saveTasks(tasks.filter(function (item) { return item.id !== id; }));
        addLog({
          type: "task",
          severity: "warning",
          action: "Deleted task \"" + task.title + "\""
        });
        return { id: id };
      });
    },

    getUsers: function (params) {
      const options = params || {};
      return delay().then(function () {
        let users = getUsers().map(sanitizeUser);
        const search = String(options.search || "").trim().toLowerCase();
        if (search) {
          users = users.filter(function (user) {
            return [user.name, user.email, user.department, user.id]
              .join(" ")
              .toLowerCase()
              .includes(search);
          });
        }
        if (options.role && options.role !== "all") {
          users = users.filter(function (user) { return user.role === options.role; });
        }
        if (options.status && options.status !== "all") {
          users = users.filter(function (user) { return user.status === options.status; });
        }
        users.sort(function (a, b) { return a.name.localeCompare(b.name); });
        const pageSize = Math.max(1, Number(options.pageSize) || 8);
        const total = users.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, Number(options.page) || 1), totalPages);
        const start = (page - 1) * pageSize;
        return {
          items: users.slice(start, start + pageSize),
          total: total,
          page: page,
          pageSize: pageSize,
          totalPages: totalPages
        };
      });
    },

    createUser: function (payload) {
      return delay().then(function () {
        const users = getUsers();
        const email = String(payload.email || "").trim().toLowerCase();
        if (!payload.name || !email) throw fail("Name and email are required.");
        if (users.some(function (user) { return user.email.toLowerCase() === email; })) {
          throw fail("A user with this email already exists.");
        }
        const user = {
          id: nextId("USR-", users),
          name: String(payload.name).trim(),
          email: email,
          password: payload.password || "Password@123",
          role: payload.role || "employee",
          status: payload.status || "active",
          department: payload.department || "Operations",
          phone: payload.phone || "",
          createdAt: new Date().toISOString(),
          lastLogin: null
        };
        users.push(user);
        saveUsers(users);
        addLog({
          type: "user",
          severity: "success",
          action: "Created user account for " + user.name
        });
        return sanitizeUser(user);
      });
    },

    updateUser: function (id, payload) {
      return delay().then(function () {
        const users = getUsers();
        const index = users.findIndex(function (user) { return user.id === id; });
        if (index === -1) throw fail("User not found.");
        const current = users[index];
        const email = payload.email != null ? String(payload.email).trim().toLowerCase() : current.email;
        if (users.some(function (user) { return user.id !== id && user.email.toLowerCase() === email; })) {
          throw fail("A user with this email already exists.");
        }
        const updated = Object.assign({}, current, {
          name: payload.name != null ? String(payload.name).trim() : current.name,
          email: email,
          role: payload.role || current.role,
          status: payload.status || current.status,
          department: payload.department != null ? payload.department : current.department,
          phone: payload.phone != null ? payload.phone : current.phone
        });
        if (payload.password) updated.password = payload.password;
        users[index] = updated;
        saveUsers(users);
        if (current.name !== updated.name) {
          saveTasks(getTasksRaw().map(function (task) {
            return task.assigneeId === id ? Object.assign({}, task, { assignee: updated.name }) : task;
          }));
        }
        addLog({
          type: "user",
          severity: updated.status !== current.status ? "warning" : "info",
          action:
            updated.status !== current.status
              ? (updated.status === "active" ? "Activated" : "Deactivated") + " user account for " + updated.name
              : "Updated user profile for " + updated.name
        });
        return sanitizeUser(updated);
      });
    },

    getLogs: function (params) {
      const options = params || {};
      return delay().then(function () {
        let logs = getLogsRaw();
        const search = String(options.search || "").trim().toLowerCase();
        if (search) {
          logs = logs.filter(function (log) {
            return [log.userName, log.action, log.ip, log.id, log.type]
              .join(" ")
              .toLowerCase()
              .includes(search);
          });
        }
        if (options.severity && options.severity !== "all") {
          logs = logs.filter(function (log) { return log.severity === options.severity; });
        }
        if (options.type && options.type !== "all") {
          logs = logs.filter(function (log) { return log.type === options.type; });
        }
        logs.sort(function (a, b) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        const pageSize = Math.max(1, Number(options.pageSize) || 10);
        const total = logs.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, Number(options.page) || 1), totalPages);
        const start = (page - 1) * pageSize;
        return {
          items: logs.slice(start, start + pageSize),
          total: total,
          page: page,
          pageSize: pageSize,
          totalPages: totalPages
        };
      });
    },

    getDashboard: function () {
      return delay().then(function () {
        const users = getUsers();
        const tasks = getTasksRaw();
        const logs = getLogsRaw().slice().sort(function (a, b) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        const activeUsers = users.filter(function (user) { return user.status === "active"; }).length;
        const completedTasks = tasks.filter(function (task) { return task.status === "completed"; }).length;
        const pendingTasks = tasks.filter(function (task) { return task.status === "pending"; }).length;
        const failedOperations = logs.filter(function (log) { return log.severity === "critical"; }).length;

        const activity = [];
        for (let offset = 13; offset >= 0; offset -= 1) {
          const dayStart = startOfDay(now - offset * DAY);
          const dayEnd = dayStart + DAY;
          const label = new Date(dayStart).toLocaleDateString(undefined, { month: "short", day: "numeric" });
          activity.push({
            label: label,
            created: tasks.filter(function (task) {
              const time = new Date(task.createdDate).getTime();
              return time >= dayStart && time < dayEnd;
            }).length,
            completed: tasks.filter(function (task) {
              if (!task.completedAt) return false;
              const time = new Date(task.completedAt).getTime();
              return time >= dayStart && time < dayEnd;
            }).length
          });
        }

        const userActivity = [];
        for (let offset = 6; offset >= 0; offset -= 1) {
          const dayStart = startOfDay(now - offset * DAY);
          const dayEnd = dayStart + DAY;
          const unique = new Set(
            logs.filter(function (log) {
              const time = new Date(log.timestamp).getTime();
              return time >= dayStart && time < dayEnd;
            }).map(function (log) { return log.userId; })
          );
          userActivity.push({
            label: new Date(dayStart).toLocaleDateString(undefined, { weekday: "short" }),
            active: unique.size
          });
        }

        const distribution = [
          { key: "pending", label: "Pending", color: "#F59E0B", value: 0 },
          { key: "in_progress", label: "In Progress", color: "#6366F1", value: 0 },
          { key: "completed", label: "Completed", color: "#10B981", value: 0 },
          { key: "cancelled", label: "Cancelled", color: "#64748B", value: 0 }
        ];
        tasks.forEach(function (task) {
          const bucket = distribution.find(function (item) { return item.key === task.status; });
          if (bucket) bucket.value += 1;
        });

        return {
          simulated: true,
          stats: {
            totalUsers: users.length,
            activeUsers: activeUsers,
            totalTasks: tasks.length,
            completedTasks: completedTasks,
            pendingTasks: pendingTasks,
            failedOperations: failedOperations
          },
          taskActivity: activity,
          userActivity: userActivity,
          statusDistribution: distribution,
          recentLogs: logs.slice(0, 5),
          recentTasks: tasks.slice().sort(function (a, b) {
            return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
          }).slice(0, 5),
          systemStatus: {
            api: "operational",
            database: "operational",
            backgroundJobs: "operational",
            cpu: randomBetween(34, 52),
            memory: randomBetween(54, 73),
            uptime: "99.98%"
          }
        };
      });
    },

    getHealth: function () {
      return delay().then(function () {
        const requestsSeries = [];
        for (let index = 0; index < 12; index += 1) {
          requestsSeries.push({
            label: String((index + 1) * 2) + "h",
            value: randomBetween(980, 1620)
          });
        }
        const responseSeries = [];
        for (let index = 0; index < 12; index += 1) {
          responseSeries.push({
            label: String((index + 1) * 2) + "h",
            value: randomBetween(112, 196)
          });
        }
        return {
          simulated: true,
          status: "operational",
          updatedAt: new Date().toISOString(),
          services: [
            { name: "API Gateway", detail: "FastAPI application", status: "operational", latency: randomBetween(118, 176) },
            { name: "PostgreSQL", detail: "Primary database", status: "operational", latency: randomBetween(22, 48) },
            { name: "Task Queue", detail: "Background workers", status: "operational", latency: randomBetween(14, 32) }
          ],
          metrics: {
            cpu: randomBetween(32, 56),
            memory: randomBetween(52, 74),
            requests: randomBetween(17800, 19400),
            errorRate: randomBetween(0.18, 0.52, 2),
            responseTime: randomBetween(126, 172),
            uptime: "99.98%"
          },
          requestsSeries: requestsSeries,
          responseSeries: responseSeries,
          checks: [
            { name: "Authentication service", value: "Healthy", detail: "Last check 12s ago" },
            { name: "Database replication", value: "Healthy", detail: "Lag 0.4s" },
            { name: "Object storage", value: "Healthy", detail: "Last check 18s ago" },
            { name: "Email delivery", value: "Degraded", detail: "Retry queue elevated" },
            { name: "Scheduled jobs", value: "Healthy", detail: "42 of 42 completed" }
          ]
        };
      });
    },

    reset: function () {
      localStorage.removeItem(OMS.storage.mockUsers);
      localStorage.removeItem(OMS.storage.mockTasks);
      localStorage.removeItem(OMS.storage.mockLogs);
      ensureSeeded();
      return { reset: true };
    }
  };

  ensureSeeded();

  global.MockService = MockService;
  global.MockDB = {
    reset: MockService.reset,
    key: function (value) { return dayKey(value); },
    priorityRank: priorityRank,
    statusRank: statusRank
  };
})(window);
