-- See Curavite Hospital Management — Relational Database Schema Reference
-- Compatible with PostgreSQL / Supabase if you ever migrate from Firebase Cloud Firestore.

create table if not exists public.roles_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'staff')),
  department text default 'General',
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hospital_settings (
  id text primary key default 'hospital_config',
  hospital_name text not null default 'See Curavite Hospital Management',
  uhid_prefix text not null default 'CVH',
  address text,
  phone text,
  gstin text,
  drug_license_no text,
  low_stock_threshold integer not null default 15,
  near_expiry_days integer not null default 90,
  auto_logout_minutes integer not null default 15,
  strict_logout_on_hide boolean not null default false,
  receipt_footer text,
  updated_at timestamptz not null default now()
);

create table if not exists public.patients (
  id text primary key,
  uhid text unique not null,
  full_name text not null,
  age integer,
  gender text,
  blood_group text,
  phone text not null,
  emergency_contact text,
  address text,
  city text,
  referral_source text,
  insurance_provider text,
  policy_no text,
  family_group_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.op_visits (
  id text primary key,
  visit_date date not null,
  token_no text,
  uhid text references public.patients(uhid),
  patient_name text not null,
  doctor_name text not null,
  visit_type text default 'New',
  consultation_fee numeric(10,2) default 0,
  vitals jsonb default '{}'::jsonb,
  chief_complaint text,
  diagnosis text,
  icd_code text,
  status text default 'Waiting',
  created_at timestamptz not null default now()
);

create table if not exists public.ip_admissions (
  id text primary key,
  admit_date date not null,
  uhid text references public.patients(uhid),
  patient_name text not null,
  doctor_name text not null,
  ward text not null,
  room_no text not null,
  diagnosis text,
  advance_paid numeric(10,2) default 0,
  service_charges jsonb default '[]'::jsonb,
  status text default 'Admitted',
  discharge_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.medicines (
  id text primary key,
  name text not null,
  generic text,
  med_type text,
  manufacturer text,
  hsn text,
  batch_no text,
  expiry date,
  stock integer not null default 0,
  mrp numeric(10,2) not null,
  purchase_rate numeric(10,2) not null,
  gst_percent numeric(5,2) not null default 12,
  barcode text,
  updated_at timestamptz not null default now()
);

create table if not exists public.pharmacy_purchases (
  id text primary key,
  grn_date date not null,
  invoice_no text not null,
  supplier text not null,
  purchase_type text default 'Purchase',
  items jsonb not null default '[]'::jsonb,
  sub_total numeric(12,2) not null default 0,
  gst_amount numeric(12,2) not null default 0,
  net_total numeric(12,2) not null default 0,
  status text not null default 'Pending Approval' check (status in ('Pending Approval', 'Approved', 'Rejected')),
  entered_by text not null,
  approved_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.pharmacy_sales (
  id text primary key,
  bill_date date not null,
  uhid text,
  patient_name text not null,
  sale_type text default 'General',
  items jsonb not null default '[]'::jsonb,
  sub_total numeric(12,2) not null default 0,
  gst_amount numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  net_total numeric(12,2) not null default 0,
  payment_mode text not null,
  status text not null default 'Paid',
  billed_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lab_orders (
  id text primary key,
  order_date date not null,
  uhid text,
  patient_name text not null,
  category text not null,
  test_name text not null,
  source text default 'In-House',
  price numeric(10,2) not null default 0,
  result_value text,
  status text default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists public.cashier_bills (
  id text primary key,
  bill_date date not null,
  uhid text,
  patient_name text not null,
  doctor_name text,
  category text,
  amount numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0,
  payment_mode text not null,
  status text not null default 'Paid',
  cashier text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  logged_at timestamptz not null default now(),
  username text not null,
  role text not null,
  module text not null,
  action text not null,
  details text
);
