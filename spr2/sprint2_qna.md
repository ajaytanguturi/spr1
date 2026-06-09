# 🏥 Sprint 2 — Hospital Management System
## Angular + Node.js — Professional Q&A Interview Guide

> **Based on**: Actual Sprint 2 codebase (Angular 19 + Express/MongoDB) & Evaluation Criteria  
> **Marking Weightage**: 15% — Rating Scale: 5 = Excellent → 1 = Poor

---

## 📋 Evaluation Categories at a Glance

| Category | Weight | Key Focus |
|---|---|---|
| A. AngularJS Fundamentals & UI | 15% | Components, routing, forms, validation |
| B. API Integration (Angular ↔ Node) | 20% | Services, HttpClient, error handling |
| C. Authentication & Role-Based Access (JWT) | 15% | Guards, interceptors, token flow |
| D. Hospital Workflows & Pages | 15% | Receptionist, Doctor, Admin flows |
| E. Quality, Error Handling & Code Structure | 10% | Separation of concerns, code patterns |
| F. Communication & Presentation | 25% | Live demo, explaining architecture |

---

---

# 🅐 SECTION A — Angular Fundamentals & UI (15%)

---

### Q1. What is a component in Angular and how is it structured in your project?

**Answer:**  
A component is the basic building block of an Angular application — it controls a piece of the UI. Every component has three parts:
- **TypeScript class** — the logic
- **HTML template** — the view
- **CSS** — the styling

In our project, components are **standalone** (Angular 19 style) — they don't need an NgModule. For example, `LoginComponent` is declared with:

```ts
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
```

We follow a **feature-based structure**: all components are inside `src/app/features/` grouped by domain — `auth/`, `dashboard/`, `home/`.

---

### Q2. What is the difference between `NgModule`-based and Standalone components? Why did you use standalone?

**Answer:**  
| | NgModule-based | Standalone |
|---|---|---|
| Introduced | Angular 2 | Angular 14+ (stable in 15+) |
| Declaration | Need `@NgModule` | Self-contained with `standalone: true` |
| Boilerplate | High | Minimal |
| Imports | In module | Directly in `@Component` |

We used **standalone components** because this is Angular 19 — NgModule is legacy. Standalone components are simpler, more tree-shakeable, and the recommended approach. Our `main.ts` bootstraps with:

```ts
bootstrapApplication(AppComponent, appConfig)
```

No `AppModule` at all.

---

### Q3. Explain lazy loading in your routing. How does it work and why use it?

**Answer:**  
Lazy loading means a component/module is only downloaded when the user navigates to that route — NOT at app startup.

In our `app.routes.ts`:
```ts
{
  path: 'login',
  loadComponent: () =>
    import('./features/auth/login/login').then((m) => m.LoginComponent),
}
```

`loadComponent` returns a **dynamic import** — the browser fetches the JS bundle only when `/login` is visited.

**Why?**  
- Reduces initial bundle size → faster first load
- Better performance — users only download what they use

---

### Q4. What is `pathMatch: 'full'` and when is it needed?

**Answer:**  
In our routes:
```ts
{ path: '', pathMatch: 'full', redirectTo: 'overview' }
```

`pathMatch: 'full'` means Angular matches the route **only when the entire URL path** matches `''` (empty).  
Without it, `''` would match ANY path (since every URL starts with empty), causing unintended redirects.

It is **mandatory** when using `redirectTo` with an empty string path.

---

### Q5. What are Reactive Forms? How are they different from Template-Driven forms?

**Answer:**  
| | Reactive Forms | Template-Driven |
|---|---|---|
| Control creation | In TypeScript | In HTML (`ngModel`) |
| Validation | Code-based (`Validators.required`) | Attribute-based (`required`) |
| Testability | Easy (pure TS) | Hard (needs DOM) |
| Complex scenarios | Excellent | Limited |

In our project, login uses `FormBuilder`:
```ts
loginForm = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(6)]]
});
```

Reactive forms are preferred for hospital workflows because validations are complex (e.g., appointment time overlaps, UHID formats).

---

### Q6. What is `BehaviorSubject` and how is it used in your `AuthService`?

