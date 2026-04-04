# AVS Matrimony — Community Matrimony Web Application

A production-ready, bilingual (Tamil + English) matrimony web application built for the **Arunattu Vellalar (AVS)** community.

---

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Frontend       | React 19 + Next.js 15 (App Router)|
| Backend        | Next.js API Routes / Server Actions |
| Database       | Supabase (PostgreSQL)             |
| Auth           | OTP-based (Email / Mobile)        |
| Notifications  | Firebase Cloud Messaging + Email  |
| Styling        | Tailwind CSS                      |
| Hosting        | Vercel                            |

---

## Features

**User Features:** Register (OTP), Login (Email/Mobile), Create/Edit Profile, Upload Photos, Send/Accept/Reject Interest, Shortlist, Block User, Photo Privacy, Language Toggle (Tamil/English)

**Matching System:** Age, Location, Education, Marital Status based matching. District-based nearby matches. Admin-approved profiles only.

**Admin Panel:** Dashboard with stats, Approve/Reject users, Edit/Delete profiles, Map married couples, Reports & analytics

**Notifications:** Profile Approved, New Match, Interest Received/Accepted, Wedding Anniversary (annual cron)

**Profile ID Format:** Bride: `AVS-BR-001`, Groom: `AVS-GR-001` (auto-increment, separate sequences)

---

## Folder Structure

```
avs-matrimony/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (main)/
│   │   ├── dashboard/page.tsx
│   │   ├── search/page.tsx
│   │   ├── matches/page.tsx
│   │   ├── interests/page.tsx
│   │   ├── shortlist/page.tsx
│   │   ├── profile/
│   │   │   ├── [id]/page.tsx
│   │   │   └── edit/page.tsx
│   │   └── notifications/page.tsx
│   ├── admin/
│   │   ├── dashboard/page.tsx
│   │   ├── approve/page.tsx
│   │   ├── users/page.tsx
│   │   ├── married/page.tsx
│   │   └── reports/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── send-otp/route.ts
│   │   │   ├── verify-otp/route.ts
│   │   │   └── logout/route.ts
│   │   ├── profiles/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   ├── search/route.ts
│   │   │   └── match/route.ts
│   │   ├── interests/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── shortlist/route.ts
│   │   ├── photos/route.ts
│   │   ├── notifications/route.ts
│   │   ├── admin/
│   │   │   ├── approve/route.ts
│   │   │   ├── reject/route.ts
│   │   │   ├── map-married/route.ts
│   │   │   ├── dashboard/route.ts
│   │   │   └── reports/route.ts
│   │   └── cron/
│   │       └── anniversary/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Avatar.tsx
│   │   ├── Tabs.tsx
│   │   └── Stepper.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   └── Footer.tsx
│   ├── profile/
│   │   ├── ProfileCard.tsx
│   │   ├── ProfileForm.tsx
│   │   ├── ProfileView.tsx
│   │   ├── PhotoUpload.tsx
│   │   └── PhotoPrivacy.tsx
│   ├── search/
│   │   ├── SearchFilters.tsx
│   │   └── SearchResults.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── ApprovalTable.tsx
│   │   ├── UserTable.tsx
│   │   ├── MarriageMapper.tsx
│   │   └── Reports.tsx
│   └── auth/
│       ├── OTPInput.tsx
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useProfile.ts
│   ├── useSearch.ts
│   ├── useInterests.ts
│   ├── useNotifications.ts
│   ├── useLanguage.ts
│   └── useAdmin.ts
├── services/
│   ├── supabase.ts
│   ├── auth.ts
│   ├── profiles.ts
│   ├── interests.ts
│   ├── notifications.ts
│   ├── firebase.ts
│   ├── email.ts
│   ├── matching.ts
│   └── storage.ts
├── types/
│   ├── user.ts
│   ├── profile.ts
│   ├── interest.ts
│   ├── notification.ts
│   ├── admin.ts
│   └── index.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── firebase/
│   │   ├── config.ts
│   │   └── messaging.ts
│   ├── utils.ts
│   ├── constants.ts
│   └── translations/
│       ├── en.ts
│       └── ta.ts
├── middleware.ts
├── public/
│   ├── icons/
│   ├── images/
│   └── firebase-messaging-sw.js
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Database Schema (Supabase PostgreSQL)

### Table: `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_email VARCHAR(255) UNIQUE NOT NULL,
  registered_mobile VARCHAR(20),
  login_type VARCHAR(10) CHECK (login_type IN ('email', 'mobile')) DEFAULT 'email',
  role VARCHAR(10) CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  language_pref VARCHAR(2) CHECK (language_pref IN ('en', 'ta')) DEFAULT 'en',
  fcm_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_id VARCHAR(20) UNIQUE NOT NULL,     -- AVS-BR-001, AVS-GR-001
  profile_type VARCHAR(5) CHECK (profile_type IN ('bride', 'groom')) NOT NULL,

  -- Personal
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  age INTEGER GENERATED ALWAYS AS (
    DATE_PART('year', AGE(date_of_birth))
  ) STORED,
  height VARCHAR(10),
  marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'divorced', 'widowed')) DEFAULT 'single',
  education VARCHAR(100),
  occupation VARCHAR(100),
  salary VARCHAR(20),

  -- Community
  religion VARCHAR(50) DEFAULT 'Hindu',
  community VARCHAR(100) DEFAULT 'Arunattu Vellalar',
  sub_caste VARCHAR(100),
  mother_tongue VARCHAR(50) DEFAULT 'Tamil',

  -- Location
  country VARCHAR(50) DEFAULT 'India',
  state VARCHAR(50) DEFAULT 'Tamil Nadu',
  district VARCHAR(100),
  city VARCHAR(100),

  -- Additional
  family_details TEXT,
  about_me TEXT,
  photo_privacy VARCHAR(20) CHECK (photo_privacy IN ('public', 'accepted', 'loggedIn')) DEFAULT 'public',

  -- WhatsApp & Contact
  whatsapp_number VARCHAR(20),
  contact_number VARCHAR(20),
  alternate_contact VARCHAR(20),

  -- Status
  profile_status VARCHAR(20) CHECK (profile_status IN ('active', 'married', 'inactive', 'deleted')) DEFAULT 'active',
  approval_status VARCHAR(20) CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-increment sequences for profile IDs
