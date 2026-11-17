(function (global) {
  "use strict";

  const state = {
    search: "",
    status: "all",
    priority: "all",
    sort: "createdDate",
    dir: "desc",
    page: 1,
    pageSize: 8,
    users: [],
    items: [],
    hasLoaded: false,
    requestId: 0
  };

  let els = {};

  function init() {
    if (!Auth.isAuthenticated()) return;
    UI.initLayout({
      active: "tasks",
      title: "Tasks",
      subtitle: "Plan, assign and track operations work."
    });
    cacheElements();
    bindEvents();
    updateSortIndicators();
    loadTasks().then(function () {
      if (UI.getQueryParam("new") === "1") openTaskModal(null);
    });
  }

  function cacheElements() {
    els.card = document.querySelector(".table-card");
    els.search = document.getElementById("task-search");
    els.status = document.getElementById("filter-status");
    els.priority = document.getElementById("filter-priority");
    els.reset = document.getElementById("reset-filters");
    els.newTask = document.getElementById("new-task");
    els.loading = document.getElementById("tasks-loading");
    els.tableWrap = document.getElementById("tasks-table-wrap");
    els.tbody = document.getElementById("tasks-tbody");
    els.empty = document.getElementById("tasks-empty");
    els.emptyTitle = document.getElementById("tasks-empty-title");
    els.emptyText = document.getElementById("tasks-empty-text");
    els.emptyAction = document.getElementById("tasks-empty-action");
    els.footer = document.getElementById("tasks-footer");
    els.summary = document.getElementById("tasks-summary");
    els.pagination = document.getElementById("tasks-pagination");
  }

  function bindEvents() {
    els.search.addEventListener(
      "input",
      UI.debounce(function () {
        state.search = els.search.value;
        state.page = 1;
        loadTasks();
      }, 300)
    );

    els.status.addEventListener("change", function () {
      state.status = els.status.value;
      state.page = 1;
      loadTasks();
    });

    els.priority.addEventListener("change", function () {
      state.priority = els.priority.value;
      state.page = 1;
      loadTasks();
    });

    els.reset.addEventListener("click", resetFilters);
    els.newTask.addEventListener("click", function () { openTaskModal(null); });

    document.querySelectorAll(".sort-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        const key = button.getAttribute("data-sort");
        if (state.sort === key) {
          state.dir = state.dir === "asc" ? "desc" : "asc";
        } else {
          state.sort = key;
          state.dir = key === "title" || key === "assignee" ? "asc" : "desc";
        }
        state.page = 1;
        updateSortIndicators();
        loadTasks();
      });
    });

    els.tbody.addEventListener("click", function (event) {
      const edit = event.target.closest("[data-edit-task]");
      if (edit) {
        const task = state.items.find(function (item) { return item.id === edit.getAttribute("data-edit-task"); });
        if (task) openTaskModal(task);
        return;
      }
      const remove = event.target.closest("[data-delete-task]");
      if (remove) {
        const task = state.items.find(function (item) { return item.id === remove.getAttribute("data-delete-task"); });
        if (task) deleteTask(task);
      }
    });

    els.emptyAction.addEventListener("click", function () {
      const mode = els.emptyAction.dataset.mode;
      if (mode === "retry") {
        loadTasks();
      } else if (mode === "create") {
        openTaskModal(null);
      } else {
        resetFilters();
      }
    });
  }

  function resetFilters() {
    state.search = "";
    state.status = "all";
    state.priority = "all";
    state.page = 1;
    els.search.value = "";
    els.status.value = "all";
    els.priority.value = "all";
    loadTasks();
  }

  function hasFilters() {
    return Boolean(state.search.trim()) || state.status !== "all" || state.priority !== "all";
  }

  function updateSortIndicators() {
    const labels = {
      title: "Task",
      assignee: "Assignee",
      priority: "Priority",
      status: "Status",
      dueDate: "Due date",
      createdDate: "Created"
    };
    document.querySelectorAll(".sort-btn").forEach(function (button) {
      const key = button.getAttribute("data-sort");
      const active = state.sort === key;
      const th = button.closest("th");
      if (th) th.setAttribute("aria-sort", active ? (state.dir === "asc" ? "ascending" : "descending") : "none");
      const iconName = active ? (state.dir === "asc" ? "arrow-up" : "arrow-down") : "chevrons-up-down";
      button.innerHTML =
        "<span>" + labels[key] + "</span>" + UI.icon(iconName, "icon sort-icon" + (active ? " is-active" : ""));
    });
    UI.icons();
  }

  async function loadTasks() {
    const requestId = ++state.requestId;
    setLoading(true);
    try {
      const params = {
        search: state.search,
        status: state.status,
        priority: state.priority,
        sort: state.sort,
        dir: state.dir,
        page: state.page,
        pageSize: state.pageSize
      };
      const tasksPromise = Api.tasks.list(params);
      const usersPromise = state.users.length
        ? Promise.resolve({ items: state.users })
        : Api.users.list({ pageSize: 100 });
      const results = await Promise.all([tasksPromise, usersPromise]);
      if (requestId !== state.requestId) return;
      const result = results[0];
      state.users = results[1].items || state.users;
      state.items = result.items;
      state.page = result.page;
      state.hasLoaded = true;
      renderTasks(result);
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

  function renderTasks(result) {
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
        "Showing " + start + "–" + end + " of " + result.total + " task" + (result.total === 1 ? "" : "s");
      UI.renderPagination(els.pagination, {
        page: result.page,
        totalPages: result.totalPages,
        onChange: function (page) {
          state.page = page;
          loadTasks();
          els.card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } else {
      els.empty.hidden = false;
      const filtered = hasFilters();
      els.emptyTitle.textContent = filtered ? "No tasks match your filters" : "No tasks yet";
      els.emptyText.textContent = filtered
        ? "Try a different search term or clear the active filters."
        : "Create the first task to start tracking operations work.";
      els.emptyAction.textContent = filtered ? "Clear filters" : "Create task";
      els.emptyAction.dataset.mode = filtered ? "clear" : "create";
    }
    UI.icons();
  }

  function renderError(error) {
    state.hasLoaded = true;
    els.tableWrap.hidden = true;
    els.footer.hidden = true;
    els.empty.hidden = false;
    els.emptyTitle.textContent = "Unable to load tasks";
    els.emptyText.textContent = error.message || "Something went wrong while loading tasks.";
    els.emptyAction.textContent = "Try again";
    els.emptyAction.dataset.mode = "retry";
    UI.icons();
    UI.toast(error.message || "Unable to load tasks.", "error", "Request failed");
  }

  function renderRow(task) {
    const overdue =
      task.dueDate &&
      task.status !== "completed" &&
      task.status !== "cancelled" &&
      new Date(task.dueDate).getTime() < Date.now();
    return (
      "<tr>" +
      '<td class="primary"><strong>' + UI.escapeHtml(task.title) + "</strong>" +
      '<span class="cell-sub mono">' + UI.escapeHtml(task.id) + "</span></td>" +
      '<td><div class="user-cell">' +
      UI.avatar(task.assignee, task.assigneeId, "sm") +
      '<span class="user-cell-text"><strong>' + UI.escapeHtml(task.assignee) + "</strong></span></div></td>" +
      "<td>" + UI.priorityBadge(task.priority) + "</td>" +
      "<td>" + UI.statusBadge(task.status) + "</td>" +
      '<td class="hide-md cell-nowrap' + (overdue ? " text-danger" : "") + '">' +
      UI.formatDate(task.dueDate) +
      (overdue ? '<span class="cell-sub text-danger">Overdue</span>' : "") +
      "</td>" +
      '<td class="hide-sm cell-nowrap text-muted">' + UI.formatDate(task.createdDate) + "</td>" +
      '<td class="table-actions-col"><div class="row-actions">' +
      '<button class="icon-btn sm" type="button" data-edit-task="' + UI.escapeHtml(task.id) +
      '" aria-label="Edit ' + UI.escapeHtml(task.title) + '" title="Edit task">' + UI.icon("pencil") + "</button>" +
      '<button class="icon-btn sm danger" type="button" data-delete-task="' + UI.escapeHtml(task.id) +
      '" aria-label="Delete ' + UI.escapeHtml(task.title) + '" title="Delete task">' + UI.icon("trash-2") + "</button>" +
      "</div></td></tr>"
    );
  }

  function dateInputValue(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function defaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return dateInputValue(date.toISOString());
  }

  function optionList(values, selected, labelMap) {
    return values
      .map(function (value) {
        return (
          '<option value="' + value + '"' + (value === selected ? " selected" : "") + ">" +
          UI.escapeHtml(labelMap[value] || value) + "</option>"
        );
      })
      .join("");
  }

  function assigneeOptions(selectedId) {
    return state.users
      .map(function (user) {
        const role = (UI.ROLE_META[user.role] || {}).label || user.role;
        return (
          '<option value="' + UI.escapeHtml(user.id) + '"' + (user.id === selectedId ? " selected" : "") + ">" +
          UI.escapeHtml(user.name) + " · " + UI.escapeHtml(role) +
          (user.status === "inactive" ? " (inactive)" : "") + "</option>"
        );
      })
      .join("");
  }

  async function openTaskModal(task) {
    if (!state.users.length) {
      try {
        const result = await Api.users.list({ pageSize: 100 });
        state.users = result.items;
      } catch (error) {
        UI.toast("Unable to load assignees.", "error", "Request failed");
        return;
      }
    }
    if (!state.users.length) {
      UI.toast("Create a user before assigning tasks.", "warning", "No assignees");
      return;
    }

    const editing = Boolean(task);
    const currentUser = Auth.getUser();
    const selectedAssignee = task ? task.assigneeId : (currentUser && currentUser.id) || state.users[0].id;
    const priorityLabels = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
    const statusLabels = { pending: "Pending", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

    const form = document.createElement("form");
    form.id = "task-form";
    form.className = "form-grid";
    form.noValidate = true;
    form.innerHTML =
      '<div class="form-group span-2">' +
      '<label class="form-label" for="task-title">Title</label>' +
      '<input class="input" type="text" id="task-title" name="title" maxlength="120" required ' +
      'placeholder="e.g. Review weekly operations report" value="' + UI.escapeHtml(task ? task.title : "") + '">' +
      '<p class="form-error" id="task-title-error" aria-live="polite"></p>' +
      "</div>" +
      '<div class="form-group span-2">' +
      '<label class="form-label" for="task-description">Description <span class="optional">Optional</span></label>' +
      '<textarea class="textarea" id="task-description" name="description" maxlength="600" ' +
      'placeholder="Add context, scope or acceptance criteria">' + UI.escapeHtml(task ? task.description : "") + "</textarea>" +
      "</div>" +
      '<div class="form-group">' +
      '<label class="form-label" for="task-assignee">Assignee</label>' +
      '<select class="select" id="task-assignee" name="assignee" required>' + assigneeOptions(selectedAssignee) + "</select>" +
      '<p class="form-error" id="task-assignee-error" aria-live="polite"></p>' +
      "</div>" +
      '<div class="form-group">' +
      '<label class="form-label" for="task-due-date">Due date</label>' +
      '<input class="input" type="date" id="task-due-date" name="dueDate" required value="' +
      UI.escapeHtml(task ? dateInputValue(task.dueDate) : defaultDueDate()) + '">' +
      '<p class="form-error" id="task-due-date-error" aria-live="polite"></p>' +
      "</div>" +
      '<div class="form-group">' +
      '<label class="form-label" for="task-priority">Priority</label>' +
      '<select class="select" id="task-priority" name="priority">' +
      optionList(["low", "medium", "high", "critical"], task ? task.priority : "medium", priorityLabels) +
      "</select></div>" +
      '<div class="form-group">' +
      '<label class="form-label" for="task-status">Status</label>' +
      '<select class="select" id="task-status" name="status">' +
      optionList(["pending", "in_progress", "completed", "cancelled"], task ? task.status : "pending", statusLabels) +
      "</select></div>";

    const modal = UI.openModal({
      title: editing ? "Edit task" : "Create task",
      subtitle: editing ? task.id + " · Changes are stored in local demo data." : "Add a new work item to the operations board.",
      icon: editing ? "pencil" : "plus",
      size: "lg",
      body: form,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<button type="submit" class="btn btn-primary" id="task-save" form="task-form">' +
        '<span class="btn-label">' + (editing ? "Save changes" : "Create task") + "</span></button>"
    });

    const saveButton = modal.element.querySelector("#task-save");
    const titleInput = form.querySelector("#task-title");
    const assigneeInput = form.querySelector("#task-assignee");
    const dueInput = form.querySelector("#task-due-date");

    function clearErrors() {
      [titleInput, assigneeInput, dueInput].forEach(function (input) {
        input.removeAttribute("aria-invalid");
      });
      form.querySelectorAll(".form-error").forEach(function (error) { error.textContent = ""; });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors();
      let valid = true;
      if (!titleInput.value.trim()) {
        titleInput.setAttribute("aria-invalid", "true");
        form.querySelector("#task-title-error").textContent = "Title is required.";
        valid = false;
      }
      if (!assigneeInput.value) {
        assigneeInput.setAttribute("aria-invalid", "true");
        form.querySelector("#task-assignee-error").textContent = "Select an assignee.";
        valid = false;
      }
      if (!dueInput.value) {
        dueInput.setAttribute("aria-invalid", "true");
        form.querySelector("#task-due-date-error").textContent = "Choose a due date.";
        valid = false;
      }
      if (!valid) {
        if (!titleInput.value.trim()) titleInput.focus();
        return;
      }

      const payload = {
        title: titleInput.value.trim(),
        description: form.querySelector("#task-description").value.trim(),
        assigneeId: assigneeInput.value,
        priority: form.querySelector("#task-priority").value,
        status: form.querySelector("#task-status").value,
        dueDate: new Date(dueInput.value + "T17:00:00").toISOString()
      };

      UI.setButtonLoading(saveButton, true);
      const request = editing ? Api.tasks.update(task.id, payload) : Api.tasks.create(payload);
      request
        .then(function () {
          modal.close();
          UI.toast(editing ? "Task updated successfully." : "Task created successfully.", "success",
            editing ? "Task updated" : "Task created");
          loadTasks();
        })
        .catch(function (error) {
          UI.setButtonLoading(saveButton, false);
          UI.toast(error.message || "Unable to save the task.", "error", "Save failed");
        });
    });
  }

  async function deleteTask(task) {
    const confirmed = await UI.confirm({
      title: "Delete task?",
      subtitle: task.id,
      message: "“" + task.title + "” will be permanently removed from the local demo data. This cannot be undone.",
      confirmText: "Delete task",
      cancelText: "Keep task"
    });
    if (!confirmed) return;
    try {
      await Api.tasks.remove(task.id);
      if (state.items.length === 1 && state.page > 1) state.page -= 1;
      UI.toast("Task deleted.", "success", "Task removed");
      loadTasks();
    } catch (error) {
      UI.toast(error.message || "Unable to delete the task.", "error", "Delete failed");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
