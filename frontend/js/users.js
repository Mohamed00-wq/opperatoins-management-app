(function (global) {
  "use strict";

  const state = {
    search: "",
    role: "all",
    status: "all",
    page: 1,
    pageSize: 8,
    items: [],
    hasLoaded: false,
    requestId: 0
  };

  let els = {};

  function init() {
    if (!Auth.isAuthenticated()) return;
    UI.initLayout({
      active: "users",
      title: "Users",
      subtitle: "Manage roles, access and account status."
    });
    cacheElements();
    bindEvents();
    loadUsers().then(function () {
      if (UI.getQueryParam("new") === "1") openUserModal(null);
    });
  }

  function cacheElements() {
    els.card = document.querySelector(".table-card");
    els.search = document.getElementById("user-search");
    els.role = document.getElementById("filter-role");
    els.status = document.getElementById("filter-user-status");
    els.reset = document.getElementById("reset-user-filters");
    els.newUser = document.getElementById("new-user");
    els.loading = document.getElementById("users-loading");
    els.tableWrap = document.getElementById("users-table-wrap");
    els.tbody = document.getElementById("users-tbody");
    els.empty = document.getElementById("users-empty");
    els.emptyTitle = document.getElementById("users-empty-title");
    els.emptyText = document.getElementById("users-empty-text");
    els.emptyAction = document.getElementById("users-empty-action");
    els.footer = document.getElementById("users-footer");
    els.summary = document.getElementById("users-summary");
    els.pagination = document.getElementById("users-pagination");
  }

  function bindEvents() {
    els.search.addEventListener(
      "input",
      UI.debounce(function () {
        state.search = els.search.value;
        state.page = 1;
        loadUsers();
      }, 300)
    );

    els.role.addEventListener("change", function () {
      state.role = els.role.value;
      state.page = 1;
      loadUsers();
    });

    els.status.addEventListener("change", function () {
      state.status = els.status.value;
      state.page = 1;
      loadUsers();
    });

    els.reset.addEventListener("click", resetFilters);
    els.newUser.addEventListener("click", function () { openUserModal(null); });

    els.tbody.addEventListener("click", function (event) {
      const view = event.target.closest("[data-view-user]");
      if (view) {
        const user = findUser(view.getAttribute("data-view-user"));
        if (user) openUserDetails(user);
        return;
      }
      const edit = event.target.closest("[data-edit-user]");
      if (edit) {
        const user = findUser(edit.getAttribute("data-edit-user"));
        if (user) openUserModal(user);
        return;
      }
      const toggle = event.target.closest("[data-toggle-user]");
      if (toggle) {
        const user = findUser(toggle.getAttribute("data-toggle-user"));
        if (user) toggleUserStatus(user);
      }
    });

    els.emptyAction.addEventListener("click", function () {
      const mode = els.emptyAction.dataset.mode;
      if (mode === "retry") loadUsers();
      else if (mode === "create") openUserModal(null);
      else resetFilters();
    });
  }

  function findUser(id) {
    return state.items.find(function (user) { return user.id === id; });
  }

  function resetFilters() {
    state.search = "";
    state.role = "all";
    state.status = "all";
    state.page = 1;
    els.search.value = "";
    els.role.value = "all";
    els.status.value = "all";
    loadUsers();
  }

  function hasFilters() {
    return Boolean(state.search.trim()) || state.role !== "all" || state.status !== "all";
  }

  async function loadUsers() {
    const requestId = ++state.requestId;
    setLoading(true);
    try {
      const result = await Api.users.list({
        search: state.search,
        role: state.role,
        status: state.status,
        page: state.page,
        pageSize: state.pageSize
      });
      if (requestId !== state.requestId) return;
      state.items = result.items;
      state.page = result.page;
      state.hasLoaded = true;
      renderUsers(result);
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

  function renderUsers(result) {
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
        "Showing " + start + "–" + end + " of " + result.total + " user" + (result.total === 1 ? "" : "s");
      UI.renderPagination(els.pagination, {
        page: result.page,
        totalPages: result.totalPages,
        onChange: function (page) {
          state.page = page;
          loadUsers();
          els.card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    } else {
      els.empty.hidden = false;
      const filtered = hasFilters();
      els.emptyTitle.textContent = filtered ? "No users match your filters" : "No users yet";
      els.emptyText.textContent = filtered
        ? "Try a different search term or clear the active filters."
        : "Create the first user account to get started.";
      els.emptyAction.textContent = filtered ? "Clear filters" : "Create user";
      els.emptyAction.dataset.mode = filtered ? "clear" : "create";
    }
    UI.icons();
  }

  function renderError(error) {
    state.hasLoaded = true;
    els.tableWrap.hidden = true;
    els.footer.hidden = true;
    els.empty.hidden = false;
    els.emptyTitle.textContent = "Unable to load users";
    els.emptyText.textContent = error.message || "Something went wrong while loading users.";
    els.emptyAction.textContent = "Try again";
    els.emptyAction.dataset.mode = "retry";
    UI.icons();
    UI.toast(error.message || "Unable to load users.", "error", "Request failed");
  }

  function renderRow(user) {
    const toggleLabel = user.status === "active" ? "Deactivate" : "Activate";
    const toggleIcon = user.status === "active" ? "user-x" : "user-check";
    return (
      "<tr>" +
      '<td class="primary"><div class="user-cell">' +
      UI.avatar(user.name, user.id, "sm") +
      '<span class="user-cell-text"><strong>' + UI.escapeHtml(user.name) + "</strong><span>" +
      UI.escapeHtml(user.email) + "</span></span></div></td>" +
      "<td>" + UI.roleBadge(user.role) + "</td>" +
      "<td>" + UI.userStatusBadge(user.status) + "</td>" +
      '<td class="hide-md">' + UI.escapeHtml(user.department || "—") + "</td>" +
      '<td class="hide-sm cell-nowrap">' +
      (user.lastLogin ? UI.timeAgo(user.lastLogin) : "Never") +
      "</td>" +
      '<td class="table-actions-col"><div class="row-actions">' +
      '<button class="icon-btn sm" type="button" data-view-user="' + UI.escapeHtml(user.id) +
      '" aria-label="View ' + UI.escapeHtml(user.name) + '" title="View details">' + UI.icon("eye") + "</button>" +
      '<button class="icon-btn sm" type="button" data-edit-user="' + UI.escapeHtml(user.id) +
      '" aria-label="Edit ' + UI.escapeHtml(user.name) + '" title="Edit user">' + UI.icon("pencil") + "</button>" +
      '<button class="icon-btn sm" type="button" data-toggle-user="' + UI.escapeHtml(user.id) +
      '" aria-label="' + toggleLabel + " " + UI.escapeHtml(user.name) + '" title="' + toggleLabel + '">' +
      UI.icon(toggleIcon) + "</button>" +
      "</div></td></tr>"
    );
  }

  function openUserDetails(user) {
    const body = document.createElement("div");
    body.innerHTML =
      '<div class="settings-profile-head">' +
      UI.avatar(user.name, user.id, "lg") +
      "<div><h3>" + UI.escapeHtml(user.name) + "</h3><p>" + UI.escapeHtml(user.email) + "</p></div>" +
      "</div>" +
      '<dl class="detail-list">' +
      detail("User ID", '<span class="mono">' + UI.escapeHtml(user.id) + "</span>") +
      detail("Role", UI.roleBadge(user.role)) +
      detail("Account status", UI.userStatusBadge(user.status)) +
      detail("Department", UI.escapeHtml(user.department || "—")) +
      detail("Phone", UI.escapeHtml(user.phone || "—")) +
      detail("Created", UI.formatDate(user.createdAt)) +
      detail("Last login", user.lastLogin ? UI.formatDateTime(user.lastLogin) : "Never") +
      "</dl>";

    const modal = UI.openModal({
      title: "User details",
      subtitle: "Profile and access information",
      icon: "user",
      body: body,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Close</button>' +
        '<button type="button" class="btn btn-primary" id="view-user-edit">' +
        '<i data-lucide="pencil" class="icon"></i> Edit user</button>'
    });

    modal.element.querySelector("#view-user-edit").addEventListener("click", function () {
      modal.close();
      setTimeout(function () { openUserModal(user); }, 200);
    });
  }

  function detail(label, value) {
    return '<div class="detail-row"><dt>' + label + "</dt><dd>" + value + "</dd></div>";
  }

  function openUserModal(user) {
    const editing = Boolean(user);
    const currentUser = Auth.getUser();
    const roleLabels = { administrator: "Administrator", manager: "Manager", employee: "Employee" };
    const statusLabels = { active: "Active", inactive: "Inactive" };

    const form = document.createElement("form");
    form.id = "user-form";
    form.className = "form-grid";
    form.noValidate = true;
    form.innerHTML =
      '<div class="form-group">' +
      '<label class="form-label" for="user-name">Full name</label>' +
      '<input class="input" type="text" id="user-name" name="name" autocomplete="off" required value="' +
      UI.escapeHtml(user ? user.name : "") + '" placeholder="Alex Morgan">' +
      '<p class="form-error" id="user-name-error" aria-live="polite"></p>' +
      "</div>" +
      '<div class="form-group">' +
      '<label class="form-label" for="user-email">Email</label>' +
      '<input class="input" type="email" id="user-email" name="email" autocomplete="off" required value="' +
      UI.escapeHtml(user ? user.email : "") + '" placeholder="alex@company.com">' +
      '<p class="form-error" id="user-email-error" aria-live="polite"></p>' +
      "</div>" +
      '<div class="form-group">' +
      '<label class="form-label" for="user-role">Role</label>' +
      '<select class="select" id="user-role" name="role">' +
      optionList(["administrator", "manager", "employee"], user ? user.role : "employee", roleLabels) +
      "</select></div>" +
      '<div class="form-group">' +
      '<label class="form-label" for="user-department">Department</label>' +
      '<input class="input" type="text" id="user-department" name="department" value="' +
      UI.escapeHtml(user ? user.department : "Operations") + '" placeholder="Operations">' +
      "</div>" +
      '<div class="form-group">' +
      '<label class="form-label" for="user-phone">Phone <span class="optional">Optional</span></label>' +
      '<input class="input" type="tel" id="user-phone" name="phone" value="' +
      UI.escapeHtml(user ? user.phone : "") + '" placeholder="+1 (555) 000-0000">' +
      "</div>" +
      '<div class="form-group">' +
      '<label class="form-label" for="user-status">Account status</label>' +
      '<select class="select" id="user-status" name="status">' +
      optionList(["active", "inactive"], user ? user.status : "active", statusLabels) +
      "</select></div>" +
      '<div class="form-group span-2">' +
      '<label class="form-label" for="user-password">Password <span class="optional">Optional</span></label>' +
      '<div class="password-field">' +
      '<input class="input" type="password" id="user-password" name="password" autocomplete="new-password" ' +
      'placeholder="' + (editing ? "Leave blank to keep the current password" : "Leave blank to use the demo default") + '">' +
      '<button class="password-toggle" type="button" data-password-toggle="user-password" aria-label="Show password" aria-pressed="false">' +
      UI.icon("eye") + "</button></div>" +
      '<p class="form-hint">Demo passwords are stored in your browser only. Never enter a real password.</p>' +
      '<p class="form-error" id="user-password-error" aria-live="polite"></p>' +
      "</div>";

    const modal = UI.openModal({
      title: editing ? "Edit user" : "Create user",
      subtitle: editing ? user.id + " · Changes are stored in local demo data." : "Add a new member to the workspace.",
      icon: editing ? "user-cog" : "user-plus",
      size: "lg",
      body: form,
      footer:
        '<button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>' +
        '<button type="submit" class="btn btn-primary" id="user-save" form="user-form">' +
        '<span class="btn-label">' + (editing ? "Save changes" : "Create user") + "</span></button>"
    });

    UI.bindPasswordToggles(modal.element);
    UI.icons();

    const saveButton = modal.element.querySelector("#user-save");
    const nameInput = form.querySelector("#user-name");
    const emailInput = form.querySelector("#user-email");
    const passwordInput = form.querySelector("#user-password");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      form.querySelectorAll(".form-error").forEach(function (error) { error.textContent = ""; });
      [nameInput, emailInput, passwordInput].forEach(function (input) { input.removeAttribute("aria-invalid"); });

      let valid = true;
      if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
        nameInput.setAttribute("aria-invalid", "true");
        form.querySelector("#user-name-error").textContent = "Enter the user's full name.";
        valid = false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
        emailInput.setAttribute("aria-invalid", "true");
        form.querySelector("#user-email-error").textContent = "Enter a valid email address.";
        valid = false;
      }
      if (passwordInput.value && passwordInput.value.length < 8) {
        passwordInput.setAttribute("aria-invalid", "true");
        form.querySelector("#user-password-error").textContent = "Use at least 8 characters.";
        valid = false;
      }
      const nextStatus = form.querySelector("#user-status").value;
      if (editing && currentUser && user.id === currentUser.id && nextStatus !== "active") {
        form.querySelector("#user-status").setAttribute("aria-invalid", "true");
        UI.toast("You cannot deactivate your own account.", "warning", "Action blocked");
        valid = false;
      }
      if (!valid) {
        if (!nameInput.value.trim()) nameInput.focus();
        return;
      }

      const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        role: form.querySelector("#user-role").value,
        department: form.querySelector("#user-department").value.trim(),
        phone: form.querySelector("#user-phone").value.trim(),
        status: nextStatus
      };
      if (passwordInput.value) payload.password = passwordInput.value;

      UI.setButtonLoading(saveButton, true);
      const request = editing ? Api.users.update(user.id, payload) : Api.users.create(payload);
      request
        .then(function (saved) {
          modal.close();
          UI.toast(editing ? "User updated successfully." : "User created successfully.", "success",
            editing ? "User updated" : "User created");
          if (currentUser && saved.id === currentUser.id) {
            Auth.updateProfile(saved);
            UI.initLayout({
              active: "users",
              title: "Users",
              subtitle: "Manage roles, access and account status."
            });
          }
          loadUsers();
        })
        .catch(function (error) {
          UI.setButtonLoading(saveButton, false);
          UI.toast(error.message || "Unable to save the user.", "error", "Save failed");
        });
    });
  }

  function optionList(values, selected, labels) {
    return values
      .map(function (value) {
        return (
          '<option value="' + value + '"' + (value === selected ? " selected" : "") + ">" +
          UI.escapeHtml(labels[value] || value) + "</option>"
        );
      })
      .join("");
  }

  async function toggleUserStatus(user) {
    const currentUser = Auth.getUser();
    if (currentUser && user.id === currentUser.id) {
      UI.toast("You cannot change the status of your own account.", "warning", "Action blocked");
      return;
    }
    const deactivating = user.status === "active";
    if (deactivating) {
      const confirmed = await UI.confirm({
        title: "Deactivate user?",
        message: user.name + " will lose access to the workspace. You can reactivate the account at any time.",
        confirmText: "Deactivate",
        cancelText: "Cancel"
      });
      if (!confirmed) return;
    }
    try {
      await Api.users.update(user.id, { status: deactivating ? "inactive" : "active" });
      UI.toast(
        user.name + (deactivating ? " has been deactivated." : " has been activated."),
        "success",
        deactivating ? "User deactivated" : "User activated"
      );
      loadUsers();
    } catch (error) {
      UI.toast(error.message || "Unable to update the account.", "error", "Update failed");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
