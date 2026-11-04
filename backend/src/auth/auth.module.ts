import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';

/** Autenticación JWT, refresh tokens y RBAC (HU-001) */
@Module({
  providers: [PasswordService],
  exports: [PasswordService],
})
export class AuthModule {}
