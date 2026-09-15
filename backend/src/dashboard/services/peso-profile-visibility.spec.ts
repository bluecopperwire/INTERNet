import { PesoDashboardService } from './peso-dashboard.service';

describe('PesoDashboardService profile visibility', () => {
  const createService = (rows: Record<string, unknown>[]) => {
    const dataSource = { query: jest.fn().mockResolvedValue(rows) };
    const service = new PesoDashboardService(
      dataSource as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { dataSource, service };
  };

  it('removes account identifiers from QC PESO student detail responses', async () => {
    const { service } = createService([
      {
        student_id: 7,
        user_account_id: 91,
        deleted_at: null,
        full_name: 'Student User',
        contact_email: 'student@example.com',
      },
    ]);

    await expect(service.getStudentDetail(7)).resolves.toEqual({
      student_id: 7,
      full_name: 'Student User',
      contact_email: 'student@example.com',
    });
  });

  it('does not select an employer account ID or login email for QC PESO', async () => {
    const { dataSource, service } = createService([
      { company_id: 4, company_name: 'Example Company' },
    ]);

    await service.getEmployerDetail(4);
    const sql = String(dataSource.query.mock.calls[0][0]);
    const selectedColumns = sql.split('FROM public.company')[0];
    expect(selectedColumns).not.toContain('c.*');
    expect(selectedColumns).not.toContain('ua.email');
    expect(selectedColumns).not.toContain('c.user_account_id');
  });
});
