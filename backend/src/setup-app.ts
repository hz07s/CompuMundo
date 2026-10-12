import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Configuración HTTP compartida por main.ts y las pruebas e2e. */
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config
      .getOrThrow<string>('CORS_ORIGIN')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true, // el refresh token viaja en cookie httpOnly
  });
}
