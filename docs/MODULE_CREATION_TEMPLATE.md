# Module Creation Template & Patterns

This document provides a comprehensive guide and template for creating new modules in the ABZ Panel project.

## 📁 Directory Structure Overview

### 1. News Module Structure (`src/app/noticias/`)

```
src/app/noticias/
├── page.tsx                    # Main page (client component using MainLayout)
└── post/
    └── [id]/
        └── page.tsx           # Dynamic route for individual posts

src/components/news/
├── NewsFeed.tsx               # Main feed component
├── NewsPostCard.tsx           # Card display for posts
├── NewsPostEditor.tsx         # Editor for creating/editing posts
├── NewsCommentSection.tsx     # Comments component
├── NewsHighlights.tsx          # Featured/pinned posts
├── MediaUploadWithFilters.tsx # Media upload with filters
├── RichTextEditor.tsx         # Rich text editing
├── TagInput.tsx               # Tag input component
└── ViewTracker.tsx           # View tracking for analytics

src/types/news.ts              # TypeScript interfaces for the module
src/services/newsService.ts    # Service layer for data operations
```

### 2. Evaluation Module Structure (`src/app/avaliacao/`)

```
src/app/avaliacao/
├── page.tsx                   # Main server component with data fetching
├── EvaluationListClient.tsx   # Client component for list view
├── gerenciar/
│   ├── page.tsx              # Manager configuration page
│   └── ManageManagersClient.tsx
├── nova/
│   ├── page.tsx              # New evaluation creation
│   └── NewEvaluationClient.tsx
├── pendentes/
│   ├── page.tsx              # Pending evaluations
│   └── PendentesClient.tsx
├── preencher/
│   └── [id]/
│       ├── page.tsx          # Fill evaluation form
│       └── FillEvaluationClient.tsx
└── ver/
    └── [id]/
        ├── page.tsx          # View evaluation details
        └── ViewEvaluationClient.tsx

src/components/avaliacao/
├── ActivePeriodCard.tsx      # Card for active periods
├── CompetencyCard.tsx        # Competency display
├── EvaluationCard.tsx         # Evaluation summary card
├── EvaluationCharts.tsx      # Charts for results
├── FormularioAutoavaliacao.tsx # Self-evaluation form
├── InterfaceAprovacaoGerente.tsx # Manager approval UI
├── ProgressBar.tsx           # Progress indicator
├── QuestionarioAvaliacaoCardBased.tsx # Card-based questionnaire
├── SeletorEstrelas.tsx       # Star rating selector
└── StatusBadge.tsx            # Status badge component

src/services/evaluationService.ts # Evaluation business logic
src/app/api/avaliacao/
├── [id]/route.ts             # GET, PATCH for single evaluation
└── setup-simple/route.ts     # Setup endpoint
```

### 3. Reimbursement Module Structure (`src/app/reembolso/`)

```
src/app/reembolso/
├── error.tsx                  # Error boundary
├── page.tsx                   # Main reimbursement page
└── [protocolo]/
    └── page.tsx              # Dynamic route by protocol number

src/app/api/reimbursement/
├── approve/route.ts           # Approve reimbursement
├── reject/route.ts            # Reject reimbursement
└── [dynamic routes as needed]

src/services/reimbursementService.ts
```

## 🔄 Common Patterns

### Pattern 1: Page Architecture (Server + Client Components)

**Server Component Pattern** (`src/app/module/page.tsx`):
```typescript
// Server-side authentication and data fetching
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getData } from '@/services/moduleService';
import ModuleClientComponent from './ModuleClientComponent';

export default async function ModulePage() {
  // 1. Get token from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get('abzToken')?.value || cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login?redirect=/module-path');
  }

  // 2. Verify token and get user info
  const decoded = await verifyToken(token);
  if (!decoded?.userId) {
    redirect('/login');
  }

  // 3. Fetch data
  const data = await getData({ userId: decoded.userId });

  // 4. Pass data to client component
  return <ModuleClientComponent initialData={data} userId={decoded.userId} />;
}
```

**Client Component Pattern** (`src/app/module/ModuleClientComponent.tsx`):
```typescript
'use client';

import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';

interface ModuleClientComponentProps {
  initialData: any[];
  userId: string;
}

export default function ModuleClientComponent({ 
  initialData, 
  userId 
}: ModuleClientComponentProps) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-6 px-4">
        {/* Module content */}
      </div>
    </MainLayout>
  );
}
```

### Pattern 2: Dynamic Routes

**Dynamic Route with ID** (`src/app/module/[id]/page.tsx`):
```typescript
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { getItemById } from '@/services/moduleService';
import ItemDetailClient from './ItemDetailClient';

export default async function ItemPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('abzToken')?.value;

  if (!token) {
    redirect('/login');
  }

  const decoded = await verifyToken(token);
  const item = await getItemById(id);

  return <ItemDetailClient item={item} userId={decoded.userId} />;
}
```

### Pattern 3: API Routes

