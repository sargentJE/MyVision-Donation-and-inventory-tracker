import { z } from 'zod';
import { AcquisitionType, Condition, DeviceCategory } from '../enums';

export const createEquipmentSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    deviceCategory: z.nativeEnum(DeviceCategory),
    acquisitionType: z.nativeEnum(AcquisitionType),
    condition: z.nativeEnum(Condition),
    acquiredAt: z.string().date('Invalid date format'),
    make: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    conditionNotes: z.string().optional(),
    notes: z.string().optional(),
    // PURCHASED fields
    purchasePrice: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
      .optional(),
    supplier: z.string().optional(),
    warrantyExpiry: z.string().date('Invalid date format').optional(),
    // DONATED fields — link existing donation or create new
    donationId: z.string().uuid('Invalid donation ID').optional(),
    donorName: z.string().optional(),
    donorOrg: z.string().optional(),
    donatedAt: z.string().date('Invalid date format').optional(),
  })
  .superRefine((data, ctx) => {
    const isDonated =
      data.acquisitionType === AcquisitionType.DONATED_DEMO ||
      data.acquisitionType === AcquisitionType.DONATED_GIVEABLE;

    if (isDonated && !data.donationId && !data.donorName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Donor name is required for donated items (or link an existing donation)',
        path: ['donorName'],
      });
    }
  });

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
