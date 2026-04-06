# Post-Deployment QA Checklist
## MyVision Equipment Tracker — equipment.sightkick.co.uk

_Date: 6 April 2026_
_Environment: Production (Coolify on Hetzner, Cloudflare DNS)_

---

## How to Use This Checklist

Work through each section in order. Each item is a specific test to perform manually. Mark items as you go. If a test fails, note the failure and continue — don't block on one item.

**Test on both desktop (1440px+) and mobile (375px)** where indicated with the mobile icon.

---

## 1. Authentication & Sessions

### Login
- [ ] Navigate to `https://equipment.sightkick.co.uk` — redirects to `/login`
- [ ] Login page shows MyVision logo, branded card with navy accent
- [ ] Enter valid credentials → click Sign in → redirected to Dashboard
- [ ] Enter wrong password → "Invalid email or password" error shown
- [ ] Enter non-existent email → same generic error (no user enumeration)
- [ ] Rapid login attempts (10+) → rate limited (toast or error)

### Session Persistence
- [ ] After login, navigate to Inventory → Loans → Clients → back to Dashboard — stays logged in
- [ ] Close browser tab, reopen `equipment.sightkick.co.uk` — still logged in (refresh token works)
- [ ] Open a second browser tab — authenticated without re-login

### Logout
- [ ] User menu (top-right) → Sign out → redirected to login page
- [ ] After logout, navigating to `/equipment` redirects to `/login`

### Password Change
- [ ] Settings → Change Password → dialog opens with 3 fields
- [ ] Submit empty → field-level errors ("Current password is required", etc.)
- [ ] Submit mismatched passwords → "Passwords do not match" on confirm field
- [ ] Submit correct current + new password → "Password changed" toast
- [ ] Automatically signed out → redirected to login
- [ ] Login with NEW password works
- [ ] Login with OLD password fails

### Profile Edit
- [ ] Settings → change Name → Save Changes → "Profile updated" toast
- [ ] Settings → change Email to existing email → "Email already in use" error
- [ ] Settings → change Email to new unique email → saves successfully

---

## 2. Navigation & Layout

### Desktop Sidebar
- [ ] MyVision logo visible (white on dark blue-grey background)
- [ ] All 7 nav items visible: Dashboard, Inventory, Loans, Clients, Donations, Reports, Admin
- [ ] Active page has yellow left-border accent + lighter background
- [ ] Clicking each nav item navigates to correct page
- [ ] Admin link only visible when logged in as ADMIN role

### Mobile Bottom Nav 📱
- [ ] Resize browser to <1024px — sidebar disappears, bottom nav appears
- [ ] Bottom nav shows: Dashboard, Inventory, Loans, More
- [ ] Active item highlighted in yellow
- [ ] "More" dropdown shows: Clients, Donations, Reports, Admin
- [ ] All links navigate correctly

### Header
- [ ] Page title shown in header bar (e.g., "Dashboard", "Inventory", "Add Equipment")
- [ ] Notification bell visible with count badge (if unread notifications exist)
- [ ] User menu shows name + role badge + Settings + Sign out

---

## 3. Dashboard

- [ ] Page loads without errors
- [ ] **Metric cards**: Overdue Loans, Active Loans, On Demo Visit, For Sale — all show correct counts
- [ ] **Stock Distribution chart**: stacked bar renders with colour legend
- [ ] **Loanable Stock Usage gauge**: percentage and bar render
- [ ] **Equipment by Type chart**: horizontal bars render with category labels
- [ ] **Recent Activity feed**: shows latest audit entries with timestamps
- [ ] Click a metric card → navigates to relevant page (e.g., Overdue → Loans)
- [ ] Click an activity item link → navigates to equipment detail

---

## 4. Equipment Inventory

### List View
- [ ] Page loads showing equipment table with 55 items
- [ ] Columns: Name, Make/Model, Category, Type, Status, Condition, Added
- [ ] Pagination shows "Showing 1–25 of 55" with Previous/Next buttons
- [ ] Click Next → page 2 loads (items 26–50)
- [ ] Click Next → page 3 loads (items 51–55)
- [ ] Click Previous → returns to page 2

### Search & Filters
- [ ] Type "iPad" in search → results filter to iPad items only
- [ ] Clear search → all items return
- [ ] Select Status filter → "Available for Demo" → only matching items shown
- [ ] Select Category filter → "Tablet" → only tablets shown
- [ ] Check "Show archived" → no change (no archived items yet)
- [ ] Clear all filters → full list returns
- [ ] **Empty state**: Search for "zzzzz" → icon + "No equipment found." + "Add Equipment" CTA

