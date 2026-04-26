# Sales Tracking System — SaaS Dashboard

A role-based SaaS app for tracking Micro Enterprises (MEs), their fixed master tasks, and product assignments, with three distinct experiences: Admin, Sales/Market Developer, and ME user.

---

## 1. Roles & Authentication

Simple email/password login with a role selector on the login screen:
- **Admin** — full access
- **Sales/Market Developer** — access only to assigned MEs
- **ME (Micro Enterprise)** — access only to own profile

Signup creates the auth user; role is chosen at signup (or assigned by Admin). Each ME = exactly one profile (1-to-1).

---

## 2. Profile (ME) Module

Each profile contains:
- Owner Name, Enterprise Name, Business Category (dropdown)
- Contact Number, Email, Location
- Registration Date
- Trade License (file upload)
- Owner Image, Shop Image (image uploads)
- Sub-sector (one of 12, see below)
- Assigned Developer

**Sub-sectors (12):** Automobile Workshop, Dairy products, Dry fish processing and trade, Eco-friendly tourism, Full grain rice, High-value crops, High-value handicrafts rural area, Leather products, Loom, Machinery & Equipment, Metal products, Mini garments, Poultry.

### Profile Detail Page Layout (same for all roles)
3-column card layout:
- **Left:** Owner avatar (rounded, medium)
- **Middle:** Profile info (label + value format)
- **Right:** Shop image (rectangular card)

Responsive: 3-col on desktop, 2+1 on tablet, vertical stack on mobile (Avatar → Info → Shop).

Below the header card: two tabs/sections — **Tasks** and **Products**.

---

## 3. Fixed Master Task System

24 predefined global tasks auto-attached to every ME profile:

Banner/Festoon, Billboard, Cutout Board, Digital Media Posts, Environmental NOC, Facebook Page Development, Leaflet/Brochure/Product Catalog, Media Buying, OVC & Documentary, POSM Items, Packaging, Post Design (5 times), Press Releases, Price Tag, Print Media Ads, Product License, Product Testing Support, Retail Branding, Shop Sign, Trade License, Visiting Card, Voiceover Recording, YouTube Channel, FB/YouTube Boosting.

**Rules:**
- Only **Admin** can add/remove tasks from the master list
- Per-ME, only **status** is editable: Pending / Processing / Completed
- Proof upload allowed **only when status = Completed**
- Developer & ME cannot create or delete tasks

---

## 4. Product List

Same 24-item list as products (predefined, editable by Admin only). Each product can be assigned to a profile with a status (Pending / Processing / Completed). Developer can assign and update status on assigned MEs only.

---

## 5. Role Permissions Summary

| Capability | Admin | Developer | ME |
|---|---|---|---|
| View all profiles | ✔ | Assigned only | Own only |
| Edit profiles | ✔ | Assigned only (no ownership change) | Own only |
| Create profile | ✔ | ✘ | Own (one) |
| Delete profile | ✔ | ✘ | ✘ |
| Update task status | ✔ | Assigned MEs | Own (limited) |
| Upload proof | ✔ | Assigned MEs | Own |
| Add/remove master tasks | ✔ | ✘ | ✘ |
| Manage product master list | ✔ | ✘ | ✘ |
| Assign products to ME | ✔ | Assigned only | ✘ |
| View global dashboard | ✔ | ✘ | ✘ |

---

## 6. Dashboards

### Admin Dashboard
- **Summary cards:** Total Profiles, Total Tasks, Completed, Pending, Processing
- **Pie chart:** Task status distribution
- **Bar chart:** Completion by Sub-Sector
- **Sub-Sector Performance table:** Sub Sector | Total MEs | 75%+ Completed | 50–74% | <50%
- **Developer Performance table:** Developer | Total MEs | Tasks Completed | Tasks Pending

### Developer Dashboard (limited)
- Total Assigned MEs, Tasks Completed, Pending, Processing
- Optional simple task-status chart
- No global analytics, no sub-sector summary

### ME Dashboard (very simple)
- Own profile card (3-col layout)
- Own tasks (status view, limited update)
- Own products (status view)
- **Profile Completion %** progress bar based on completed tasks

---

## 7. Navigation & UI

- Sidebar navigation (collapsible, mobile-responsive)
- Top header with user menu + role badge
- Profiles list: search, filter (by sub-sector, developer, status), pagination
- Bulk CSV import for profiles (Admin)
- Clean SaaS aesthetic: cards, soft shadows, neutral palette with a single accent
- Toasts for feedback, confirmation dialogs for destructive actions

---

## 8. Pages / Routes

- `/login` — role-selector login
- `/signup` — signup (with role)
- `/dashboard` — role-aware (Admin / Developer / ME variants)
- `/profiles` — list (Admin sees all, Developer sees assigned, ME redirected to own)
- `/profiles/:id` — 3-column detail page with Tasks & Products tabs
- `/profiles/new` — create profile (Admin or first-time ME)
- `/master-tasks` — Admin: manage 24-task master list
- `/products` — Admin: manage product master list
- `/developers` — Admin: developer performance view
- `/import` — Admin: CSV bulk import

---

## Technical Notes

**Stack:** React + Vite + Tailwind + shadcn/ui, React Router, TanStack Query, Recharts for charts, Lovable Cloud (Supabase) for backend.

**Database tables:**
- `profiles` — auth-linked user metadata + role (`admin` | `developer` | `me`)
- `user_roles` — separate roles table with `app_role` enum + `has_role()` security definer function (avoids RLS recursion / privilege escalation)
- `me_profiles` — the ME entity records (owner_name, enterprise_name, sub_sector, developer_id, user_id, etc.)
- `master_tasks` — 24-row seeded list, Admin-managed
- `me_tasks` — per-(me_profile, master_task) status + proof_url
- `products` — master product list
- `me_products` — assignments + status
- `business_categories` — dropdown source

**Storage buckets:** `trade-licenses`, `owner-images`, `shop-images`, `task-proofs` (RLS-scoped).

**RLS policies (strict isolation):**
- ME: rows where `user_id = auth.uid()`
- Developer: `me_profiles` where `developer_id = auth.uid()`; child rows joined via parent
- Admin: full access via `has_role(auth.uid(), 'admin')`

**Auto-attach tasks:** DB trigger on `me_profiles` insert creates 24 `me_tasks` rows (status=Pending). Trigger on `master_tasks` insert backfills all existing MEs.

**Phase 1 scope:** Profile module + fixed task/product tracking + role-based dashboards + login. No payments, no complex auth flows (email/password only).
