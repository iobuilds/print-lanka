// IO Builds 3D Print Service Constants

export const CURRENCY = "LKR";
export const CURRENCY_SYMBOL = "Rs.";

export const PRINT_COLORS = [
  "Black",
  "White", 
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Orange",
  "Gray",
  "Pink",
  "Purple",
  "Custom",
] as const;

export const INFILL_PRESETS = [
  { value: 10, label: "10% - Light" },
  { value: 20, label: "20% - Standard" },
  { value: 30, label: "30% - Strong" },
  { value: 50, label: "50% - Very Strong" },
  { value: 100, label: "100% - Solid" },
] as const;

export const QUALITY_PRESETS = {
  draft: { name: "Draft", description: "0.3mm layer height - Fast", pricePerGram: 5 },
  normal: { name: "Normal", description: "0.2mm layer height - Balanced", pricePerGram: 8 },
  high: { name: "High", description: "0.1mm layer height - Detailed", pricePerGram: 12 },
} as const;

export const MATERIALS = {
  pla: { name: "PLA", description: "Easy to print, eco-friendly", surcharge: 0 },
  petg: { name: "PETG", description: "Strong, heat resistant", surcharge: 15 },
  abs: { name: "ABS", description: "Durable, impact resistant", surcharge: 20 },
} as const;

export const PRINT_QUALITIES = [
  { value: "draft", label: "Draft", description: "0.3mm layer height - Fast" },
  { value: "normal", label: "Normal", description: "0.2mm layer height - Balanced" },
  { value: "high", label: "High", description: "0.1mm layer height - Detailed" },
] as const;

export const PRINT_MATERIALS = [
  { value: "pla", label: "PLA", description: "Easy to print, eco-friendly" },
  { value: "petg", label: "PETG", description: "Strong, heat resistant" },
  { value: "abs", label: "ABS", description: "Durable, impact resistant" },
] as const;

export const ORDER_STATUSES = {
  pending_review: { label: "Pending Review", color: "status-pending", icon: "Clock" },
  priced_awaiting_payment: { label: "Priced - Awaiting Payment", color: "status-priced", icon: "DollarSign" },
  payment_submitted: { label: "Payment Submitted", color: "status-payment", icon: "FileCheck" },
  payment_approved: { label: "Payment Approved", color: "status-production", icon: "CheckCircle" },
  in_production: { label: "In Production", color: "status-production", icon: "Printer" },
  ready_to_ship: { label: "Ready to Ship", color: "status-ready", icon: "Package" },
  shipped: { label: "Shipped", color: "status-shipped", icon: "Truck" },
  completed: { label: "Completed", color: "status-shipped", icon: "CheckCircle2" },
  rejected: { label: "Rejected", color: "status-rejected", icon: "XCircle" },
  payment_rejected: { label: "Payment Rejected", color: "status-rejected", icon: "XCircle" },
} as const;

export const ACCEPTED_MODEL_TYPES = {
  "model/stl": [".stl"],
  "model/obj": [".obj"],
  "model/3mf": [".3mf"],
  "application/octet-stream": [".stl", ".obj", ".3mf"],
};

export const ACCEPTED_PAYMENT_SLIP_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/pdf": [".pdf"],
};

export const MAX_FILE_SIZE_MB = 100;
export const MAX_PAYMENT_SLIP_SIZE_MB = 10;

export const formatPrice = (price: number): string => {
  return `${CURRENCY_SYMBOL} ${price.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatPhone = (phone: string): string => {
  // Format Sri Lankan phone number
  if (phone.startsWith("+94")) {
    return phone.replace(/(\+94)(\d{2})(\d{3})(\d{4})/, "$1 $2 $3 $4");
  }
  return phone;
};
