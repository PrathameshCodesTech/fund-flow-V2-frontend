// ── Finance / Payment types — mirrors Backend/apps/finance/api/v1/serializers/payment.py ──

export type PaymentStatus =
  | 'pending'
  | 'initiated'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'reversed'
  | 'cancelled';

export interface PaymentRecord {
  id: string;
  invoice: string;
  invoice_number: string;
  vendor_name: string;
  payment_reference: string;
  payment_method: string;
  payment_date: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  bank_transaction_id: string;
  initiated_by: string | null;
  initiated_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecordDetail extends PaymentRecord {
  invoice_detail: {
    id: string;
    invoice_number: string;
    vendor_invoice_number: string;
    vendor_name: string;
    legal_entity_name: string;
    invoice_date: string;
    due_date: string | null;
    currency: string;
    total_amount: string;
    status: string;
  };
  notes: string;
  failure_reason: string;
}

export interface PaymentCreatePayload {
  invoice: string;
  vendor_bank_account?: string | null;
  payment_reference?: string;
  payment_method?: string;
  payment_date: string;
  amount: string;
  currency: string;
  bank_transaction_id?: string;
  notes?: string;
}

export interface PaymentUpdatePayload {
  payment_reference?: string;
  payment_method?: string;
  payment_date?: string;
  bank_transaction_id?: string;
  notes?: string;
  status?: PaymentStatus;
}