**GET Endpoint** (`src/app/api/module/route.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('abzToken')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Fetch data
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const { data, error } = await supabaseAdmin
      .from('table_name')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

**PATCH Endpoint** (`src/app/api/module/[id]/route.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('abzToken')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    const userId = decoded.userId;

    // Get request body
    const body = await request.json();

    // Permission check
    const { data: existingItem } = await supabaseAdmin
      .from('table_name')
      .select('user_id')
      .eq('id', id)
      .single();

    if (existingItem.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Update
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### Pattern 4: Service Layer

**Service Pattern** (`src/services/moduleService.ts`):
```typescript
import { supabase } from '@/lib/supabase';
import { ModuleItem, ModuleFilters } from '@/types';

export const getItems = async (filters: ModuleFilters): Promise<ModuleItem[]> => {
  const { userId, status } = filters || {};

  let query = supabase.from('table_name').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data as ModuleItem[];
};

export const getItemById = async (id: string): Promise<ModuleItem | null> => {
  const { data, error } = await supabase
    .from('table_name')
    .select(`
      *,
      related_table:related_table_id (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ModuleItem | null;
};

export const createItem = async (itemData: Partial<ModuleItem>): Promise<ModuleItem> => {
  const { data, error } = await supabase
    .from('table_name')
    .insert([itemData])
    .select()
    .single();

  if (error) throw error;
  return data as ModuleItem;
};

export const updateItem = async (
  id: string, 
  updates: Partial<ModuleItem>
): Promise<ModuleItem> => {
  const { data, error } = await supabase
    .from('table_name')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as ModuleItem;
};

export const deleteItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('table_name')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
```

### Pattern 5: TypeScript Types

**Module Types** (`src/types/module.ts`):
```typescript
export interface ModuleItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  user_id: string;
  category_id: string | null;
  data: Record<string, any>;
  metadata?: any;
  created_at: string;
  updated_at: string;
  
  // Relations (when using select with joins)
  user?: {
    id: string;
    name: string;
    email: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

export interface ModuleCategory {
  id: string;
  name: string;
  color: string;
  description?: string;
  icon?: string;
}

export interface ModuleFilters {
  userId?: string;
  status?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}
```

### Pattern 6: Custom Hooks

**Hook Pattern** (`src/hooks/useModule.ts`):
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { ModuleItem, ModuleFilters } from '@/types';

export function useModule(filters?: ModuleFilters) {
  const { user } = useSupabaseAuth();
  const [items, setItems] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      
      const res = await fetch(`/api/module?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setItems(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filters?.status]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refresh: fetchItems };
}
```

## 📋 Complete Module Creation Checklist

### 1. Create Directory Structure
```
src/app/newmodule/
├── page.tsx                    # Main page (server component)
├── error.tsx                   # Error boundary (optional)
├── loading.tsx                 # Loading state (optional)
└── [param]/
    └── page.tsx               # Dynamic route (optional)

src/app/api/newmodule/
├── route.ts                    # GET, POST
└── [id]/
    └── route.ts               # GET, PATCH, DELETE
```

### 2. Create Type Definitions
```
src/types/
└── newmodule.ts               # Module-specific types
```

### 3. Create Service Layer
```
src/services/
└── newmoduleService.ts        # Business logic and data operations
```

### 4. Create Components
```
src/components/newmodule/
├── ModuleClientComponent.tsx  # Main client component
├── ModuleCard.tsx             # Card display
├── ModuleForm.tsx             # Form for create/edit
└── ModuleList.tsx             # List view
```

### 5. Create Custom Hooks (if needed)
```
src/hooks/
└── useNewModule.ts            # Module-specific hook
```

### 6. Add to Navigation
- Update `src/lib/unifiedDataService.ts` to include the new module in menu items
- Add translations in translation files

### 7. Create Database Tables (if needed)
- Create SQL migration file in `docs/` or `MIGRATIONS/`
- Document table schema and relationships

## 🔑 Key Conventions

1. **Naming**: Use Portuguese for user-facing content, English for code
2. **Authentication**: Always use cookies (`abzToken` or `token`) for auth
3. **Server Components**: Use for data fetching and authentication
4. **Client Components**: Use for user interactions and state
5. **API Routes**: Place in `src/app/api/module-name/`
6. **Service Layer**: Centralize Supabase operations in `src/services/`
7. **Types**: Define in `src/types/` with module-specific filename
8. **Components**: Organize in `src/components/module-name/`
9. **Error Handling**: Always include try-catch with proper error responses
10. **Permissions**: Check user permissions before operations

## 📊 Database Tables Reference

Common tables used across modules:
- `users_unified` - User information
- `sectors` - Department/sector data
- `settings` - Module settings
- `notifications` - User notifications
- Module-specific tables (e.g., `avaliacoes_desempenho`, `reembolso_solicitacoes`, `noticias`)

## 🚀 Quick Start Template

Copy this template structure to create a new module:

```
src/app/newmodule/
├── page.tsx
├── error.tsx
└── [id]/
    └── page.tsx

src/app/api/newmodule/
├── route.ts
└── [id]/
    └── route.ts

src/components/newmodule/
├── NewModuleClient.tsx
├── NewModuleCard.tsx
└── NewModuleForm.tsx

src/types/
└── newmodule.ts

src/services/
└── newmoduleService.ts

src/hooks/
└── useNewModule.ts
```
