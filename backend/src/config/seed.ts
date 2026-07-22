import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, AccountStatus } from '../users/user.entity';

export async function seedUsers(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  const existingCount = await userRepository.count();
  if (existingCount > 0) {
    console.log('Seed skipped: Users already exist in database.');
    return;
  }

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const seedUsersData = [
    {
      email: 'student@example.com',
      password: hashedPassword,
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ACTIVE,
    },
    {
      email: 'admin@example.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
    },
    {
      email: 'employer@example.com',
      password: hashedPassword,
      role: UserRole.EMPLOYER,
      accountStatus: AccountStatus.ACTIVE,
    },
    {
      email: 'inactive@example.com',
      password: hashedPassword,
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.INACTIVE,
    },
    {
      email: 'archived@example.com',
      password: hashedPassword,
      role: UserRole.STUDENT,
      accountStatus: AccountStatus.ARCHIVED,
    },
  ];

  await userRepository.save(seedUsersData);
  console.log('Successfully seeded 5 test users into database.');
}
