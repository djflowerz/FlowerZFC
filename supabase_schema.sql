-- FlowerZFC Production Supabase Database Schema
-- Run this script in Supabase SQL Editor (https://supabase.com/dashboard/project/ogdxnqzhqvvhrrvrqoup/sql/new)

-- 1. Create articles table
CREATE TABLE IF NOT EXISTS public.articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'published',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read for published articles" ON public.articles;
CREATE POLICY "Public read for published articles" ON public.articles FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "Super admin and editors full access" ON public.articles;
CREATE POLICY "Super admin and editors full access" ON public.articles FOR ALL USING (true);

-- 2. Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id TEXT PRIMARY KEY,
  article_id TEXT,
  match_id TEXT,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_avatar TEXT,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'approved',
  reported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read approved comments" ON public.comments;
CREATE POLICY "Public read approved comments" ON public.comments FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "Anyone insert comments" ON public.comments;
CREATE POLICY "Anyone insert comments" ON public.comments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin manage comments" ON public.comments;
CREATE POLICY "Admin manage comments" ON public.comments FOR ALL USING (true);

-- 3. Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  price NUMERIC NOT NULL,
  available_tickets INT NOT NULL,
  sold_tickets INT DEFAULT 0,
  status TEXT DEFAULT 'on_sale',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read on_sale tickets" ON public.tickets;
CREATE POLICY "Public read on_sale tickets" ON public.tickets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage tickets" ON public.tickets;
CREATE POLICY "Admin manage tickets" ON public.tickets FOR ALL USING (true);

-- 4. Enable RLS and insert policy for orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone insert orders" ON public.orders;
CREATE POLICY "Anyone insert orders" ON public.orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (true);

-- 5. Create reddit_posts table (tracks all Reddit shares to prevent duplicate posts)
CREATE TABLE IF NOT EXISTS public.reddit_posts (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  article_title TEXT NOT NULL,
  article_url TEXT NOT NULL,
  subreddit TEXT NOT NULL,
  custom_title TEXT,
  flair TEXT,
  status TEXT DEFAULT 'posted',
  reddit_permalink TEXT,
  error_message TEXT,
  schedule_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, subreddit)
);

ALTER TABLE public.reddit_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access on reddit_posts" ON public.reddit_posts;
CREATE POLICY "Admin full access on reddit_posts" ON public.reddit_posts FOR ALL USING (true);

