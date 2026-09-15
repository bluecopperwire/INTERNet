import { AdminDashboardService } from './admin-dashboard.service';
import { UserRole } from '../../users/entities/account.entities';

describe('AdminDashboardService account metrics', () => {
  it('returns independent active, suspended, and deactivated totals', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        { account_status: 'active', count: '7' },
        { account_status: 'suspended', count: '2' },
        { account_status: 'archived', count: '3' },
      ]),
    };
    const service = new AdminDashboardService(dataSource as never);

    await expect(
      service.getRoleDashboardMetrics(UserRole.STUDENT),
    ).resolves.toEqual({
      totalRegistered: 12,
      activeAccounts: 7,
      suspendedAccounts: 2,
      archivedAccounts: 3,
    });

    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_role = $1'),
      [UserRole.STUDENT],
    );
    expect(String(dataSource.query.mock.calls[0][0])).not.toContain(
      'deleted_at IS NULL',
    );
  });
});
