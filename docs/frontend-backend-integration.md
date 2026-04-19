# Frontend–Backend Integration Reference

## Environment Variable

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | DRF backend base URL |

Copy `.env.example` to `.env.local` and set the variable before running `npm run dev`.

---

## Token Storage

- Key: `invoflow_token` in `localStorage`
- Format: Django REST Framework token — sent as `Authorization: Token <token>`
- Helpers: `src/lib/auth/session.ts` — `getToken`, `setToken`, `clearToken`, `isAuthenticated`, `getAuthHeaders`

---

## Auth Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/auth/login/` | Login |
| POST | `/api/v1/auth/logout/` | Logout (invalidates server token) |
| GET | `/api/v1/auth/me/` | Fetch current authenticated user |

### Login response shape

```json
{
  "token": "<DRF token string>",
  "user_context": {
    "user": {
      "id": "<uuid>",
      "email": "user@example.com",
      "first_name": "Alice",
      "last_name": "Smith",
      "full_name": "Alice Smith",
      "employee_id": "EMP001",
      "phone": "+91 98765 43210",
      "is_staff": false,
      "is_active": true
    },
    "assigned_roles": [
      {
        "id": "<uuid>",
        "role": { "id": "<uuid>", "code": "finance", "name": "Finance Team" },
        "org_unit": { "id": "<uuid>", "code": "HQ", "name": "Head Office", "unit_type": "dept", "organization_id": "<uuid>", "organization_name": "Acme Corp", "legal_entity_id": null, "legal_entity_name": "" },
        "valid_from": null,
        "valid_until": null
      }
    ],
    "org_assignments": [ ... ],
    "primary_org_assignment": { "id": "<uuid>", "org_unit": { ... }, "is_primary": true, "valid_from": null, "valid_until": null },
    "accessible_modules": [ { "id": "<uuid>", "code": "vendors", "name": "Vendors" } ]
  }
}
```

### `/me/` response shape

Returns the same `CurrentUserSerializer` structure as `user_context` above (not wrapped in a `token` field).

### Frontend User type (`src/lib/types/auth.ts`)

`LoginResponse` maps to `{ token: string; user_context: CurrentUserResponse }`.
`CurrentUserResponse` is the full nested structure above.

### Role derivation rule (`src/contexts/AuthContext.tsx`)

1. Take `assigned_roles[0].role.code` (fall back to `.name` if code is blank).
2. Normalise: lowercase, replace spaces/hyphens with `_`.
3. Match against known `UserRole` values; fall back via partial-match heuristics.
4. If `assigned_roles` is empty → default `"finance"` (logged as warning).

Known `UserRole` values: `marketing_executive`, `regional_manager`, `ho_head`, `finance`, `finance_head`, `admin`, `vendor`.

---

## Vendor Endpoints

| Method | Path | Auth required | Purpose |
|---|---|---|---|
| GET | `/api/v1/vendors/vendors/` | IsAuthenticated | List vendors (paginated) |
| POST | `/api/v1/vendors/vendors/` | **IsAdminUser (staff only)** | Create vendor |
| GET | `/api/v1/vendors/vendors/{id}/` | IsAuthenticated | Get single vendor |
| PATCH | `/api/v1/vendors/vendors/{id}/` | IsAdminUser | Update vendor |
| GET | `/api/v1/vendors/registration-requests/` | IsAuthenticated | List registration requests |
| POST | `/api/v1/vendors/registration-requests/` | IsAuthenticated | Submit a registration request |
| POST | `/api/v1/vendors/registration-requests/{id}/approve/` | IsAdminUser | Approve a request |
| POST | `/api/v1/vendors/registration-requests/{id}/reject/` | IsAdminUser | Reject a request |

### Vendor list supported query params

| Param | Supported | Notes |
|---|---|---|
| `?status=` | Yes | Filter by status value |
| `?organization=` | Yes | Filter by organization UUID |
| `?active_only=` | Yes | Default `true` — backend filters `is_active=True` |
| `?search=` | **No** | Not supported by backend; filtering is client-side only |

### Vendor field names (VendorSerializer)

