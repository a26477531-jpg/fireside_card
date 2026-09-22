-- Apply after 0006. Favorites are deliberately independent from ownership.
ALTER TABLE purchase_orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE purchase_orders ADD COLUMN cards_snapshot TEXT CHECK(cards_snapshot IS NULL OR json_valid(cards_snapshot));
CREATE UNIQUE INDEX idx_order_request ON purchase_orders(user_id,idempotency_key);
CREATE TABLE user_cards (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  card_data TEXT NOT NULL CHECK(json_valid(card_data)),
  acquired_at TEXT NOT NULL,
  PRIMARY KEY(user_id,card_id)
);
-- The trigger is part of the order INSERT transaction: debit, ownership, ledger
-- and order either all succeed or all roll back. Archived cards remain owned.
CREATE TRIGGER fulfill_coin_order AFTER INSERT ON purchase_orders
WHEN NEW.idempotency_key IS NOT NULL AND NEW.status='completed' AND NEW.currency='COIN'
BEGIN
  SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.user_id AND coin_balance>=NEW.total)
    THEN RAISE(ABORT,'insufficient-coins') END;
  UPDATE users SET coin_balance=coin_balance-NEW.total WHERE id=NEW.user_id;
  INSERT INTO user_cards(user_id,card_id,quantity,card_data,acquired_at)
    SELECT NEW.user_id,json_extract(value,'$.id'),1,value,NEW.created_at
    FROM json_each(NEW.cards_snapshot) WHERE 1
    ON CONFLICT(user_id,card_id) DO UPDATE SET quantity=user_cards.quantity+1,card_data=excluded.card_data;
  -- amount is positive in the existing ledger; type determines debit/credit.
  INSERT INTO coin_transactions(user_id,amount,type,balance_after)
    SELECT NEW.user_id,NEW.total,'purchase',coin_balance FROM users WHERE id=NEW.user_id AND NEW.total>0;
END;
