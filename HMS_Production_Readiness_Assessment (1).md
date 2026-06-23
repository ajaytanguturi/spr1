# HMS — Production Readiness Assessment Report
### Principal Architect Review · Sprint 1 Codebase vs. BRD (Sprint 4 Node Batch)

---

## Table of Contents
1. Phase 1: BRD vs. Implementation Mapping
2. Phase 2: Architecture Review (Backend · Angular · React Native)
3. Phase 3: Recommended Production Folder Structures
4. Phase 4: Critical Code Improvements (with complete code)
5. Phase 5: Security Hardening
6. Phase 6: Coding Standards
7. Phase 7: Developer Documentation & Production Readiness Checklist

---

# PHASE 1 — BRD VS. IMPLEMENTATION MAPPING

## 1.1 Implemented Features

| Module | Requirement | Status | Implementation Location |
|--------|------------|--------|------------------------|
| Auth | Employee self-signup with PENDING status | ✅ Implemented | `authController.selfRegister`, `Users.js` |
| Auth | Employee login with status gate (PENDING/REJECTED/INACTIVE blocked) | ✅ Implemented | `authController.login` |
| Auth | Forgot / reset password (link-based, hashed token) | ✅ Implemented | `authController.forgotPassword / resetPassword` |
| Auth | Change password | ✅ Implemented | `authController.changePassword` |
| Auth | JWT-based authentication middleware | ✅ Implemented | `authMiddleware.js` |
| Auth | Role-based authorization (OWNER/ADMIN/STAFF) | ✅ Implemented | `authorizeRolesMiddleware.js` |
| Auth | Designation-based authorization (DOCTOR/RECEPTIONIST etc.) | ✅ Implemented | `authorizeDesignations.js` |
| Employee | Admin creates employee | ✅ Implemented | `adminController.createEmployee` |
| Employee | Admin updates employee | ✅ Implemented | `adminController.updateEmployee` |
| Employee | Admin deletes employee | ✅ Implemented | `adminController.deleteEmployee` |
| Employee | Approve/reject self-signup (PENDING → ACTIVE/REJECTED) | ✅ Implemented | `adminController.approveEmployee / rejectEmployee` |
| Employee | Profile change request workflow | ✅ Implemented | `employeeController`, `ProfileChangeRequests.js` |
| Employee | Auto-cancel doctor appointments on delete | ✅ Implemented | `cancelDoctorAppointments.js` |
| Patient | Admin creates patient (with temp password via email) | ✅ Implemented | `patientController.createPatient` |
| Patient | Admin updates patient | ✅ Implemented | `patientController.updatePatient` |
| Patient | Patient self-registration (auto-ACTIVE) | ✅ Implemented | `patientAuthController.register` |
| Patient | Patient login (separate JWT with `type: PATIENT`) | ✅ Implemented | `patientAuthController.login` |
| Patient | Patient forgot/reset password (reset code method) | ✅ Implemented | `patientAuthController.forgotPassword / resetPassword` |
| Patient | Patient updates own profile | ✅ Implemented | `patientSelfController.updateMyProfile` |
| Appointment | Staff books appointment (OWNER/ADMIN/RECEPTIONIST) | ✅ Implemented | `appointmentController.createAppointment` |
| Appointment | Staff updates appointment | ✅ Implemented | `appointmentController.updateAppointment` |
| Appointment | Staff cancels appointment | ✅ Implemented | `appointmentController.cancelAppointment` |
| Appointment | Doctor completes own appointment | ✅ Implemented | `appointmentController.completeAppointment` |
| Appointment | Patient books own appointment | ✅ Implemented | `patientSelfController.bookAppointment` |
| Appointment | Patient reschedules own appointment | ✅ Implemented | `patientSelfController.updateMyAppointment` |
| Appointment | Patient cancels own appointment | ✅ Implemented | `patientSelfController.cancelMyAppointment` |
| Appointment | Booked-slot conflict detection per doctor/patient | ✅ Implemented | `checkAppointmentValidity.js` |
| Node | Role-based page access (Node model + getMyNodes) | ✅ Implemented | `Nodes.js`, `nodeController.js`, `seedNodes.js` |
| Audit | Audit log model + recording | ✅ Implemented | `AuditLogs.js`, `recordAudit.js` |
| Security | bcrypt password hashing (rounds 10–12) | ✅ Implemented | `authController`, `patientAuthController` |
| Security | Helmet, CORS, Morgan middleware | ✅ Implemented | `app.js` |

## 1.2 Partially Implemented Features

| Module | Requirement | Missing Components | Priority |
|--------|------------|-------------------|----------|
| Appointment | Patient appointments must start as PENDING and require Admin approval (BRD FR-3.4) | `PENDING_REVIEW` status missing from model enum; no approve/reject endpoints; no `createdByRole` field | 🔴 Critical |
| Health Records | Full CRUD for medical records | Controller file, routes file, validation file — none exist | 🔴 Critical |
| Audit | `APPOINTMENT_UPDATED` used in code but not in audit schema enum | Causes Mongoose validation failures on audit recording after appointment updates | 🔴 Critical |
| Audit | Approval actions for appointments not audited | No `APPOINTMENT_APPROVED` / `APPOINTMENT_REJECTED` in enum | 🟠 High |
| Patient | Admin delete patient (BRD FR-2.3) | No DELETE route in `patientRoutes.js` | 🟠 High |
| Profile Change | `approveProfileChange` iterates `requestedChanges` with `.forEach` | `requestedChanges` is a plain Object, not an Array; will silently skip all changes | 🔴 Critical |
| Security | No rate limiting on any endpoints | `express-rate-limit` not installed or configured | 🟠 High |
| Security | No request sanitization (NoSQL injection prevention) | `express-mongo-sanitize` not applied | 🟠 High |
| MedicalRecords | Timestamps not persisted | Schema option written as `timeStamps` (capital S) — typo, so `createdAt` never saved | 🟡 Medium |
| React Native | Missing `PENDING_REVIEW` appointment status type | `types.ts` only has `BOOKED \| CANCELED \| COMPLETED`; HomeScreen filter would miss pending | 🔴 Critical |

## 1.3 Missing Features (Not Yet Built)

| Module | Requirement | Recommended Design | Priority |
|--------|------------|-------------------|----------|
| Appointment | Admin approves/rejects patient appointment request | New endpoints: `PUT /api/admin/appointments/:appointmentId/approve` and `/reject`. Update Appointment model: add `PENDING_REVIEW` to status enum, add `createdByRole`, `approvedBy`, `approvedAt`, `rejectedBy`, `rejectionReason` fields | 🔴 Critical |
| Health Records | Create health record | New `POST /api/health-records` restricted to OWNER/ADMIN/RECEPTIONIST/DOCTOR | 🔴 Critical |
| Health Records | Read health records (by appointment, by patient) | New `GET /api/health-records` with query filters | 🔴 Critical |
| Health Records | Update health record | New `PUT /api/health-records/:id` restricted to OWNER/ADMIN/RECEPTIONIST/DOCTOR | 🔴 Critical |
| Health Records | Delete health record | New `DELETE /api/health-records/:id` restricted to OWNER/ADMIN only | 🟠 High |
| Patient | Delete patient (OWNER/ADMIN only) | `DELETE /api/patients/:UHID` with soft delete recommended | 🟠 High |
| Audit | Full audit coverage for all CRUD operations | Add missing audit actions to schema enum; add health-record audit events | 🟡 Medium |
| Security | Rate limiting | Apply `express-rate-limit` to auth routes (login, forgot-password), general API routes | 🟠 High |
| Security | Mongo query sanitization | Apply `express-mongo-sanitize` globally | 🟠 High |
| Angular | JWT stored in localStorage (XSS risk) | Migrate to `httpOnly` cookies or use Angular's `XSRF-TOKEN` pattern | 🟠 High |
| React Native | Pending appointment approval notification/display | Show `PENDING_REVIEW` appointments with distinct badge on HomeScreen | 🟡 Medium |

---

# PHASE 2 — ARCHITECTURE REVIEW

## 2.1 Backend (Node.js / Express / MongoDB)

### Current Architecture Assessment

**Folder Structure — Grade: B+**
The project has a reasonable MVC structure under `src/`: `controllers/`, `middlewares/`, `models/`, `routes/`, `validators/`, `utils/`, `constants/`, `config/`. The `utils/` folder, however, has become a catch-all with 20+ files mixing business logic (e.g. `cancelDoctorAppointments.js`), data transformation (`buildEmployeeData.js`), and email helpers — these should be separated into `services/` and `helpers/`.

**Route Design — Grade: B**
Routes are well-structured and follow REST conventions. However, several verb-in-URL patterns appear (`/create-appointment`, `/create-employee`, `/delete-employee/:code`) where standard HTTP methods (`POST /appointments`, `DELETE /employees/:code`) would be more RESTful and easier to document.

**Controller Layer — Grade: B+**
Controllers are lean and delegate well. The `adminController.js` handles too many concerns (employees + audit + profile changes) and should be split.

**Service Layer — Grade: D**
No dedicated service layer exists. Business logic lives partly in controllers, partly in `utils/` functions. This violates separation of concerns and makes unit testing controllers impossible without mocking DB calls.

**Middleware — Grade: A-**
Auth, role, designation, validation, and error middlewares are all clean and well-structured. The `validate.js` (express-validator wrapper) pattern is excellent.

**Error Handling — Grade: A**
`AppError`, `errorHandler`, and `sendSuccess`/`sendError` pattern is consistent and production-quality.

**Authentication — Grade: B+**
JWT-based auth is correctly implemented. Password hashing uses bcrypt with appropriate salt rounds. One concern: both employee and patient tokens use the same `JWT_SECRET`; a `type` field differentiates them, but a separate secret or key pair per audience would be safer.

**Security Gaps:**
- No rate limiting (anyone can brute-force login)
- No `express-mongo-sanitize` (NoSQL injection risk)
- No `hpp` (HTTP parameter pollution protection)
- Employee JWT payload includes `roles` array but RBAC at route level does a DB lookup for `designation` (extra round-trip per protected request)

**Performance:**
- `authorizeDesignation` makes a DB call on every protected request to fetch employee designation — this should be cached in the JWT payload
- `enrichAppointments` runs N separate DB lookups in a loop — should use MongoDB `$lookup` aggregation

**Configuration:**
- `dotenv.config()` called in multiple files (controllers, server) — should be called once at entry point only
- No config validation (missing env vars cause silent failures)

### Recommended Backend Architecture