**Answer:**  
`BehaviorSubject` is an RxJS Subject that:
1. Always holds the **current value**
2. Immediately emits that value to any **new subscriber**

In `auth.service.ts`:
```ts
private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
public currentUser$ = this.currentUserSubject.asObservable();
```

- `currentUserSubject` holds the logged-in user at all times
- Components subscribe to `currentUser$` and **reactively update** when user logs in/out
- `.next(user)` pushes a new value to all subscribers
- `.value` gets the current synchronous value

We also use a **Signal** alongside (`currentUserSignal`) for zoneless change detection.

---

### Q7. What are Signals in Angular and why does your project use `provideZonelessChangeDetection()`?

**Answer:**  
**Signals** (Angular 16+) are reactive primitives — they notify Angular when data changes without needing Zone.js to detect it.

```ts
currentUserSignal = signal<User | null>(null);
// Update:
this.currentUserSignal.set(user);
// Read in template:
{{ authService.currentUserSignal() }}
```

Our `app.config.ts` uses:
```ts
provideZonelessChangeDetection()
```

This disables Zone.js entirely. Angular now detects changes **only when signals change** — more performant, less overhead. It's the future of Angular.

---

### Q8. What is `canDeactivate` guard? Explain how it's used in your project.

**Answer:**  
`canDeactivate` runs **before leaving a route** — it can prevent navigation if there are unsaved changes.

Our `unsavedChangesGuard`:
```ts
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  return confirmModal.open({ title: 'Unsaved Changes', ... }).then(r => r.confirmed);
};
```

- Component must implement `hasUnsavedChanges(): boolean`
- If user has unsaved form data → shows a confirmation modal
- Only navigates away if user confirms "Leave"

Used on: `profile`, `employees/create`, `appointments/book`, `patients/create`.

---

### Q9. What is `environment.ts` and why is `apiUrl` configured there?

**Answer:**  
`environment.ts` holds **environment-specific configuration** — different for dev vs production:

```ts
// environment.ts (dev)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

In services: `private readonly apiUrl = \`${environment.apiUrl}/auth\``;

**Why?**  
- No hardcoded URLs in code
- Easy to swap to production URL by just changing one file
- Follows the **Single Source of Truth** principle

---

---

# 🅑 SECTION B — API Integration (Angular ↔ Node) (20%)

---

### Q10. How does your Angular app communicate with the Node.js backend?

**Answer:**  
All API calls go through Angular's `HttpClient` service, inside dedicated **service files** in `src/app/core/services/`.

Example from `appointment.service.ts`:
```ts
getAppointments(page = 1, limit = 10): Observable<AppointmentsResponse> {
  let params = new HttpParams()
    .set('page', page.toString())
    .set('limit', limit.toString());
  return this.http.get<AppointmentsResponse>(this.apiUrl, { params });
}
```

The pattern is:
1. Service builds the URL + params
2. Returns an `Observable`
3. Component **subscribes** and handles `next`/`error`/`complete`

No API calls are made directly from components — strict **separation of concerns**.

---

### Q11. What is an HTTP Interceptor and how does yours work?

**Answer:**  
An HTTP interceptor is middleware for HTTP requests — it intercepts every request/response **globally**.

Our `authInterceptor`:
```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = authService.getToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401: authService.forceClearSession(); break;
        case 403: router.navigate(['/dashboard/overview']); break;
        case 0: toastService.error('Cannot reach server.'); break;
      }
      return throwError(() => error);
    })
  );
};
```

It:
1. **Attaches JWT token** to every outgoing request automatically
2. **Handles 401** → clears session, redirects to login
3. **Handles 403** → shows access denied toast
4. **Handles network error (status 0)** → shows connection error

---

### Q12. Why do you use `HttpParams` instead of manually building query strings?

**Answer:**  
`HttpParams` is Angular's immutable, type-safe way to build query parameters.

```ts
// ❌ Bad — manual, error-prone:
`${this.apiUrl}?page=1&limit=10&status=BOOKED`

// ✅ Good — HttpParams:
let params = new HttpParams().set('page', '1').set('limit', '10');
params = params.set('status', 'BOOKED');
```

