import { Module } from '@nestjs/common';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { TransitionService } from './transition.service';
import { ImportService } from './import.service';

@Module({
  controllers: [EquipmentController],
  providers: [EquipmentService, TransitionService, ImportService],
  exports: [EquipmentService, TransitionService],
})
export class EquipmentModule {}