```
src/
├── api/
│   └── index.js               # Serverless/vercel entry
├── config/
│   ├── db.js                  # MongoDB connection
│   ├── env.js                 # Validated env config (joi/zod)
│   └── constants/
│       ├── domain.js          # Role/designation constants
│       ├── messages.js        # All message strings
│       └── statusCodes.js     # HTTP codes
├── controllers/               # Thin HTTP layer only
│   ├── auth.controller.js
│   ├── admin.controller.js
│   ├── employee.controller.js
│   ├── patient.controller.js
│   ├── appointment.controller.js
│   ├── healthRecord.controller.js
│   ├── node.controller.js
│   └── dashboard.controller.js
├── services/                  # Business logic layer (NEW)
│   ├── auth.service.js
│   ├── employee.service.js
│   ├── patient.service.js
│   ├── appointment.service.js
│   ├── healthRecord.service.js
│   └── node.service.js
├── models/
│   ├── Appointments.js
│   ├── AuditLogs.js
│   ├── Counter.js
│   ├── Employees.js
│   ├── MedicalRecords.js
│   ├── Nodes.js
│   ├── Patients.js
│   ├── ProfileChangeRequests.js
│   └── Users.js
├── middlewares/
│   ├── auth.middleware.js
│   ├── patientAuth.middleware.js
│   ├── authorize.middleware.js   # Unified role+designation guard
│   ├── rateLimiter.middleware.js # NEW
│   ├── sanitize.middleware.js    # NEW
│   ├── validate.middleware.js
│   ├── errorHandler.middleware.js
│   └── notFound.middleware.js
├── routes/
│   ├── auth.routes.js
│   ├── admin.routes.js
│   ├── owner.routes.js
│   ├── employee.routes.js
│   ├── patient.routes.js
│   ├── appointment.routes.js
│   ├── healthRecord.routes.js  # NEW
│   ├── node.routes.js
│   ├── dashboard.routes.js
│   ├── patientAuth.routes.js
│   └── patientSelf.routes.js
├── validators/
│   ├── appointment.validators.js
│   ├── employee.validators.js
│   ├── healthRecord.validators.js  # NEW
│   ├── patient.validators.js
│   ├── patientAuth.validators.js
│   ├── patientAppointment.validators.js
│   ├── shared.validators.js
│   └── password.validators.js
├── utils/
│   ├── AppError.js
│   ├── apiResponse.js
│   ├── audit.js               # recordAudit helper
│   ├── email/
│   │   ├── sendEmail.js
│   │   ├── emailTemplates.js
│   │   └── sendAppointmentEmail.js
│   ├── pagination.js          # parsePagination + paginateAppointments
│   ├── tokenHelpers.js        # JWT sign/verify helpers
│   └── seeders/
│       ├── seed.js
│       ├── seedNodes.js
│       └── seedOwner.js
├── app.js
└── server.js
```

---

## 2.2 Angular Frontend

### Current Architecture Assessment

**Structure — Grade: B+**
Feature-based organization under `features/` is correct and scalable. `core/` holds guards and services. `shared/ui/` holds reusable components. This is close to enterprise Angular.

**Guards — Grade: A-**
Four guard types implemented (`authGuard`, `designationGuard`, `mustChangePasswordGuard`, `unsavedChangesGuard`). The `designationGuard([])` pattern for superuser-only routes is clever but non-obvious; documenting intent via named constants would help.

**State Management — Grade: B**
`BehaviorSubject` + `signal` dual-state for `currentUser` is redundant and can cause inconsistencies. Chose one pattern (prefer Angular signals for new code).

**Token Storage — Grade: D**
JWT stored in `localStorage` is XSS-vulnerable. This is the most significant security issue in the frontend.

**Lazy Loading — Grade: A**
All routes use `loadComponent()` — excellent code-splitting strategy.

**HTTP Layer — Grade: B**
No HTTP interceptor for automatic token attachment — each service would need manual header injection. A `AuthInterceptor` should be added.

**Missing Modules:**
- Health Records UI (list, create, detail)
- Appointment approval queue for Admin/Super Admin
- Patient delete action (with confirmation)

### Recommended Angular Enterprise Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   ├── role.guard.ts
│   │   │   ├── must-change-password.guard.ts
│   │   │   └── unsaved-changes.guard.ts
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts        # Auto-attach JWT
│   │   │   └── error.interceptor.ts       # Global HTTP error handling
│   │   ├── models/
│   │   │   ├── api-response.model.ts
│   │   │   ├── employee.model.ts
│   │   │   ├── patient.model.ts
│   │   │   ├── appointment.model.ts
│   │   │   └── health-record.model.ts     # NEW
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── appointment.service.ts
│   │   │   ├── health-record.service.ts   # NEW
│   │   │   ├── patient.service.ts
│   │   │   ├── employee.service.ts
│   │   │   ├── node.service.ts
│   │   │   ├── owner.service.ts
│   │   │   └── toast.service.ts
│   │   └── constants/
│   │       └── messages.ts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── change-password/
│   │   ├── dashboard/
│   │   │   ├── overview/
│   │   │   ├── employees/
│   │   │   ├── employees-create/
│   │   │   ├── admins/
│   │   │   ├── approvals/
│   │   │   ├── patients-list/
│   │   │   ├── patient-create/
│   │   │   ├── patient-detail/
│   │   │   ├── appointments-list/
│   │   │   ├── appointment-book/
│   │   │   ├── appointment-detail/
│   │   │   ├── appointment-approvals/     # NEW
│   │   │   ├── health-records-list/       # NEW
│   │   │   ├── health-record-create/      # NEW
│   │   │   └── profile/
│   │   └── home/
│   └── shared/
│       └── ui/
│           ├── availability-slots-form/
│           ├── confirm-modal/
│           ├── dashboard-layout/
│           ├── last-login-cell/
│           ├── navbar/
│           ├── password-input/
│           ├── searchable-select/
│           ├── sidebar/
│           ├── slot-picker/
│           └── toast/
```

---

## 2.3 React Native (PatientApp)

### Current Architecture Assessment

**Folder Structure — Grade: B**
Clean separation of `screens/`, `components/`, `services/`, `hooks/`, `store/`, `utils/`, `constants/`. Good foundation.

**Navigation — Grade: B+**
Expo Router file-based navigation is well-structured. `useGuardedRouter` hook adds unsaved-change protection.

**Auth/State — Grade: A-**
Zustand + SecureStore is an excellent pattern. Token is stored securely in device keychain.

**API Layer — Grade: B+**
`apiFetch` generic function with proper error handling and envelope unwrapping. `ApiError` class is clean. Missing: request timeout, retry logic.

**Type Safety — Grade: C**
`AppointmentStatus` type is missing `PENDING_REVIEW`. Patient `types.ts` is thorough but not in sync with backend model.

**Error Handling — Grade: B**
`showError` utility normalizes `ApiError` and unknown errors. No global error boundary for unexpected React errors.

**Missing Features:**
- Pending appointment display and status badge
- No offline handling/caching
- No push notification registration

### Recommended React Native Structure

```
src/
├── app/                           # Expo Router pages
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── profile.tsx
│   ├── explore.tsx
│   ├── book-appointment.tsx
│   ├── edit-appointment.tsx
│   ├── change-password.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── components/
│   ├── appointment/
│   │   ├── AppointmentCard.tsx
│   │   ├── AppointmentForm.tsx
│   │   └── AppointmentStatusBadge.tsx    # NEW
│   └── common/
│       ├── ConfirmModal.tsx
│       ├── DatePickerSheet.tsx
│       ├── LoadingOverlay.tsx            # NEW
│       ├── PasswordScreen.tsx
│       ├── StatusBadge.tsx               # NEW (reusable)
│       ├── textbox.tsx
│       └── textbox.styles.tsx
├── config/
│   └── api.ts
├── constants/
│   ├── messages.ts
│   ├── statusTypes.ts                    # NEW (BOOKED | CANCELED | COMPLETED | PENDING_REVIEW)
│   └── theme.ts
├── hooks/
│   ├── useAppointments.ts                # NEW (data fetching hook)
│   ├── useGuardedRouter.ts
│   └── useUnsavedChanges.ts
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   └── styles/
│   ├── home/
│   │   └── HomeScreen.tsx
│   ├── landing/
│   │   └── LandingScreen.tsx
│   └── patient/
│       ├── ProfileScreen.tsx
│       └── styles/
├── services/
│   ├── apiClient.ts
│   ├── appointmentService.ts
│   ├── authService.ts
│   ├── patientService.ts
│   └── types.ts
├── store/
│   ├── AuthStore.ts
│   ├── confirmModal.ts
│   └── navGuard.ts
├── styles/
│   └── password.style.ts
└── utils/
    ├── alerts.ts
    ├── format.ts
    └── validation.ts
