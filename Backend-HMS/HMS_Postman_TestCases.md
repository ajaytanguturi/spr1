# HMS Auth API — Postman Test Cases

**Base URL:** `{{BASE_URL}}/api/auth`  
Set a Postman environment variable `BASE_URL` = your server URL (e.g. `http://localhost:3000`)

---

## 1. POST `/api/auth/signup`

**Headers:** `Content-Type: application/json`

---

### ✅ POSITIVE SCENARIOS

#### TC-S-01 — Doctor signup (with medicalRegistrationNumber)
```json
{
  "name": "Dr Arjun Menon",
  "email": "arjun.menon@hms.com",
  "password": "Doctor@123",
  "phone": "9876543210",
  "designation": "DOCTOR",
  "department": "OPD",
  "status": "ACTIVE",
  "joiningDate": "2024-01-15",
  "medicalRegistrationNumber": "MRC-2024-001",
  "specialization": "Cardiology",
  "qualification": "MBBS, MD",
  "consultationFee": 500,
  "availabilitySlots": ["09:00-10:00", "14:00-15:00"]
}
```
**Expected:** `201 Created` · `{ success: true, message: "Employee Created Successfully. Verification Email sent" }`

---

#### TC-S-02 — Admin signup (no medicalRegistrationNumber)
```json
{
  "name": "Priya Nair",
  "email": "priya.nair@hms.com",
  "password": "Admin@1234",
  "phone": "8012345678",
  "designation": "ADMIN",
  "department": "Admin",
  "status": "ACTIVE",
  "joiningDate": "2024-03-01"
}
```
**Expected:** `201 Created`

---

#### TC-S-03 — Receptionist signup
```json
{
  "name": "Anitha Raj",
  "email": "anitha.raj@hms.com",
  "password": "Recept@99",
  "phone": "7001234567",
  "designation": "RECEPTIONIST",
  "department": "OPD",
  "status": "ACTIVE",
  "joiningDate": "2025-06-01"
}
```
**Expected:** `201 Created`

---

#### TC-S-04 — Nurse signup (medicalRegistrationNumber required)
```json
{
  "name": "Suja Thomas",
  "email": "suja.thomas@hms.com",
  "password": "Nurse@2025",
  "phone": "9123456780",
  "designation": "NURSE",
  "department": "IPD",
  "status": "ACTIVE",
  "joiningDate": "2025-01-10",
  "medicalRegistrationNumber": "NRC-2025-005"
}
```
**Expected:** `201 Created`

---

### ❌ NEGATIVE SCENARIOS

#### TC-S-05 — Duplicate email
> Use same email as TC-S-01 (`arjun.menon@hms.com`)

```json
{
  "name": "Dr Arjun Menon",
  "email": "arjun.menon@hms.com",
  "password": "Doctor@123",
  "phone": "9876543210",
  "designation": "DOCTOR",
  "department": "OPD",
  "medicalRegistrationNumber": "MRC-2024-001"
}
```
**Expected:** `409 Conflict` · `{ message: "Email already registered" }`

---

#### TC-S-06 — Invalid email format
```json
{
  "name": "Test User",
  "email": "not-an-email",
  "password": "Test@1234",
  "phone": "9876543210",
  "designation": "ADMIN",
  "department": "Admin"
}
```
**Expected:** `422 Unprocessable Entity` · Validation error: `"Valid email required"`

---

#### TC-S-07 — Weak password (no uppercase)
```json
{
  "name": "Test User",
  "email": "test1@hms.com",
  "password": "password1@",
  "phone": "9876543210",
  "designation": "ADMIN",
  "department": "Admin"
}
```
**Expected:** `422` · `"Password must contain at least one uppercase letter"`

---

#### TC-S-08 — Password too short (< 8 chars)
```json
{
  "name": "Test User",
  "email": "test2@hms.com",
  "password": "Ab@1",
  "phone": "9876543210",
  "designation": "ADMIN",
  "department": "Admin"
}
```
**Expected:** `422` · `"Password must be at least 8 characters long"`

