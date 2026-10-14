import { loadDashboardData, readSavedState, saveState } from "./data.js";
import { bindEvents } from "./events.js";
import { notify, renderDashboard, setLoadState } from "./ui.js";

const DEFAULT_SETTINGS = { search: "", roleSearch: "", roleFilter: "", sortKey: "", sortDirection: 1 };

async function startDashboard() {
    setLoadState("Loading dashboard data…");
    document.getElementById("retryLoadButton").hidden = true;
    try {
        const initialData = await loadDashboardData();
        const saved = readSavedState();
        const state = {
            users: Array.isArray(saved.state?.users) ? saved.state.users : initialData.users,
            roles: Array.isArray(saved.state?.roles) ? saved.state.roles : initialData.roles,
            settings: { ...DEFAULT_SETTINGS, ...(saved.state?.settings ?? {}) }
        };
        if (saved.error) notify("Saved browser data could not be read; using the JSON defaults for this session.", true);
        bindEvents(state, saveState);
        renderDashboard(state);
        setLoadState("");
    } catch (error) {
        setLoadState(`Unable to load dashboard data. ${error.message} Check the JSON files and try again.`, true);
    }
}

document.getElementById("retryLoadButton").addEventListener("click", startDashboard);
startDashboard();
