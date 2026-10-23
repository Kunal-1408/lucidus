import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Render's health check and a cheap way to wake the service.
  @Get('health')
  health() {
    return { ok: true };
  }
}