---

#### TC-S-09 — Password missing special character
```json
{
  "name": "Test User",
  "email": "test3@hms.com",
  "password": "Password1",
  "phone": "9876543210",
  "designation": "ADMIN",
  "department": "Admin"
}
```
**Expected:** `422` · `"Password must contain at least one special character"`

---

#### TC-S-10 — Invalid phone (starts with 5)
```json
{
  "name": "Test User",
  "email": "test4@hms.com",
  "password": "Test@1234",
  "phone": "5012345678",
  "designation": "ADMIN",
  "department": "Admin"
}
```
**Expected:** `422` · `"Phone number should exactly 10 digits starting with 6-9"`

---

#### TC-S-11 — Phone too short
```json
{
  "name": "Test User",
  "email": "test5@hms.com",
  "password": "Test@1234",
  "phone": "98765",
  "designation": "ADMIN",
  "department": "Admin"
}
```
**Expected:** `422` · Phone validation error

---

#### TC-S-12 — Invalid designation
```json
{
  "name": "Test User",
  "email": "test6@hms.com",
  "password": "Test@1234",
  "phone": "9876543210",
  "designation": "MANAGER",
  "department": "Admin"
}
```
**Expected:** `422` · `"Role mismatch"`

---

#### TC-S-13 — Invalid department
```json
{
  "name": "Test User",
  "email": "test7@hms.com",
  "password": "Test@1234",
  "phone": "9876543210",
  "designation": "ADMIN",
  "department": "Finance"
}
```
**Expected:** `422` · `"Invalid Department"`

---

#### TC-S-14 — DOCTOR without medicalRegistrationNumber
```json
{
  "name": "Dr Test",
  "email": "test8@hms.com",
  "password": "Doctor@123",
  "phone": "9876543210",
  "designation": "DOCTOR",
  "department": "OPD"
}
```
**Expected:** `422` · `"Medical registration number is required for this role"`

---

#### TC-S-15 — ADMIN with medicalRegistrationNumber (not allowed)
```json
{
  "name": "Admin Test",
  "email": "test9@hms.com",
  "password": "Admin@123",
  "phone": "9876543210",
  "designation": "ADMIN",
  "department": "Admin",
  "medicalRegistrationNumber": "MRC-INVALID"
}
```
**Expected:** `422` · `"Medical registration number is available only for medical-based roles"`

---

#### TC-S-16 — Name with numbers
```json
{
  "name": "John123",
  "email": "test10@hms.com",
  "password": "Test@1234",
  "phone": "9876543210",
  "designation": "ADMIN",
  "department": "Admin"
}
```
**Expected:** `422` · `"Name is required"` (name regex only allows A-Z, a-z, spaces)

---

#### TC-S-17 — Missing required fields (empty body)
```json
{}
```
**Expected:** `422` · Multiple validation errors

---

---

## 2. POST `/api/auth/login`

**Headers:** `Content-Type: application/json`

> ⚠️ To test TC-L-01 (successful login), the user must have verified their email first (via the verify-email link sent after signup).

---

### ✅ POSITIVE SCENARIOS

#### TC-L-01 — Valid credentials (verified account)
```json
{
  "email": "arjun.menon@hms.com",
  "password": "Doctor@123"
}
```
**Expected:** `200 OK`
```json
{
  "message": "Login successful",
  "token": "<JWT>",
  "user": {
    "id": "EMP-XXXX",
    "email": "arjun.menon@hms.com",
    "role": ["DOCTOR"],
    "lastloginAt": "...",
    "profile": { ... }
  }
}
```
> 💡 **Save the `token` value as a Postman environment variable** (e.g. `AUTH_TOKEN`) for use in `/me` tests.

---

### ❌ NEGATIVE SCENARIOS

#### TC-L-02 — Wrong password
```json
{
  "email": "arjun.menon@hms.com",
  "password": "WrongPass@1"
}
```
**Expected:** `401 Unauthorized` · `{ message: "Invalid email or password" }`

---

