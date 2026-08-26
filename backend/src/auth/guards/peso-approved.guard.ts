import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PersonnelVerificationStatus, UserRole } from '../../users/entities/account.entities';

@Injectable()
export class PesoApprovedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.userRole !== UserRole.PESO_PERSONNEL && user.role !== UserRole.PESO_PERSONNEL) {
      // If user is not PESO, let standard RolesGuard handle or reject
      return true;
    }

    if (user.verificationStatus !== PersonnelVerificationStatus.APPROVED && user.verificationStatus !== 'approved') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'PESO personnel account verification is required before accessing operational services',
        error: 'Forbidden',
        code: 'PESO_VERIFICATION_REQUIRED',
      });
    }

    return true;
  }
}
