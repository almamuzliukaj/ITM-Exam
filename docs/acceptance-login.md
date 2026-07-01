# Login Acceptance Checklist

## Prerequisites

- PostgreSQL is running.
- Backend configuration points to the correct database.
- Seed or demo users exist.
- Frontend `VITE_API_BASE_URL` points to the backend API.

## Checklist

- [ ] Backend starts successfully.
- [ ] Swagger or API documentation is reachable.
- [ ] `POST /auth/login` returns a token for valid credentials.
- [ ] Invalid credentials return a clear error.
- [ ] `GET /auth/me` returns the current user when a valid bearer token is provided.
- [ ] Protected endpoints reject unauthenticated requests.
- [ ] Admin-only endpoints reject non-admin users.
- [ ] Frontend login stores the token and redirects by role.
- [ ] Logout clears the session and returns the user to login.
