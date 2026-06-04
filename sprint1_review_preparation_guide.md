# Sprint 1 Review Preparation Guide & Codebase Audit
**Course/Batch:** ELEVANCE - NODE BATCH (Revised Criteria)  
**Sprint Weightage:** 10%  
**Target Score:** 85+ (Rating 5 - Excellent)

---

## 1. Executive Summary & Codebase Health Map

This preparation guide has been updated to reflect the revised Hackerearth Sprint 1 Evaluation Criteria. The scope of Sprint 1 is focused on **user signup, login, email verification, and profile retrieval (getprofile / `/api/auth/me`)**, as well as the live demo flow: **`signup -> login -> auth token`**. 

Your backend codebase already contains the routes and controllers for this flow (defined in `authRoutes.js` and `authController.js`). However, several **critical execution bugs** and design inconsistencies in your codebase will cause runtime failures during the demo or fail code quality reviews. Fixing these is essential to secure a **Rating 5 (Excellent / 85+ score)**.

Below is the evaluation matrix comparing your current codebase against the updated rubric:

| Category | Rubric Criteria | Current Status | Score Impact | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **A. Node.js Fundamentals** (15%) | Modules, npm scripts, env vars, async basics, clear project structure | **Good (80%)** | Pass | Remove unsafe `NODE_TLS_REJECT_UNAUTHORIZED`. Clean up redundant DB connection logic in `app.js`. |
| **B. Express API Implementation** (20%) | Routes/controllers structure, middleware usage, CRUD for hospital basics (**signup, login, getprofile**), centralized error handling | **Needs Improvement (50%)** | Max Rating 3 | You have the CRUD endpoints, but they contain key bugs (last login, role mismatch, uniqueness index) and **no global error handler**. |
| **C. Async, Middleware & Errors** (10%) | Async error propagation (next/try-catch), request validation, logging | **Satisfactory (60%)** | Pass | Implement a global centralized error handler to catch unhandled errors and format them as JSON. |
| **D. REST API Design & Validation** (15%) | Status codes, predictable formats, input validation, role-ready endpoints | **Good (70%)** | Pass | Fix Mongoose `medicalRegistrationNumber` uniqueness bug for non-medical roles. Fix array/string role comparison issue. |
| **E. Postman Testing** (15%) | Collection organization, env vars, positive/negative tests (**AIRNET-VALIDATE/200 scenarios**) | **Missing (0%)** | -15% | Create/export a Postman collection validating successful login/signup and negative (400/422/409) inputs. |
| **F. Communication & Presentation** (25%) | Explains API flow, live demo: **signup -> login -> auth token**, answers questions confidently | **Good (75%)** | Pass | Practice the exact walk-through of the authentication flow. (See section 5). |

---

## 2. Critical Codebase Bugs & Gaps (SME Audit)

The Hackerearth SME will examine the stability of your code. You must fix the following issues to prevent runtime errors:

### 🚨 Bug 1: MongoDB Duplicate Key Error for Non-Medical Roles
In `Employee.js`, `medicalRegistrationNumber` is marked as a unique index:
```javascript
medicalRegistrationNumber: { type: String, unique: true }
```
In `authValidator.js`, your custom validator forces this field to be absent/empty for non-medical roles (like `ADMIN`, `RECEPTIONIST`, `CASHIER`).
* **The Flaw:** When you sign up the first non-medical employee, the field is saved as `undefined` (or `null`). When you register a second one, MongoDB will throw a `E11000 duplicate key error collection: ... index: medicalRegistrationNumber_1 dup key: { medicalRegistrationNumber: null }`.
* **Impact:** You cannot register more than one non-medical user in your system!
* **Fix:** Add `sparse: true` to the schema field so MongoDB ignores null/undefined values in uniqueness checks.

### 🚨 Bug 2: Array vs. String Inconsistency in User Roles
In `User.js`, the `role` field is defined as an array of strings:
```javascript
role: [{
    type: String,
    enum: ["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", ...],
}]
```
But in `authController.js` (line 58), you register users by setting `role: designation` (where designation is a single string, e.g., `"DOCTOR"`).
* **The Flaw:** Mongoose converts the string into a single-element array `["DOCTOR"]`. When generating the JWT token during login, you pass `role: user.role` (which is `["DOCTOR"]`). If your downstream middleware or frontend checks `req.user.role === 'DOCTOR'`, it will evaluate to **false** because `["DOCTOR"] !== 'DOCTOR'`.
* **Impact:** Future role-based authorization checks will fail.
* **Fix:** Change `role` in the `User` schema to a single String.

### 🚨 Bug 3: Database Mismatch on `lastLoginAt` (Transient Field Bug)
In `User.js` schema, the field is named `lastLoginAt`. However, in `authController.js` (line 104), you set:
```javascript
user.last_login = new Date();
await user.save();
```
* **The Flaw:** Since `last_login` is not defined in the `User` schema, Mongoose discards it before saving the document. It is never saved to MongoDB. In `authController.js` line 148, the `/me` (getprofile) endpoint returns `lastLoginAt: user.lastLoginAt` which will always remain `null`.
* **Fix:** Update the controller to set `user.lastLoginAt = new Date();`.

