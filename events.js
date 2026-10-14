import { createCsv, getVisibleUsers, notify, renderDashboard } from "./ui.js";
import { validateUser } from "./validators.js";

function nextId(items, prefix) {
    const highest = items.reduce((max, item) => Math.max(max, Number(item.id.replace(/\D/g, "")) || 0), 0);
    return `${prefix}${String(highest + 1).padStart(3, "0")}`;
}

export function bindEvents(state, persist) {
    const persistAndRender = () => {
        renderDashboard(state);
        const error = persist(state);
        if (error) notify("Changes are active for this session but could not be saved in this browser.", true);
    };
    const userForm = document.getElementById("userForm");
    const roleForm = document.getElementById("roleForm");

    document.getElementById("mainSearch").value = state.settings.search;
    document.getElementById("userTableSearch").value = state.settings.search;
    document.getElementById("roleTableSearch").value = state.settings.roleSearch;
    document.getElementById("mainSearch").addEventListener("input", (event) => {
        state.settings.search = event.target.value;
        document.getElementById("userTableSearch").value = event.target.value;
        persistAndRender();
    });
    document.getElementById("userTableSearch").addEventListener("input", (event) => {
        state.settings.search = event.target.value;
        document.getElementById("mainSearch").value = event.target.value;
        persistAndRender();
    });
    document.getElementById("roleTableSearch").addEventListener("input", (event) => {
        state.settings.roleSearch = event.target.value;
        persistAndRender();
    });
    document.getElementById("roleFilter").addEventListener("change", (event) => {
        state.settings.roleFilter = event.target.value;
        persistAndRender();
    });
    document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => {
        const key = button.dataset.sort;
        state.settings.sortDirection = state.settings.sortKey === key ? state.settings.sortDirection * -1 : 1;
        state.settings.sortKey = key;
        persistAndRender();
    }));

    document.getElementById("selectAllUsers").addEventListener("change", (event) => {
        document.querySelectorAll("#userTableBody .row-select").forEach((checkbox) => {
            checkbox.checked = event.target.checked;
        });
    });
    document.getElementById("userTableBody").addEventListener("change", (event) => {
        if (event.target.matches(".row-select")) {
            const checkboxes = [...document.querySelectorAll("#userTableBody .row-select")];
            document.getElementById("selectAllUsers").checked =
                checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
        }
    });
    document.getElementById("deleteUsersButton").addEventListener("click", () => {
        const selectedIds = [...document.querySelectorAll("#userTableBody .row-select:checked")].map((checkbox) => checkbox.value);
        if (!selectedIds.length) {
            notify("Select at least one user to delete.");
            return;
        }
        if (!window.confirm(`Delete ${selectedIds.length} selected user${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
        state.users = state.users.filter((user) => !selectedIds.includes(user.id));
        persistAndRender();
        notify(`${selectedIds.length} user${selectedIds.length === 1 ? "" : "s"} deleted.`);
    });

    function openUser(user) {
        userForm.reset();
        userForm.dataset.editingId = user?.id ?? "";
        document.getElementById("userDialogTitle").textContent = user ? "Edit User" : "Add User";
        userForm.elements.userName.value = user?.name ?? "";
        userForm.elements.userEmail.value = user?.email ?? "";
        userForm.elements.userRole.value = user?.role ?? "User";
        userForm.elements.userStatus.value = user?.status ?? "Active";
        document.getElementById("emailError").textContent = "";
        userForm.elements.userEmail.setCustomValidity("");
        document.getElementById("userDialog").showModal();
        userForm.elements.userName.focus();
    }
    document.getElementById("addUserButton").addEventListener("click", () => openUser(null));
    document.getElementById("cancelUserButton").addEventListener("click", () => document.getElementById("userDialog").close());
    document.getElementById("userTableBody").addEventListener("click", (event) => {
        const button = event.target.closest("[data-edit-user]");
        if (button) openUser(state.users.find((user) => user.id === button.dataset.editUser));
    });
    userForm.elements.userEmail.addEventListener("input", () => {
        userForm.elements.userEmail.setCustomValidity("");
        document.getElementById("emailError").textContent = "";
    });
    userForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const editingId = userForm.dataset.editingId;
        const user = {
            name: userForm.elements.userName.value.trim(),
            email: userForm.elements.userEmail.value.trim(),
            role: userForm.elements.userRole.value,
            status: userForm.elements.userStatus.value
        };
        const validationError = validateUser(user, state.users, editingId);
        if (validationError) {
            const field = userForm.elements[validationError.field];
            field.setCustomValidity(validationError.message);
            document.getElementById("emailError").textContent = validationError.field === "userEmail" ? validationError.message : "";
            field.reportValidity();
            return;
        }
        if (editingId) {
            const existing = state.users.find((item) => item.id === editingId);
            if (!existing) {
                notify("The selected user no longer exists.", true);
                return;
            }
            Object.assign(existing, user);
        } else {
            const today = new Date();
            const joinedOn = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            state.users.push({ id: nextId(state.users, "USR"), ...user, joinedOn });
        }
        document.getElementById("userDialog").close();
        persistAndRender();
        notify(editingId ? "User updated." : "User added.");
    });

    document.getElementById("roleTableBody").addEventListener("click", (event) => {
        const toggle = event.target.closest("[data-toggle-role]");
        if (toggle) {
            const role = state.roles.find((item) => item.id === toggle.dataset.toggleRole);
            if (!role) return;
            role.status = role.status === "Active" ? "Inactive" : "Active";
            persistAndRender();
            notify(`${role.name} role is now ${role.status.toLowerCase()}.`);
            return;
        }
        const button = event.target.closest("[data-edit-role]");
        if (button) openRole(state.roles.find((role) => role.id === button.dataset.editRole));
    });

    function openRole(role) {
        roleForm.reset();
        roleForm.dataset.editingId = role?.id ?? "";
        document.getElementById("roleDialogTitle").textContent = role ? "Edit Role" : "Add Role";
        roleForm.elements.roleName.value = role?.name ?? "";
        roleForm.elements.roleDescription.value = role?.description ?? "";
        roleForm.elements.roleStatus.value = role?.status ?? "Active";
        roleForm.elements.rolePermissions.value = role?.permissions ?? "";
        document.getElementById("roleDialog").showModal();
        roleForm.elements.roleName.focus();
    }
    document.getElementById("addRoleButton").addEventListener("click", () => openRole(null));
    document.getElementById("cancelRoleButton").addEventListener("click", () => document.getElementById("roleDialog").close());
    roleForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const editingId = roleForm.dataset.editingId;
        const role = {
            name: roleForm.elements.roleName.value.trim(),
            description: roleForm.elements.roleDescription.value.trim(),
            status: roleForm.elements.roleStatus.value,
            permissions: roleForm.elements.rolePermissions.value.trim()
        };
        if (!role.name || !role.description || !role.permissions) {
            roleForm.reportValidity();
            return;
        }
        if (editingId) {
            const existing = state.roles.find((item) => item.id === editingId);
            if (!existing) {
                notify("The selected role no longer exists.", true);
                return;
            }
            Object.assign(existing, role);
        } else {
            state.roles.push({ id: nextId(state.roles, "ROL"), ...role });
        }
        document.getElementById("roleDialog").close();
        persistAndRender();
        notify(editingId ? "Role updated." : "Role added.");
    });

    document.getElementById("exportUsersButton").addEventListener("click", () => {
        const csv = createCsv(getVisibleUsers(state.users, state.settings));
        const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "user-report.csv";
        link.setAttribute("aria-hidden", "true");
        link.style.position = "fixed";
        link.style.left = "-10000px";
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify("Visible users exported to CSV.");
    });
    document.getElementById("refreshButton").addEventListener("click", () => {
        document.getElementById("refreshTime").textContent = `◷ Last Refreshed: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        notify("Dashboard refreshed.");
    });
    document.querySelectorAll(".ai-button").forEach((button) => button.addEventListener("click", () => notify("AI assistant is ready to help.")));
    document.querySelectorAll(".menu a").forEach((link) => link.addEventListener("click", (event) => {
        event.preventDefault();
        document.querySelectorAll(".menu a").forEach((item) => {
            item.classList.toggle("active", item === link);
            if (item === link) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
        });
    }));
}
