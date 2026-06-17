CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(120) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(10) PRIMARY KEY,
  title_fa VARCHAR(80) NOT NULL,
  rate_to_toman NUMERIC(18, 2) NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coin_types (
  code VARCHAR(40) PRIMARY KEY,
  title_fa VARCHAR(120) NOT NULL,
  price_toman NUMERIC(18, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS karat_options (
  karat INTEGER PRIMARY KEY,
  title_fa VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS unit_options (
  code VARCHAR(30) PRIMARY KEY,
  title_fa VARCHAR(60) NOT NULL,
  gram_factor NUMERIC(18, 8) NOT NULL
);

CREATE TABLE IF NOT EXISTS gold_price_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  global_gold_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  domestic_18k_price NUMERIC(18, 2) NOT NULL,
  usd_exchange_rate NUMERIC(18, 2) NOT NULL DEFAULT 0,
  selected_currency VARCHAR(10) REFERENCES currencies(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(120) NOT NULL,
  wage_percent NUMERIC(8, 3) NOT NULL DEFAULT 0,
  profit_percent NUMERIC(8, 3) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(8, 3) NOT NULL DEFAULT 0,
  fixed_service_fee NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(40) NOT NULL UNIQUE,
  shop_name VARCHAR(180) NOT NULL,
  seller_name VARCHAR(180) NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(180) NOT NULL,
  customer_phone VARCHAR(40) NOT NULL,
  domestic_18k_price NUMERIC(18, 2) NOT NULL,
  selected_karat INTEGER NOT NULL,
  converted_weight_gram NUMERIC(18, 4) NOT NULL,
  adjusted_gold_price NUMERIC(18, 2) NOT NULL,
  raw_gold_price NUMERIC(18, 2) NOT NULL,
  wage_amount NUMERIC(18, 2) NOT NULL,
  profit_amount NUMERIC(18, 2) NOT NULL,
  subtotal NUMERIC(18, 2) NOT NULL,
  tax_amount NUMERIC(18, 2) NOT NULL,
  discount_amount NUMERIC(18, 2) NOT NULL,
  final_price NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_type VARCHAR(120) NOT NULL,
  product_sku VARCHAR(100) NOT NULL,
  product_description TEXT,
  weight NUMERIC(18, 4) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  karat INTEGER NOT NULL,
  price_per_gram NUMERIC(18, 2) NOT NULL,
  raw_gold_price NUMERIC(18, 2) NOT NULL,
  wage_percent NUMERIC(8, 3) NOT NULL,
  profit_percent NUMERIC(8, 3) NOT NULL,
  tax_percent NUMERIC(8, 3) NOT NULL,
  fixed_service_fee NUMERIC(18, 2) NOT NULL DEFAULT 0,
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO currencies (code, title_fa, rate_to_toman) VALUES
  ('TOMAN', 'تومان', 1),
  ('RIAL', 'ریال', 0.1),
  ('USD', 'دلار آمریکا', 0),
  ('EUR', 'یورو', 0),
  ('AED', 'درهم امارات', 0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO coin_types (code, title_fa, price_toman) VALUES
  ('emami', 'سکه امامی', 0),
  ('bahar', 'سکه بهار آزادی', 0),
  ('half', 'نیم سکه', 0),
  ('quarter', 'ربع سکه', 0),
  ('gram', 'سکه گرمی', 0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO karat_options (karat, title_fa) VALUES
  (24, '۲۴ عیار'),
  (22, '۲۲ عیار'),
  (21, '۲۱ عیار'),
  (18, '۱۸ عیار'),
  (17, '۱۷ عیار'),
  (14, '۱۴ عیار')
ON CONFLICT (karat) DO NOTHING;

INSERT INTO unit_options (code, title_fa, gram_factor) VALUES
  ('gram', 'گرم', 1),
  ('mithqal', 'مثقال', 4.6083),
  ('ounce', 'اونس', 31.1034768),
  ('kilogram', 'کیلوگرم', 1000)
ON CONFLICT (code) DO NOTHING;
