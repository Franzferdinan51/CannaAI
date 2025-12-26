export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  maxStockLevel: number;
  cost: number;
  sellingPrice?: number;
  supplier?: string;
  lastRestocked: string;
  expiryDate?: string;
  location?: string;
  sku?: string;
  barcode?: string;
  notes?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  website?: string;
  notes?: string;
  rating?: number;
  leadTime?: number;
}

export interface Transaction {
  id: string;
  itemId: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reason?: string;
  timestamp: string;
  performedBy: string;
}

export interface InventoryFilters {
  searchTerm: string;
  selectedCategory: string;
  selectedStatus: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface InventoryFormData {
  name: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  maxStockLevel: number;
  cost: number;
  sellingPrice?: number;
  supplier?: string;
  location?: string;
  sku?: string;
  barcode?: string;
  notes?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'discontinued';
}

export interface SupplierFormData {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  website?: string;
  notes?: string;
  rating?: number;
  leadTime?: number;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  color: string;
  icon?: string;
}