### 🚨 Bug 4: No Centralized Error Handling Middleware
Your Express application does not define a centralized error-handling middleware.
* **The Flaw:** If an asynchronous query fails or throws an error, Express will fall back to its default HTML error page, exposing raw system paths and stack traces. This violates REST API standards (Rating 3 or 2: "inconsistent error handling/response structure").
* **Fix:** Add a global error-handling middleware block at the bottom of `app.js`.

### 🚨 Bug 5: Missing `Counter` Imports in Inactive Models
Although `Patient.js`, `Appointment.js`, `Bill.js`, `MedicalRecord.js`, and `Payment.js` are not part of the active Sprint 1 API flow, they are loaded by mongoose and contain pre-save hooks referencing the `Counter` model without importing it.
* **Impact:** If these files are ever loaded or required elsewhere, they will crash with `ReferenceError: Counter is not defined`.
* **Fix:** Add `const Counter = require('./Counter');` at the top of these models.

---

## 3. Strict SME Evaluation Mock Interview Q&A

Here are the strict, high-yield questions the Hackerearth SME will ask during your Sprint 1 viva, mapped directly to your implementation.

### Q1: "Walk me through the lifecycle of a user signup. What happens from the moment the request hits the route to when the email is sent?"
* **SME Persona Check:** Testing **Category B (Express API Implementation)** and **Category F (Communication)**.
* **Ideal Answer:** 
  > "1. The client submits signup data to `POST /api/auth/signup`.
  > 2. The request passes through `signupValidation` (defined in `authValidator.js`), which checks criteria such as strong password requirements, correct phone format, department checks, and the custom validator for `medicalRegistrationNumber`.
  > 3. If validation fails, `validate.js` intercepts it and returns a `422 Unprocessable Entity` response. If validation passes, it proceeds to the `signup` controller.
  > 4. The controller checks if the user already exists by email; if so, it returns `409 Conflict`.
  > 5. The password is encrypted using `bcryptjs` with salt round 12.
  > 6. We instantiate and save an `Employee` document, generating a unique `employeeId` (via a Mongoose pre-save counter hook).
  > 7. We create the `User` document, referencing the `employeeId`, setting `isActive: false`, and generating a random verification token.
  > 8. Finally, we compile an HTML email template with a verification link and send it via the Brevo API using `sib-api-v3-sdk`. We respond with `201 Created`."

### Q2: "In your `signupValidation`, you have a custom validator for `medicalRegistrationNumber`. Explain how it ensures role-based data integrity."
* **SME Persona Check:** Testing **Category D (REST API Design & Validation)**.
* **Ideal Answer:**
  > "Our custom validator checks the `designation` sent in the request body. If the role is a medical-based role (DOCTOR, NURSE, LAB_TECH, or PHARMACIST), the registration number is strictly required. If it's a non-medical role (like ADMIN or RECEPTIONIST), the validator throws an error if a registration number is provided. This ensures that only authorized medical staff have license numbers recorded in our system."

### Q3: "Explain how your authentication middleware (`authMiddleware.js`) protects the `getprofile` (`/me`) route. What happens if a token is modified or expired?"
* **SME Persona Check:** Testing **Category B (Middleware)** and **Category C (Async/Errors)**.
* **Ideal Answer:**
  > "The `authenticateToken` middleware acts as a gatekeeper. It extracts the HTTP `Authorization` header and checks if it starts with the `Bearer ` prefix. If missing, it immediately rejects the request with a `401 Unauthorized` response. If present, it extracts the token and validates it against our `process.env.JWT_SECRET` using `jwt.verify()`. If the token is expired or has been altered, `jwt.verify` throws an error, which is caught by our `try/catch` block, returning a `401` status with an 'Invalid or expired token' message. Only if validation succeeds is the decoded payload attached to `req.user`, and `next()` is called to let the request proceed to the `/me` controller."

### Q4: "You are setting `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` in your entry file. Why is this present, and what are the security implications of this in a production environment?"
* **SME Persona Check:** Testing production readiness and security.
* **Ideal Answer:**
  > "`NODE_TLS_REJECT_UNAUTHORIZED = '0'` disables SSL/TLS certificate verification for Node's outbound HTTPS requests. This was temporarily added during local testing to bypass certificate issues when connecting to external APIs (like MongoDB or Brevo). However, in production, this is a major security vulnerability that exposes our application to Man-In-The-Middle (MITM) attacks. I am removing this setting for our production build and ensuring our environment has valid SSL root certificates."

