-- PrimeMe AI: new synced collections for the water tracker, Prime Memory and Prime's action log.
--
-- Only widens the list of allowed collection names in public.user_records; no data is changed and
-- nothing is removed. Existing rows all satisfy the new check. Apply BEFORE releasing the app
-- version that writes these collections (older servers would reject them as invalid; the app keeps
-- them locally and reports them as not synced until then).
alter table public.user_records drop constraint if exists user_records_collection_check;
alter table public.user_records add constraint user_records_collection_check check (collection in (
  'profile', 'plan', 'food', 'foodDone', 'activity', 'rest', 'weight', 'photo',
  'savedMeal', 'customFood', 'settings', 'achievement', 'coach',
  'water', 'memory', 'primeAction'
));
