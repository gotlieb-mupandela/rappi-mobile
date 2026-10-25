/**
 * Orders use a UUID primary key. `shortOrderId` strips hyphens for display,
 * and the order screen loads `orders.id` as that full string.
 */
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOrderId(value: unknown): value is string {
  return typeof value === 'string' && ORDER_ID.test(value);
}
