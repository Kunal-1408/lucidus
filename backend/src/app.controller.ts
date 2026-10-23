import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Render's health check and a cheap way to wake the service. `commit` is the
  // deployed git SHA (Render sets RENDER_GIT_COMMIT), so the smoke check can
  // tell new code from old.
  @Get('health')
  health() {
    return { ok: true, commit: process.env.RENDER_GIT_COMMIT ?? null };
  }
}
