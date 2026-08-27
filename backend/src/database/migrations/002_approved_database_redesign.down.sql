DO $$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = 'ApprovedDatabaseRedesign1787788800000 is irreversible',
    DETAIL = 'Removed QC PESO verification history and arbitrary text allowances cannot be reconstructed losslessly.',
    HINT = 'Restore a pre-migration database backup and deploy the previous application version.';
END;
$$;
