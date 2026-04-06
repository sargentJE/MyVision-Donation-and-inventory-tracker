'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateEquipment } from '@/hooks/use-equipment';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const STEPS = ['Basic Info', 'Details', 'Acquisition', 'Review'] as const;

const CATEGORIES = [
  { value: 'DIGITAL_MAGNIFIER', label: 'Digital Magnifier' },
  { value: 'CCTV_MAGNIFIER', label: 'CCTV Magnifier' },
  { value: 'TEXT_TO_SPEECH', label: 'Text to Speech' },
  { value: 'SMARTPHONE', label: 'Smartphone' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'MONITOR', label: 'Monitor' },
  { value: 'OTHER', label: 'Other' },
];

const ACQUISITION_TYPES = [
  { value: 'PURCHASED', label: 'Purchased' },
  { value: 'DONATED_DEMO', label: 'Donated (Demo)' },
  { value: 'DONATED_GIVEABLE', label: 'Donated (Giveable)' },
];

const CONDITIONS = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
];

const INITIAL_STATUS: Record<string, string> = {
  PURCHASED: 'Available for Demo',
  DONATED_DEMO: 'Available for Demo',
  DONATED_GIVEABLE: 'Available for Loan',
};

interface FormData {
  // Step 1
  name: string;
  deviceCategory: string;
  acquisitionType: string;
  condition: string;
  acquiredAt: string;
  // Step 2
  make: string;
  model: string;
  serialNumber: string;
  conditionNotes: string;
  notes: string;
  // Step 3 — Purchased
  purchasePrice: string;
  supplier: string;
  warrantyExpiry: string;
  // Step 3 — Donated
  donorName: string;
  donorOrg: string;
  donatedAt: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  deviceCategory: '',
  acquisitionType: '',
  condition: 'GOOD',
  acquiredAt: new Date().toISOString().split('T')[0],
  make: '',
  model: '',
  serialNumber: '',
  conditionNotes: '',
  notes: '',
  purchasePrice: '',
  supplier: '',
  warrantyExpiry: '',
  donorName: '',
  donorOrg: '',
  donatedAt: '',
};