### For Sale Tab
- [ ] Click "For Sale" tab → shows items flagged for sale (may be empty)
- [ ] Empty state shows appropriate message

### Mobile 📱
- [ ] Table columns collapse (some hidden on small screens)
- [ ] Table scrolls horizontally if needed
- [ ] Search and filters stack vertically

---

## 5. Equipment Detail

- [ ] Click any equipment name → detail page loads
- [ ] **Header**: item name, status badge, acquisition badge
- [ ] **Metadata grid**: Make, Model, Serial Number, Category, Condition, Acquired date
- [ ] **Edit button**: opens dialog, pre-populated with current data
- [ ] **Print Label button**: opens label page in new context
- [ ] **Audit Log**: click to expand → shows creation event
- [ ] **Audit Log pagination**: works if many entries

### Edit Dialog
- [ ] Opens with current values pre-filled
- [ ] Clear Name → submit → "Name is required" inline error
- [ ] Change condition via Select dropdown → Save → "Equipment updated" toast
- [ ] Close dialog → reopen → form reset to current values

---

## 6. Equipment Creation (Multi-Step Form)

### Step 1: Basic Info
- [ ] "Add Equipment" button → navigates to `/equipment/new`
- [ ] Step indicator shows step 1 of 4
- [ ] Click Next with empty required fields → validation errors appear
- [ ] Fill: Name, Category (select), Acquisition Type (select), Condition, Date
- [ ] Click Next → advances to Step 2

### Step 2: Details
- [ ] Optional fields: Make, Model, Serial Number, Condition Notes, Notes
- [ ] Fill in Make and Model
- [ ] Click Next → advances to Step 3

### Step 3: Acquisition Details
- [ ] If Donated type selected: shows Donor Name field (required) or Link Donation option
- [ ] If Purchased type selected: shows Purchase Price, Supplier, Warranty fields
- [ ] Fill required fields → Next

### Step 4: Review
- [ ] All entered data shown in summary
- [ ] Click "Create Equipment" → "Equipment created" toast
- [ ] Redirected to new item's detail page
- [ ] Item appears in Inventory list

### Navigation
- [ ] Back button returns to previous step without losing data
- [ ] Cancel button returns to Inventory
- [ ] Step indicator shows current step highlighted

---

## 7. Loan Lifecycle

### Issue Loan
- [ ] Navigate to an "Available for Loan" equipment item
- [ ] Click "Issue Loan" → dialog opens
- [ ] Client typeahead: type a name → no results (no clients yet)
- [ ] Click "Create new client" → CreateClientDialog opens
- [ ] Enter CharityLog ID + Display Name → Create → client auto-selected
- [ ] Set Expected Return date → click "Issue Loan"
- [ ] "Loan created" toast
- [ ] Equipment status changes to "On Loan"
- [ ] LoanCard appears showing client, loaned date, expected return

### Return Loan
- [ ] On the loaned item's detail page → click "Return"
- [ ] Return dialog: select Condition at Return, add notes
- [ ] Submit → "Loan returned" toast
- [ ] Equipment status changes back to "Available for Loan"

### Reserve → Convert to Loan
- [ ] On an available item → click "Reserve"
- [ ] Select client, optional expiry → "Equipment reserved" toast
- [ ] ReservationCard appears → click "Convert to Loan"
- [ ] "Converted to loan" toast → LoanCard appears

### Cancel Reservation
- [ ] Reserve an item → ReservationCard shows
- [ ] Click "Cancel" → confirmation dialog → "Reservation cancelled"
- [ ] Item returns to available status

### Convert Loan to Allocation
- [ ] On a loaned item → click "Convert to Allocation"
- [ ] Confirmation dialog: "This cannot be undone" → "Convert to Allocation"
- [ ] "Converted to permanent allocation" toast
- [ ] AllocationCard appears (permanent)

---

## 8. Demo Visits

- [ ] Navigate to an "Available for Demo" item
- [ ] Click "Start Demo Visit" → dialog opens
- [ ] Enter destination + expected return → submit
- [ ] "Demo visit started" toast → DemoVisitCard appears
- [ ] Click "Return from Demo" → condition select + notes → submit
- [ ] "Demo visit returned" toast → item returns to available

---

## 9. Clients

- [ ] Navigate to Clients page
- [ ] Table shows clients created during loan testing
- [ ] Click client name → Client Detail page
- [ ] Detail shows loan history and allocations
- [ ] **Admin only**: Actions dropdown → "Anonymise" → AlertDialog confirmation
- [ ] After anonymise: display name replaced with "Anonymised"

---

## 10. Donations

