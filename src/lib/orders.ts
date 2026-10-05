import { supabase } from '@/src/lib/supabase';

export type OrderItem = {
  order_id: string;
  code: string;
  name: string;
  size: string;
  qty: number;
  unit_price: number;
};

export type Order = {
  id: string;
  created_at: string;
  email: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  shipping_method: string;
  shipping_cost: number;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: string;
  notes: string | null;
  order_items?: OrderItem[];
};

export function orderStatusLabel(status: string): string | null {
  if (status === 'stock_short') return null;
  if (status === 'reserved') return 'Received';
  if (status === 'preparing') return 'Preparing';
  if (status === 'shipped') return 'Shipped';
  if (status === 'cancelled') return 'Cancelled';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function shortOrderId(id: string | number): string {
  return String(id).replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function shippingLabel(method: string): string {
  if (method === 'express') return 'Express (2–3 days)';
  if (method === 'pickup') return 'Hub pickup';
  if (method === 'standard') return 'Standard (5–8 days)';
  return method;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      'id, created_at, email, full_name, phone, address, city, country, shipping_method, shipping_cost, subtotal, vat_rate, vat_amount, total, status, notes',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error("Can't load the shop");
  const ids = (orders ?? []).map((order) => order.id);
  if (ids.length === 0) return [];
  const { data: items, error: itemError } = await supabase.from('order_items').select('order_id, code, name, size, qty, unit_price').in('order_id', ids);
  if (itemError) throw new Error("Can't load the shop");
  return (orders ?? []).map((order) => ({
    ...order,
    order_items: (items ?? []).filter((item) => item.order_id === order.id),
  }));
}

export async function fetchOrder(id: string): Promise<Order | null> {
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, created_at, email, full_name, phone, address, city, country, shipping_method, shipping_cost, subtotal, vat_rate, vat_amount, total, status, notes',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error("Can't load the shop");
  if (!order) return null;
  const { data: items, error: itemError } = await supabase
    .from('order_items')
    .select('order_id, code, name, size, qty, unit_price')
    .eq('order_id', id);
  if (itemError) throw new Error("Can't load the shop");
  return { ...order, order_items: items ?? [] };
}

export async function latestOrderId(): Promise<string | null> {
  const { data, error } = await supabase.from('orders').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Can't load the shop");
  return data?.id ?? null;
}

/** Polls for an order newer than `previousId`; the webhook or return page may still be writing it. */
export async function waitForNewOrder(previousId: string | null, attempts = 10, delayMs = 1250): Promise<string | null> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const id = await latestOrderId();
      if (id && id !== previousId) return id;
    } catch {
      // Keep polling; Orders remains available to the user either way.
    }
    if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

export async function fetchProfile(userId: string): Promise<{ email: string | null; full_name: string | null }> {
  const { data } = await supabase.from('profiles').select('email, full_name').eq('id', userId).maybeSingle();
  return { email: data?.email ?? null, full_name: data?.full_name ?? null };
}
