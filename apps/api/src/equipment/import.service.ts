import { Injectable, Logger } from '@nestjs/common';
import {
  AcquisitionType,
  AuditEvent,
  Condition,
  DeviceCategory,
  OperationalStatus,
  Prisma,
} from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';
import { TransitionService } from './transition.service';

interface CsvRow {
  name?: string;
  acquisitionType?: string;
  deviceCategory?: string;
  condition?: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  acquiredAt?: string;
  donorName?: string;
  donorOrg?: string;
  purchasePrice?: string;
  supplier?: string;
}

interface RowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  dryRun: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: RowError[];
  importedCount?: number;
}

const VALID_ACQUISITION_TYPES = new Set(Object.values(AcquisitionType));
const VALID_CATEGORIES = new Set(Object.values(DeviceCategory));
const VALID_CONDITIONS = new Set(Object.values(Condition));
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transitionService: TransitionService,
  ) {}

  /**
   * Import equipment from CSV. donorName is OPTIONAL even for DONATED_* types
   * because this tool is for bulk-loading historical data that may lack donor
   * records. Equipment is created without a donation link; donors can be
   * associated later via the equipment detail page.
   */
  async processImport(
    csvBuffer: Buffer,
    dryRun: boolean,
    actorId: string,
  ): Promise<ImportResult> {
    // Parse CSV
    let rows: CsvRow[];
    try {
      rows = parse(csvBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch {
      return {
        dryRun,
        totalRows: 0,
        validRows: 0,
        errorRows: 1,
        errors: [{ row: 0, field: '_csv', message: 'Failed to parse CSV file' }],
      };
    }

    // Validate all rows
    const errors: RowError[] = [];
    const validatedRows: Array<{
      rowNum: number;
      data: Prisma.EquipmentCreateInput & { donorName?: string; donorOrg?: string };
    }> = [];

    // Collect serial numbers to check for duplicates within the CSV itself
    const serialsInCsv = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2
      const row = rows[i];
      const rowErrors = this.validateRow(row, rowNum, serialsInCsv);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        const acquisitionType = row.acquisitionType as AcquisitionType;
        const condition = (row.condition as Condition) || Condition.GOOD;
        const status = this.transitionService.getInitialStatus(acquisitionType);

        validatedRows.push({
          rowNum,
          data: {
            name: row.name!,
            acquisitionType,
            deviceCategory: row.deviceCategory as DeviceCategory,
            condition,
            status,
            acquiredAt: row.acquiredAt ? new Date(row.acquiredAt) : new Date(),
            make: row.make || undefined,
            model: row.model || undefined,
            serialNumber: row.serialNumber || undefined,
            purchasePrice: row.purchasePrice
              ? new Prisma.Decimal(row.purchasePrice)
              : undefined,
            supplier: row.supplier || undefined,
            donorName: row.donorName || undefined,
            donorOrg: row.donorOrg || undefined,
          } as Prisma.EquipmentCreateInput & { donorName?: string; donorOrg?: string },
        });

        if (row.serialNumber) {
          serialsInCsv.add(row.serialNumber);
        }
      }
    }

    const result: ImportResult = {
      dryRun,
      totalRows: rows.length,
      validRows: validatedRows.length,
      errorRows: rows.length - validatedRows.length,
      errors,
    };

    // Dry run — return validation results only
    if (dryRun || errors.length > 0) {
      return result;
    }

    // Live import — all-or-nothing transaction
    try {
      const imported = await this.prisma.$transaction(
        async (tx) => {
          let count = 0;
          for (const { data } of validatedRows) {
            const { donorName, donorOrg, ...equipmentData } = data as Record<string, unknown>;

            // Create donation if donor info present
            let donationId: string | undefined;
            if (donorName) {
              const donation = await tx.donation.create({
                data: {
                  donorName: donorName as string,
                  donorOrg: (donorOrg as string) || undefined,
                  donatedAt: (equipmentData.acquiredAt as Date) ?? new Date(),
                },
              });
              donationId = donation.id;
            }

            await tx.equipment.create({
              data: {
                name: equipmentData.name as string,
                acquisitionType: equipmentData.acquisitionType as AcquisitionType,
                deviceCategory: equipmentData.deviceCategory as DeviceCategory,
                condition: equipmentData.condition as Condition,
                status: equipmentData.status as OperationalStatus,
                acquiredAt: equipmentData.acquiredAt as Date,
                make: equipmentData.make as string | undefined,
                model: equipmentData.model as string | undefined,
                serialNumber: equipmentData.serialNumber as string | undefined,
                purchasePrice: equipmentData.purchasePrice as Prisma.Decimal | undefined,
                supplier: equipmentData.supplier as string | undefined,
                donationId,
              },
            });
            count++;
          }

          // Single audit entry for the entire import
          await tx.auditEntry.create({
            data: {
              event: AuditEvent.ITEM_CREATED,
              changedByUserId: actorId,
              note: `CSV import: ${count} items imported`,
            },
          });

          return count;
        },
        { timeout: 30000 }, // 30s timeout for large imports
      );

      result.importedCount = imported;
    } catch (error) {
      this.logger.error('CSV import transaction failed', error);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        result.errorRows = 1;
        result.errors.push({
          row: 0,
          field: 'serialNumber',
          message: 'Duplicate serial number found during import',
        });
      } else {
        result.errorRows = 1;
        result.errors.push({
          row: 0,
          field: '_transaction',
          message: 'Import failed. No records were created.',
        });
      }
    }

    return result;
  }

  private validateRow(
    row: CsvRow,
    rowNum: number,
    serialsInCsv: Set<string>,
  ): RowError[] {
    const errors: RowError[] = [];

    // Required: name
    if (!row.name?.trim()) {
      errors.push({ row: rowNum, field: 'name', message: 'Required' });
    } else if (row.name.length > 255) {
      errors.push({ row: rowNum, field: 'name', message: 'Max 255 characters' });
    }

    // Required: acquisitionType
    if (!row.acquisitionType?.trim()) {
      errors.push({ row: rowNum, field: 'acquisitionType', message: 'Required' });
    } else if (!VALID_ACQUISITION_TYPES.has(row.acquisitionType as AcquisitionType)) {
      errors.push({
        row: rowNum,
        field: 'acquisitionType',
        message: `Invalid value: "${row.acquisitionType}". Expected: ${[...VALID_ACQUISITION_TYPES].join(', ')}`,
      });
    }

    // Required: deviceCategory
    if (!row.deviceCategory?.trim()) {
      errors.push({ row: rowNum, field: 'deviceCategory', message: 'Required' });
    } else if (!VALID_CATEGORIES.has(row.deviceCategory as DeviceCategory)) {
      errors.push({
        row: rowNum,
        field: 'deviceCategory',
        message: `Invalid value: "${row.deviceCategory}". Expected: ${[...VALID_CATEGORIES].join(', ')}`,
      });
    }

    // Optional: condition
    if (row.condition?.trim() && !VALID_CONDITIONS.has(row.condition as Condition)) {
      errors.push({
        row: rowNum,
        field: 'condition',
        message: `Invalid value: "${row.condition}". Expected: ${[...VALID_CONDITIONS].join(', ')}`,
      });
    }

    // Optional: acquiredAt (ISO date)
    if (row.acquiredAt?.trim() && !ISO_DATE_REGEX.test(row.acquiredAt)) {
      errors.push({
        row: rowNum,
        field: 'acquiredAt',
        message: 'Invalid date format. Expected: YYYY-MM-DD',
      });
    }

    // String lengths
    if (row.make && row.make.length > 255)
      errors.push({ row: rowNum, field: 'make', message: 'Max 255 characters' });
    if (row.model && row.model.length > 255)
      errors.push({ row: rowNum, field: 'model', message: 'Max 255 characters' });
    if (row.serialNumber && row.serialNumber.length > 255)
      errors.push({ row: rowNum, field: 'serialNumber', message: 'Max 255 characters' });
    if (row.donorName && row.donorName.length > 255)
      errors.push({ row: rowNum, field: 'donorName', message: 'Max 255 characters' });
    if (row.donorOrg && row.donorOrg.length > 255)
      errors.push({ row: rowNum, field: 'donorOrg', message: 'Max 255 characters' });
    if (row.supplier && row.supplier.length > 255)
      errors.push({ row: rowNum, field: 'supplier', message: 'Max 255 characters' });

    // Duplicate serial within CSV
    if (row.serialNumber?.trim()) {
      if (serialsInCsv.has(row.serialNumber)) {
        errors.push({
          row: rowNum,
          field: 'serialNumber',
          message: `Duplicate within CSV: "${row.serialNumber}"`,
        });
      }
    }

    return errors;
  }
}