#### TC-L-03 — Non-existent email
```json
{
  "email": "ghost@hms.com",
  "password": "Doctor@123"
}
```
**Expected:** `401 Unauthorized` · `{ message: "Invalid email or password" }`

---

#### TC-L-04 — Unverified account (not yet clicked email link)
```json
{
  "email": "priya.nair@hms.com",
  "password": "Admin@1234"
}
```
**Expected:** `403 Forbidden` · `{ message: "Your account has not been verified. Please verify your email" }`

---

#### TC-L-05 — Empty email field
```json
{
  "email": "",
  "password": "Doctor@123"
}
```
**Expected:** `422` · `"Valid email required"`

---

#### TC-L-06 — Empty password field
```json
{
  "email": "arjun.menon@hms.com",
  "password": ""
}
```
**Expected:** `422` · `"Password is required"`

---

#### TC-L-07 — Invalid email format
```json
{
  "email": "not-valid",
  "password": "Doctor@123"
}
```
**Expected:** `422` · `"Valid email required"`

---

#### TC-L-08 — Missing body fields entirely
```json
{}
```
**Expected:** `422` · Validation errors for email and password

---

---

## 3. GET `/api/auth/me`

**Headers:**  
`Authorization: Bearer {{AUTH_TOKEN}}`  
*(No request body needed)*

---

### ✅ POSITIVE SCENARIOS

#### TC-M-01 — Valid JWT token
- Set `Authorization` header: `Bearer <token from TC-L-01>`

**Expected:** `200 OK`
```json
{
  "user": {
    "id": "EMP-XXXX",
    "email": "arjun.menon@hms.com",
    "role": ["DOCTOR"],
    "lastLoginAt": "..."
  },
  "profile": {
    "name": "Dr Arjun Menon",
    "phone": "9876543210",
    "department": "OPD",
    ...
  }
}
```

---

### ❌ NEGATIVE SCENARIOS

#### TC-M-02 — No Authorization header
- Remove the `Authorization` header entirely

**Expected:** `401 Unauthorized` · `{ message: "No token provided" }`

---

#### TC-M-03 — Malformed token (missing "Bearer" prefix)
- Header: `Authorization: <token_without_bearer>`

**Expected:** `401 Unauthorized` · `{ message: "No token provided" }`

---

#### TC-M-04 — Invalid / tampered token
- Header: `Authorization: Bearer invalidtoken.abc.xyz`

**Expected:** `401 Unauthorized` · `{ message: "Invalid or expired token" }`

---

#### TC-M-05 — Expired token
- Use a token that was issued with a very short expiry (or wait for `JWT_EXPIRES_IN` to pass)

**Expected:** `401 Unauthorized` · `{ message: "Invalid or expired token" }`

---

#### TC-M-06 — Empty Bearer value
- Header: `Authorization: Bearer `

**Expected:** `401 Unauthorized` · `{ message: "Invalid or expired token" }`

---

---

## 4. GET `/api/auth/verify-email/:token`

**No body or auth header needed. Token comes from the email link.**

URL format: `GET /api/auth/verify-email/<hex-token>`

---

### ✅ POSITIVE SCENARIOS

#### TC-V-01 — Valid, unexpired token
- After signing up (TC-S-01), check your email for the verification link
- Copy the token from the URL and send:

`GET /api/auth/verify-email/a1b2c3d4e5f6...` *(64-char hex string)*

