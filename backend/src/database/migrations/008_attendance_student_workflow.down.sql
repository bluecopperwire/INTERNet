DO $$
BEGIN
  RAISE EXCEPTION 'AttendanceStudentWorkflow1788652800000 is irreversible because reverting would discard authoritative present/absent/incomplete outcomes.';
END;
$$;
