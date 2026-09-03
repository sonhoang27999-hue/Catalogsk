-- 1) Chuẩn hoá thứ tự hiển thị: gán lại sort duy nhất 0..n-1 trong từng phạm vi,
--    giữ nguyên thứ tự hiện hành (sort, created_at, id).
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY sort, created_at, id) - 1 AS rn
  FROM public.categories
)
UPDATE public.categories t SET sort = ranked.rn
FROM ranked WHERE t.id = ranked.id AND t.sort <> ranked.rn;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY category_id ORDER BY sort, created_at, id) - 1 AS rn
  FROM public.series
)
UPDATE public.series t SET sort = ranked.rn
FROM ranked WHERE t.id = ranked.id AND t.sort <> ranked.rn;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY series_id ORDER BY sort, created_at, id) - 1 AS rn
  FROM public.models
)
UPDATE public.models t SET sort = ranked.rn
FROM ranked WHERE t.id = ranked.id AND t.sort <> ranked.rn;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY category_id, parent_id ORDER BY sort, created_at, id) - 1 AS rn
  FROM public.nodes
)
UPDATE public.nodes t SET sort = ranked.rn
FROM ranked WHERE t.id = ranked.id AND t.sort <> ranked.rn;

WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY COALESCE(model_id::text,'') || '|' || COALESCE(node_id::text,'') || '|' || COALESCE(category_id::text,'')
    ORDER BY sort, created_at, id
  ) - 1 AS rn
  FROM public.products
)
UPDATE public.products t SET sort = ranked.rn
FROM ranked WHERE t.id = ranked.id AND t.sort <> ranked.rn;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY model_id ORDER BY sort, created_at, id) - 1 AS rn
  FROM public.videos
)
UPDATE public.videos t SET sort = ranked.rn
FROM ranked WHERE t.id = ranked.id AND t.sort <> ranked.rn;

-- 2) Hàng mới thêm tự nhận vị trí CUỐI danh sách trong phạm vi của nó
--    (thay vì mặc định sort = 0 gây trùng lặp và thứ tự ngẫu nhiên).
--    Chỉ đổi khi giá trị sort xin cấp đã bị chiếm (giữ nguyên khi khôi phục sao lưu).
CREATE OR REPLACE FUNCTION public.assign_next_sort()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _max integer;
  _taken boolean;
BEGIN
  IF TG_TABLE_NAME = 'categories' THEN
    SELECT COALESCE(MAX(sort), -1), COALESCE(bool_or(sort = COALESCE(NEW.sort, 0)), false)
      INTO _max, _taken FROM public.categories;
  ELSIF TG_TABLE_NAME = 'series' THEN
    SELECT COALESCE(MAX(sort), -1), COALESCE(bool_or(sort = COALESCE(NEW.sort, 0)), false)
      INTO _max, _taken FROM public.series WHERE category_id = NEW.category_id;
  ELSIF TG_TABLE_NAME = 'models' THEN
    SELECT COALESCE(MAX(sort), -1), COALESCE(bool_or(sort = COALESCE(NEW.sort, 0)), false)
      INTO _max, _taken FROM public.models WHERE series_id = NEW.series_id;
  ELSIF TG_TABLE_NAME = 'nodes' THEN
    SELECT COALESCE(MAX(sort), -1), COALESCE(bool_or(sort = COALESCE(NEW.sort, 0)), false)
      INTO _max, _taken FROM public.nodes
      WHERE category_id = NEW.category_id AND parent_id IS NOT DISTINCT FROM NEW.parent_id;
  ELSIF TG_TABLE_NAME = 'videos' THEN
    SELECT COALESCE(MAX(sort), -1), COALESCE(bool_or(sort = COALESCE(NEW.sort, 0)), false)
      INTO _max, _taken FROM public.videos WHERE model_id = NEW.model_id;
  ELSIF TG_TABLE_NAME = 'products' THEN
    SELECT COALESCE(MAX(sort), -1), COALESCE(bool_or(sort = COALESCE(NEW.sort, 0)), false)
      INTO _max, _taken FROM public.products
      WHERE model_id IS NOT DISTINCT FROM NEW.model_id
        AND node_id IS NOT DISTINCT FROM NEW.node_id
        AND category_id IS NOT DISTINCT FROM NEW.category_id;
  ELSE
    RETURN NEW;
  END IF;

  IF NEW.sort IS NULL OR _taken THEN
    NEW.sort := _max + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_next_sort ON public.categories;
CREATE TRIGGER trg_categories_next_sort BEFORE INSERT ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.assign_next_sort();

DROP TRIGGER IF EXISTS trg_series_next_sort ON public.series;
CREATE TRIGGER trg_series_next_sort BEFORE INSERT ON public.series
FOR EACH ROW EXECUTE FUNCTION public.assign_next_sort();

DROP TRIGGER IF EXISTS trg_models_next_sort ON public.models;
CREATE TRIGGER trg_models_next_sort BEFORE INSERT ON public.models
FOR EACH ROW EXECUTE FUNCTION public.assign_next_sort();

DROP TRIGGER IF EXISTS trg_nodes_next_sort ON public.nodes;
CREATE TRIGGER trg_nodes_next_sort BEFORE INSERT ON public.nodes
FOR EACH ROW EXECUTE FUNCTION public.assign_next_sort();

DROP TRIGGER IF EXISTS trg_products_next_sort ON public.products;
CREATE TRIGGER trg_products_next_sort BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.assign_next_sort();

DROP TRIGGER IF EXISTS trg_videos_next_sort ON public.videos;
CREATE TRIGGER trg_videos_next_sort BEFORE INSERT ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.assign_next_sort();