-- Insert a new card for the manager module
INSERT INTO "Card" (
  "id", 
  "title", 
  "description", 
  "href", 
  "icon", 
  "color", 
  "hoverColor", 
  "external", 
  "enabled", 
  "order", 
  "managerOnly",
  "createdAt", 
  "updatedAt"
) 
VALUES (
  gen_random_uuid(), 
  'Manager Module', 
  'Special tools and features for managers', 
  '/manager-module', 
  'FiUsers', 
  '#4F46E5', 
  '#4338CA', 
  false, 
  true, 
  100, 
  true,
  NOW(), 
  NOW()
);
