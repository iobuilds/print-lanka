// In-memory store for order data that can't be serialized in navigation state
// File objects and geometry data need to stay in memory

interface ModelConfig {
  material: string;
  quality: string;
  color: string;
  infill: number;
  quantity: number;
  notes: string;
}

interface UploadedModel {
  file: File;
  name: string;
  config: ModelConfig;
}

interface CouponData {
  user_coupon_id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

interface OrderData {
  models: UploadedModel[];
  coupon: CouponData | null;
}

let orderData: OrderData | null = null;

export const setOrderData = (data: OrderData) => {
  orderData = data;
};

export const getOrderData = (): OrderData | null => {
  return orderData;
};

export const clearOrderData = () => {
  orderData = null;
};
