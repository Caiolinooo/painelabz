# User Table Unification

This document describes the unification of all user-related tables into a single `users_unified` table.

## Background

Previously, the project had several user-related tables:

1. **users** (Supabase table):
   - Primary user information (id, email, first_name, last_name, phone_number, role, etc.)
   - Used for authentication and basic user data

2. **User** (Prisma model):
   - Similar to the users table but with different column naming conventions
   - Contains additional fields like verificationCode, inviteCode, etc.
   - Stores accessPermissions as JSONB

3. **user_permissions** (Supabase table):
   - Stores module-based permissions for users
   - References users(id) with a foreign key

4. **authorized_users** (Supabase table):
   - Stores information about users who are authorized to register
   - Contains email, phone_number, domain, invite_code, etc.

5. **AuthorizedUser** (Prisma model):
   - Similar to the authorized_users table but with different column naming conventions

6. **access_history** (Supabase table):
   - Stores user access history
   - References users(id) with a foreign key

This fragmentation led to several issues:
- Duplicate data across tables
- Inconsistent naming conventions
- Complex queries to join data from multiple tables
- Difficulty maintaining data integrity

## New Unified Table Structure

The new `users_unified` table combines all the necessary fields from these tables:

```sql
CREATE TABLE users_unified (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic user information
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'MANAGER')),
  position TEXT,
  department TEXT,
  avatar TEXT,
  active BOOLEAN DEFAULT TRUE,
  
  -- Authentication fields
  verification_code TEXT,
  verification_code_expires TIMESTAMP WITH TIME ZONE,
  password_last_changed TIMESTAMP WITH TIME ZONE,
  
  -- Invitation fields
  invite_code TEXT,
  invite_sent BOOLEAN DEFAULT FALSE,
  invite_sent_at TIMESTAMP WITH TIME ZONE,
  invite_accepted BOOLEAN DEFAULT FALSE,
  invite_accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Authorization fields (from authorized_users)
  is_authorized BOOLEAN DEFAULT FALSE,
  authorization_status TEXT DEFAULT 'pending' CHECK (authorization_status IN ('active', 'pending', 'rejected', 'expired')),
  authorization_domain TEXT,
  authorization_expires_at TIMESTAMP WITH TIME ZONE,
  authorization_max_uses INTEGER,
  authorization_uses INTEGER DEFAULT 0,
  authorized_by UUID REFERENCES users_unified(id),
  authorization_notes JSONB,
  
  -- Permissions (from user_permissions)
  access_permissions JSONB,
  
  -- History
  access_history JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Backward Compatibility

To maintain backward compatibility with existing code, we've created views that mimic the structure of the original tables:

1. **users_view**: Provides a view of the basic user information
2. **authorized_users_view**: Provides a view of authorized users
3. **user_permissions_view**: Provides a view of user permissions

## Migration Process

The migration process involved:

1. Creating the new unified table
2. Migrating data from existing tables to the new table
3. Creating compatibility views
4. Updating the Prisma schema to use the new table
5. Updating the Supabase client to work with the new table
6. Updating API endpoints to use the new table

## Benefits

The unified table structure provides several benefits:

1. **Simplified Data Model**: All user-related data is in one place
2. **Improved Data Integrity**: No need to maintain relationships across multiple tables
3. **Simplified Queries**: No need for complex joins to get all user data
4. **Consistent Naming Conventions**: All fields follow the same naming convention
5. **Easier Maintenance**: Only one table to maintain and update

## Usage Guidelines

When working with user data, always use the `users_unified` table directly. The compatibility views are provided only for backward compatibility and should be phased out over time.

### Example Queries

#### Get a user by ID:

```sql
SELECT * FROM users_unified WHERE id = '123e4567-e89b-12d3-a456-426614174000';
```

#### Get all authorized users:

```sql
SELECT * FROM users_unified WHERE is_authorized = TRUE;
```

#### Get all users with a specific permission:

```sql
SELECT * FROM users_unified WHERE access_permissions->'modules'->>'dashboard' = 'true';
```

## Future Improvements

In the future, we may want to:

1. Remove the compatibility views once all code has been updated to use the unified table
2. Add more indexes to improve query performance
3. Add more constraints to ensure data integrity
4. Add triggers to automatically update the `updated_at` field

## Conclusion

The unification of user-related tables into a single `users_unified` table simplifies the data model, improves data integrity, and makes it easier to work with user data. This change is a significant improvement to the project's architecture and will make future development easier and more maintainable.