export default function NewEquipmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createEquipment = useCreateEquipment();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);

  // Unsaved changes warning
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function canAdvance(): boolean {
    if (step === 0) {
      return !!(
        form.name &&
        form.deviceCategory &&
        form.acquisitionType &&
        form.condition &&
        form.acquiredAt
      );
    }
    if (step === 2) {
      const isDonated =
        form.acquisitionType === 'DONATED_DEMO' ||
        form.acquisitionType === 'DONATED_GIVEABLE';
      if (isDonated && !form.donorName) return false;
    }
    return true;
  }

  async function handleSubmit() {
    const payload: Record<string, unknown> = {
      name: form.name,
      deviceCategory: form.deviceCategory,
      acquisitionType: form.acquisitionType,
      condition: form.condition,
      acquiredAt: form.acquiredAt,
    };

    if (form.make) payload.make = form.make;
    if (form.model) payload.model = form.model;
    if (form.serialNumber) payload.serialNumber = form.serialNumber;
    if (form.conditionNotes) payload.conditionNotes = form.conditionNotes;
    if (form.notes) payload.notes = form.notes;

    if (form.acquisitionType === 'PURCHASED') {
      if (form.purchasePrice) payload.purchasePrice = form.purchasePrice;
      if (form.supplier) payload.supplier = form.supplier;
      if (form.warrantyExpiry) payload.warrantyExpiry = form.warrantyExpiry;
    } else {
      if (form.donorName) payload.donorName = form.donorName;
      if (form.donorOrg) payload.donorOrg = form.donorOrg;
      if (form.donatedAt) payload.donatedAt = form.donatedAt;
    }

    try {
      const result = await createEquipment.mutateAsync(payload);
      setDirty(false);
      toast({ title: 'Equipment created', description: `${form.name} added to inventory.` });
      router.push(`/equipment/${result.data.id}`);
    } catch (err: unknown) {
      const error = err as { status?: number };
      toast({
        title: 'Failed to create equipment',
        description:
          error.status === 409
            ? 'Serial number already exists.'
            : 'Please check your input and try again.',
        variant: 'destructive',
      });
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">Add Equipment</h1>

      {/* Step indicator */}
      <nav aria-label="Form progress" className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                i < step && 'bg-primary text-primary-foreground cursor-pointer',
                i === step && 'bg-primary text-primary-foreground',
                i > step && 'bg-muted text-muted-foreground',
              )}
              aria-current={i === step ? 'step' : undefined}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            <span
              className={cn(
                'text-sm hidden sm:inline',
                i === step ? 'font-medium' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="h-px w-6 bg-border" />
            )}
          </div>
        ))}
      </nav>

      {/* Step 1: Basic Info */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. ZoomText HD"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Device Category *</Label>
            <Select value={form.deviceCategory} onValueChange={(v) => update('deviceCategory', v)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acqType">Acquisition Type *</Label>
            <Select value={form.acquisitionType} onValueChange={(v) => update('acquisitionType', v)}>
              <SelectTrigger id="acqType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ACQUISITION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="condition">Condition *</Label>
            <Select value={form.condition} onValueChange={(v) => update('condition', v)}>
              <SelectTrigger id="condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acquiredAt">Date Acquired *</Label>
            <Input
              id="acquiredAt"
              type="date"
              value={form.acquiredAt}
              onChange={(e) => update('acquiredAt', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input id="make" value={form.make} onChange={(e) => update('make', e.target.value)} placeholder="e.g. HumanWare" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={form.model} onChange={(e) => update('model', e.target.value)} placeholder="e.g. Explore 8" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serial">Serial Number</Label>
            <Input id="serial" value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="condNotes">Condition Notes</Label>
            <Textarea id="condNotes" value={form.conditionNotes} onChange={(e) => update('conditionNotes', e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">General Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
          </div>
        </div>
      )}

      {/* Step 3: Acquisition Details (conditional) */}
      {step === 2 && (
        <div className="space-y-4" aria-live="polite">
          {form.acquisitionType === 'PURCHASED' ? (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">Purchase Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Purchase Price</Label>
                  <Input id="price" value={form.purchasePrice} onChange={(e) => update('purchasePrice', e.target.value)} placeholder="e.g. 599.99" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input id="supplier" value={form.supplier} onChange={(e) => update('supplier', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="warranty">Warranty Expiry</Label>
                <Input id="warranty" type="date" value={form.warrantyExpiry} onChange={(e) => update('warrantyExpiry', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">Donation Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="donor">Donor Name *</Label>
                  <Input id="donor" value={form.donorName} onChange={(e) => update('donorName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donorOrg">Donor Organisation</Label>
                  <Input id="donorOrg" value={form.donorOrg} onChange={(e) => update('donorOrg', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="donatedAt">Date Donated</Label>
                <Input id="donatedAt" type="date" value={form.donatedAt} onChange={(e) => update('donatedAt', e.target.value)} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-md border p-4 space-y-3">
            <h3 className="font-medium">Review</h3>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Name</dt><dd>{form.name}</dd></div>
              <div><dt className="text-muted-foreground">Category</dt><dd>{form.deviceCategory.replace(/_/g, ' ')}</dd></div>
              <div><dt className="text-muted-foreground">Acquisition Type</dt><dd>{ACQUISITION_TYPES.find(t => t.value === form.acquisitionType)?.label}</dd></div>
              <div><dt className="text-muted-foreground">Condition</dt><dd>{form.condition}</dd></div>
              <div><dt className="text-muted-foreground">Acquired</dt><dd>{form.acquiredAt}</dd></div>
              {form.make && <div><dt className="text-muted-foreground">Make</dt><dd>{form.make}</dd></div>}
              {form.model && <div><dt className="text-muted-foreground">Model</dt><dd>{form.model}</dd></div>}
              {form.serialNumber && <div><dt className="text-muted-foreground">Serial Number</dt><dd>{form.serialNumber}</dd></div>}
              {form.purchasePrice && <div><dt className="text-muted-foreground">Price</dt><dd>{form.purchasePrice}</dd></div>}
              {form.supplier && <div><dt className="text-muted-foreground">Supplier</dt><dd>{form.supplier}</dd></div>}
              {form.donorName && <div><dt className="text-muted-foreground">Donor</dt><dd>{form.donorName}{form.donorOrg && ` (${form.donorOrg})`}</dd></div>}
            </dl>
            <div className="rounded bg-muted p-2 text-sm">
              Initial status: <strong>{INITIAL_STATUS[form.acquisitionType] ?? '—'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? router.back() : setStep(step - 1))}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canAdvance()}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createEquipment.isPending}>
            {createEquipment.isPending ? 'Creating...' : 'Create Equipment'}
          </Button>
        )}
      </div>
    </div>
  );
}
