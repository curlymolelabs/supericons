-- Adds taxonomy rows for the 2026-07-29 Supericons icon expansion.
-- This forward migration updates environments that already applied the original taxonomy seed.

insert into public.icon_metadata (
  icon_id,
  source_library,
  job_category,
  secondary_categories
)
values
  ('si:agent-scout', 'si', 'agent-identity', array['agent-lifecycle-states', 'people-accounts', 'bot', 'explorer', 'chatbot', 'avatar']::text[]),
  ('si:agent-wink', 'si', 'agent-identity', array['agent-lifecycle-states', 'people-accounts', 'bot', 'friendly', 'companion', 'avatar']::text[]),
  ('si:game-pad', 'si', 'game-assets', array['devices-hardware', 'media-playback', 'controller', 'play', 'gaming', 'console']::text[]),
  ('si:game-ghost', 'si', 'game-assets', array['trending-culture', 'enemy', 'sprite', 'arcade', 'npc']::text[]),
  ('si:toothpaste', 'si', 'everyday-objects', array['health-body', 'trending-culture', 'dental', 'hygiene', 'teeth', 'routine']::text[]),
  ('si:bacteria', 'si', 'health-body', array['frontier-compute', 'germ', 'microbe', 'pathogen', 'microbiology']::text[]),
  ('si:stomach', 'si', 'health-body', array['gut', 'digestion', 'organ', 'anatomy']::text[]),
  ('si:lawn-mower', 'si', 'physical-automation', array['everyday-objects', 'mower', 'grass', 'gardening', 'yard']::text[]),
  ('si:house-key', 'si', 'everyday-objects', array['security-access', 'maps-places-travel', 'key', 'home', 'real-estate', 'property']::text[]),
  ('si:screw', 'si', 'everyday-objects', array['fastener', 'hardware', 'diy', 'tornillo']::text[]),
  ('si:agent-pod', 'si', 'agent-identity', array['agent-lifecycle-states', 'people-accounts', 'bot', 'avatar', 'ai-face', 'companion']::text[]),
  ('si:cashback', 'si', 'agentic-payments', array['commerce-finance', 'everyday-objects', 'refund', 'rebate', 'rewards', 'money-back']::text[]),
  ('si:lottery-ticket', 'si', 'agentic-payments', array['trending-culture', 'commerce-finance', 'raffle', 'lotto', 'prize-draw', 'sweepstakes']::text[]),
  ('si:noodle-bowl', 'si', 'food-dining', array['kitchen', 'everyday-objects', 'ramen', 'noodles', 'pasta', 'meal']::text[]),
  ('si:dinosaur', 'si', 'nature-animals', array['trending-culture', 'sauropod', 'long-neck', 'dino', 'prehistoric', 'paleontology']::text[]),
  ('si:fossil', 'si', 'nature-animals', array['ammonite', 'paleontology', 'archaeology', 'geology']::text[]),
  ('si:comb', 'si', 'personal-care', array['everyday-objects', 'hair-care', 'grooming', 'barber', 'styling']::text[]),
  ('si:hairbrush', 'si', 'personal-care', array['everyday-objects', 'hair-care', 'grooming', 'paddle-brush', 'styling']::text[]),
  ('si:hair-clipper', 'si', 'personal-care', array['everyday-objects', 'hair-care', 'grooming', 'barber', 'trimmer']::text[]),
  ('si:mascara', 'si', 'personal-care', array['trending-culture', 'cosmetics', 'beauty', 'makeup', 'eyelashes']::text[]),
  ('si:nail-polish', 'si', 'personal-care', array['trending-culture', 'cosmetics', 'beauty', 'manicure', 'nails']::text[]),
  ('si:toothbrush', 'si', 'personal-care', array['everyday-objects', 'health-body', 'oral-care', 'hygiene', 'dental', 'brushing']::text[]),
  ('si:dental-floss', 'si', 'personal-care', array['health-body', 'oral-care', 'hygiene', 'flossing', 'dental']::text[]),
  ('si:shampoo', 'si', 'personal-care', array['everyday-objects', 'hair-care', 'shower', 'toiletries', 'grooming']::text[]),
  ('si:lotion', 'si', 'personal-care', array['everyday-objects', 'health-body', 'skincare', 'moisturizer', 'toiletries', 'grooming']::text[]),
  ('si:sunscreen', 'si', 'personal-care', array['everyday-objects', 'health-body', 'skincare', 'spf', 'sun-protection', 'summer']::text[]),
  ('si:cotton-swab', 'si', 'personal-care', array['everyday-objects', 'health-body', 'hygiene', 'first-aid', 'q-tip', 'cotton-bud']::text[]),
  ('si:tweezers', 'si', 'personal-care', array['everyday-objects', 'health-body', 'grooming', 'beauty', 'eyebrows', 'precision']::text[]),
  ('si:plate', 'si', 'kitchen', array['food-dining', 'tableware', 'dining', 'restaurant', 'place-setting']::text[]),
  ('si:cutting-board', 'si', 'kitchen', array['everyday-objects', 'prep-tools', 'chopping', 'food-prep', 'cookware']::text[]),
  ('si:wok', 'si', 'kitchen', array['food-dining', 'cookware', 'stir-fry', 'asian-cooking', 'pan']::text[]),
  ('si:toaster', 'si', 'kitchen', array['food-dining', 'everyday-objects', 'appliance', 'breakfast', 'toast', 'bread']::text[]),
  ('si:mixer', 'si', 'kitchen', array['food-dining', 'appliance', 'baking', 'stand-mixer', 'whisk']::text[]),
  ('si:grater', 'si', 'kitchen', array['prep-tools', 'shredding', 'cheese', 'zester']::text[]),
  ('si:peeler', 'si', 'kitchen', array['prep-tools', 'peeling', 'vegetables', 'y-peeler']::text[]),
  ('si:rolling-pin', 'si', 'kitchen', array['food-dining', 'baking', 'dough', 'pastry', 'prep-tools']::text[]),
  ('si:tongs', 'si', 'kitchen', array['food-dining', 'prep-tools', 'serving', 'grilling', 'bbq']::text[]),
  ('si:colander', 'si', 'kitchen', array['prep-tools', 'draining', 'strainer', 'pasta']::text[]),
  ('si:corkscrew', 'si', 'kitchen', array['food-dining', 'bar-tools', 'wine', 'opener', 'bottle']::text[]),
  ('si:can-opener', 'si', 'kitchen', array['everyday-objects', 'prep-tools', 'tin', 'opening', 'pantry']::text[])
on conflict (icon_id) do update
set
  source_library = excluded.source_library,
  job_category = excluded.job_category,
  secondary_categories = excluded.secondary_categories,
  updated_at = timezone('utc', now());
