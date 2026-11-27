CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL,
  password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('customer','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY, name text UNIQUE NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY, category_id text NOT NULL REFERENCES categories(id),
  name text NOT NULL, description text NOT NULL, color text NOT NULL,
  image text NOT NULL, background text NOT NULL DEFAULT '#e9e8dc',
  price_cents integer NOT NULL CHECK (price_cents > 0),
  stock integer NOT NULL CHECK (stock >= 0),
  laptop_inches numeric(4,1) CHECK (laptop_inches BETWEEN 10 AND 20),
  monogram_cents integer CHECK (monogram_cents > 0),
  active boolean NOT NULL DEFAULT true, deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_category ON products(category_id, price_cents) WHERE active AND deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS cart_items (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES products(id),
  monogram text NOT NULL DEFAULT '' CHECK (monogram = '' OR monogram ~ '^[A-Z]{1,3}$'),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  PRIMARY KEY (user_id, product_id, monogram)
);
CREATE TABLE IF NOT EXISTS coupons (
  code text PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('percent','fixed')),
  value integer NOT NULL CHECK (value > 0 AND (kind <> 'percent' OR value <= 100)),
  minimum_cents integer NOT NULL CHECK (minimum_cents >= 0), expires_at timestamptz NOT NULL,
  max_uses integer NOT NULL CHECK (max_uses > 0),
  max_per_user integer NOT NULL CHECK (max_per_user BETWEEN 1 AND max_uses),
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  idem_key uuid NOT NULL, request_hash text NOT NULL, shipping jsonb NOT NULL,
  coupon_code text REFERENCES coupons(code), currency text NOT NULL DEFAULT 'PHP' CHECK (currency = 'PHP'),
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents integer NOT NULL CHECK (discount_cents BETWEEN 0 AND subtotal_cents),
  shipping_cents integer NOT NULL CHECK (shipping_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents = subtotal_cents - discount_cents + shipping_cents AND total_cents > 0),
  status text NOT NULL CHECK (status IN ('pending_payment','paid','processing','shipped','delivered','cancelled','expired','failed')),
  session_state text NOT NULL DEFAULT 'new' CHECK (session_state IN ('new','creating','ready','uncertain')),
  gateway_id uuid UNIQUE, checkout_url text, payment_flag jsonb,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idem_key)
);
CREATE INDEX IF NOT EXISTS orders_customer ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_coupon ON orders(coupon_code, status, user_id);
CREATE INDEX IF NOT EXISTS orders_expiry ON orders(expires_at) WHERE status = 'pending_payment';
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_checkout ON orders(user_id) WHERE status = 'pending_payment';
CREATE TABLE IF NOT EXISTS order_items (
  order_id uuid NOT NULL REFERENCES orders(id), product_id text NOT NULL REFERENCES products(id),
  name text NOT NULL, image text NOT NULL, monogram text NOT NULL DEFAULT '',
  unit_cents integer NOT NULL CHECK (unit_cents > 0), quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id, monogram)
);
CREATE TABLE IF NOT EXISTS reservations (
  order_id uuid NOT NULL REFERENCES orders(id), product_id text NOT NULL REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0), expires_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'held' CHECK (state IN ('held','consumed','released')),
  PRIMARY KEY (order_id, product_id)
);
CREATE TABLE IF NOT EXISTS stock_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, product_id text NOT NULL REFERENCES products(id),
  old_stock integer NOT NULL, new_stock integer NOT NULL, reason text NOT NULL,
  actor uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id),
  status text NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payments (
  gateway_id uuid PRIMARY KEY, order_id uuid UNIQUE NOT NULL REFERENCES orders(id),
  amount_cents integer NOT NULL CHECK (amount_cents > 0), currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS webhook_events (
  id text PRIMARY KEY, payment_id uuid NOT NULL, order_id uuid,
  gateway_status text NOT NULL, state text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now(),
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_queue ON webhook_events(state, next_attempt);

CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY);
WITH migration AS (
  INSERT INTO schema_migrations (id) VALUES ('restore-crossbody-names')
  ON CONFLICT DO NOTHING RETURNING id
)
UPDATE products AS product SET name = corrected.name
FROM (VALUES ('phone-sling', 'Pocket Phone Sling'), ('camera-sling', 'Camera Day Sling'),
             ('zip-crossbody', 'Zip Around Crossbody')) AS corrected(id, name)
WHERE EXISTS (SELECT 1 FROM migration)
  AND product.id = corrected.id AND product.name = 'Oat' AND product.category_id = 'crossbody';

-- In-app notifications are private to their recipient. No existing orders or stock are changed.
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('order','payment','inventory')),
  title text NOT NULL, message text NOT NULL, href text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
);
CREATE INDEX IF NOT EXISTS notifications_inbox ON notifications(user_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS notifications_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE TABLE IF NOT EXISTS admin_activity (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor uuid NOT NULL REFERENCES users(id),
  category text NOT NULL CHECK (category IN ('products','categories','coupons')),
  action text NOT NULL, reference text NOT NULL, description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_activity_date ON admin_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS order_history_date ON order_history(created_at DESC);
CREATE INDEX IF NOT EXISTS stock_history_date ON stock_history(created_at DESC);
