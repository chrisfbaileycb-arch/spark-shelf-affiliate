CREATE TABLE public.ad_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ratio TEXT NOT NULL CHECK (ratio IN ('1:1','9:16','16:9')),
  size TEXT NOT NULL,
  prompt TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_images TO authenticated;
GRANT ALL ON public.ad_images TO service_role;
ALTER TABLE public.ad_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own ad images" ON public.ad_images FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ad_images_user_created_idx ON public.ad_images(user_id, created_at DESC);