-- Stable, human-readable references; UUIDs remain the internal order keys.
-- AUTOINCREMENT prevents reuse even if an order is deleted later.
CREATE TABLE IF NOT EXISTS order_numbers (
  number INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL UNIQUE REFERENCES purchase_orders(id) ON DELETE CASCADE
);

INSERT INTO order_numbers(order_id)
SELECT id FROM purchase_orders
WHERE id NOT IN (SELECT order_id FROM order_numbers)
ORDER BY created_at, id;

CREATE TRIGGER IF NOT EXISTS assign_order_number AFTER INSERT ON purchase_orders
BEGIN
  INSERT INTO order_numbers(order_id) VALUES (NEW.id);
END;
