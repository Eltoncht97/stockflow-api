import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export function setupApplication(app: INestApplication): void {
  app.use(helmet());
}
