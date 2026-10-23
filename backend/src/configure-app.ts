import { INestApplication } from '@nestjs/common';

// Shared by main.ts and the test harness so tests hit the same routes.
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  return app;
}
