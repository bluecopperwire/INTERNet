DO $$
BEGIN
  RAISE EXCEPTION 'AssignmentLifecycleFoundation1788566400000 is irreversible because reverting would discard exact schedules, minute precision, lifecycle metadata, and finalization history.';
END;
$$;
