# Authentication API

## Overview

FluxStudio uses JWT (JSON Web Tokens) for authentication. Tokens expire after 24 hours by default, with refresh tokens available for extended sessions.

## Endpoints

### Register New User

```http
POST /api/auth/signup
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "userType": "designer"
}
```

**User Types:**
- `designer` - Creative professionals
- `client` - Project clients
- `admin` - System administrators

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "clxyz123",
    "email": "user@example.com",
    "name": "John Doe",
    "userType": "designer",
    "createdAt": "2025-02-09T12:00:00Z"
  }
}
```

**Errors:**
- `400` - Validation error (email format, password requirements)
- `409` - Email already registered

---

### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "clxyz123",
    "email": "user@example.com",
    "name": "John Doe",
    "userType": "designer",
    "organizations": ["org-1"],
    "lastLogin": "2025-02-09T12:00:00Z"
  }
}
```

**Errors:**
- `401` - Invalid email or password
- `403` - Account disabled
- `429` - Too many login attempts

---

### Google OAuth Login

```http
POST /api/auth/google
```

**Request Body:**
```json
{
  "credential": "google_id_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "clxyz123",
    "email": "user@gmail.com",
    "name": "John Doe",
    "userType": "client",
    "oauthProvider": "google",
    "profilePicture": "https://..."
  },
  "isNewUser": false
}
```

**Notes:**
- First-time OAuth users are automatically registered
- `isNewUser: true` indicates account was just created

---

### Refresh Token

```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "your_refresh_token"
}
```

**Response:**
```json
{
  "success": true,
  "token": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

**Errors:**
- `401` - Invalid or expired refresh token

---

### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "clxyz123",
    "email": "user@example.com",
    "name": "John Doe",
    "userType": "designer",
    "profilePicture": "https://...",
    "phone": "+1234567890",
    "timezone": "America/New_York",
    "preferences": {
      "notifications": {
        "email": true,
        "push": true
      },
      "display": {
        "theme": "light",
        "compactMode": false
      }
    },
    "organizations": [
      {
        "id": "org-1",
        "name": "Design Studio",
        "role": "owner"
      }
    ],
    "createdAt": "2024-01-15T10:00:00Z",
    "lastLogin": "2025-02-09T12:00:00Z"
  }
}
```

---

### Update Profile

```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+1234567890",
  "timezone": "America/Los_Angeles",
  "preferences": {
    "notifications": {
      "email": false
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "clxyz123",
    "name": "John Smith",
    "phone": "+1234567890",
    "timezone": "America/Los_Angeles",
    "updatedAt": "2025-02-09T12:30:00Z"
  }
}
```

---

### Change Password

```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

---

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Request Body (optional):**
```json
{
  "refreshToken": "token_to_invalidate"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Request Password Reset

```http
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists, a reset email has been sent"
}
```

**Note:** Response is intentionally vague to prevent email enumeration.

---

### Reset Password

```http
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newSecurePassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Token Structure

### Access Token (JWT)

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "John Doe",
  "userType": "designer",
  "iat": 1707480000,
  "exp": 1707566400
}
```

### Token Expiration
- Access Token: 24 hours (configurable via `JWT_EXPIRES_IN`)
- Refresh Token: 30 days

## Security Headers

The authentication endpoints return CSRF tokens via cookies:
- `_csrf`: CSRF token for subsequent requests
- `HttpOnly`, `Secure`, `SameSite=Strict` flags enabled in production

## Rate Limiting

Authentication endpoints have stricter rate limits:
- Login: 5 attempts per 15 minutes per IP
- Password reset: 3 requests per hour per email
- Signup: 10 requests per hour per IP
