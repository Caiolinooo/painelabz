// User model and related interfaces

// Interface for access history entry
export interface AccessHistoryEntry {
  timestamp: Date;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Interface for access permissions
export interface AccessPermissions {
  modules?: {
    [key: string]: boolean;
  };
  features?: {
    [key: string]: boolean;
  };
}

// Interface for reimbursement email settings
export interface ReimbursementEmailSettings {
  enabled: boolean;
  recipients: string[];
}

// Interface for user model
export interface User {
  id: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'ADMIN' | 'USER' | 'MANAGER';
  position?: string;
  department?: string;
  avatar?: string;
  active: boolean;
  accessPermissions?: AccessPermissions;
  accessHistory?: AccessHistoryEntry[];
  reimbursement_email_settings?: ReimbursementEmailSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for user creation
export interface CreateUserData {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: 'ADMIN' | 'USER' | 'MANAGER';
  position?: string;
  department?: string;
  password?: string;
}

// Interface for user update
export interface UpdateUserData {
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'ADMIN' | 'USER' | 'MANAGER';
  position?: string;
  department?: string;
  active?: boolean;
  accessPermissions?: AccessPermissions;
  reimbursement_email_settings?: ReimbursementEmailSettings;
}
