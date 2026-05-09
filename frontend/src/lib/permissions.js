export function canManageExams(role) {
  return role === "Professor" || role === "Assistant";
}

export function canCreateExams(role) {
  return role === "Professor" || role === "Assistant";
}

export function isAdmin(role) {
  return role === "Admin";
}
