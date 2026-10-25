import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export type AppSetupOptions = {
  corsOrigins: string[];
};

export function setupApp(
  app: INestApplication,
  options: AppSetupOptions,
): void {
  app.use(helmet());

  app.enableCors({
    origin: options.corsOrigins,
    credentials: false,
  });
}
