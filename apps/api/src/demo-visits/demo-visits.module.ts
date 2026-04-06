import { Module } from '@nestjs/common';
import { DemoVisitsController } from './demo-visits.controller';
import { DemoVisitsService } from './demo-visits.service';

@Module({
  controllers: [DemoVisitsController],
  providers: [DemoVisitsService],
  exports: [DemoVisitsService],
})
export class DemoVisitsModule {}
