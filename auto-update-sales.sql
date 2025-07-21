-- Auto-update total_sales when orders are paid
-- Run this in Supabase SQL Editor

-- Function to update product sales when order is paid
CREATE OR REPLACE FUNCTION update_product_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product sales when order status changes to 'paid'
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE products 
    SET 
      total_sales = total_sales + (
        SELECT COALESCE(SUM(quantity), 0) 
        FROM order_items 
        WHERE order_id = NEW.id AND product_id = products.id
      ),
      total_revenue = total_revenue + (
        SELECT COALESCE(SUM(price * quantity), 0) 
        FROM order_items 
        WHERE order_id = NEW.id AND product_id = products.id
      ),
      updated_at = NOW()
    WHERE id IN (
      SELECT product_id 
      FROM order_items 
      WHERE order_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update sales on order status change
DROP TRIGGER IF EXISTS update_product_sales_trigger ON orders;
CREATE TRIGGER update_product_sales_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_product_sales();

-- Function to update seller analytics when product sales change
CREATE OR REPLACE FUNCTION update_seller_sales()
RETURNS TRIGGER AS $$
BEGIN
  -- Update seller profile when product sales change
  UPDATE profiles 
  SET 
    total_sales = (
      SELECT COALESCE(SUM(total_sales), 0) 
      FROM products 
      WHERE seller_id = profiles.id AND status = 'active'
    ),
    total_earnings = (
      SELECT COALESCE(SUM(total_revenue * 0.9), 0) 
      FROM products 
      WHERE seller_id = profiles.id AND status = 'active'
    ),
    updated_at = NOW()
  WHERE id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update seller analytics when product sales change
DROP TRIGGER IF EXISTS update_seller_sales_trigger ON products;
CREATE TRIGGER update_seller_sales_trigger
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_seller_sales(); 