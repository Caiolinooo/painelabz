-- Create SiteConfig table if it doesn't exist
CREATE TABLE IF NOT EXISTS "SiteConfig" (
    id TEXT PRIMARY KEY DEFAULT 'default',
    title TEXT,
    description TEXT,
    logo TEXT,
    favicon TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "companyName" TEXT,
    "contactEmail" TEXT,
    "footerText" TEXT,
    "dashboardTitle" TEXT,
    "dashboardDescription" TEXT,
    "sidebarTitle" TEXT,
    "googleClientId" TEXT,
    "googleClientSecret" TEXT,
    "googleRedirectUri" TEXT,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default config if not exists
INSERT INTO "SiteConfig" (id, title, "companyName", logo)
VALUES ('default', 'Painel ABZ Group', 'ABZ Group', '/images/LC1_Azul.png')
ON CONFLICT (id) DO NOTHING;
