
CREATE SCHEMA IF NOT EXISTS olap;
GRANT USAGE ON SCHEMA olap TO anon, authenticated, service_role;

CREATE TABLE public.distributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  region text NOT NULL,
  manager text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.distributors TO anon, authenticated;
GRANT ALL ON public.distributors TO service_role;
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "distributors_public_read" ON public.distributors FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_public_read" ON public.brands FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.monthly_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  distributor_id uuid NOT NULL REFERENCES public.distributors(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  revenue numeric(14,2) NOT NULL DEFAULT 0,
  active_outlets integer NOT NULL DEFAULT 0,
  orders integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period, distributor_id, brand_id)
);
GRANT SELECT ON public.monthly_sales TO anon, authenticated;
GRANT ALL ON public.monthly_sales TO service_role;
ALTER TABLE public.monthly_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_sales_public_read" ON public.monthly_sales FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.distributors (code, name, region, manager) VALUES
  ('NPP-HN01', 'NPP Minh Anh Hà Nội', 'Miền Bắc', 'Nguyễn Văn Sơn'),
  ('NPP-HP02', 'NPP Hải Phát Hải Phòng', 'Miền Bắc', 'Trần Thu Hà'),
  ('NPP-DN03', 'NPP Đà Thành Đà Nẵng', 'Miền Trung', 'Lê Quốc Bảo'),
  ('NPP-HU04', 'NPP Hương Giang Huế', 'Miền Trung', 'Phạm Thị Lan'),
  ('NPP-HCM05', 'NPP Tân Bình Sài Gòn', 'Miền Nam', 'Võ Minh Trí'),
  ('NPP-HCM06', 'NPP Phú Mỹ Hưng', 'Miền Nam', 'Đặng Hoài Nam'),
  ('NPP-CT07', 'NPP Tây Đô Cần Thơ', 'Tây Nam Bộ', 'Bùi Kim Ngân'),
  ('NPP-BD08', 'NPP Bình Dương Phát', 'Đông Nam Bộ', 'Hoàng Anh Tuấn');

INSERT INTO public.brands (name, category) VALUES
  ('Aqua Pure', 'Nước giải khát'),
  ('Golden Milk', 'Sữa & Chế phẩm'),
  ('Snacky', 'Bánh kẹo'),
  ('CleanX', 'Hoá mỹ phẩm'),
  ('Café Sài Gòn', 'Cà phê');

INSERT INTO public.monthly_sales (period, distributor_id, brand_id, revenue, active_outlets, orders)
SELECT p.period,
       d.id,
       b.id,
       ROUND((300000000 + (abs(hashtext(d.code || b.name)) % 700000000)) *
             CASE WHEN p.period = '2026-07'
                  THEN 0.72 + ((abs(hashtext(d.code || b.name || 'g')) % 60) / 100.0)
                  ELSE 1 END, 2),
       40 + (abs(hashtext(d.code || b.name || p.period)) % 160),
       120 + (abs(hashtext(d.code || b.name || p.period || 'o')) % 500)
FROM public.distributors d
CROSS JOIN public.brands b
CROSS JOIN (VALUES ('2026-06'), ('2026-07')) AS p(period);

CREATE OR REPLACE FUNCTION olap.fn_root_cause_explorer(p_current_period text, p_compare_period text)
RETURNS TABLE (
  distributor_code text,
  distributor_name text,
  region text,
  brand_name text,
  prev_revenue numeric,
  curr_revenue numeric,
  growth_pct numeric,
  outlet_change_pct numeric,
  order_change_pct numeric,
  root_cause text,
  severity text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cur AS (
    SELECT * FROM public.monthly_sales WHERE period = p_current_period
  ), prev AS (
    SELECT * FROM public.monthly_sales WHERE period = p_compare_period
  ), joined AS (
    SELECT d.code AS distributor_code,
           d.name AS distributor_name,
           d.region,
           b.name AS brand_name,
           COALESCE(prev.revenue, 0) AS prev_revenue,
           COALESCE(cur.revenue, 0) AS curr_revenue,
           CASE WHEN COALESCE(prev.revenue,0) = 0 THEN NULL
                ELSE ROUND((cur.revenue - prev.revenue) / prev.revenue * 100, 1) END AS growth_pct,
           CASE WHEN COALESCE(prev.active_outlets,0) = 0 THEN NULL
                ELSE ROUND((cur.active_outlets - prev.active_outlets)::numeric / prev.active_outlets * 100, 1) END AS outlet_change_pct,
           CASE WHEN COALESCE(prev.orders,0) = 0 THEN NULL
                ELSE ROUND((cur.orders - prev.orders)::numeric / prev.orders * 100, 1) END AS order_change_pct
    FROM cur
    JOIN prev ON prev.distributor_id = cur.distributor_id AND prev.brand_id = cur.brand_id
    JOIN public.distributors d ON d.id = cur.distributor_id
    JOIN public.brands b ON b.id = cur.brand_id
  )
  SELECT j.*,
         CASE
           WHEN j.growth_pct IS NULL THEN 'Không đủ dữ liệu'
           WHEN j.growth_pct <= -15 AND COALESCE(j.outlet_change_pct, 0) < 0 THEN 'Sụt giảm độ phủ điểm bán'
           WHEN j.growth_pct <= -15 THEN 'Sụt giảm nghiêm trọng - rà soát trưng bày & giá'
           WHEN j.growth_pct < 0 AND COALESCE(j.order_change_pct, 0) < 0 THEN 'Giảm tần suất đặt hàng'
           WHEN j.growth_pct < 0 THEN 'Giảm giá trị đơn hàng bình quân'
           WHEN j.growth_pct >= 15 THEN 'Tăng trưởng bứt phá'
           WHEN j.growth_pct >= 5 THEN 'Tăng trưởng ổn định'
           ELSE 'Đi ngang'
         END AS root_cause,
         CASE
           WHEN j.growth_pct IS NULL THEN 'neutral'
           WHEN j.growth_pct <= -15 THEN 'critical'
           WHEN j.growth_pct < 0 THEN 'warning'
           WHEN j.growth_pct >= 15 THEN 'success'
           WHEN j.growth_pct >= 5 THEN 'positive'
           ELSE 'neutral'
         END AS severity
  FROM joined j
  ORDER BY j.growth_pct ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION olap.fn_root_cause_explorer(text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_root_cause_explorer(p_current_period text, p_compare_period text)
RETURNS TABLE (
  distributor_code text,
  distributor_name text,
  region text,
  brand_name text,
  prev_revenue numeric,
  curr_revenue numeric,
  growth_pct numeric,
  outlet_change_pct numeric,
  order_change_pct numeric,
  root_cause text,
  severity text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, olap
AS $$
  SELECT * FROM olap.fn_root_cause_explorer(p_current_period, p_compare_period);
$$;

GRANT EXECUTE ON FUNCTION public.fn_root_cause_explorer(text, text) TO anon, authenticated, service_role;

CREATE POLICY "sales_imports_upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'sales_imports');
CREATE POLICY "sales_imports_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'sales_imports');
