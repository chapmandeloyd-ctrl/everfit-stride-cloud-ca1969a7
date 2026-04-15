
-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.client_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on tasks they're involved with
CREATE POLICY "Users can view task comments"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_tasks ct
    WHERE ct.id = task_comments.task_id
    AND (ct.client_id = auth.uid() OR ct.trainer_id = auth.uid())
  )
);

-- Users can create comments on tasks they're involved with
CREATE POLICY "Users can create task comments"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.client_tasks ct
    WHERE ct.id = task_comments.task_id
    AND (ct.client_id = auth.uid() OR ct.trainer_id = auth.uid())
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete own task comments"
ON public.task_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;

-- Index for fast lookups
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