Benefits:
- Immutable — each `.set()` returns a new instance (no mutations)
- Handles encoding automatically (spaces, special chars)
- Easy to conditionally add parameters

---

### Q13. What is the `tap` operator in RxJS and why is it used in `login()`?

**Answer:**  
`tap` performs a **side effect** without modifying the Observable stream.

```ts
login(email, password): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
    .pipe(
      tap((response) => {
        if (response?.token && response?.user) {
          this.setSession(response.token, response.user); // side effect
        }
      })
    );
}
```

- The HTTP call returns the response
- `tap` saves the token/user to localStorage as a **side effect**
- The same response is passed through unchanged to the subscriber
- Component still receives the full `LoginResponse` — no interference

---

### Q14. How does your backend handle CORS and why is it needed?

**Answer:**  
CORS (Cross-Origin Resource Sharing) is needed because the Angular app (port 4200) and Node API (port 3000) are on **different origins**.

In `app.js`:
```js
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

- `origin: process.env.FRONTEND_URL` — only allows requests from the Angular frontend
- `credentials: true` — allows cookies/auth headers
- Without CORS, the browser blocks requests with a CORS error

`FRONTEND_URL` is in `.env` — not hardcoded.

---

### Q15. How does loading/error state management work in your services and components?

**Answer:**  
We follow this pattern in components:

```ts
isLoading = false;
errorMessage = '';

loadAppointments() {
  this.isLoading = true;
  this.appointmentService.getAppointments().subscribe({
    next: (response) => {
      this.appointments = response.appointments;
      this.isLoading = false;
    },
    error: (err) => {
      this.errorMessage = err.error?.message || 'Failed to load appointments';
      this.isLoading = false;
    }
  });
}
```

In the template:
```html
@if (isLoading) { <app-spinner /> }
@else if (errorMessage) { <p class="error">{{ errorMessage }}</p> }
@else { <!-- data table --> }
```

The global `ToastService` is used for non-blocking notifications. The interceptor handles 401/403 globally.

---

---

# 🅒 SECTION C — Authentication & JWT (15%)

---

### Q16. Explain the full JWT authentication flow in your application.

**Answer:**  

```
1. User submits login form (email + password)
2. Angular AuthService POSTs to /api/auth/login
3. Backend:
   a. Finds user by email
   b. bcrypt.compare(password, passwordHash)
   c. Checks user status (ACTIVE only)
   d. jwt.sign({ employeeCode, roles }, JWT_SECRET, { expiresIn })
   e. Returns { token, user }
4. AuthService stores token in localStorage ('hms_token')
5. Stores user object in localStorage + updates BehaviorSubject + Signal
6. Every subsequent HTTP request → authInterceptor adds:
   Authorization: Bearer <token>
