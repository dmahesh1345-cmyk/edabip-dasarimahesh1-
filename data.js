const STORAGE_KEY = "edabip-dashboard-state";

async function fetchJson(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
    }
    return response.json();
}

export async function loadDashboardData() {
    const [users, roles] = await Promise.all([
        fetchJson("./data/users.json"),
        fetchJson("./data/roles.json")
    ]);
    if (!Array.isArray(users) || !Array.isArray(roles)) {
        throw new Error("Dashboard data has an invalid format.");
    }
    return { users, roles };
}

export function readSavedState() {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return { state: value ? JSON.parse(value) : null, error: null };
    } catch (error) {
        return { state: null, error };
    }
}

export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return null;
    } catch (error) {
        return error;
    }
}
