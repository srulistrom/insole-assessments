export type Status = "draft" | "new" | "sent_to_supplier" | "arrived" | "picked_up" | "cancelled";

export const STATUS_META: Record<Status, { label: string; pill: string; dot: string }> = {
  draft: { label: "Draft", pill: "bg-amber-100 text-amber-900 ring-amber-300", dot: "bg-amber-500" },
  new: { label: "New", pill: "bg-blue-100 text-blue-900 ring-blue-300", dot: "bg-blue-600" },
  sent_to_supplier: { label: "Sent to Supplier", pill: "bg-sky-100 text-sky-900 ring-sky-300", dot: "bg-sky-600" },
  arrived: { label: "Arrived", pill: "bg-violet-100 text-violet-900 ring-violet-300", dot: "bg-violet-600" },
  picked_up: { label: "Picked Up", pill: "bg-emerald-100 text-emerald-900 ring-emerald-300", dot: "bg-emerald-600" },
  cancelled: { label: "Cancelled", pill: "bg-slate-200 text-slate-700 ring-slate-300", dot: "bg-slate-500" },
};

export interface Assessor {
  id: string;
  name: string;
  active: boolean;
  has_pin: boolean;
  sort_order: number;
}
export const ASSESSOR_COLUMNS = "id,name,active,has_pin,sort_order";

export interface ArchType {
  id: string;
  name: string;
  price: number;
  active: boolean;
  sort_order: number;
}

export interface Assessment {
  id: string;
  order_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  shoe_size: string | null;
  issue: string | null;
  notes: string | null;
  arch_type_id: string | null;
  arch_type_name: string | null;
  price: number;
  deposit_amount: number;
  deposit_payment_method: string | null;
  balance_due: number;
  assessor_id: string | null;
  assessor_name: string | null;
  status: Status;
  foam_photo_right_url: string | null;
  foam_photo_left_url: string | null;
  label_printed: boolean;
  label_printed_at: string | null;
  pdf_path: string | null;
  drive_folder_id: string | null;
  drive_pdf_file_id: string | null;
  drive_synced_at: string | null;
  sent_to_supplier_at: string | null;
  arrived_at: string | null;
  picked_up_at: string | null;
  cancelled_at: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}
