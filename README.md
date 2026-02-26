# حنين الشرق للاستقدام — نظام الإدارة
## Haneen Al Sharq Recruitment — Management System

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **UI**: Arabic RTL, Cairo Font, Dark Navy Blue Theme (#1B2B6B)

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies
```bash
cd Haneen_system_final
npm install
```

### Step 2: Run Database Schema
1. Open your Supabase Dashboard → SQL Editor
2. Copy the entire contents of `supabase_schema.sql`
3. Paste and run it — this creates all tables, triggers, views, RLS policies

### Step 3: Create Users in Supabase
Go to Supabase Dashboard → Authentication → Users → Add User:

| Email | Password | Display Name | Role |
|-------|----------|--------------|------|
| ahmed@haneen.sa | (your choice) | أحمد | admin |
| wajdi@haneen.sa | (your choice) | وجدي | data_entry |
| check@haneen.sa | (your choice) | مستخدم البحث | check_user |
| driver@haneen.sa | (your choice) | السائق | driver |
| abuturki@haneen.sa | (your choice) | أبو تركي | owner |

After creating each user, insert their profile:
```sql
INSERT INTO user_profiles (id, display_name, role) VALUES
  ('USER_ID_FROM_AUTH', 'أحمد', 'admin'),
  ('USER_ID_FROM_AUTH', 'وجدي', 'data_entry'),
  ('USER_ID_FROM_AUTH', 'مستخدم البحث', 'check_user'),
  ('USER_ID_FROM_AUTH', 'السائق', 'driver'),
  ('USER_ID_FROM_AUTH', 'أبو تركي', 'owner');
```

### Step 4: Add Logo
Place your logo file as `public/logo.png`

### Step 5: Run Development Server
```bash
npm run dev
```
Open http://localhost:3000

---

## 📁 Project Structure
```
Haneen_system_final/
├── app/
│   ├── layout.tsx          # Root layout (RTL + Cairo)
│   ├── page.tsx            # Login
│   ├── globals.css         # Theme + Navy Blue
│   ├── dashboard/          # Ahmed's dashboard
│   ├── orders/             # Orders CRUD + bulk ops
│   ├── contracts/          # Contracts + financial
│   ├── cvs/                # Worker CVs + photo upload
│   ├── external-offices/   # External offices master
│   ├── external-accounts/  # Payment tracking
│   ├── reports/            # Owner, delayed, financial, analytics
│   ├── check/              # Search (contract# / phone#)
│   ├── schedule/           # Driver schedule
│   ├── workers/            # PUBLIC: Worker grid
│   ├── about/              # PUBLIC: Company info
│   └── track/[token]/      # PUBLIC: Client tracking
├── components/
│   ├── ui/                 # Sidebar, DataTable, StatusBadge, etc.
│   ├── forms/              # OrderForm, ContractForm, CVForm
│   ├── dashboard/          # Stat widgets, charts
│   └── tracking/           # Progress bar, status messages
├── lib/
│   ├── supabase.ts         # Browser client
│   ├── supabase-server.ts  # Server client
│   ├── constants.ts        # All system constants
│   ├── types.ts            # TypeScript definitions
│   └── ...
├── middleware.ts            # Auth protection
├── supabase_schema.sql     # Complete DB schema
└── .env.local              # Supabase credentials
```

---

## 🔐 User Roles
| User | Access |
|------|--------|
| أحمد (Admin) | Full access — all features |
| وجدي (Data Entry) | Create orders, view all, select workers |
| Check User | Search by contract# or phone# only |
| Driver | View upcoming arrivals/returns |
| أبو تركي (Owner) | View all reports — no edit |

---

## Phase 1 (Current) ✅
- [x] Database schema + triggers + RLS
- [x] Authentication + role routing
- [x] Dashboard with stats
- [x] Orders CRUD + passport auto-populate + bulk status
- [x] CVs CRUD + photo upload + video URL
- [x] Contracts + financial editing
- [x] External offices master
- [x] Check search page
- [x] Driver schedule page
- [x] Copy all visa numbers

## Phase 2 (Next)
- [ ] Financial dashboard + Musaned tracking
- [ ] Analytics + charts (quarterly, nationality %, arrival reports)
- [ ] Excel/PDF export on all reports
- [ ] Magic token client tracking page
- [ ] Public workers page (attractive cards)
- [ ] About Us page
- [ ] Owner dashboard (Abu Turki)
- [ ] Delayed contracts alert view
- [ ] External accounts payment tracking