CREATE SEQUENCE bride_seq START 1;
CREATE SEQUENCE groom_seq START 1;

-- Function to generate profile_id
CREATE OR REPLACE FUNCTION generate_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_type = 'bride' THEN
    NEW.profile_id := 'AVS-BR-' || LPAD(NEXTVAL('bride_seq')::TEXT, 3, '0');
  ELSE
    NEW.profile_id := 'AVS-GR-' || LPAD(NEXTVAL('groom_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profile_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.profile_id IS NULL)
  EXECUTE FUNCTION generate_profile_id();
```

### Table: `photos`
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  photo_type VARCHAR(20) CHECK (photo_type IN ('profile', 'gallery', 'horoscope')) DEFAULT 'gallery',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `interests`
```sql
CREATE TABLE interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(sender_profile_id, receiver_profile_id)
);
```

### Table: `shortlist`
```sql
CREATE TABLE shortlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shortlisted_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_profile_id, shortlisted_profile_id)
);
```

### Table: `blocked_users`
```sql
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_profile_id, blocked_profile_id)
);
```

### Table: `marriage`
```sql
CREATE TABLE marriage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bride_profile_id UUID REFERENCES profiles(id),
  groom_profile_id UUID REFERENCES profiles(id),
  married_date DATE NOT NULL,
  partner_name VARCHAR(255),
  marriage_type VARCHAR(20) CHECK (marriage_type IN ('arranged', 'love', 'matrimony')) NOT NULL,
  married_via_matrimony BOOLEAN DEFAULT false,
  mapped_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) CHECK (type IN (
    'profile_approved', 'new_match', 'interest_received',
    'interest_accepted', 'interest_rejected', 'anniversary',
    'admin_message'
  )) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `admin_log`
```sql
CREATE TABLE admin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  target_profile_id UUID REFERENCES profiles(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read approved profiles
CREATE POLICY "Public profiles are viewable"
  ON profiles FOR SELECT
  USING (approval_status = 'approved' AND profile_status = 'active');

-- Users can edit own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Users can read own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());
```

### Indexes
```sql
CREATE INDEX idx_profiles_type ON profiles(profile_type);
CREATE INDEX idx_profiles_district ON profiles(district);
CREATE INDEX idx_profiles_status ON profiles(profile_status, approval_status);
CREATE INDEX idx_profiles_age ON profiles(age);
CREATE INDEX idx_interests_sender ON interests(sender_profile_id);
CREATE INDEX idx_interests_receiver ON interests(receiver_profile_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_marriage_date ON marriage(married_date);
```

---

## Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# Email (Resend or SendGrid)
RESEND_API_KEY=re_your-api-key
EMAIL_FROM=noreply@avsmatrimony.com

# App
NEXT_PUBLIC_APP_URL=https://avsmatrimony.com
NEXT_PUBLIC_APP_NAME=AVS Matrimony

# OTP
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

# Admin
ADMIN_EMAIL=admin@avsmatrimony.com

# Cron Secret (for Vercel cron jobs)
CRON_SECRET=your-cron-secret-key
```

---

## Setup Instructions

### 1. Clone & Install
```bash
git clone https://github.com/your-org/avs-matrimony.git
cd avs-matrimony
npm install
```

### 2. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema above in the SQL Editor
3. Enable Row Level Security policies
4. Copy project URL and keys to `.env.local`
5. Enable Supabase Storage for photo uploads (create `photos` and `horoscopes` buckets)

### 3. Firebase Setup
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Cloud Messaging
3. Generate VAPID key for web push
4. Copy config to `.env.local`
5. Add `firebase-messaging-sw.js` to `/public`

### 4. Email Setup
1. Sign up at [resend.com](https://resend.com) (or SendGrid)
2. Verify your domain
3. Create API key and add to `.env.local`

### 5. Run Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel
```bash
npx vercel --prod
```
Add environment variables in Vercel dashboard. Set up Vercel Cron for anniversary notifications:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/anniversary",
      "schedule": "0 6 * * *"
    }
  ]
}
```

---

## Key Implementation Notes

**Profile ID Generation:** Uses PostgreSQL sequences (`bride_seq`, `groom_seq`) with a trigger function for auto-generation.

**OTP Auth Flow:** Send OTP → Verify OTP → Create session. Supports both email and mobile. Store `login_type` in users table.

**Matching Algorithm:** Filters by opposite gender, age range (±5 years), same district priority, compatible education level, same marital status preference.

**Anniversary Cron:** Daily job at 6 AM IST checks `marriage.married_date` month/day against today. Sends push + email notifications.

**Photo Privacy:** `public` = visible to all, `accepted` = only users who accepted interest, `loggedIn` = any authenticated user.

**Admin Approval:** New profiles default to `pending`. Admin reviews and sets to `approved` or `rejected`. Only approved profiles appear in search/matches.

**Marriage Mapping:** Admin can search and link bride + groom profiles. Updates both profiles' `profile_status` to `married`. If partner not on platform, stores `partner_name` only.

---

## License

Private — All rights reserved.