### Q5: "How does your codebase implement centralized error handling? If a Mongoose query fails, how is that error returned to the client?"
* **SME Persona Check:** Testing **Category B & C (Centralized Error Handling)**.
* **Ideal Answer:**
  > "In the controllers, async operations are wrapped in `try/catch` blocks. If a Mongoose query fails, the catch block calls `next(error)` to propagate the error down the middleware stack. At the bottom of our `app.js` file, we register a centralized error-handling middleware `app.use((err, req, res, next) => { ... })`. This middleware logs the stack trace internally for debugging and returns a structured JSON response `{ success: false, message: err.message }` with the appropriate status code (defaulting to `500`), ensuring the client never receives a raw HTML page or raw stack trace."

---

## 4. Complete Code Reconstruction Plan (To Score 85+)

Apply these modifications to your files to fix the bugs and satisfy the 85+ score requirements.

### Step 4.1: Fix the Missing Counter Imports (Apply to 5 Models)
Add the import statement at the top of these files:
1. `src/models/Patient.js` (line 2)
2. `src/models/Appointment.js` (line 2)
3. `src/models/Bill.js` (line 2)
4. `src/models/MedicalRecord.js` (line 2)
5. `src/models/Payment.js` (line 2)

```javascript
const Counter = require("./Counter");
```

### Step 4.2: Fix `Employee.js` unique index bug
Modify line 42 in [Employee.js](file:///c:/Users/AJAY%20TANGUTURI/Desktop/hm-spr1/spr1/Backend-HMS/src/models/Employee.js#L42):
```javascript
// BEFORE
medicalRegistrationNumber: { type: String, unique: true },

// AFTER (Add sparse: true to allow multiple null/undefined values)
medicalRegistrationNumber: { type: String, unique: true, sparse: true },
```

### Step 4.3: Fix `User.js` Role Type and Mismatch
Modify lines 24–27 in [User.js](file:///c:/Users/AJAY%20TANGUTURI/Desktop/hm-spr1/spr1/Backend-HMS/src/models/User.js#L24-L27) to change the role field from an Array to a single String:
```javascript
// BEFORE
role: [{
    type: String,
    enum: ["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "CASHIER", "NURSE", "LAB_TECH", "PHARMACIST"],
}],

// AFTER
role: {
    type: String,
    enum: ["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "CASHIER", "NURSE", "LAB_TECH", "PHARMACIST"],
    required: true
},
```

### Step 4.4: Fix `lastLoginAt` bug in `authController.js`
Modify line 104 in [authController.js](file:///c:/Users/AJAY%20TANGUTURI/Desktop/hm-spr1/spr1/Backend-HMS/src/controllers/authController.js#L104):
```javascript
// BEFORE
user.last_login = new Date();

// AFTER (Match the Mongoose schema field name)
user.lastLoginAt = new Date();
```

### Step 4.5: Add Centralized Error-Handling Middleware in `app.js`
Insert this block at the bottom of [app.js](file:///c:/Users/AJAY%20TANGUTURI/Desktop/hm-spr1/spr1/Backend-HMS/src/app.js) before `module.exports = app;`:
```javascript
// Centralized Error-Handling Middleware
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});
```

---

## 5. Live Demo Script (Presentation: 25%)

The evaluator will ask you to perform a live demo of the flow: **`signup -> login -> auth token`**. Prepare your Postman workspace according to this exact flow:

1. **Step 1: Demo Signup Validation (Negative Scenario)**
   * Endpoint: `POST /api/auth/signup`
   * Body: Send invalid data (e.g. invalid phone format `12345` or non-medical user with a medical registration number).
   * **Show the Evaluator:** Point out the `422 Unprocessable Entity` response and describe how `express-validator` blocks invalid input.
2. **Step 2: Demo Successful Signup (Positive Scenario)**
   * Endpoint: `POST /api/auth/signup`
   * Body: Submit a valid receptionist signup payload.
   * **Show the Evaluator:** The response returns `201 Created` with a success message and employee details. Show that the generated `employeeId` starts with `EMP-` followed by 6 sequence digits.
3. **Step 3: Demo Email Verification**
   * Endpoint: `GET /api/auth/verify-email/<token>` (copy token from console logs or DB)
   * **Show the Evaluator:** The response returns `200 OK` ("Email verified successfully"). Explain that `isActive` is now updated to `true` in MongoDB.
4. **Step 4: Demo User Login**
   * Endpoint: `POST /api/auth/login`
   * Body: Input receptionist credentials.
   * **Show the Evaluator:** The response returns `200 OK` with a signed JWT token and receptionist profile. Show how the login updates the `lastLoginAt` timestamp in MongoDB.
5. **Step 5: Demo Get Profile via Auth Token**
   * Endpoint: `GET /api/auth/me`
   * Headers: Configure `Authorization` header with `Bearer <JWT_TOKEN>`.
   * **Show the Evaluator:** The response returns `200 OK` containing the receptionist profile. Highlight that the endpoint is fully protected, and removing the token yields a `401 Unauthorized` response.