```
id                  (read-only)
organization        (UUID FK, writable on create)
organization_name   (read-only, denormalized)
code                (read-only)
name
legal_name
tax_id
registration_number
vendor_type
status
email
phone
website
address_line1
address_line2
city
state
country
postal_code
payment_terms_days
currency
is_active
bank_accounts[]     (write-only on VendorSerializer, readable on VendorDetailSerializer)
documents[]         (write-only on VendorSerializer, readable on VendorDetailSerializer)
```

**Important:** The old frontend types (`gst_number`, `pan_number`, `contact_name`, `contact_email`, `contact_phone`) do **not** exist in the backend. Use `tax_id`, `email`, `phone` instead.

### Vendor search (client-side)

The backend does not support `?search=`. The Partners page fetches all vendors and filters client-side by `name`, `legal_name`, and `email` using a simple `String.includes()` match. No debounced API call is made.

### Add Partner visibility

The "Add Partner" button in `PartnersPage` is only rendered when `user.is_staff === true`. Non-staff users see the vendor list but not the button. The backend enforces `IsAdminUser` on `POST /api/v1/vendors/vendors/` regardless.

### Organization on create

When a staff user creates a vendor, the `organization` UUID is read from `user.organization_id` (derived from `primary_org_assignment.org_unit.organization_id` in the login/me response). If the user has no primary org assignment, an inline error is shown in the form.

---

## Reporting Endpoints

### Dashboard

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/dashboard/summary/` | Dashboard summary metrics |

### Insights

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/insights/budget-vs-spend/` | Budget-version based budget vs spend rows |
| GET | `/api/v1/insights/vendor-spend/` | Vendor spend grouped by vendor and currency |
| GET | `/api/v1/insights/campaign-spend/` | Campaign allocation spend grouped by campaign and currency |
| GET | `/api/v1/insights/invoice-status-summary/` | Invoice totals grouped by status and currency |
| GET | `/api/v1/insights/pending-approvals/` | Pending approvals summary for the current authenticated user |

### Reporting filter notes

- Shared supported filters include `organization`, `legal_entity`, `vendor`, `status`, `date_from`, `date_to`, `invoice_date_from`, and `invoice_date_to` where the endpoint supports them.
- `budget-vs-spend` additionally supports `budget_version`.
- `campaign-spend` supports `campaign`.
- `budget-vs-spend` does **not** support `campaign`; the backend rejects that parameter.
- Mixed-currency rows must remain grouped by currency in the UI. Do not collapse them into invented single totals.

---

## Paginated Response Format

DRF returns all list endpoints in this shape:

```json
{
  "count": 10,
  "next": "url or null",
  "previous": "url or null",
  "results": [...]
}
```

The `useVendors` hook exposes `vendors` (the `results` array) and `total` (`count`).

---

## Error Handling

DRF errors are normalized into `Record<string, string[]>` by `ApiError` in `src/lib/api/client.ts`.

Supported DRF error shapes:
- `{ "field": ["error msg"] }` — field-level validation
- `{ "detail": "msg" }` — permission / not found errors
- `{ "non_field_errors": ["msg"] }` — non-field errors

On 401, the client automatically calls `clearToken()` before rejecting.

---

## Auth Flow

1. User submits email + password on `LoginPage`.
2. `AuthContext.login()` calls `POST /api/v1/auth/login/` via `src/lib/api/auth.ts`.
3. On success: token stored in `localStorage` via `setToken()`; `user_context` mapped to frontend `User` shape via `mapCurrentUser()`.
4. On app load with an existing token: `AuthContext` calls `GET /api/v1/auth/me/` to restore user state. A full-screen spinner is shown during this check to avoid a login-page flash.
5. On logout: `POST /api/v1/auth/logout/` is called; token cleared via `clearToken()`.
6. The role dropdown on `LoginPage` is a UI-only display element — it is not sent to the backend.

---

## What is Still Mocked / Deferred

- Integrated pages: Login, Partners, Marketing Funds, Campaigns, Vendor Bills, Approvals, Dashboard, Insights.
- Invoice totals / spend figures on vendor cards are not available from the vendor list endpoint — these will come from reporting endpoints in a future sprint.
- Bank account data is collected in the Add Partner form but not submitted until a dedicated bank account endpoint is available.
- The following domain routes are not yet wired to the backend (routes exist in the DRF URL conf but no frontend integration):
  - Budget periods/versions/tree
  - Admin / vendor portal / notifications / integrations
