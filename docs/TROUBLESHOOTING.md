# Troubleshooting Next.js Development Server Issues

This document provides solutions for common issues with the Next.js development server in the Painel ABZ project.

## Issue 1: Missing 'critters' Module

### Symptoms
- 500 errors when accessing pages like `/reembolso?tab=dashboard`
- Error message: `MODULE_NOT_FOUND` for 'critters'

### Solution
The 'critters' package is a dependency used by Next.js for CSS optimization. To fix this issue:

```bash
# Install the missing dependency
npm install critters
```

## Issue 2: useLayoutEffect SSR Warning

### Symptoms
- Warnings about `useLayoutEffect` being used during server-side rendering
- Messages like "Warning: useLayoutEffect does nothing on the server..."
- Hydration mismatches related to components using ShadowPortal

### Solution
We've created a safe wrapper for components using `useLayoutEffect`:

1. Use the `ClientSideOnly` component to wrap components that use `useLayoutEffect`:

```jsx
import { ClientSideOnly } from '@/components/ClientSideOnly';

function MyComponent() {
  // Component that uses useLayoutEffect
  return (
    <ClientSideOnly>
      <ComponentWithUseLayoutEffect />
    </ClientSideOnly>
  );
}
```

2. Or use the `useSafeLayoutEffect` hook instead of `useLayoutEffect`:

```jsx
import { useSafeLayoutEffect } from '@/components/ClientSideOnly';

function MyComponent() {
  useSafeLayoutEffect(() => {
    // Your effect code here
  }, []);
  
  return <div>My Component</div>;
}
```

3. Run the script to automatically fix components using `useLayoutEffect`:

```bash
node scripts/fix-use-layout-effect.js
```

## Issue 3: Webpack Cache Error

### Symptoms
- Error message: `ENOENT: no such file or directory, rename [path]`
- Issues with webpack cache during development

### Solution
We've created scripts to fix webpack cache issues:

1. Clean the Next.js and webpack cache:

```bash
node scripts/clean-next-cache.js
```

2. Create the necessary cache directories with proper permissions:

```bash
node scripts/fix-webpack-cache.js
```

3. If issues persist, try running the development server with a clean cache:

```bash
npm run clean && npm run dev
```

## Additional Fixes

### Suppressing Hydration Warnings

We've updated the root layout to suppress hydration warnings:

```jsx
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
```

### Fixing Client-Side Components

We've updated the `ClientProviders` component to properly handle client-side rendering:

```jsx
// src/components/ClientProviders.tsx
export default function ClientProviders({ children }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <GlobalErrorHandler />
      <SupabaseAuthProvider>
        <AuthProvider>
          <I18nProvider>
            <SiteConfigProvider>
              <SiteHead />
              {/* Only render components that might cause hydration issues when mounted on client */}
              {isMounted && <LanguageDialog />}
              {isMounted && <ToastContainer position="top-right" theme="colored" />}
              {children}
            </SiteConfigProvider>
          </I18nProvider>
        </AuthProvider>
      </SupabaseAuthProvider>
    </>
  );
}
```

### Webpack Configuration

We've updated the Next.js configuration to fix webpack cache issues:

```js
// next.config.js
webpack: (config, { isServer, dev }) => {
  // ...existing config
  
  // Fix webpack cache issues
  if (dev) {
    // Use a custom cache directory to avoid permission issues
    config.cache = {
      type: 'filesystem',
      cacheDirectory: path.resolve('.next/cache/webpack'),
      compression: false,
      buildDependencies: {
        config: [__filename],
      },
    };
  }
  
  return config;
}
```

## Preventing Future Issues

1. Always install all required dependencies
2. Use client-side only components for browser-specific code
3. Regularly clean the Next.js cache when experiencing issues
4. Use the provided scripts to fix common issues
