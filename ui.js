const makeCell = (value) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    return cell;
};

function makeEmptyRow(message, columns) {
    const row = document.createElement("tr");
    const cell = makeCell(message);
    cell.colSpan = columns;
    cell.className = "empty-state";
    row.append(cell);
    return row;
}

export function getVisibleUsers(users, settings) {
    const query = settings.search.trim().toLowerCase();
    const filtered = users.filter((user) =>
        (!settings.roleFilter || user.role === settings.roleFilter) &&
        (!query || Object.values(user).some((value) => String(value).toLowerCase().includes(query)))
    );
    const { sortKey, sortDirection } = settings;
    if (sortKey) {
        filtered.sort((first, second) =>
            String(first[sortKey]).localeCompare(String(second[sortKey]), undefined, { sensitivity: "base" }) * sortDirection
        );
    }
    return filtered;
}

export function renderDashboard(state) {
    const visibleUsers = getVisibleUsers(state.users, state.settings);
    const userBody = document.getElementById("userTableBody");
    userBody.replaceChildren();
    if (!state.users.length) {
        userBody.append(makeEmptyRow("No users yet. Add a user to get started.", 7));
    } else if (!visibleUsers.length) {
        userBody.append(makeEmptyRow("No users match your search or role filter.", 7));
    } else {
        visibleUsers.forEach((user) => {
            const row = document.createElement("tr");
            const selectCell = document.createElement("td");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "row-select";
            checkbox.value = user.id;
            checkbox.setAttribute("aria-label", `Select ${user.name}`);
            selectCell.append(checkbox);
            const statusCell = makeCell("");
            const badge = document.createElement("span");
            badge.className = `status ${user.status === "Active" ? "active-status" : "inactive-status"}`;
            badge.textContent = user.status;
            statusCell.append(badge);
            const actionCell = document.createElement("td");
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "row-edit";
            editButton.dataset.editUser = user.id;
            editButton.setAttribute("aria-label", `Edit ${user.name}`);
            editButton.textContent = "✎";
            actionCell.append(editButton);
            row.append(selectCell, makeCell(user.id), makeCell(user.name), makeCell(user.email), makeCell(user.role), statusCell, actionCell);
            userBody.append(row);
        });
    }
    const monthPrefix = new Date().toISOString().slice(0, 7);
    document.getElementById("totalUserCount").textContent = String(state.users.length);
    document.getElementById("activeUserCount").textContent = String(state.users.filter((user) => user.status === "Active").length);
    document.getElementById("inactiveUserCount").textContent = String(state.users.filter((user) => user.status === "Inactive").length);
    document.getElementById("newUserCount").textContent = String(state.users.filter((user) => user.joinedOn?.startsWith(monthPrefix)).length);
    document.getElementById("userSummary").textContent = `Showing ${visibleUsers.length} of ${state.users.length} users`;
    document.getElementById("selectAllUsers").checked = visibleUsers.length > 0 &&
        [...userBody.querySelectorAll(".row-select")].every((checkbox) => checkbox.checked);

    const roleBody = document.getElementById("roleTableBody");
    const roleQuery = state.settings.roleSearch.trim().toLowerCase();
    const visibleRoles = state.roles.filter((role) =>
        !roleQuery || Object.values(role).some((value) => String(value).toLowerCase().includes(roleQuery))
    );
    roleBody.replaceChildren();
    if (!state.roles.length) {
        roleBody.append(makeEmptyRow("No roles available.", 6));
    } else if (!visibleRoles.length) {
        roleBody.append(makeEmptyRow("No roles match your search.", 6));
    } else {
        visibleRoles.forEach((role) => {
            const row = document.createElement("tr");
            const statusCell = document.createElement("td");
            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = `status status-toggle ${role.status === "Active" ? "active-status" : "inactive-status"}`;
            toggle.dataset.toggleRole = role.id;
            toggle.setAttribute("aria-pressed", String(role.status === "Active"));
            toggle.setAttribute("aria-label", `${role.name}: ${role.status}. Toggle status`);
            toggle.textContent = role.status;
            statusCell.append(toggle);
            const actionCell = document.createElement("td");
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "row-edit";
            editButton.dataset.editRole = role.id;
            editButton.setAttribute("aria-label", `Edit ${role.name} role`);
            editButton.textContent = "✎";
            actionCell.append(editButton);
            row.append(makeCell(role.id), makeCell(role.name), makeCell(role.description), statusCell, makeCell(role.permissions), actionCell);
            roleBody.append(row);
        });
    }
    document.getElementById("roleSummary").textContent = `Showing ${visibleRoles.length} of ${state.roles.length} roles`;
    updateRoleOptions(state);
}

function updateRoleOptions(state) {
    const names = [...new Set(["User", ...state.roles.map((role) => role.name)])];
    const selected = document.getElementById("userRole").value;
    const select = document.getElementById("userRole");
    select.replaceChildren(...names.map((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        return option;
    }));
    if (names.includes(selected)) {
        select.value = selected;
    }
    const filter = document.getElementById("roleFilter");
    const filterValue = state.settings.roleFilter;
    filter.replaceChildren(new Option("All roles", ""), ...names.map((name) => new Option(name, name)));
    filter.value = names.includes(filterValue) ? filterValue : "";
    state.settings.roleFilter = filter.value;
}

export function notify(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.toggle("toast-error", isError);
    toast.classList.add("visible");
    clearTimeout(notify.timeoutId);
    notify.timeoutId = setTimeout(() => toast.classList.remove("visible"), 3000);
}

export function setLoadState(message, isError = false) {
    const element = document.getElementById("loadMessage");
    element.textContent = message;
    element.hidden = !message;
    element.classList.toggle("load-error", isError);
    document.getElementById("retryLoadButton").hidden = !isError;
}

export function createCsv(users) {
    const rows = [["User ID", "Name", "Email", "Role", "Status"], ...users.map((user) =>
        [user.id, user.name, user.email, user.role, user.status]
    )];
    return rows.map((row) => row.map((value) => {
        let text = String(value ?? "");
        if (/^[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    }).join(",")).join("\r\n");
}