7. Backend authMiddleware verifies the JWT on protected routes
8. On 401 response → interceptor clears session, redirects to /login
```

---

### Q17. Where is the JWT token stored and what are the security trade-offs?

**Answer:**  
We store it in **localStorage** (`hms_token`).

```ts
private setSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
}
```

**Trade-offs:**

| | localStorage | httpOnly Cookie |
|---|---|---|
| XSS vulnerable | ✅ Yes | ❌ No |
| CSRF vulnerable | ❌ No | ✅ Yes |
| Accessible in JS | ✅ Yes | ❌ No |
| Simpler to implement | ✅ Yes | ❌ More complex |

For this hospital system context, localStorage is acceptable. In production, **httpOnly cookies** are more secure. The interceptor mitigates some risk by automatically clearing tokens on 401.

---

### Q18. What is the purpose of `authGuard`, `designationGuard`, and `mustChangePasswordGuard`? How do they chain?

**Answer:**  

**`authGuard`** — checks if user is authenticated at all:
```ts
if (authService.isAuthenticated()) return true;
return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
```

**`mustChangePasswordGuard`** — checks if user must change password first:
```ts
if (user?.mustChangePassword) return router.createUrlTree(['/change-password']);
return true;
```

**`designationGuard`** — checks role/designation:
```ts
if (authService.hasDesignation(allowed)) return true;
return router.createUrlTree(['/dashboard/overview']);
```

**Chaining on `/dashboard`:**
```ts
{
  path: 'dashboard',
  canActivate: [authGuard, mustChangePasswordGuard],
  children: [
    { path: 'patients', canActivate: [designationGuard(['RECEPTIONIST'])] }
  ]
}
```

Guards run **in order**: authGuard → mustChangePasswordGuard → designationGuard. If any returns a UrlTree, navigation stops.

---

### Q19. How does your backend protect routes? Explain `authMiddleware` and `authorizeDesignation`.

**Answer:**  

**`authMiddleware.js`** — verifies JWT:
```js
const token = authHeader.split(" ")[1];
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded; // { employeeCode, roles }
next();
```

**`authorizeDesignation.js`** — checks designation from DB:
```js
const employee = await Employee.findOne({ employeeCode: req.user.employeeCode });
const hasPermission = allowedDesignations.includes(employee.designation);
if (!hasPermission) return res.status(403).json({ message: "Access denied" });
```

They're used together on routes:
```js
router.get('/patients', authenticateUser, authorizeDesignation('RECEPTIONIST', 'ADMIN'), getPatients);
```

First authenticates (401 if no/bad token), then authorizes (403 if wrong role).

---

### Q20. What happens when the JWT token expires? Walk through the full flow.

**Answer:**  

1. Token expiry → backend returns **401 Unauthorized**
2. Angular `authInterceptor` catches it:
   ```ts
   case 401:
     if (!isPublicAuthCall) {
       toastService.error('Session expired. Please login again.');
       authService.forceClearSession();
     }
   ```
3. `forceClearSession()`:
   - Removes `hms_token` and `hms_user` from localStorage
   - Sets `currentUserSubject.next(null)`
   - Sets `currentUserSignal.set(null)`
   - Navigates to `/login`
4. User sees a toast: *"Session expired. Please login again."*
5. `authGuard` on all protected routes now redirects to `/login`

Note: Public auth paths (login, forgot-password) are **excluded** from this 401 handling to prevent infinite loops.

---

### Q21. Why does `forgotPassword` always return 200 even if the email doesn't exist?

**Answer:**  
```js
if (!user || String(user.status) !== "ACTIVE") {
  return res.status(200).json({
    message: "If the email exists, a reset link has been sent"
  });
}
```

This is a **security best practice** called **"email enumeration prevention"**.  
If we returned 404 for non-existent emails, an attacker could probe which emails are registered. By always returning 200 with the same message, we reveal **nothing** about whether an account exists.

---

---

# 🅓 SECTION D — Hospital Workflows & Pages (15%)

---

### Q22. Explain the Receptionist workflow in your application.

**Answer:**  
The receptionist role (`RECEPTIONIST`) has access to:

1. **Register Patient** → `/dashboard/patients/create`
   - Form with patient details, generates UHID
   - `patientService.createPatient(data)`

2. **View/Search Patients** → `/dashboard/patients`
   - List with search/filter

3. **Patient Detail** → `/dashboard/patients/:UHID`
   - Edit patient info

4. **Book Appointment** → `/dashboard/appointments/book`
   - Select patient, doctor, date, time slot
   - `appointmentService.getBookedSlots(doctorId, date)` to avoid double-booking
   - `appointmentService.createAppointment(data)`

5. **View/Edit Appointments** → `/dashboard/appointments`

All these routes use `canActivate: [designationGuard(['RECEPTIONIST'])]` — doctors and admins cannot access them.

---

### Q23. What can a Doctor do vs a Receptionist? How is this enforced?

**Answer:**  

| Feature | Receptionist | Doctor | Admin/Owner |
|---|---|---|---|
| Register Patient | ✅ | ❌ | ❌ |
| Book Appointment | ✅ | ❌ | ❌ |
| View Appointments | ✅ | ✅ (own only) | ✅ |
| View Employees | ❌ | ❌ | ✅ |
| Manage Admins | ❌ | ❌ | ✅ (OWNER only) |

**Enforcement:**

Frontend — Route guards:
```ts
{ path: 'patients', canActivate: [designationGuard(['RECEPTIONIST'])] }
{ path: 'appointments', canActivate: [designationGuard(['RECEPTIONIST', 'DOCTOR'])] }
```

Backend — `authorizeDesignation` middleware on each API endpoint.

Doctor viewing appointments calls `/api/appointments/my` — returns only their appointments.

---

### Q24. How does the `hasDesignation` method handle superusers (OWNER/ADMIN)?

**Answer:**  
```ts
hasDesignation(allowed: Designation[]): boolean {
  const designation = this.getDesignation();
  if (!designation) return false;
  if (SUPERUSER_DESIGNATIONS.has(designation)) return true; // OWNER & ADMIN bypass all
  return allowed.includes(designation);
}
```

`SUPERUSER_DESIGNATIONS = new Set(['OWNER', 'ADMIN'])`.

OWNER and ADMIN can access **any** designation-protected route — they bypass the allowed list check entirely. This means they can view/manage everything without being explicitly listed in each guard.

The `ownerOnlyGuard` is the only exception — restricts `/admins` management to OWNER only:
```ts
if (authService.getDesignation() === 'OWNER') return true;
```

---

---

# 🅔 SECTION E — Code Quality & Structure (10%)

---

### Q25. What is "separation of concerns" and how is it applied in your project?

**Answer:**  
Separation of concerns means each layer/file has **one responsibility**:

| Layer | Responsibility | Example |
|---|---|---|
| Component (`.ts`) | UI logic, form handling | `login.ts` — handles form submit |
| Service (`.service.ts`) | API calls, business logic | `auth.service.ts` — calls `/api/auth/login` |
| Guard (`.guard.ts`) | Route protection | `auth.guard.ts` — checks auth |
| Interceptor | Global HTTP handling | `auth.interceptor.ts` — attaches JWT |
| Model (`.model.ts`) | TypeScript interfaces | `user.model.ts` — User type |
| Environment | Config | `environment.ts` — apiUrl |

**No API calls in templates** — all data flows through services.  
**No business logic in templates** — only display logic.

---

### Q26. Why is `@Injectable({ providedIn: 'root' })` used in services?

**Answer:**  
```ts
@Injectable({ providedIn: 'root' })
export class AuthService { ... }
```

`providedIn: 'root'` makes the service a **singleton** — one instance shared across the entire app.

- Angular's DI (Dependency Injection) creates it once and reuses it
- State (like `currentUserSubject`) is consistent everywhere
- Tree-shakeable — if not used, Angular removes it from the bundle

Alternative: `providedIn: 'any'` creates a new instance per lazy-loaded module.

---

### Q27. What is `HttpParams` immutability and why does it matter?

**Answer:**  
`HttpParams` is **immutable** — every method returns a new instance:

```ts
// ❌ Wrong — doesn't update params:
params.set('status', 'BOOKED'); // returns new, but old params unchanged

