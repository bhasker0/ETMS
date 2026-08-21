import { JwtModuleOptions } from '@nestjs/jwt';

export const getJwtConfig = (): JwtModuleOptions => ({
  secret: process.env.JWT_SECRET || 'surat_embroidery_super_secret_jwt_key_2026',
  signOptions: {
    expiresIn: process.env.JWT_EXPIRATION || '86400s',
  },
});
