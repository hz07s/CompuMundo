import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { REFRESH_COOKIE } from './auth/auth.constants';

/** Configuración HTTP compartida por main.ts y las pruebas e2e. */
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.use(cookieParser());

  app.enableCors({
    origin: config
      .getOrThrow<string>('CORS_ORIGIN')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true, // el refresh token viaja en cookie httpOnly
  });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('CompuMundo CEDIS API')
      .setDescription('API del sistema de biblioteca del CEDIS')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addCookieAuth(REFRESH_COOKIE)
      .addTag('health', 'Estado del servicio')
      .addTag('auth', 'Inicio de sesión, renovación y cierre (HU-001)')
      .build(),
  );
  // UI en /api/docs y especificación descargable en /api/docs-json
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}
