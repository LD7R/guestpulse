-- Classifier: strength vs improvement for each topic
alter table public.reviews
  add column if not exists topic_type text;