**Expected:** `200 OK`
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```
> After this, the user's `isActive` becomes `true` and login will succeed.

---

### ❌ NEGATIVE SCENARIOS

#### TC-V-02 — Invalid / random token
`GET /api/auth/verify-email/0000000000000000000000000000000000000000000000000000000000000000`

**Expected:** `400 Bad Request`
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

#### TC-V-03 — Already used token (reuse after TC-V-01)
- Send the same valid token again (token is nulled out after first use)

`GET /api/auth/verify-email/<same-token-as-TC-V-01>`

**Expected:** `400 Bad Request` · `{ message: "Invalid or expired token" }`

---

#### TC-V-04 — Expired token
- Token is valid for 24 hours (set in `verificationTokenExpiry`). Simulate by directly updating the DB expiry to a past date, then hit the endpoint.

**Expected:** `400 Bad Request` · `{ message: "Invalid or expired token" }`

---

#### TC-V-05 — Completely garbage token string
`GET /api/auth/verify-email/xyz`

**Expected:** `400 Bad Request` · `{ message: "Invalid or expired token" }`

---

---

## Summary Table

| TC ID    | Endpoint        | Scenario                              | Expected Status |
|----------|-----------------|---------------------------------------|-----------------|
| TC-S-01  | POST /signup    | Valid Doctor signup                   | 201             |
| TC-S-02  | POST /signup    | Valid Admin signup                    | 201             |
| TC-S-03  | POST /signup    | Valid Receptionist signup             | 201             |
| TC-S-04  | POST /signup    | Valid Nurse signup                    | 201             |
| TC-S-05  | POST /signup    | Duplicate email                       | 409             |
| TC-S-06  | POST /signup    | Invalid email format                  | 422             |
| TC-S-07  | POST /signup    | No uppercase in password              | 422             |
| TC-S-08  | POST /signup    | Password < 8 chars                    | 422             |
| TC-S-09  | POST /signup    | No special char in password           | 422             |
| TC-S-10  | POST /signup    | Phone starts with 5                   | 422             |
| TC-S-11  | POST /signup    | Phone too short                       | 422             |
| TC-S-12  | POST /signup    | Invalid designation                   | 422             |
| TC-S-13  | POST /signup    | Invalid department                    | 422             |
| TC-S-14  | POST /signup    | Doctor without MRN                    | 422             |
| TC-S-15  | POST /signup    | Admin with MRN                        | 422             |
| TC-S-16  | POST /signup    | Name contains numbers                 | 422             |
| TC-S-17  | POST /signup    | Empty body                            | 422             |
| TC-L-01  | POST /login     | Valid credentials (verified user)     | 200             |
| TC-L-02  | POST /login     | Wrong password                        | 401             |
| TC-L-03  | POST /login     | Non-existent email                    | 401             |
| TC-L-04  | POST /login     | Unverified account                    | 403             |
| TC-L-05  | POST /login     | Empty email                           | 422             |
| TC-L-06  | POST /login     | Empty password                        | 422             |
| TC-L-07  | POST /login     | Invalid email format                  | 422             |
| TC-L-08  | POST /login     | Empty body                            | 422             |
| TC-M-01  | GET /me         | Valid JWT                             | 200             |
| TC-M-02  | GET /me         | No Authorization header               | 401             |
| TC-M-03  | GET /me         | No Bearer prefix                      | 401             |
| TC-M-04  | GET /me         | Tampered token                        | 401             |
| TC-M-05  | GET /me         | Expired token                         | 401             |
| TC-M-06  | GET /me         | Empty Bearer value                    | 401             |
| TC-V-01  | GET /verify-email | Valid, fresh token                  | 200             |
| TC-V-02  | GET /verify-email | Random invalid token                | 400             |
| TC-V-03  | GET /verify-email | Already-used token                  | 400             |
| TC-V-04  | GET /verify-email | Expired token                       | 400             |
| TC-V-05  | GET /verify-email | Garbage string                      | 400             |

---

## Postman Setup Tips

1. **Environment variables to set:**
   - `BASE_URL` → `http://localhost:3000`
   - `AUTH_TOKEN` → *(set automatically using a "Tests" script after TC-L-01)*

2. **Auto-save token after login** — paste this in the Postman **Tests** tab of TC-L-01:
   ```javascript
   const res = pm.response.json();
   if (res.token) {
     pm.environment.set("AUTH_TOKEN", res.token);
   }
   ```

3. **For `/me`** — set Authorization type to **Bearer Token** and value to `{{AUTH_TOKEN}}`.

4. **Validation errors** — the API uses `express-validator`. The 422 responses will include an `errors` array with field-level messages.
