# Cluck N Moo (CNM) — Staff Bootstrap Setup Guide

This guide describes how to securely initialize staff accounts (Admin, Kitchen Staff, and Riders) in Supabase Auth and assign their roles in the PostgreSQL database.

---

## Architecture Overview

Cluck N Moo enforces strict server-side role-based access control (RBAC).
Roles are stored in the PostgreSQL `public.profiles` table and validated server-side on every request:
- `ADMIN`: Full operational access (settings, delivery areas, all orders, rider assignment, phone confirmations).
- `KITCHEN_STAFF`: Kitchen Display System (KDS), preparation status updates (`Confirmed` -> `Preparing` -> `Ready`).
- `RIDER`: Rider Delivery Portal, assigned delivery order dispatch, cash-on-delivery collection confirmation (`Ready` -> `Out for delivery` -> `Completed`).
- `CUSTOMER`: Default role for all public signups.

Client-side headers (`x-user-role`, `x-user-id`), query parameters, or localStorage claims are **strictly ignored and never trusted**.

---

## Step 1: Create the First Administrator User

### Option A: Via Supabase Web Dashboard (Recommended for initial setup)
1. Go to your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication** > **Users**.
3. Click **Add User** -> **Create User**.
4. Enter the administrator's operational email (e.g., `admin@clucknmoo.com`) and a strong, unique password.
5. Check **Auto Confirm User** (so no email verification loop is needed for internal staff).
6. Click **Create User**.
7. Copy the generated `User UID` (a UUID like `e7b9...`).

### Option B: Via SQL Editor in Supabase Dashboard
Run the following SQL snippet in the Supabase SQL editor:
```sql
-- Replace with the desired staff email and password
-- (Supabase auth.users handles bcrypt hashing internally via pgcrypto)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@clucknmoo.com',
  crypt('YOUR_SECURE_PASSWORD_HERE', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"CNM Head Administrator"}',
  now(),
  now()
);
```

---

## Step 2: Assign the ADMIN Role in the Database

When a user is created in `auth.users`, the trigger `public.handle_new_user()` automatically creates a corresponding row in `public.profiles` with the default role `'CUSTOMER'`.

To elevate the user to `ADMIN`:
1. In the Supabase Dashboard, open the **SQL Editor**.
2. Run the following update query with the admin's email:

```sql
UPDATE public.profiles
SET role = 'ADMIN',
    full_name = 'CNM Admin Manager',
    updated_at = now()
WHERE email = 'admin@clucknmoo.com';
```

3. Verify the role elevation:
```sql
SELECT id, email, full_name, role, updated_at
FROM public.profiles
WHERE email = 'admin@clucknmoo.com';
```
The query must return `role = 'ADMIN'`.

---

## Step 3: Create Kitchen Staff & Rider Users

Follow the same workflow to create accounts for Kitchen Staff and Delivery Riders.

### For Kitchen Staff:
1. Create user in Supabase Auth with email e.g. `kitchen@clucknmoo.com`.
2. Run SQL elevation:
```sql
UPDATE public.profiles
SET role = 'KITCHEN_STAFF',
    full_name = 'Kharian Kitchen Station 1',
    updated_at = now()
WHERE email = 'kitchen@clucknmoo.com';
```

### For Delivery Riders:
1. Create user in Supabase Auth with email e.g. `rider1@clucknmoo.com` and rider phone number.
2. Run SQL elevation:
```sql
UPDATE public.profiles
SET role = 'RIDER',
    full_name = 'Rider - Ali Khan',
    phone = '0300-1234567',
    updated_at = now()
WHERE email = 'rider1@clucknmoo.com';
```

---

## Step 4: Login to Staff Portals

1. Navigate to `/staff/login` on the CNM web application.
2. Enter the staff email and password.
3. Upon authentication:
   - Users with role `ADMIN` are redirected to `/admin`.
   - Users with role `KITCHEN_STAFF` are redirected to `/kitchen`.
   - Users with role `RIDER` are redirected to `/rider`.
4. If a standard `CUSTOMER` logs into `/staff/login` or navigates to any `/admin`, `/kitchen`, or `/rider` URL, the server responds with **403 Forbidden / Access Denied**.

---

## Security Invariants

- **Zero Hardcoded Secrets**: No staff passwords, service role keys, or connection strings are stored in git repositories.
- **Server-Side Role Checks**: Roles are checked directly in PostgreSQL on every API request and route change.
- **Audit Logging**: Every state transition recorded in `order_status_history` tracks `changed_by_user_id` referencing the authenticated staff member's profile UUID.
