DO $$
BEGIN
  RAISE EXCEPTION 'StudentAvailabilityDays1788825600000 is irreversible because reverting would discard exact student availability schedules.';
END;
$$;
