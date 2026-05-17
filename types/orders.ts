export type ProductType = 'stick' | 'apparel' | 'blade' | 'other';

export type OrderItemPayload = {
    product_type: ProductType;
    product_name?: string;
    product_code?: string;
    side?: string;
    height?: string;
    size?: string;
    quantity: number;
    note?: string;
    unit_price?: number | string;
    is_canceled?: boolean;
};

export type OrderPayload = {
    club: number;
    note?: string;
    items: OrderItemPayload[];
};

export type OrderDto = {
    id: number;
    user: number;
    club: number;
    status: 'new' | 'processing' | 'done' | 'canceled';
    note: string;
    created_at: string;
    is_paid: boolean;
    total_amount: number | string;
    items: (OrderItemPayload & { id: number })[];
};
