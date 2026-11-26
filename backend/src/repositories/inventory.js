import { all, productFrom, publicProduct } from './store.js';

export function inventorySnapshot(db, days) {
  return all(db, `WITH recent_sales AS (
    SELECT item.product_id, sum(item.quantity)::int AS units_sold
    FROM payments payment
    JOIN orders o ON o.id=payment.order_id
    JOIN order_items item ON item.order_id=o.id
    WHERE payment.created_at >= now() - ($1::int * interval '1 day')
      AND o.status IN ('paid','processing','shipped','delivered')
    GROUP BY item.product_id
  )
  SELECT p.id,p.name,c.name AS category,p.stock,COALESCE(sale.units_sold,0)::int AS units_sold
  ${productFrom} LEFT JOIN recent_sales sale ON sale.product_id=p.id
  WHERE ${publicProduct} ORDER BY p.name,p.id`, [days]);
}