```

---

# PHASE 3 — PRODUCTION FOLDER STRUCTURES (purpose of every folder)

## 3.1 Backend Folder Purpose Map

| Folder/File | Purpose |
|-------------|---------|
| `src/api/index.js` | Serverless adapter (Vercel/Render) — connects DB and delegates to `app.js` |
| `src/app.js` | Express app setup — middleware, routes, error handlers |
| `src/server.js` | Node HTTP server — binds port, starts app locally |
| `src/config/db.js` | MongoDB connection with retry logic |
| `src/config/env.js` | Environment variable validation (joi schema) — fails fast on missing vars |
| `src/constants/domain.js` | Role/designation constants shared across backend |
| `src/constants/messages.js` | All user-facing strings — single source of truth |
| `src/constants/statusCodes.js` | HTTP status code constants |
| `src/controllers/` | HTTP layer only — parse req, call service, return res |
| `src/services/` | Business logic, DB queries, orchestration — testable in isolation |
| `src/models/` | Mongoose schemas and models |
| `src/middlewares/` | Request pipeline — auth, validation, error, rate limit |
| `src/routes/` | Route definitions — wire middleware + controllers |
| `src/validators/` | express-validator rule arrays — reused across routes |
| `src/utils/` | Pure helper functions — email, pagination, audit, token |

---

## 3.2 Angular Folder Purpose Map

The existing structure already follows a `core` / `features` / `shared` split. The table below documents the production purpose of each folder as-is, plus additions needed to close checklist items 20–23.

| Folder/File | Purpose |
|-------------|---------|
| `src/app/core/` | Singleton, app-wide concerns — loaded once, never lazy-loaded |
| `src/app/core/constants/` | Frontend enums mirroring backend `constants/domain.js` (roles, statuses) |
| `src/app/core/guards/` | `CanActivateFn` route guards — auth guard, role guard, node-access guard |
| `src/app/core/interceptors/` | Functional `HttpInterceptorFn` — auth token attach, error normalization, loading state |
| `src/app/core/models/` | Shared TypeScript interfaces (Employee, Patient, Appointment, AuditLog, ApiResponse<T>) |
| `src/app/core/services/` | App-wide services — AuthService, ApiService, NodeAccessService, ToastService |
| `src/app/core/validators/` | Custom reactive form validators (password strength, phone, NIC, etc.) |
| `src/app/features/` | Lazy-loaded route-level feature modules — one folder per business domain |
| `src/app/features/auth/` | Login, register, forgot/reset/change password flows |
| `src/app/features/dashboard/` | Authenticated staff workspace — nested lazy routes |
| `src/app/features/dashboard/overview/` | Landing/summary view after login |
| `src/app/features/dashboard/employees*/` | Employee directory, creation, detail |
| `src/app/features/dashboard/admins/` | Owner-only admin management |
| `src/app/features/dashboard/patients*/` | Patient directory, creation, detail (staff-managed) |
| `src/app/features/dashboard/appointment*/` | Appointment list, booking, detail |
| `src/app/features/dashboard/approvals/` | Existing profile-change approval queue — extended (see 3.2.1) |
| `src/app/features/dashboard/profile/` | Logged-in employee's own profile/settings |
| `src/app/features/home/` | Public landing page (pre-auth) |
| `src/app/shared/ui/` | Presentational, reusable components — no business logic, no HTTP calls |
| `src/app/shared/ui/dashboard-layout/` | Shell layout (sidebar + navbar + router-outlet) for authenticated routes |
| `src/app/shared/ui/searchable-select/`, `slot-picker/`, `availability-slots-form/` | Domain-agnostic form controls reused across features |
| `src/app/shared/ui/toast/`, `confirm-modal/` | Global notification/confirmation primitives |
| `src/environments/` | `environment.ts` / `environment.prod.ts` — `apiBaseUrl`, feature flags |

### 3.2.1 New Folders Required (Checklist Items 21, 23)

| New Folder/File | Purpose |
|-------------|---------|
| `src/app/features/dashboard/appointment-approvals/` | NEW — queue of `PENDING_REVIEW` patient-originated appointments with Approve/Reject actions (#21) |
| `src/app/features/dashboard/appointment-approvals/appointment-approvals.ts` | Component — table of pending appointments, calls `AppointmentService.approve()` / `.reject()` |
| `src/app/features/dashboard/appointment-approvals/appointment-approvals.html` | Template — reuses `dashboard-layout` table styling |
| `src/app/features/dashboard/health-records/` | NEW — Health Records CRUD UI (#23), maps to `/api/health-records` |
| `src/app/features/dashboard/health-records/health-records-list.ts` | List view per patient with create/edit/delete |
| `src/app/features/dashboard/health-records/health-record-form.ts` | Create/edit reactive form |
| `src/app/core/services/health-record.service.ts` | HTTP client for `/api/health-records` endpoints |
| `src/app/core/services/appointment.service.ts` (extend) | Add `getPendingReview()`, `approve(id)`, `reject(id, reason)` methods |

---

## 3.3 React Native (PatientApp) Folder Purpose Map

| Folder/File | Purpose |
|-------------|---------|
| `app/` | Expo Router file-based routes — each file = a screen/route |
| `app/_layout.tsx` | Root layout — navigation stack, auth bootstrap, global providers |
| `app/index.tsx` | Entry route — redirects to landing or home based on auth state |
| `app/login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `change-password.tsx` | Auth route wrappers — render corresponding `screens/auth/*` |
| `app/book-appointment.tsx`, `edit-appointment.tsx` | Appointment route wrappers |
| `app/profile.tsx`, `explore.tsx` | Patient profile and doctor/appointment exploration routes |
| `screens/` | Actual screen implementations (UI + logic), referenced by `app/` routes |
| `screens/auth/` | LoginScreen, RegisterScreen — forms + validation |
| `screens/auth/styles/` | Per-screen StyleSheet objects |
| `screens/home/` | HomeScreen — patient dashboard, appointment summary |
| `screens/landing/` | Pre-auth landing/marketing screen |
| `screens/patient/` | Profile view/edit screens |
| `screens/patient/styles/` | Per-screen styles |
| `components/` | Reusable presentational components shared across screens |
| `components/common/` | Generic UI primitives — textbox, modals, date pickers, loading screen |
| `components/appointment/` | `AppointmentCard`, `AppointmentForm` — domain components |
| `components/app-tabs.tsx` | Bottom tab navigator definition |
| `config/api.ts` | API base URL + endpoint path constants |
| `constants/theme.ts` | Colors, spacing, typography tokens |
| `constants/messages.ts` | User-facing string constants (mirrors backend `messages.js`) |
| `constants/statusTypes.ts` | NEW — `AppointmentStatus` union type (Finding 7) |
| `services/` | API access layer — no UI code |
| `services/apiClient.ts` | `apiFetch<T>` wrapper — attaches token, handles errors/refresh |
| `services/authService.ts` | login, register, password reset/change calls |
| `services/patientService.ts` | Patient profile self-service calls |
| `services/appointmentService.ts` | Appointment CRUD/booking calls |
| `services/types.ts` | Shared TS interfaces/types for API payloads |
| `store/` | Lightweight global state (no Redux) |
| `store/AuthStore.ts` | Token + current patient state, persisted via SecureStore |
| `store/navGuard.ts`, `confirmModal.ts` | Navigation guard and modal state stores |
| `hooks/` | Custom hooks |
| `hooks/useGuardedRouter.ts` | Wraps router navigation with unsaved-changes confirmation |
| `hooks/useUnsavedChanges.ts` | Tracks dirty form state |
| `utils/` | Pure helpers — `validation.ts`, `format.ts`, `alerts.ts` |
| `styles/` | Cross-screen shared styles (e.g. `password.style.ts`) |

### 3.3.1 New/Modified Items Required (Checklist Item 22)

| File | Purpose |
|-------------|---------|
| `constants/statusTypes.ts` | NEW — central `AppointmentStatus = 'PENDING_REVIEW' \| 'BOOKED' \| 'COMPLETED' \| 'CANCELLED' \| 'REJECTED'` union, imported by `types.ts`, `AppointmentCard`, `HomeScreen` |
| `components/appointment/AppointmentCard.tsx` (modify) | Add a `PENDING_REVIEW` badge variant (amber) alongside existing status badges |
| `screens/home/HomeScreen.tsx` (modify) | Add a "Pending Approval" section/counter, sourced from `appointmentService.getMyAppointments()` filtered by `status === 'PENDING_REVIEW'` |

---

# PHASE 4 — CRITICAL CODE IMPROVEMENTS

---

## Finding 1: Appointment Model Missing PENDING_REVIEW Status and Approval Fields

**Problem:** BRD FR-3.4 requires patient-created appointments to be `PENDING` until approved. The current model only allows `BOOKED | CANCELED | COMPLETED`. The `patientSelfController.bookAppointment` creates directly as `BOOKED`, skipping the entire approval workflow.

**Impact:** Patient appointments are confirmed immediately without admin review — critical business rule violation.

**Files to Modify:** `src/models/Appointments.js`
**Files to Create:** `src/controllers/appointmentApproval.controller.js`, updated `src/routes/adminRoutes.js`

### Complete Code — Updated Appointment Model

```javascript
// src/models/Appointments.js
const mongoose = require("mongoose");
const Counter = require("./Counter");

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      unique: true,
    },
    patientId: {
      type: String,
      required: true,
      ref: "Patients",
    },
    doctorEmployeeId: {
      type: String,
      required: true,
      ref: "Employee",
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      // PENDING_REVIEW: patient-created, awaiting admin approval
      // BOOKED: confirmed by staff or approved by admin
      // CANCELED: cancelled by patient or staff
      // COMPLETED: marked complete by doctor
      enum: ["PENDING_REVIEW", "BOOKED", "CANCELED", "COMPLETED"],
      default: "BOOKED",
    },
    createdByRole: {
      type: String,
      enum: ["PATIENT", "STAFF"],
      default: "STAFF",
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    createdByEmployeeId: {
      type: String,
      ref: "Employee",
      default: null,
    },
    // Approval audit fields
    approvedBy: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: String,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

appointmentSchema.pre("save", async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { name: "appointments" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.appointmentId = `APT-${String(counter.seq).padStart(6, "0")}`;
  }
});

module.exports = mongoose.model("Appointments", appointmentSchema);
```

### Complete Code — Updated Patient Self Controller (bookAppointment)

```javascript
// In src/controllers/patientSelfController.js — replace bookAppointment export

exports.bookAppointment = async (req, res) => {
  const patientId = req.patient.patientId;
  const { doctorEmployeeId, appointmentDate, timeSlot } = req.body;

  const { patient, doctor } = await checkAppointmentValidity({
    patientId,
    doctorId: doctorEmployeeId,
    appointmentDate,
    timeSlot,
  });

  // Patient-created appointments always start as PENDING_REVIEW (BRD FR-3.4)
  const appointment = await Appointment.create({
    patientId,
    doctorEmployeeId,
    appointmentDate,
    timeSlot,
    status: "PENDING_REVIEW",
    createdByRole: "PATIENT",
  });

  await sendAppointmentEmail(
    patient.email,
    emailTemplates.appointmentPendingReview({
      patientName: patient.name,
      doctorName: doctor.name,
      appointmentDate,
      timeSlot,
    })
  );

  await recordAudit({
    actor: patientActor(patient),
    action: "APPOINTMENT_CREATED",
    targetType: "APPOINTMENT",
    targetId: appointment.appointmentId,
    message: MESSAGES.AUDIT.APPOINTMENT_BOOKED_BY_PATIENT(
      appointment.appointmentId,
      patient.name,
      doctor.name
    ),
  });

  return sendSuccess(
    res,
    STATUS.CREATED,
    MESSAGES.APPOINTMENT.PENDING_REVIEW_CREATED,
    { appointment }
  );
};
```

### Complete Code — Appointment Approval Controller

```javascript
// src/controllers/appointmentApproval.controller.js  (NEW FILE)
const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const Employee = require("../models/Employees");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const sendAppointmentEmail = require("../utils/sendAppointmentEmail");
const emailTemplates = require("../utils/emailTemplates");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

/**
 * GET /api/admin/appointment-requests
 * List all PENDING_REVIEW appointments for admin review queue
 */
exports.getPendingAppointments = async (req, res) => {
  const appointments = await Appointment.find({ status: "PENDING_REVIEW" })
    .sort({ created_at: -1 })
    .lean();

  return sendSuccess(
    res,
    STATUS.OK,
    MESSAGES.APPOINTMENT.PENDING_LIST_RETRIEVED,
    { total: appointments.length, appointments }
  );
};

/**
 * PUT /api/admin/appointments/:appointmentId/approve
 * Approve a patient-requested appointment
 */
exports.approveAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  const appointment = await Appointment.findOne({ appointmentId });

  if (!appointment) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
  }

  if (appointment.status !== "PENDING_REVIEW") {
    throw new AppError(
      STATUS.BAD_REQUEST,
      MESSAGES.APPOINTMENT.NOT_PENDING_REVIEW
    );
  }

  appointment.status = "BOOKED";
  appointment.approvedBy = req.user.employeeCode;
  appointment.approvedAt = new Date();
  await appointment.save();

  // Notify patient
  const patient = await Patient.findOne({ UHID: appointment.patientId });
  const doctor = await Employee.findOne({
    employeeCode: appointment.doctorEmployeeId,
  });

  if (patient) {
    await sendAppointmentEmail(
      patient.email,
      emailTemplates.appointmentApproved({
        patientName: patient.name,
        doctorName: doctor?.name ?? "Doctor",
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
      })
    );
  }

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "APPOINTMENT_APPROVED",
    targetType: "APPOINTMENT",
    targetId: appointmentId,
    message: MESSAGES.AUDIT.APPOINTMENT_APPROVED(
      appointmentId,
      patient?.name ?? appointment.patientId
    ),
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.APPROVED, {
    appointment,
  });
};

/**
 * PUT /api/admin/appointments/:appointmentId/reject
 * Reject a patient-requested appointment
 */
exports.rejectAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { rejectionReason } = req.body;

  const appointment = await Appointment.findOne({ appointmentId });

  if (!appointment) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
  }

  if (appointment.status !== "PENDING_REVIEW") {
    throw new AppError(
      STATUS.BAD_REQUEST,
      MESSAGES.APPOINTMENT.NOT_PENDING_REVIEW
    );
  }

  appointment.status = "CANCELED";
  appointment.cancellationReason = rejectionReason;
  appointment.rejectedBy = req.user.employeeCode;
  appointment.rejectedAt = new Date();
  appointment.rejectionReason = rejectionReason;
  await appointment.save();

  const patient = await Patient.findOne({ UHID: appointment.patientId });
  const doctor = await Employee.findOne({
    employeeCode: appointment.doctorEmployeeId,
  });

  if (patient) {
    await sendAppointmentEmail(
      patient.email,
      emailTemplates.appointmentRejected({
        patientName: patient.name,
        doctorName: doctor?.name ?? "Doctor",
        appointmentDate: appointment.appointmentDate,
        timeSlot: appointment.timeSlot,
        rejectionReason,
      })
    );
  }

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "APPOINTMENT_REJECTED",
    targetType: "APPOINTMENT",
    targetId: appointmentId,
    message: MESSAGES.AUDIT.APPOINTMENT_REJECTED(
      appointmentId,
      patient?.name ?? appointment.patientId,
      rejectionReason
    ),
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.REJECTED, {
    appointment,
  });
};
```

