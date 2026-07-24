# Auth Testing Playbook — Emergent Google OAuth

The Google OAuth flow cannot be automated end-to-end. To test auth-gated pages, seed a session directly into MongoDB and set the `session_token` cookie in Playwright.

## Step 1 — Seed test users & sessions
See `/app/memory/test_credentials.md` for the mongosh command that seeds:
- `test_session_provider_001` → provider role
- `test_session_admin_001` → admin role

## Step 2 — Backend curl testing
```
curl -X GET "$REACT_APP_BACKEND_URL/api/auth/me" \
  -H "Authorization: Bearer test_session_provider_001"

curl -X GET "$REACT_APP_BACKEND_URL/api/patients" \
  -H "Authorization: Bearer test_session_provider_001"

curl -X POST "$REACT_APP_BACKEND_URL/api/patients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_session_provider_001" \
  -d '{"initials":"J.D.","dob":"1990-01-15","mrn":"MRN001"}'
```

## Step 3 — Browser testing with Playwright
```
await page.context.add_cookies([{
    "name": "session_token",
    "value": "test_session_provider_001",
    "domain": "<preview-host-without-scheme>",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto(f"{BASE_URL}/dashboard")
```

## Success indicators
- `/api/auth/me` returns `{user_id, email, name, role}` (not 401)
- `/dashboard` renders without redirect to `/login`
- Admin token can access `/admin/criteria`; provider token cannot

## Failure indicators
- 401 Unauthorized → session_token not sent OR session expired
- Redirect to `/login` after cookie set → check cookie domain/path in Playwright
