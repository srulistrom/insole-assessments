-- Extra pictures per assessment (Picture 3, 4, ...). Pictures 1 and 2 keep using
-- foam_photo_right_url / foam_photo_left_url, so nothing existing changes.
alter table public.assessments
  add column if not exists extra_photo_urls text[] not null default '{}';
