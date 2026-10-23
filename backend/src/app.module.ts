import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { CommonModule } from './common/common.module';
import { envValidationSchema } from './config/env.validation';
import { buildDataSourceOptions } from './database/typeorm.config';
import { HealthModule } from './health/health.module';
import { LectoresModule } from './lectores/lectores.module';
import { PrestamosModule } from './prestamos/prestamos.module';
import { ReportesModule } from './reportes/reportes.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions({
          DATABASE_URL: config.getOrThrow<string>('DATABASE_URL'),
          DATABASE_SSL: config.get<boolean>('DATABASE_SSL'),
        }),
    }),
    CommonModule,
    HealthModule,
    AuthModule,
    CatalogoModule,
    LectoresModule,
    PrestamosModule,
    ReportesModule,
    UsuariosModule,
  ],
})
export class AppModule {}
