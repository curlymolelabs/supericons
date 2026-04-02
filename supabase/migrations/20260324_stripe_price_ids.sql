-- Supericons: Update si_products with Stripe sandbox price IDs
-- Run this in Supabase SQL Editor

-- Map Stripe products to seeded slugs:
-- Stripe "Status and Feedback"      -> DB slug: status-feedback
-- Stripe "Navigation and Actions"   -> DB slug: navigation-menus
-- Stripe "Social and Communication" -> DB slug: social-communication
-- Stripe "Data and Dashboard"       -> DB slug: data-charts
-- Stripe "E-commerce and Finance"   -> DB slug: ecommerce
-- Stripe "Media and Content"        -> DB slug: media-playback
-- Stripe "System and Device"        -> DB slug: security-auth
-- Stripe "Agentic AI Tools"         -> DB slug: ai-agentic

UPDATE si_products SET stripe_price_id = 'price_1TETVM3eLO1ro0klPiVYGanN' WHERE slug = 'status-feedback';
UPDATE si_products SET stripe_price_id = 'price_1TETk73eLO1ro0klWBn7gTx3' WHERE slug = 'navigation-menus';
UPDATE si_products SET stripe_price_id = 'price_1TETkS3eLO1ro0klWTlEGTJV' WHERE slug = 'social-communication';
UPDATE si_products SET stripe_price_id = 'price_1TETkj3eLO1ro0klCkLXlelh' WHERE slug = 'data-charts';
UPDATE si_products SET stripe_price_id = 'price_1TETkz3eLO1ro0klNvnVmTVh' WHERE slug = 'ecommerce';
UPDATE si_products SET stripe_price_id = 'price_1TETlE3eLO1ro0klzG2e5755' WHERE slug = 'media-playback';
UPDATE si_products SET stripe_price_id = 'price_1TETlT3eLO1ro0klT71tEkwf' WHERE slug = 'security-auth';
UPDATE si_products SET stripe_price_id = 'price_1TETln3eLO1ro0klkgfSBoXP' WHERE slug = 'ai-agentic';

-- Also activate all packs for testing (they were seeded as draft)
UPDATE si_products SET status = 'active' WHERE pack_type = 'single';