// ✅ Correct:
params = params.set('status', 'BOOKED');
```

In our `buildListParams()`:
```ts
let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
if (filters?.status) {
  params = params.set('status', filters.status); // reassign
}
```

Immutability prevents **accidental shared state** — different requests can't interfere with each other's params.

---

### Q28. What is `Helmet` in Express and why is it in your backend?

**Answer:**  
```js
app.use(helmet());
```

`helmet` is a Node.js middleware that sets **security-related HTTP headers**:

- `X-Frame-Options: DENY` → prevents clickjacking
- `X-Content-Type-Options: nosniff` → prevents MIME sniffing
- `Strict-Transport-Security` → enforces HTTPS
- `Content-Security-Policy` → prevents XSS
- Removes `X-Powered-By: Express` header (hides server info)

It's a security best practice — one line adds ~11 protective headers.

---

---

# 🔥 SECTION — OUT-OF-THE-BOX / TRICKY QUESTIONS

---

### Q29. ⚡ "Your JWT is stored in localStorage. What if I open DevTools and steal it — what happens?"

**Model Answer:**  
"You're right that localStorage is accessible via JavaScript — that's the XSS (Cross-Site Scripting) vulnerability. If a malicious script runs on the page, it can call `localStorage.getItem('hms_token')` and steal the token.

**How we mitigate this:**
1. **Angular's built-in XSS protection** — Angular escapes all template interpolations by default. `{{ value }}` is safe.
2. **Short token expiry** — configured via `JWT_EXPIRES_IN` in `.env` (e.g., 1h). Stolen tokens expire quickly.
3. **Helmet headers** on backend prevent common XSS vectors.
4. **The ideal fix** would be `httpOnly` cookies — JavaScript cannot access those even with XSS. The backend would set `Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict`.

For this sprint's scope, localStorage is acceptable. Production systems should use httpOnly cookies."

---

### Q30. ⚡ "Why do you check designation from the DB in `authorizeDesignation` instead of just reading from the JWT payload?"

**Model Answer:**  
"Great question. The JWT stores `{ employeeCode, roles }` — not designation. Even if roles were in the token:

**Problem with trusting JWT claims for authorization:**  
The JWT is signed when the user logs in. If an admin **changes someone's designation** after login, their token still has the old designation until it expires.

**Checking DB at runtime:**
```js
const employee = await Employee.findOne({ employeeCode: req.user.employeeCode });
const hasPermission = allowedDesignations.includes(employee.designation);
```

This fetches the **current designation from the database** — so any role changes take effect **immediately** without waiting for token expiry. This is safer for RBAC in a hospital system where permissions can change quickly."

---

### Q31. ⚡ "Your `designationGuard([])` on the employees route — the array is empty. What does that mean?"

**Model Answer:**  
"Looking at the route:
```ts
{ path: 'employees', canActivate: [designationGuard([])] }
```

The `hasDesignation([])` method:
```ts
if (SUPERUSER_DESIGNATIONS.has(designation)) return true;
return allowed.includes(designation); // [] includes nothing
```

With an empty array:
- **OWNER or ADMIN** → passes (superuser bypass)
- **Anyone else** (RECEPTIONIST, DOCTOR) → `[].includes(anything) = false` → redirected

So `designationGuard([])` means **superusers only** — OWNER and ADMIN. No regular staff can access the employees management section. It's a concise way to write an admin-only guard."

---

### Q32. ⚡ "What happens if a user is on `/dashboard/patients/create` with a half-filled form and hits the back button?"

**Model Answer:**  
"This is handled by `canDeactivate: [unsavedChangesGuard]` on that route.

The `PatientCreateComponent` implements `hasUnsavedChanges(): boolean` — returns true if the form is `dirty` (user typed something).

When back is pressed:
1. Angular checks the `canDeactivate` guard before allowing navigation
2. Guard calls `component.hasUnsavedChanges()` — returns `true`
3. `ConfirmModalService.open()` shows a modal: *'You have unsaved changes... Leave or Stay?'*
4. If user clicks **Leave** → `result.confirmed = true` → navigation proceeds
5. If user clicks **Stay** → `result.confirmed = false` → stays on the form

The form data is also preserved in `FormDraftService` (draft-saving feature) so data isn't lost even across navigation."

---

### Q33. ⚡ "How do you prevent double-booking of the same doctor at the same time slot?"

**Model Answer:**  
"In the `AppointmentBookComponent`, before allowing the user to select a time slot, we call:
```ts
appointmentService.getBookedSlots(doctorEmployeeId, date)
```

This hits:
```
GET /api/appointments/booked-slots?doctorEmployeeId=...&date=...
```

The backend queries all **BOOKED/CONFIRMED** appointments for that doctor on that date and returns the occupied time slots.

The frontend then **disables** or **hides** those slots in the time picker UI — user can only pick available slots.

For the edit flow, we also pass `excludeAppointmentId` so the current appointment's slot isn't wrongly marked as taken.

On the backend, there's also validation at the database level — the API rejects overlapping slots even if the frontend check is bypassed."

---

### Q34. ⚡ "What's the difference between `throwError(() => error)` and `throwError(error)` in RxJS?"

**Model Answer:**  
"In older RxJS (v6), `throwError(error)` accepted a value directly.

In **RxJS 7+** (which Angular 15+ uses), the recommended form is:
```ts
throwError(() => error)
```

The factory function `() => error` is **lazily evaluated** — the error object is only created when someone subscribes. This prevents issues with error objects being created eagerly even when no one is handling them.

In our interceptor:
```ts
return throwError(() => error);
```

This re-throws the HttpErrorResponse so individual components can still handle specific errors in their own `.subscribe({ error: (e) => ... })` blocks — even after the interceptor handled the global cases (401/403)."

---

### Q35. ⚡ "The `logout()` function checks `isPasswordChangeRequired()` first. Why?"

**Model Answer:**  
```ts
logout(navigate = true): void {
  if (this.isPasswordChangeRequired()) {
    return; // block logout!
  }
  // ...
}
```

When `mustChangePassword = true`, the user is **forced** to the `/change-password` page. If logout was allowed, they could:
1. Log out
2. Log back in
3. Skip changing password indefinitely

By **blocking logout** when `mustChangePassword` is true, we force them to change their password before they can do anything else. The only way out is to change the password (which sets `mustChangePassword = false`).

This is a common pattern in enterprise systems where admins create accounts with temporary passwords."

---

### Q36. ⚡ "What is `provideZonelessChangeDetection()` and what problem does it solve?"

**Model Answer:**  
"Traditionally, Angular used **Zone.js** to detect changes. Zone.js monkey-patches browser APIs (setTimeout, addEventListener, HTTP calls) to know when async work completes, then triggers Angular's change detection — often unnecessarily.

`provideZonelessChangeDetection()` removes Zone.js entirely. Angular **only** re-renders when:
- A `signal()` value changes
- `markForCheck()` is explicitly called

```ts
// Our app.config.ts:
provideZonelessChangeDetection()
```

**Benefits:**
- Faster change detection (no unnecessary cycles)
- Smaller bundle (no Zone.js — ~27KB saved)
- More predictable rendering
- Better performance for large apps

**Requirement:** Components must use Signals or `OnPush` change detection strategy. Our `AuthService` uses `signal<User | null>(null)` to make this work."

---

---

## 🎤 COMMUNICATION TIPS (Category F — 25%)

### For your demo, walk through this script:

1. **"Let me show you the role-based system"**
   - Login as **Receptionist** → show patient registration + appointment booking
   - Login as **Doctor** → show `/appointments/my` only (no patient create)
   - Login as **Admin** → show employee management, approvals
   - Login as **Owner** → show admin creation (only OWNER can)

2. **"This is our JWT flow"**
   - Open DevTools Network tab → show `/api/auth/login` response with token
   - Show Application → LocalStorage → `hms_token`
   - Show a protected route request → `Authorization: Bearer ...` header

3. **"This is our guard chain"**
   - Type `/dashboard/patients` in URL without login → redirected to `/login`
   - Login as Doctor → try `/dashboard/patients` → redirected to `/dashboard/overview`

4. **"Our service layer"**
   - Show `appointment.service.ts` — clean, no UI logic
   - Show interceptor — explain it handles auth for ALL requests

---

## 📝 Quick Revision — Key Terms

| Term | One-Line Definition |
|---|---|
| JWT | Signed token containing user identity, verified without DB lookup |
| BehaviorSubject | RxJS stream that holds current value and replays it to new subscribers |
| Signal | Angular's reactive primitive for zoneless change detection |
| `canActivate` | Guard that runs before entering a route |
| `canDeactivate` | Guard that runs before leaving a route |
| Interceptor | Middleware for all HTTP requests/responses globally |
| `providedIn: 'root'` | Makes a service a singleton across the app |
| Lazy loading | Loads a component/module only when its route is visited |
| RBAC | Role-Based Access Control — permissions based on user role |
| `bcrypt` | Password hashing library — one-way, salt-based |
| `tap` | RxJS operator for side effects without modifying the stream |
| `HttpParams` | Immutable Angular class for building query parameters |
| `pathMatch: 'full'` | Matches route only when the entire URL equals the path |
| Helmet | Express middleware that sets security HTTP headers |
| CORS | Browser policy requiring server permission for cross-origin requests |
