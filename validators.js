export function validateUser(user, users, editingId = "") {
    if (!user.name.trim()) {
        return { field: "userName", message: "Enter the user's name." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        return { field: "userEmail", message: "Enter a valid email address." };
    }
    const duplicate = users.some((item) =>
        item.id !== editingId && item.email.toLowerCase() === user.email.toLowerCase()
    );
    if (duplicate) {
        return { field: "userEmail", message: "A user with this email address already exists." };
    }
    return null;
}
