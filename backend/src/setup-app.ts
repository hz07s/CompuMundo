import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('CompuMundo CEDIS API')
      .setDescription('API del sistema de biblioteca del CEDIS')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addTag('health', 'Estado del servicio')
      .build(),
  );
  // UI en /api/docs y especificación descargable en /api/docs-json
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}