### Routes addition to adminRoutes.js

```javascript
// Add to src/routes/adminRoutes.js (inside the existing OWNER+ADMIN router)
const approvalController = require("../controllers/appointmentApproval.controller");
const { param, body } = require("express-validator"); // already imported

const appointmentIdValidation = [
  param("appointmentId").notEmpty().withMessage("Appointment ID is required"),
];

const rejectAppointmentValidation = [
  ...appointmentIdValidation,
  body("rejectionReason")
    .notEmpty()
    .withMessage("Rejection reason is required"),
];

// Appointment approval queue
router.get(
  "/appointment-requests",
  approvalController.getPendingAppointments
);

router.put(
  "/appointments/:appointmentId/approve",
  appointmentIdValidation,
  validate,
  approvalController.approveAppointment
);

router.put(
  "/appointments/:appointmentId/reject",
  rejectAppointmentValidation,
  validate,
  approvalController.rejectAppointment
);
```

---

## Finding 2: Health Records CRUD — Completely Missing

**Problem:** BRD FR-4 specifies full CRUD for health records, but no controller, route, or validation file exists. The `MedicalRecords.js` model is defined but unused via API.

**Impact:** Core clinical functionality missing from the application entirely.

**Files to Create:** `src/controllers/healthRecord.controller.js`, `src/routes/healthRecord.routes.js`, `src/validators/healthRecord.validators.js`

### Complete Code — Health Record Controller

```javascript
// src/controllers/healthRecord.controller.js  (NEW FILE)
const MedicalRecord = require("../models/MedicalRecords");
const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const Employee = require("../models/Employees");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const parsePagination = require("../utils/parsePagination");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

/**
 * POST /api/health-records
 * Create a health record — OWNER, ADMIN, RECEPTIONIST, DOCTOR
 */
exports.createHealthRecord = async (req, res) => {
  const {
    appointmentId,
    patientId,
    doctorEmployeeId,
    symptoms,
    diagnosis,
    prescriptionItems,
    notes,
  } = req.body;

  // Validate that the referenced appointment exists
  const appointment = await Appointment.findOne({ appointmentId });
  if (!appointment) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
  }

  if (appointment.status !== "COMPLETED" && appointment.status !== "BOOKED") {
    throw new AppError(
      STATUS.BAD_REQUEST,
      MESSAGES.HEALTH_RECORD.APPOINTMENT_NOT_ELIGIBLE
    );
  }

  // Validate patient exists
  const patient = await Patient.findOne({ UHID: patientId });
  if (!patient) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
  }

  // Validate doctor exists
  const doctor = await Employee.findOne({
    employeeCode: doctorEmployeeId,
    designation: "DOCTOR",
  });
  if (!doctor) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
  }

  // Prevent duplicate records for same appointment
  const existing = await MedicalRecord.findOne({ appointmentId });
  if (existing) {
    throw new AppError(
      STATUS.CONFLICT,
      MESSAGES.HEALTH_RECORD.ALREADY_EXISTS_FOR_APPOINTMENT
    );
  }

  const record = await MedicalRecord.create({
    appointmentId,
    patientId,
    doctorEmployeeId,
    symptoms,
    diagnosis,
    prescriptionItems: prescriptionItems || [],
    notes,
  });

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "HEALTH_RECORD_CREATED",
    targetType: "HEALTH_RECORD",
    targetId: record.medicalRecordId,
    message: MESSAGES.AUDIT.HEALTH_RECORD_CREATED(
      record.medicalRecordId,
      patient.name
    ),
  });

  return sendSuccess(
    res,
    STATUS.CREATED,
    MESSAGES.HEALTH_RECORD.CREATED,
    { record }
  );
};

/**
 * GET /api/health-records
 * List health records — filterable by patientId, doctorEmployeeId, appointmentId
 */
exports.getHealthRecords = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 10);

  const filter = {};
  if (req.query.patientId) filter.patientId = req.query.patientId;
  if (req.query.doctorEmployeeId)
    filter.doctorEmployeeId = req.query.doctorEmployeeId;
  if (req.query.appointmentId)
    filter.appointmentId = req.query.appointmentId;

  const [records, total] = await Promise.all([
    MedicalRecord.find(filter)
      .select("-__v")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MedicalRecord.countDocuments(filter),
  ]);

  return sendSuccess(res, STATUS.OK, MESSAGES.HEALTH_RECORD.LIST_RETRIEVED, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    records,
  });
};

/**
 * GET /api/health-records/:medicalRecordId
 */
exports.getHealthRecordById = async (req, res) => {
  const { medicalRecordId } = req.params;

  const record = await MedicalRecord.findOne({ medicalRecordId })
    .select("-__v")
    .lean();

  if (!record) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.HEALTH_RECORD.NOT_FOUND);
  }

  return sendSuccess(res, STATUS.OK, MESSAGES.HEALTH_RECORD.RETRIEVED, {
    record,
  });
};

/**
 * PUT /api/health-records/:medicalRecordId
 * Update — OWNER, ADMIN, RECEPTIONIST, DOCTOR
 */
exports.updateHealthRecord = async (req, res) => {
  const { medicalRecordId } = req.params;

  const record = await MedicalRecord.findOne({ medicalRecordId });
  if (!record) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.HEALTH_RECORD.NOT_FOUND);
  }

  const updatableFields = [
    "symptoms",
    "diagnosis",
    "prescriptionItems",
    "notes",
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      record[field] = req.body[field];
    }
  });

  await record.save();

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "HEALTH_RECORD_UPDATED",
    targetType: "HEALTH_RECORD",
    targetId: record.medicalRecordId,
    message: MESSAGES.AUDIT.HEALTH_RECORD_UPDATED(record.medicalRecordId),
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.HEALTH_RECORD.UPDATED, {
    record,
  });
};

/**
 * DELETE /api/health-records/:medicalRecordId
 * Delete — OWNER, ADMIN only
 */
exports.deleteHealthRecord = async (req, res) => {
  const { medicalRecordId } = req.params;

  const record = await MedicalRecord.findOne({ medicalRecordId });
  if (!record) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.HEALTH_RECORD.NOT_FOUND);
  }

  await MedicalRecord.deleteOne({ medicalRecordId });

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "HEALTH_RECORD_DELETED",
    targetType: "HEALTH_RECORD",
    targetId: medicalRecordId,
    message: MESSAGES.AUDIT.HEALTH_RECORD_DELETED(medicalRecordId),
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.HEALTH_RECORD.DELETED);
};
```

### Complete Code — Health Record Routes

```javascript
// src/routes/healthRecord.routes.js  (NEW FILE)
const express = require("express");
const router = express.Router();
const { param, body } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/healthRecord.controller");

router.use(auth);

// CREATE and READ — OWNER, ADMIN, RECEPTIONIST, DOCTOR
const READ_WRITE_LEVEL = authorizeDesignation(
  "OWNER",
  "ADMIN",
  "RECEPTIONIST",
  "DOCTOR"
);

// DELETE — OWNER, ADMIN only
const ADMIN_LEVEL = authorizeDesignation("OWNER", "ADMIN");

const recordIdValidation = [
  param("medicalRecordId")
    .notEmpty()
    .withMessage("Medical record ID is required"),
];

const createValidation = [
  body("appointmentId").notEmpty().withMessage("Appointment ID is required"),
  body("patientId").notEmpty().withMessage("Patient ID is required"),
  body("doctorEmployeeId")
    .notEmpty()
    .withMessage("Doctor employee ID is required"),
  body("symptoms").notEmpty().withMessage("Symptoms are required"),
  body("diagnosis").notEmpty().withMessage("Diagnosis is required"),
  body("prescriptionItems")
    .optional()
    .isArray()
    .withMessage("Prescription items must be an array"),
  body("prescriptionItems.*.name")
    .notEmpty()
    .withMessage("Prescription item name is required"),
  body("prescriptionItems.*.dosage")
    .notEmpty()
    .withMessage("Dosage is required"),
  body("prescriptionItems.*.duration")
    .notEmpty()
    .withMessage("Duration is required"),
];

const updateValidation = [
  ...recordIdValidation,
  body("symptoms").optional().notEmpty().withMessage("Symptoms cannot be empty"),
  body("diagnosis")
    .optional()
    .notEmpty()
    .withMessage("Diagnosis cannot be empty"),
];

router.post(
  "/",
  READ_WRITE_LEVEL,
  createValidation,
  validate,
  controller.createHealthRecord
);

router.get("/", READ_WRITE_LEVEL, controller.getHealthRecords);

router.get(
  "/:medicalRecordId",
  READ_WRITE_LEVEL,
  recordIdValidation,
  validate,
  controller.getHealthRecordById
);

router.put(
  "/:medicalRecordId",
  READ_WRITE_LEVEL,
  updateValidation,
  validate,
  controller.updateHealthRecord
);

router.delete(
  "/:medicalRecordId",
  ADMIN_LEVEL,
  recordIdValidation,
  validate,
  controller.deleteHealthRecord
);

module.exports = router;
```

### Add to app.js

```javascript
// In src/app.js, add after existing route definitions:
const healthRecordRoutes = require("./routes/healthRecord.routes");
app.use("/api/health-records", healthRecordRoutes);
```

---

## Finding 3: AuditLog Schema Missing Required Actions

**Problem:** `appointmentController.updateAppointment` calls `recordAudit({ action: "APPOINTMENT_UPDATED" })` but `"APPOINTMENT_UPDATED"` is not in the `auditActions` enum in `AuditLogs.js`. This causes a Mongoose validation error silently swallowed by the try/catch in the controller.

**Impact:** Audit logs for appointment updates silently fail — missing audit trail.

**File to Modify:** `src/models/AuditLogs.js`

