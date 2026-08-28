CREATE SCHEMA IF NOT EXISTS kpi;
CREATE SCHEMA IF NOT EXISTS olap;

CREATE OR REPLACE VIEW kpi.vw_sales_performance
WITH (security_invoker = true) AS
WITH m AS (
  SELECT period,
         SUM(revenue)::numeric AS total_revenue,
         SUM(active_outlets)::bigint AS active_outlets,
         SUM(orders)::bigint AS total_orders
  FROM public.monthly_sales
  GROUP BY period
)
SELECT period,
       total_revenue,
       active_outlets,
       total_orders,
       LAG(total_revenue) OVER (ORDER BY period) AS prev_revenue,
       CASE WHEN LAG(total_revenue) OVER (ORDER BY period) > 0
            THEN ROUND(((total_revenue - LAG(total_revenue) OVER (ORDER BY period)) / LAG(total_revenue) OVER (ORDER BY period)) * 100, 2)
       END AS mom_growth_pct
FROM m;

CREATE OR REPLACE VIEW olap.vw_brand_contribution_ranking
WITH (security_invoker = true) AS
WITH b AS (
  SELECT s.period, br.name AS brand_name, br.category,
         SUM(s.revenue)::numeric AS revenue
  FROM public.monthly_sales s
  JOIN public.brands br ON br.id = s.brand_id
  GROUP BY s.period, br.name, br.category
)
SELECT period, brand_name, category, revenue,
       ROUND((revenue / NULLIF(SUM(revenue) OVER (PARTITION BY period), 0)) * 100, 2) AS contribution_pct,
       RANK() OVER (PARTITION BY period ORDER BY revenue DESC)::int AS brand_rank
FROM b;

-- Public wrappers so the Data API can read them
CREATE OR REPLACE VIEW public.vw_sales_performance
WITH (security_invoker = true) AS SELECT * FROM kpi.vw_sales_performance;

CREATE OR REPLACE VIEW public.vw_brand_contribution_ranking
WITH (security_invoker = true) AS SELECT * FROM olap.vw_brand_contribution_ranking;

GRANT USAGE ON SCHEMA kpi, olap TO anon, authenticated, service_role;
GRANT SELECT ON kpi.vw_sales_performance, olap.vw_brand_contribution_ranking TO anon, authenticated, service_role;
GRANT SELECT ON public.vw_sales_performance, public.vw_brand_contribution_ranking TO anon, authenticated, service_role;