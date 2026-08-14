-- ==============================================================================
-- FLOWERZFC & DJ FLOWERZ — SUPABASE DATABASE MIGRATION & CLEANUP SCRIPT
-- ==============================================================================
-- Run this script in your Supabase Dashboard -> SQL Editor
-- URL: https://supabase.com/dashboard/project/ogdxnqzhqvvhrrvrqoup/sql/new
-- ==============================================================================

-- 1. Remove old electronics / previous project products
DELETE FROM public.products 
WHERE category IN ('Laptops', 'Software', 'DJ Controllers', 'Audio Equipment', 'Monitors', 'Cables', 'Speakers', 'All-In-One Desktops')
   OR lower(name) LIKE '%dell%'
   OR lower(name) LIKE '%lenovo%'
   OR lower(name) LIKE '%macbook%'
   OR lower(name) LIKE '%pioneer%'
   OR lower(name) LIKE '%oraimo%'
   OR lower(name) LIKE '%serato%';

-- 2. Insert Official FlowerZFC Merchandise Items
INSERT INTO public.products (
  id, name, slug, price, compare_at_price, category, description, image, images, is_featured, is_hot, is_active, stock, rating, comments_count
) VALUES
(
  'fz-prod-1',
  'FlowerZFC Official Home Jersey 2026',
  'flowerzfc-home-jersey-2026',
  4500,
  5500,
  'Jerseys',
  'Official 2026 FlowerZFC Home kit engineered with breathable moisture-wicking fabric, dynamic green gradient trim, and high-definition crest.',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=600&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&h=600&fit=crop'],
  true,
  true,
  true,
  50,
  4.9,
  24
),
(
  'fz-prod-2',
  'FlowerZFC Away Kit 2026 (Pro Edition)',
  'flowerzfc-away-kit-2026',
  4500,
  5200,
  'Jerseys',
  'Sleek dark edition away jersey featuring gold accents and custom ventilation panels for peak athletic performance.',
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=600&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=600&fit=crop'],
  true,
  false,
  true,
  35,
  4.8,
  19
),
(
  'fz-prod-3',
  'Bigstone Entertainment Heavyweight Hoodie',
  'bigstone-heavyweight-hoodie',
  5500,
  6500,
  'Tracksuits',
  'Premium 400GSM fleece hoodie with high-density embroidered DJ Flowerz & Bigstone Entertainment logos.',
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=600&fit=crop'],
  false,
  true,
  true,
  25,
  5.0,
  31
),
(
  'fz-prod-4',
  'DJ Flowerz Signature Snapback + Scarf Pack',
  'dj-flowerz-snapback-scarf-pack',
  2500,
  3200,
  'Accessories',
  'Limited edition matchday accessory pack including high-density embroidered snapback and double-knit woven fan scarf.',
  'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop'],
  false,
  false,
  true,
  40,
  4.7,
  14
),
(
  'fz-prod-5',
  'FlowerZFC Official Matchball (FIFA Quality Pro)',
  'flowerzfc-official-matchball',
  3800,
  4500,
  'Footballs',
  'Thermally bonded 12-panel match football with micro-textured aerow-trac grooves for true flight precision.',
  'https://images.unsplash.com/photo-1614632537190-23e4146777db?w=600&h=600&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1614632537190-23e4146777db?w=600&h=600&fit=crop'],
  true,
  false,
  true,
  30,
  4.9,
  18
),
(
  'fz-prod-6',
  'AFCON 2026 Commemorative Art Print',
  'afcon-2026-art-print',
  1800,
  2400,
  'Memorabilia',
  'Hand-numbered giclée art print celebrating East African football culture and matchday energy.',
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=600&fit=crop',
  ARRAY['https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=600&fit=crop'],
  false,
  false,
  true,
  15,
  4.9,
  12
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  images = EXCLUDED.images;

-- 3. Ensure Row Level Security (RLS) allows public read access
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for products" ON public.products;
CREATE POLICY "Public read access for products" ON public.products
  FOR SELECT USING (true);
