## Product Catalog + ME Purchase Flow

Extend the existing Master Products system into a full product catalog with stock/pricing, plus a cart and developer-approved purchase workflow. No changes to dashboards, profile layout, task system, or role permissions outside the new purchase flow.

---

### 1. Database changes (migration)

**Extend `master_products`** (keeps existing assignments intact):
- `category` text — must match one of the 13 sub-sectors (validated via trigger)
- `price` numeric(10,2) NOT NULL DEFAULT 0
- `stock` integer NOT NULL DEFAULT 0 (CHECK >= 0)
- `image_url` text

**New storage bucket**: `product-images` (public read, admin write).

**New table `orders`**:
- `me_profile_id`, `developer_id` (snapshot of assigned dev at checkout), `status` (pending/approved/rejected), `total_amount`, `notes`, timestamps

**New table `order_items`**:
- `order_id`, `master_product_id`, `quantity`, `unit_price` (snapshot)

**New enum `order_status`**: `pending`, `approved`, `rejected`

**RLS**:
- `master_products`: admin full write; everyone authenticated can read (already exists).
- `orders`: ME can insert/select own; assigned developer can select/update; admin full access.
- `order_items`: follow parent order access.

**Approval trigger** (`approve_order_deduct_stock`):
- On `orders.status` change `pending → approved`: deduct each item's quantity from `master_products.stock`. Reject if any stock would go negative (keeps order pending, raises error).
- `pending → rejected`: no stock change.
- Status transitions locked once not pending.

---

### 2. Admin: Product management UI

Rewrite `src/pages/MasterProducts.tsx` into a full product table:

**Top bar**:
- "Add Product" button → opens dialog
- Sub-sector filter dropdown

**Table columns**: Image thumbnail · Name · Category · Price (৳) · Stock · Actions (Edit / Delete)

**Add/Edit Product dialog** (new `src/components/products/ProductFormDialog.tsx`):
- Name (text)
- Category (Select — 13 sub-sectors from `SUB_SECTORS`)
- Price ৳ (number, ≥0)
- Stock (number, ≥0)
- Image upload (to `product-images` bucket via existing `uploadFile` helper)

Uses zod validation. Admin-only — guarded via existing role check.

---

### 3. ME: Assigned products + cart

Update `src/components/profile/ProductsSection.tsx` for ME view:

- Existing assigned-product list now shows: Name · Price · Available Stock · Quantity input · "Add to Cart" button
- Validate `1 ≤ qty ≤ stock`
- Cart held in local React state (no DB cart table — simpler) inside a new `CartProvider` context scoped to MyProfile page

Add new `src/components/products/CartDrawer.tsx`:
- Sheet/drawer triggered by floating "Cart (n)" button
- Lists items with qty editor + remove
- Total in ৳
- "Request Purchase" button → creates `orders` + `order_items` rows with status `pending`, `developer_id` snapshot from ME profile
- Toast confirmation, clears cart

For Admin/Developer ProductsSection view: unchanged (read-only assignment list).

---

### 4. Orders / Purchase approval UI

**New page `src/pages/Orders.tsx`** (sidebar entry: "Orders"):

- **ME view**: Own orders list — date, items count, total, status badge
- **Developer view**: Pending orders from assigned MEs at top with Approve/Reject buttons; history below
- **Admin view**: All orders, read-only oversight + status filter

Shared table with role-conditional action column. Approve calls update `status='approved'` (DB trigger handles stock); Reject sets `status='rejected'`. Errors from insufficient stock surfaced via toast.

Add route + sidebar link visible to all 3 roles.

---

### 5. Constants / types

- Reuse `SUB_SECTORS` for category dropdown (no new master list)
- Add `ORDER_STATUS_LABEL` / color map in `src/lib/constants.ts`

---

### 6. Files

**New**: migration, `src/components/products/ProductFormDialog.tsx`, `src/components/products/CartDrawer.tsx`, `src/contexts/CartContext.tsx`, `src/pages/Orders.tsx`

**Modified**: `src/pages/MasterProducts.tsx` (full rewrite), `src/components/profile/ProductsSection.tsx` (ME cart UI), `src/lib/constants.ts`, `src/App.tsx` (route), `src/components/AppSidebar.tsx` (Orders link), `src/integrations/supabase/types.ts` (auto-regenerated)

---

### Out of scope (not changed)

Dashboard, profile 3-column layout, task system, auth/approval flow, existing product assignment mechanism, role permission model outside the new purchase approval.