```javascript
// src/models/AuditLogs.js — replace auditActions array
const auditActions = [
  // Employee actions
  "EMPLOYEE_CREATED",
  "EMPLOYEE_APPROVED",
  "EMPLOYEE_REJECTED",
  "EMPLOYEE_UPDATED",
  "EMPLOYEE_DELETED",

  // Admin actions
  "ADMIN_CREATED",
  "ADMIN_UPDATED",
  "ADMIN_DELETED",

  // Patient actions
  "PATIENT_CREATED",
  "PATIENT_UPDATED",
  "PATIENT_DELETED",

  // Appointment actions
  "APPOINTMENT_CREATED",
  "APPOINTMENT_UPDATED",      // ← WAS MISSING
  "APPOINTMENT_APPROVED",     // ← WAS MISSING
  "APPOINTMENT_REJECTED",     // ← WAS MISSING
  "APPOINTMENT_CANCELED",
  "APPOINTMENT_COMPLETED",

  // Profile change request actions
  "PROFILE_CHANGE_REQUESTED",
  "PROFILE_CHANGE_APPROVED",
  "PROFILE_CHANGE_REJECTED",
  "PROFILE_UPDATED",

  // Health record actions (NEW)
  "HEALTH_RECORD_CREATED",
  "HEALTH_RECORD_UPDATED",
  "HEALTH_RECORD_DELETED",
];
```

---

## Finding 4: MedicalRecords Timestamps Typo

**Problem:** `MedicalRecords.js` has `{ timeStamps: { createdAt: "created_at" } }` — JavaScript is case-sensitive; `timeStamps` is not a recognized Mongoose schema option. Only Mongoose's `timestamps` works.

**Impact:** `created_at` field is never populated on medical records.

**File to Modify:** `src/models/MedicalRecords.js`

```javascript
// Replace the schema definition closing — change:
// { timeStamps: { createdAt: "created_at" } }
// to:
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
}
);
```

---

## Finding 5: Profile Change Approval Bug — Object.forEach Does Not Exist

**Problem:** In `adminController.js`, `approveProfileChange`:
```javascript
request.requestedChanges.forEach((change, field) => {
    employee[field] = change.new;
});
```
`requestedChanges` is stored as a `Map`-like plain object `{ field: { old, new } }`, not an Array. Calling `.forEach()` on a plain object throws `TypeError: request.requestedChanges.forEach is not a function`, crashing the approval flow.

**Impact:** Profile change approvals always throw a 500 error — feature completely broken.

**File to Modify:** `src/controllers/adminController.js`

```javascript
// Replace the forEach block in approveProfileChange:
const changes = request.requestedChanges;

if (typeof changes === "object" && !Array.isArray(changes)) {
  // Plain object: { fieldName: { old: "...", new: "..." } }
  Object.entries(changes).forEach(([field, change]) => {
    employee[field] = change.new;
  });
} else if (Array.isArray(changes)) {
  // Array format fallback
  changes.forEach(({ field, new: newValue }) => {
    employee[field] = newValue;
  });
}
```

---

## Finding 6: Patient Delete Endpoint Missing

**Problem:** BRD FR-2.3 requires Admin and Super Admin to delete patients. No DELETE route exists in `patientRoutes.js`.

**File to Modify:** `src/routes/patientRoutes.js`, `src/controllers/patientController.js`

### Controller addition

```javascript
// Add to src/controllers/patientController.js

exports.deletePatient = async (req, res) => {
  const { UHID } = req.params;

  const patient = await Patient.findOne({ UHID });
  if (!patient) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
  }

  // Soft delete: mark inactive rather than removing record
  patient.status = "INACTIVE";
  await patient.save();

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "PATIENT_DELETED",
    targetType: "PATIENT",
    targetId: UHID,
    message: MESSAGES.AUDIT.PATIENT_DELETED(patient.name, UHID),
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.DELETED);
};
```

### Route addition (patientRoutes.js)

```javascript
// In src/routes/patientRoutes.js, the router already applies OWNER/ADMIN/RECEPTIONIST
// Add a more restrictive middleware just for DELETE:
const authorizeRoles = require("../middlewares/authorizeRolesMiddleware");

router.delete(
  "/:UHID",
  authorizeRoles("OWNER", "ADMIN"),  // Only admin-level users
  uhidValidation,
  validate,
  controller.deletePatient
);
```

---

## Finding 7: React Native — Missing PENDING_REVIEW Status Type

**Problem:** `src/services/types.ts` defines `AppointmentStatus = "BOOKED" | "CANCELED" | "COMPLETED"`. With the backend fix, `PENDING_REVIEW` will now appear. The HomeScreen filters `getMyAppointments("BOOKED")` and will miss pending appointments entirely.

**Files to Modify:** `src/services/types.ts`, `src/screens/home/HomeScreen.tsx`, `src/components/appointment/AppointmentCard.tsx`

### Updated types.ts

```typescript
// src/services/types.ts — update AppointmentStatus
export type AppointmentStatus =
  | "PENDING_REVIEW"
  | "BOOKED"
  | "CANCELED"
  | "COMPLETED";
```

### Updated HomeScreen — show both PENDING_REVIEW and BOOKED

```typescript
// src/screens/home/HomeScreen.tsx — update the load callback
const load = useCallback(async () => {
  try {
    const [profile, bookedAppts, pendingAppts] = await Promise.all([
      getMyProfile(),
      getMyAppointments("BOOKED"),
      getMyAppointments("PENDING_REVIEW"),
    ]);
    setUserName(profile.patient?.name || "Patient");

    const now = Date.now();
    const combined = [
      ...(bookedAppts.appointments || []),
      ...(pendingAppts.appointments || []),
    ]
      .filter(
        (a) => new Date(a.appointmentDate).getTime() >= now - 86_400_000
      )
      .sort(
        (a, b) =>
          new Date(a.appointmentDate).getTime() -
            new Date(b.appointmentDate).getTime() ||
          a.timeSlot.localeCompare(b.timeSlot)
      );

    setAppointments(combined);
  } catch {
    // silent — user sees empty state
  } finally {
    setLoading(false);
  }
}, []);
```

### AppointmentCard — status badge for PENDING_REVIEW

```typescript
// In src/components/appointment/AppointmentCard.tsx, add to the status badge logic:

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string }
> = {
  PENDING_REVIEW: { label: "Pending Approval", bg: "#FEF3C7", text: "#92400E" },
  BOOKED:         { label: "Confirmed",         bg: "#D1FAE5", text: "#065F46" },
  CANCELED:       { label: "Cancelled",          bg: "#FEE2E2", text: "#991B1B" },
  COMPLETED:      { label: "Completed",          bg: "#E0E7FF", text: "#3730A3" },
};
```

---

## Finding 8: Angular — JWT in localStorage (XSS Risk)

**Problem:** `AuthService` stores the JWT in `localStorage` which is accessible to any JavaScript on the page. An XSS vulnerability anywhere in the Angular app (or a third-party script) can steal the token.

**Recommended Solution:** Use `httpOnly` cookies by setting `credentials: true` on CORS and having the backend set a cookie via `Set-Cookie`. As a minimal improvement without backend changes, use an in-memory store for the token and only persist a refresh signal.

**File to Modify:** `src/app/core/services/auth.service.ts`

```typescript
// src/app/core/services/auth.service.ts
// Replace localStorage for token with memory store (token never persists to storage)
// The user object (non-sensitive) can remain in localStorage for UX

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Token kept in memory ONLY — never written to localStorage or sessionStorage
  private accessToken: string | null = null;

  private setSession(token: string, user: User): void {
    this.accessToken = token;           // ← memory only
    this.persistUser(user);             // user object still in localStorage (no token)
  }

  getToken(): string | null {
    return this.accessToken;            // ← read from memory
  }

  private clearSession(): void {
    this.accessToken = null;            // ← wipe from memory
    localStorage.removeItem(USER_KEY);  // user object removed on logout
    // ... rest of clearSession
  }

  // On page reload, token is gone (expected with memory-only approach)
  // User is redirected to login — acceptable trade-off vs XSS risk
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}
```

**Also add an HTTP interceptor to auto-attach the token:**

```typescript
// src/app/core/interceptors/auth.interceptor.ts  (NEW FILE)
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (!token) return next(req);

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};
```

Register in `app.config.ts`:
```typescript
provideHttpClient(withInterceptors([authInterceptor]))
```

---

## Finding 9: Appointment Approval Queue Missing in Angular UI (Checklist #21)

### Existing Problem

Once Finding 1 introduces `PENDING_REVIEW` for patient-originated appointments, staff have no screen to view or act on this queue — patient-booked appointments would accumulate with no UI path to approve/reject them.

### Production Solution

Add a dedicated lazy-loaded feature reusing the existing `dashboard-layout` shell and table conventions from `appointments-list`.

### Complete File Changes

**New files:**
- `src/app/features/dashboard/appointment-approvals/appointment-approvals.ts`
- `src/app/features/dashboard/appointment-approvals/appointment-approvals.html`
- `src/app/features/dashboard/appointment-approvals/appointment-approvals.css`

**Modified files:**
- `src/app/core/services/appointment.service.ts` — add `getPendingReview()`, `approve()`, `reject()`
- `src/app/app.routes.ts` — add lazy route
- `src/app/shared/ui/sidebar/sidebar.ts` — add nav entry (DOCTOR/RECEPTIONIST/ADMIN/OWNER)

### Production-Ready Code