- [ ] Navigate to Donations page
- [ ] If equipment was created with donor info, donations appear here
- [ ] Toggle acknowledge button → badge changes between "Sent" / not sent
- [ ] Click donation → Donation Detail page
- [ ] Detail shows linked equipment

---

## 11. Reports

- [ ] Navigate to Reports page → 6 report cards displayed
- [ ] Click "Download CSV" on Full Inventory → file downloads
- [ ] Open downloaded file → CSV with equipment data, correct columns
- [ ] Download Active Loans report
- [ ] Download Overdue report
- [ ] Download Demo Visits report
- [ ] Download Allocations report
- [ ] Download Utilisation report

---

## 12. Admin — User Management

- [ ] Navigate to Admin → User Management
- [ ] Table shows current users
- [ ] **Create user**: click "Add User" → fill name, email, password, role → Create
- [ ] New user appears in table
- [ ] **Login as new user** in incognito window → verify access
- [ ] **Edit user**: change name or role → Save
- [ ] **Reset password**: Actions → Reset Password → enter new password → confirm
- [ ] **Deactivate user**: Actions → Deactivate → user marked inactive
- [ ] **Reactivate user**: Actions → Reactivate → user active again
- [ ] **Staff role restrictions**: login as Staff → Admin nav hidden, `/admin/users` blocked

---

## 13. Notifications

- [ ] After creating overdue loans or expired reservations, wait for cron (06:00 UTC) or check existing
- [ ] Notification bell shows count badge
- [ ] Click bell → NotificationDrawer opens
- [ ] Notifications show type icon, message, timestamp
- [ ] Click a notification → navigates to related equipment → marked as read
- [ ] "Mark all read" button clears all unread
- [ ] Badge count updates after marking read

---

## 14. QR Labels

- [ ] On any equipment detail → click "Print Label"
- [ ] Label page opens with preview: logo, name, make/model, serial, QR code
- [ ] Position picker: 21 positions (7 rows × 3 columns)
- [ ] Click different positions → preview updates
- [ ] Print preview (Cmd+P) shows A4 layout with label at selected position
- [ ] QR code is scannable (use phone camera) → links to equipment detail URL

---

## 15. Accessibility

### Keyboard Navigation
- [ ] Tab through entire login page → all fields reachable in logical order
- [ ] Tab from page top → skip-to-content link appears → Enter → focus jumps to main content
- [ ] Tab through sidebar → all nav links focusable with visible focus ring
- [ ] Tab through a form → all fields, selects, buttons reachable
- [ ] Escape closes any open dialog
- [ ] Enter submits focused button

### Screen Reader (VoiceOver on Mac: Cmd+F5)
- [ ] Page title announced on navigation
- [ ] Form fields announce their labels
- [ ] Required fields announce as required
- [ ] Validation errors announced when field is focused
- [ ] Active nav link announces "current page"
- [ ] Dashboard chart data available via aria-label

### Colour & Contrast
- [ ] All text readable (no light-on-light or dark-on-dark)
- [ ] Status badges have text labels (not colour-only)
- [ ] Focus rings visible on all interactive elements

---

## 16. Security

- [ ] `https://equipment.sightkick.co.uk/api/health` — accessible without login (200)
- [ ] `https://equipment.sightkick.co.uk/api/equipment` — returns 401 without login
- [ ] Response headers include: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [ ] Browser cookies: `jwt` and `refreshToken` have HttpOnly, Secure, SameSite=Strict flags
- [ ] Login error messages don't reveal whether email exists

---

## 17. Performance

- [ ] Dashboard loads in under 3 seconds
- [ ] Equipment list loads in under 2 seconds
- [ ] Equipment detail loads in under 1 second
- [ ] No JavaScript console errors on any page
- [ ] No broken images or missing assets
- [ ] All fonts load correctly

---

## 18. Mobile End-to-End 📱

Complete this section at 375px viewport (iPhone SE) or on an actual phone:

- [ ] Login page: form is usable, button full-width
- [ ] Dashboard: cards stack in 2-column grid, charts readable
- [ ] Inventory: table scrollable, search/filters stack vertically
- [ ] Equipment detail: metadata single column, buttons wrap
- [ ] Add Equipment form: steps work, selects open correctly
- [ ] Dialogs: full-width, scrollable, buttons reachable
- [ ] Bottom nav: all items tappable (44px+ touch targets)
- [ ] Notification drawer: full-screen on mobile

---

## Sign-Off

| Tester | Date | Result | Notes |
|--------|------|--------|-------|
| | | | |

**Pass criteria**: All critical items (sections 1–12) pass. Accessibility (section 15) and mobile (section 18) have no blocking issues. Performance (section 17) meets targets.