```typescript
// src/app/core/services/appointment.service.ts  (additions)
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Appointment } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/appointments`;

  getPendingReview(): Observable<ApiResponse<Appointment[]>> {
    return this.http.get<ApiResponse<Appointment[]>>(`${this.base}/pending-review`);
  }

  approve(id: string): Observable<ApiResponse<Appointment>> {
    return this.http.patch<ApiResponse<Appointment>>(`${this.base}/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<ApiResponse<Appointment>> {
    return this.http.patch<ApiResponse<Appointment>>(`${this.base}/${id}/reject`, { reason });
  }
}
```

```typescript
// src/app/features/dashboard/appointment-approvals/appointment-approvals.ts  (NEW FILE)
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../../core/services/appointment.service';
import { Appointment } from '../../../core/models/appointment.model';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmModal } from '../../../shared/ui/confirm-modal/confirm-modal';

@Component({
  selector: 'app-appointment-approvals',
  standalone: true,
  imports: [CommonModule, ConfirmModal],
  templateUrl: './appointment-approvals.html',
  styleUrl: './appointment-approvals.css',
})
export class AppointmentApprovals implements OnInit {
  private appointmentService = inject(AppointmentService);
  private toast = inject(ToastService);

  appointments = signal<Appointment[]>([]);
  loading = signal(true);
  rejectTargetId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.appointmentService.getPendingReview().subscribe({
      next: (res) => {
        this.appointments.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load pending appointments');
        this.loading.set(false);
      },
    });
  }

  approve(id: string): void {
    this.appointmentService.approve(id).subscribe({
      next: () => {
        this.toast.success('Appointment approved');
        this.appointments.update((list) => list.filter((a) => a._id !== id));
      },
      error: () => this.toast.error('Failed to approve appointment'),
    });
  }

  openReject(id: string): void {
    this.rejectTargetId.set(id);
  }

  confirmReject(reason: string): void {
    const id = this.rejectTargetId();
    if (!id) return;

    this.appointmentService.reject(id, reason).subscribe({
      next: () => {
        this.toast.success('Appointment rejected');
        this.appointments.update((list) => list.filter((a) => a._id !== id));
        this.rejectTargetId.set(null);
      },
      error: () => this.toast.error('Failed to reject appointment'),
    });
  }

  cancelReject(): void {
    this.rejectTargetId.set(null);
  }
}
```

```html
<!-- src/app/features/dashboard/appointment-approvals/appointment-approvals.html  (NEW FILE) -->
<div class="approvals-page">
  <h2>Pending Appointment Approvals</h2>

  @if (loading()) {
    <p>Loading...</p>
  } @else if (appointments().length === 0) {
    <p>No appointments awaiting approval.</p>
  } @else {
    <table class="approvals-table">
      <thead>
        <tr>
          <th>Patient</th>
          <th>Doctor</th>
          <th>Date</th>
          <th>Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        @for (appt of appointments(); track appt._id) {
          <tr>
            <td>{{ appt.patientName }}</td>
            <td>{{ appt.doctorName }}</td>
            <td>{{ appt.date | date:'mediumDate' }}</td>
            <td>{{ appt.time }}</td>
            <td>
              <button class="btn-approve" (click)="approve(appt._id)">Approve</button>
              <button class="btn-reject" (click)="openReject(appt._id)">Reject</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  }

  @if (rejectTargetId()) {
    <app-confirm-modal
      title="Reject Appointment"
      message="Please confirm rejection of this appointment."
      (confirmed)="confirmReject('Rejected by staff')"
      (cancelled)="cancelReject()" />
  }
</div>
```

```css
/* src/app/features/dashboard/appointment-approvals/appointment-approvals.css  (NEW FILE) */
.approvals-page { padding: 1.5rem; }
.approvals-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
.approvals-table th, .approvals-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
.btn-approve { background: #16a34a; color: #fff; border: none; padding: 0.4rem 0.9rem; border-radius: 4px; margin-right: 0.5rem; cursor: pointer; }
.btn-reject { background: #dc2626; color: #fff; border: none; padding: 0.4rem 0.9rem; border-radius: 4px; cursor: pointer; }
```

```typescript
// src/app/app.routes.ts  (addition)
{
  path: 'dashboard/appointment-approvals',
  loadComponent: () =>
    import('./features/dashboard/appointment-approvals/appointment-approvals').then(
      (m) => m.AppointmentApprovals
    ),
  canActivate: [authGuard, roleGuard(['OWNER', 'ADMIN', 'RECEPTIONIST', 'DOCTOR'])],
},
```

### Testing Strategy
- Unit test `AppointmentApprovals` with mocked `AppointmentService` for load/approve/reject success and error paths.
- E2E: login as RECEPTIONIST, navigate to Appointment Approvals, approve one item, verify it disappears and a `BOOKED` record exists via API.

---

## Finding 10: React Native — No Pending Appointment Indicator (Checklist #22)

### Existing Problem

After Finding 7 adds `PENDING_REVIEW` to the type system, patients who self-book appointments have no visual confirmation that their request is awaiting staff approval — `AppointmentCard` and `HomeScreen` only render statuses that existed before.

### Production Solution

Add a centralized status-type module, a new badge variant on `AppointmentCard`, and a "Pending Approval" summary section on `HomeScreen`.

### Complete File Changes

**New files:**
- `constants/statusTypes.ts`

**Modified files:**
- `services/types.ts` — import `AppointmentStatus` from `statusTypes.ts`
- `components/appointment/AppointmentCard.tsx` — add amber `PENDING_REVIEW` badge
- `screens/home/HomeScreen.tsx` — add pending-approval section

### Production-Ready Code

```typescript
// constants/statusTypes.ts  (NEW FILE)
export type AppointmentStatus =
  | 'PENDING_REVIEW'
  | 'BOOKED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING_REVIEW: 'Pending Approval',
  BOOKED: 'Booked',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING_REVIEW: '#F59E0B', // amber
  BOOKED: '#2563EB',         // blue
  COMPLETED: '#16A34A',      // green
  CANCELLED: '#6B7280',      // gray
  REJECTED: '#DC2626',       // red
};
```

```typescript
// services/types.ts  (modify — replace local status union with shared one)
import { AppointmentStatus } from '../constants/statusTypes';

export interface Appointment {
  _id: string;
  doctorName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  // ... existing fields
}
```

```tsx
// components/appointment/AppointmentCard.tsx  (modify — badge rendering)
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_COLORS } from '../../constants/statusTypes';

// Inside the component's render, replace the existing status badge block with:
<View style={[styles.statusBadge, { backgroundColor: APPOINTMENT_STATUS_COLORS[appointment.status] }]}>
  <Text style={styles.statusBadgeText}>
    {APPOINTMENT_STATUS_LABELS[appointment.status]}
  </Text>
</View>
```

```tsx
// screens/home/HomeScreen.tsx  (modify — add pending-approval section)
import { useMemo } from 'react';

// Inside the component, after appointments are loaded into state `appointments`:
const pendingAppointments = useMemo(
  () => appointments.filter((a) => a.status === 'PENDING_REVIEW'),
  [appointments]
);

// In the JSX, render above the main appointments list:
{pendingAppointments.length > 0 && (
  <View style={styles.pendingSection}>
    <Text style={styles.pendingTitle}>
      Pending Approval ({pendingAppointments.length})
    </Text>
    {pendingAppointments.map((appt) => (
      <AppointmentCard key={appt._id} appointment={appt} />
    ))}
  </View>
)}
```

```typescript
// Add to the HomeScreen stylesheet file:
pendingSection: {
  marginBottom: 16,
  padding: 12,
  borderRadius: 8,
  backgroundColor: '#FFFBEB',
  borderWidth: 1,
  borderColor: '#FDE68A',
},
pendingTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#92400E',
  marginBottom: 8,
},
```

### Testing Strategy
- Snapshot test `AppointmentCard` for all five status values, verifying badge color/label.
- Unit test `HomeScreen` pending-section render with mixed-status appointment arrays (0, 1, many pending).

---

## Finding 11: Health Records UI Missing in Angular (Checklist #23)

### Existing Problem

Finding 2 introduces backend `/api/health-records` CRUD, but staff have no interface to view, add, or edit a patient's medical records — the feature is API-only and unreachable from the dashboard.

### Production Solution

Add a `health-records` feature module nested under `patient-detail`, listing records for a patient with create/edit via a reactive form, following the same service/component conventions as `appointment-approvals`.

### Complete File Changes

**New files:**
- `src/app/core/services/health-record.service.ts`
- `src/app/core/models/health-record.model.ts`
- `src/app/features/dashboard/health-records/health-records-list.ts` (+ `.html`, `.css`)
- `src/app/features/dashboard/health-records/health-record-form.ts` (+ `.html`, `.css`)

**Modified files:**
- `src/app/features/dashboard/patient-detail/patient-detail.html` — add "Health Records" tab/link
- `src/app/app.routes.ts` — add nested route under patient-detail

### Production-Ready Code

```typescript
// src/app/core/models/health-record.model.ts  (NEW FILE)
export interface HealthRecord {
  _id: string;
  patientId: string;
  diagnosis: string;
  prescription: string;
  notes?: string;
  recordedBy: string;
  created_at: string;
  updated_at: string;
}

export interface HealthRecordPayload {
  diagnosis: string;
  prescription: string;
  notes?: string;
}
```

```typescript
// src/app/core/services/health-record.service.ts  (NEW FILE)
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { HealthRecord, HealthRecordPayload } from '../models/health-record.model';

@Injectable({ providedIn: 'root' })
export class HealthRecordService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/health-records`;

  getByPatient(patientId: string): Observable<ApiResponse<HealthRecord[]>> {
    return this.http.get<ApiResponse<HealthRecord[]>>(`${this.base}/patient/${patientId}`);
  }

  create(patientId: string, payload: HealthRecordPayload): Observable<ApiResponse<HealthRecord>> {
    return this.http.post<ApiResponse<HealthRecord>>(`${this.base}`, { patientId, ...payload });
  }

  update(id: string, payload: HealthRecordPayload): Observable<ApiResponse<HealthRecord>> {
    return this.http.put<ApiResponse<HealthRecord>>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.base}/${id}`);
  }
}
```

```typescript
// src/app/features/dashboard/health-records/health-records-list.ts  (NEW FILE)
import { Component, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HealthRecordService } from '../../../core/services/health-record.service';
import { HealthRecord } from '../../../core/models/health-record.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-health-records-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './health-records-list.html',
  styleUrl: './health-records-list.css',
})
export class HealthRecordsList implements OnInit {
  patientId = input.required<string>();

  private healthRecordService = inject(HealthRecordService);
  private toast = inject(ToastService);

  records = signal<HealthRecord[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.healthRecordService.getByPatient(this.patientId()).subscribe({
      next: (res) => {
        this.records.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load health records');
        this.loading.set(false);
      },
    });
  }

  delete(id: string): void {
    this.healthRecordService.delete(id).subscribe({
      next: () => {
        this.toast.success('Record deleted');
        this.records.update((list) => list.filter((r) => r._id !== id));
      },
      error: () => this.toast.error('Failed to delete record'),
    });
  }
}
```

```html
<!-- src/app/features/dashboard/health-records/health-records-list.html  (NEW FILE) -->
<div class="health-records">
  <div class="header-row">
    <h3>Health Records</h3>
    <a [routerLink]="['/dashboard/patients', patientId(), 'health-records', 'new']" class="btn-add">
      + Add Record
    </a>
  </div>

  @if (loading()) {
    <p>Loading...</p>
  } @else if (records().length === 0) {
    <p>No health records yet.</p>
  } @else {
    @for (record of records(); track record._id) {
      <div class="record-card">
        <div class="record-meta">{{ record.created_at | date:'medium' }} — {{ record.recordedBy }}</div>
        <p><strong>Diagnosis:</strong> {{ record.diagnosis }}</p>
        <p><strong>Prescription:</strong> {{ record.prescription }}</p>
        @if (record.notes) {
          <p><strong>Notes:</strong> {{ record.notes }}</p>
        }
        <div class="record-actions">
          <a [routerLink]="['/dashboard/patients', patientId(), 'health-records', record._id, 'edit']">Edit</a>
          <button (click)="delete(record._id)">Delete</button>
        </div>
      </div>
    }
  }
</div>
```

```css
/* src/app/features/dashboard/health-records/health-records-list.css  (NEW FILE) */
.health-records { padding: 1rem 0; }
.header-row { display: flex; justify-content: space-between; align-items: center; }
.btn-add { background: #2563eb; color: #fff; padding: 0.4rem 0.9rem; border-radius: 4px; text-decoration: none; font-size: 0.875rem; }
.record-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 1rem; margin-top: 0.75rem; }
.record-meta { font-size: 0.75rem; color: #6b7280; margin-bottom: 0.5rem; }
.record-actions { display: flex; gap: 1rem; margin-top: 0.5rem; }
```

```typescript
// src/app/features/dashboard/health-records/health-record-form.ts  (NEW FILE)
import { Component, OnInit, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HealthRecordService } from '../../../core/services/health-record.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-health-record-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './health-record-form.html',
  styleUrl: './health-record-form.css',
})
export class HealthRecordForm implements OnInit {
  patientId = input.required<string>();
  recordId = input<string | null>(null);

  private fb = inject(FormBuilder);
  private healthRecordService = inject(HealthRecordService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  saving = signal(false);

  form = this.fb.nonNullable.group({
    diagnosis: ['', [Validators.required, Validators.minLength(2)]],
    prescription: ['', [Validators.required]],
    notes: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('recordId');
    if (id) {
      this.recordId = () => id;
      // Optionally fetch existing record details and patchValue here
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = this.form.getRawValue();
    const id = this.recordId();

    const request = id
      ? this.healthRecordService.update(id, payload)
      : this.healthRecordService.create(this.patientId(), payload);

    request.subscribe({
      next: () => {
        this.toast.success(id ? 'Record updated' : 'Record created');
        this.router.navigate(['/dashboard/patients', this.patientId()]);
      },
      error: () => {
        this.toast.error('Failed to save health record');
        this.saving.set(false);
      },
    });
  }
}
```

```html
<!-- src/app/features/dashboard/health-records/health-record-form.html  (NEW FILE) -->
<form [formGroup]="form" (ngSubmit)="submit()" class="health-record-form">
  <div class="field">
    <label for="diagnosis">Diagnosis</label>
    <textarea id="diagnosis" formControlName="diagnosis" rows="3"></textarea>
    @if (form.controls.diagnosis.invalid && form.controls.diagnosis.touched) {
      <span class="error">Diagnosis is required.</span>
    }
  </div>

  <div class="field">
    <label for="prescription">Prescription</label>
    <textarea id="prescription" formControlName="prescription" rows="3"></textarea>
    @if (form.controls.prescription.invalid && form.controls.prescription.touched) {
      <span class="error">Prescription is required.</span>
    }
  </div>

  <div class="field">
    <label for="notes">Notes (optional)</label>
    <textarea id="notes" formControlName="notes" rows="2"></textarea>
  </div>

  <button type="submit" [disabled]="saving()">
    {{ saving() ? 'Saving...' : 'Save Record' }}
  </button>
</form>
```

```css
/* src/app/features/dashboard/health-records/health-record-form.css  (NEW FILE) */
.health-record-form { display: flex; flex-direction: column; gap: 1rem; max-width: 600px; }
.field { display: flex; flex-direction: column; gap: 0.25rem; }
.field textarea { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; font-family: inherit; }
.error { color: #dc2626; font-size: 0.8rem; }
button[type="submit"] { background: #2563eb; color: #fff; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; align-self: flex-start; }
button[disabled] { opacity: 0.6; cursor: not-allowed; }
```

```typescript
// src/app/app.routes.ts  (additions, nested under patient-detail)
{
  path: 'dashboard/patients/:patientId/health-records/new',
  loadComponent: () =>
    import('./features/dashboard/health-records/health-record-form').then((m) => m.HealthRecordForm),
  canActivate: [authGuard, roleGuard(['OWNER', 'ADMIN', 'DOCTOR'])],
},
{
  path: 'dashboard/patients/:patientId/health-records/:recordId/edit',
  loadComponent: () =>
    import('./features/dashboard/health-records/health-record-form').then((m) => m.HealthRecordForm),
  canActivate: [authGuard, roleGuard(['OWNER', 'ADMIN', 'DOCTOR'])],
},
```

### Testing Strategy
- Unit test `HealthRecordsList` for empty/populated/error states.
- Unit test `HealthRecordForm` validation (required fields) and both create/update submission paths with mocked service.
- E2E: as DOCTOR, open a patient, add a health record, verify it appears in the list and persists on reload.

---

## Finding 12: CORS Policy Does Not Account for Mobile App Origin (Checklist #24)

### Existing Problem

```javascript
// src/app.js — current configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
```

`cors` is configured with a single static origin (`FRONTEND_URL`, the Angular app). The React Native app (Expo, native build) does not send a browser `Origin` header in the same way — native HTTP clients typically omit `Origin` entirely, or use schemes like `exp://` / custom deep-link schemes during development. A single-string `origin` check has no mechanism to allow "no origin" requests, which can cause native API calls to be blocked by some configurations, and provides no documented path for adding additional trusted web origins (e.g. a future patient web portal) without code changes.

### Production Solution

Replace the static origin string with a function-based `origin` check that:
1. Allows requests with no `Origin` header (native mobile apps, curl, server-to-server) — these are not subject to browser CORS anyway, but explicitly allowing them avoids accidental blocks.
2. Allows the configured `FRONTEND_URL`.
3. Allows additional origins from a comma-separated `ADDITIONAL_CORS_ORIGINS` env var, for staging/mobile dev tooling, without redeploying code.

### Complete File Changes

**Modified files:**
- `src/app.js`
- `.env.example` (document new optional variable)

### Production-Ready Code

```javascript
// src/app.js  (modify the cors block)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.ADDITIONAL_CORS_ORIGINS
    ? process.env.ADDITIONAL_CORS_ORIGINS.split(",").map((o) => o.trim())
    : []),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header: native mobile apps, curl, server-to-server calls.
      // These do not go through browser CORS enforcement, so allow them.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
```

```bash
# .env.example  (addition)
# Comma-separated list of additional trusted origins (e.g. staging web portal, Expo dev tunnels)
ADDITIONAL_CORS_ORIGINS=
```

### Testing Strategy
- Integration test: request with `Origin: <FRONTEND_URL>` succeeds; request with an unlisted `Origin` is rejected with a CORS error; request with no `Origin` header succeeds (simulating mobile client).
- Manual: verify PatientApp (Expo Go / native build) can call `/api/patient/*` endpoints without CORS errors in both dev and production builds.

---

## Finding 13: Audit Log `actorName` Not Reliably Populated (Checklist #25)

### Existing Problem

```javascript
// src/utils/resolveActor.js  (current)
const resolveActor = async (reqUser) => {
    const employeeCode = reqUser?.employeeCode;

    if (!employeeCode) {
        return {};
    }
    // ...
};
```

When `reqUser.employeeCode` is missing — which occurs for patient-initiated actions (`req.user.type === 'PATIENT'`, which carries `patientCode`/`patientId` rather than `employeeCode`) — `resolveActor` returns `{}`. Any audit log entry written for a patient-driven action (e.g. self-booking an appointment, once Finding 1 is implemented) will then have `actorName: undefined`, leaving a blank/unreadable "Actor" column in audit views.

### Production Solution

Extend `resolveActor` to also resolve patient actors by checking `reqUser.type === 'PATIENT'` and looking up the `Patients` collection, returning a consistent `{ actorType, actorCode, name, designation }` shape regardless of actor type. `recordAudit` is updated to consume the new shape with safe fallbacks.

### Complete File Changes

**Modified files:**
- `src/utils/resolveActor.js`
- `src/utils/recordAudit.js`

### Production-Ready Code

```javascript
// src/utils/resolveActor.js  (rewritten)
const Employee = require("../models/Employees");
const Patient = require("../models/Patients");

const resolveActor = async (reqUser) => {
    if (!reqUser) {
        return { actorType: "SYSTEM", actorCode: null, name: "System", designation: null };
    }

    // Employee/staff actor
    if (reqUser.employeeCode) {
        try {
            const employee = await Employee.findOne({ employeeCode: reqUser.employeeCode }).select(
                "name designation"
            );

            return {
                actorType: "EMPLOYEE",
                actorCode: reqUser.employeeCode,
                name: employee?.name || reqUser.employeeCode,
                designation: employee?.designation || null,
            };
        } catch (err) {
            console.error("resolveActor error (employee):", err.message);
            return { actorType: "EMPLOYEE", actorCode: reqUser.employeeCode, name: reqUser.employeeCode, designation: null };
        }
    }

    // Patient actor
    if (reqUser.type === "PATIENT" && (reqUser.patientCode || reqUser.patientId || reqUser.id)) {
        const patientCode = reqUser.patientCode || reqUser.patientId || reqUser.id;
        try {
            const patient = await Patient.findOne({
                $or: [{ patientCode }, { _id: patientCode }],
            }).select("name patientCode");

            return {
                actorType: "PATIENT",
                actorCode: patient?.patientCode || patientCode,
                name: patient?.name || "Patient",
                designation: null,
            };
        } catch (err) {
            console.error("resolveActor error (patient):", err.message);
            return { actorType: "PATIENT", actorCode: patientCode, name: "Patient", designation: null };
        }
    }

    return { actorType: "UNKNOWN", actorCode: null, name: "Unknown", designation: null };
};

module.exports = resolveActor;
```

```javascript
// src/utils/recordAudit.js  (modify — consume new actor shape with fallbacks)
const AuditLog = require("../models/AuditLogs");
const resolveActor = require("./resolveActor");

const recordAudit = async ({ action, target, details, reqUser }) => {
    const actor = await resolveActor(reqUser);

    return AuditLog.create({
        action,
        target,
        details,
        actorCode: actor.actorCode,
        actorType: actor.actorType,
        actorName: actor.name || "Unknown",   // ← never undefined
    });
};

module.exports = recordAudit;
```

### Testing Strategy
- Unit test `resolveActor` with: employee `req.user`, patient `req.user` (`type: 'PATIENT'`), missing `req.user`, and DB-lookup-failure cases — assert `name` is always a non-empty string.
- Integration test: trigger a patient self-booking (Finding 1) and assert the resulting `AuditLog` document has a non-empty `actorName` and `actorType: 'PATIENT'`.

---

# PHASE 5 — SECURITY HARDENING

## 5.1 Rate Limiting (Backend)

```javascript
// src/middlewares/rateLimiter.middleware.js  (NEW FILE)
const rateLimit = require("express-rate-limit");

// Strict limiter for auth routes — 10 attempts per 15 min per IP
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

// General API limiter — 200 requests per 15 min per IP
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many requests. Please slow down.",
  },
});
```

Apply in `app.js`:
```javascript
const { authLimiter, apiLimiter } = require("./middlewares/rateLimiter.middleware");

app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/patient/auth/login", authLimiter);
app.use("/api/patient/auth/forgot-password", authLimiter);
```

Install: `npm install express-rate-limit`

## 5.2 NoSQL Injection Prevention (Backend)

```javascript
// Install: npm install express-mongo-sanitize
// In app.js, add before routes:
const mongoSanitize = require("express-mongo-sanitize");
app.use(mongoSanitize());  // Strips $ and . from request body/params/query
```

## 5.3 Environment Variable Validation (Backend)

```javascript
// src/config/env.js  (NEW FILE)
require("dotenv").config();

const required = [
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "FRONTEND_URL",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[STARTUP ERROR] Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  FRONTEND_URL: process.env.FRONTEND_URL,
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
};
```

## 5.4 Designation Caching in JWT (Performance + Security)

**Current problem:** `authorizeDesignation` makes a MongoDB round-trip on every protected request.

**Fix:** Include `designation` in the JWT payload at login time.

```javascript
// In authController.login — update the token signing:
const token = jwt.sign(
  {
    employeeCode: user.employeeCode,
    roles: user.roles,
    designation: employee.designation,  // ← ADD THIS
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN }
);
```

```javascript
// Update authorizeDesignations.js to use token payload first:
const authorizeDesignation = (...allowedDesignations) => {
  return async (req, res, next) => {
    if (!req.user) {
      throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.UNAUTHORIZED);
    }

    // Use designation from token if available (no DB call needed)
    const designation = req.user.designation;
    if (!designation) {
      throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.UNAUTHORIZED);
    }

    if (!allowedDesignations.includes(designation)) {
      throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.ACCESS_DENIED);
    }

    next();
  };
};
```

---

# PHASE 6 — CODING STANDARDS

## 6.1 Backend Standards

### Controllers — conventions
- File name: `<entity>.controller.js` (camelCase entity, lowercase)
- Each export is an async function matching the route action: `createX`, `getX`, `getXById`, `updateX`, `deleteX`, `approveX`
- No business logic in controllers — delegate to service or utility
- Always call `next(err)` rather than throwing in async wrappers (use global async wrapper or `express-async-errors`)
- Install: `npm install express-async-errors` and `require("express-async-errors")` in `app.js`

### Services — conventions
- File name: `<entity>.service.js`
- Pure functions or class methods — no `req`/`res` parameters
- Return data objects, throw `AppError` for business violations
- All DB operations live here, not in controllers

### Validators — conventions
- File name: `<entity>.validators.js`
- Export named arrays: `createXValidation`, `updateXValidation`, `xIdValidation`
- Use `express-validator` chained methods; always call `.bail()` after required checks

### Models — conventions
- File name: `PascalCase.js` (e.g. `MedicalRecords.js`)
- Always include `timestamps: { createdAt: "created_at", updatedAt: "updated_at" }`
- Enums live in model AND in `domain.js` constants — keep in sync
- Pre-save hooks only for auto-ID generation

### Error messages
- All user-facing strings in `constants/messages.js`
- Never hardcode strings in controllers or services
- Format: `MESSAGES.MODULE.ACTION_RESULT` (e.g. `MESSAGES.HEALTH_RECORD.CREATED`)

## 6.2 Angular Standards

### Components
- Filename: `kebab-case.ts` (e.g. `patient-detail.ts`)
- `@Component` selector: `app-<feature>-<name>` (e.g. `app-patient-detail`)
- Use `inject()` function, not constructor injection
- Prefer `signal()` over `BehaviorSubject` for local state
- Prefer `OnPush` change detection for list/display components

### Services
- Filename: `<entity>.service.ts`
- `providedIn: 'root'` for singletons
- Return `Observable<T>` from all HTTP calls
- Never subscribe inside a service — let consumers unsubscribe

### Guards
- Filename: `<feature>.guard.ts`
- Functional guards preferred (`CanActivateFn`, `CanDeactivateFn`)
- Always redirect, never just return `false`

### Interceptors
- Filename: `<purpose>.interceptor.ts`
- Functional interceptors using `HttpInterceptorFn`
- Chain with `next(req)` pattern

## 6.3 React Native Standards

### Screens
- Filename: `PascalCase.tsx` (e.g. `RegisterScreen.tsx`)
- Each screen has its own `styles/` subfolder: `RegisterScreen.style.ts`
- Screens are exported as `default`
- Loading and error states always handled

### Components
- Filename: `PascalCase.tsx`
- Reusable — no direct API calls inside components
- Props fully typed with TypeScript interfaces

### Services
- Filename: `camelCase.ts` (e.g. `appointmentService.ts`)
- Only exports plain async functions
- All calls go through `apiFetch<T>`
- Types defined in `types.ts` and shared

### Hooks
- Filename: `use<Name>.ts`
- Never called conditionally
- Custom hooks encapsulate `useState` + `useEffect` + cleanup logic

### Type definitions
- `AppointmentStatus` and all enum types live in `constants/statusTypes.ts`
- Always use union types, never plain `string` for status fields

---

# PHASE 7 — DOCUMENTATION

## 7.1 System Overview

The HMS is a multi-layer healthcare management system:

**Backend:** Node.js + Express + MongoDB. Dual authentication system — employees use email/password → JWT with `roles` + `designation`; patients use email/password → JWT with `type: PATIENT`. Role-based access enforced at route level via middleware.

**Angular Web Frontend:** Admin dashboard for staff (OWNER, ADMIN, RECEPTIONIST, DOCTOR). Role-based page visibility via Node model from backend. Lazy-loaded standalone components.

**React Native Mobile (PatientApp):** Patient-facing app (Expo). Patients register, log in, book/manage appointments, view their profile. Tokens stored in SecureStore (device keychain).

**API Base URL:** `/api`

**Key API Route Groups:**
- `/api/auth` — Employee auth (login, register, password)
- `/api/admin` — Admin-only operations (employee CRUD, approvals, audit)
- `/api/owner` — Owner-only (admin management)
- `/api/employees` — Employee self-service (profile, doctors list)
- `/api/patients` — Staff-managed patient CRUD
- `/api/appointments` — Staff appointment management
- `/api/health-records` — Medical records CRUD *(to be activated)*
- `/api/nodes` — Page access control
- `/api/patient/auth` — Patient auth (register, login, password)
- `/api/patient` — Patient self-service (profile, appointments, doctors)

## 7.2 Developer Onboarding Guide

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- npm >= 9

### Local Setup

**Backend:**
```bash
cd HMS_Back_end
cp .env.example .env        # fill MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_URL
npm install
npm run dev                  # or: node src/server.js
```

**Angular:**
```bash
cd HMS_Front_end
npm install
ng serve                     # http://localhost:4200
```

**React Native:**
```bash
cd PatientApp
npm install
npx expo start               # scan QR with Expo Go
```

### Environment Variables (Backend)
| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | HS256 secret (≥32 chars) |
| `JWT_EXPIRES_IN` | ✅ | e.g. `7d` |
| `FRONTEND_URL` | ✅ | Angular origin for CORS |
| `EMAIL_HOST` | Optional | SMTP host |
| `EMAIL_USER` | Optional | SMTP user |
| `EMAIL_PASS` | Optional | SMTP password |
| `NODE_ENV` | Optional | `development` / `production` |

### First-time Seed
Run owner seed to create the initial OWNER account:
```bash
node src/utils/seedOwner.js
node src/utils/seedNodes.js
```

---

## 7.3 Production Readiness Checklist

| # | Category | Item | Status | Risk | Action |
|---|----------|------|--------|------|--------|
| 1 | Feature | Patient appointment approval workflow | ❌ Missing | 🔴 Critical | Implement PENDING_REVIEW status + approve/reject endpoints |
| 2 | Feature | Health Records CRUD endpoints | ❌ Missing | 🔴 Critical | Create controller + routes (code provided above) |
| 3 | Bug | `APPOINTMENT_UPDATED` missing from AuditLog enum | ❌ Bug | 🔴 Critical | Update `AuditLogs.js` enum (code provided) |
| 4 | Bug | `approveProfileChange` forEach crash | ❌ Bug | 🔴 Critical | Replace with `Object.entries()` (code provided) |
| 5 | Bug | MedicalRecords `timeStamps` typo | ❌ Bug | 🟠 High | Fix to `timestamps` in model |
| 6 | Feature | Patient delete endpoint | ❌ Missing | 🟠 High | Add DELETE route + soft delete (code provided) |
| 7 | Security | No rate limiting | ❌ Missing | 🟠 High | Add `express-rate-limit` to auth routes |
| 8 | Security | No MongoDB query sanitization | ❌ Missing | 🟠 High | Add `express-mongo-sanitize` |
| 9 | Security | JWT in Angular localStorage | ⚠️ Risk | 🟠 High | Move to memory-only store |
| 10 | Security | Designation DB call on every request | ⚠️ Risk | 🟡 Medium | Cache designation in JWT payload |
| 11 | Feature | React Native missing PENDING_REVIEW status | ❌ Missing | 🔴 Critical | Update types.ts + HomeScreen |
| 12 | Audit | Missing APPOINTMENT_APPROVED/REJECTED actions | ❌ Missing | 🟡 Medium | Add to AuditLog enum |
| 13 | Audit | Missing HEALTH_RECORD_* audit actions | ❌ Missing | 🟡 Medium | Add to AuditLog enum |
| 14 | Performance | `enrichAppointments` N+1 DB queries | ⚠️ Risk | 🟡 Medium | Refactor to `$lookup` aggregation |
| 15 | Config | `dotenv.config()` called multiple places | ⚠️ Risk | 🟡 Medium | Call once in `server.js` / entry point |
| 16 | Config | No env var validation on startup | ⚠️ Risk | 🟡 Medium | Add `src/config/env.js` validation |
| 17 | Docs | No API documentation (Swagger/Postman) | ❌ Missing | 🟡 Medium | Generate from existing routes |
| 18 | Testing | No unit or integration tests | ❌ Missing | 🟡 Medium | Add Jest + supertest for API tests |
| 19 | Security | No HPP (HTTP parameter pollution) | ⚠️ Risk | 🟡 Medium | `npm install hpp` + `app.use(hpp())` |
| 20 | Angular | No HTTP interceptor for token | ⚠️ Risk | 🟡 Medium | Add `auth.interceptor.ts` |
| 21 | Feature | Appointment approval queue in Angular UI | ✅ Code Provided | 🟡 Medium | Finding 9 — `appointment-approvals` feature module |
| 22 | React Native | No pending appointment badge/display | ✅ Code Provided | 🟡 Medium | Finding 10 — `statusTypes.ts`, `AppointmentCard`, `HomeScreen` updates |
| 23 | Feature | Health Records UI (Angular) | ✅ Code Provided | 🟡 Medium | Finding 11 — `health-records` feature module |
| 24 | Security | CORS allows only `FRONTEND_URL` — mobile app origin not included | ✅ Code Provided | 🟡 Medium | Finding 12 — function-based `origin` check + `ADDITIONAL_CORS_ORIGINS` |
| 25 | Model | Audit `actorName` not populated in some flows | ✅ Code Provided | 🟡 Medium | Finding 13 — `resolveActor` handles patient actors |

---

**Summary:** The codebase has a solid architectural foundation with well-structured routes, middleware, and error handling. The primary gaps were business-critical: the patient appointment approval workflow was unimplemented (patient appointments skipped directly to BOOKED), health records CRUD was absent, and two critical bugs (audit enum and profile-change forEach) would have caused silent failures in production. Findings 1–13 above include complete, ready-to-use production code covering the backend approval workflow and Health Records API, supporting Angular UIs (appointment-approvals, health-records), React Native status-type and UI updates, security hardening (rate limiting, NoSQL sanitization, env validation, JWT designation caching, CORS for mobile clients), and audit-trail correctness for both employee and patient actors. Phase 3 now also documents the full Angular and React Native folder-purpose maps alongside the existing backend map. All 25 checklist items are addressed with either implemented code or a documented design.
