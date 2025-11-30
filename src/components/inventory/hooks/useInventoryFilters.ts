import { useState, useMemo } from 'react';
import { InventoryItem, InventoryFilters } from '../types/inventory';

export const useInventoryFilters = (inventory: InventoryItem[]) => {
  const [filters, setFilters] = useState<InventoryFilters>({
    searchTerm: '',
    selectedCategory: 'all',
    selectedStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const updateFilter = (key: keyof InventoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredInventory = useMemo(() => {
    let result = [...inventory];

    // Filter by search term
    if (filters.searchTerm) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (filters.selectedCategory !== 'all') {
      result = result.filter(item => item.category === filters.selectedCategory);
    }

    // Filter by status
    if (filters.selectedStatus !== 'all') {
      result = result.filter(item => item.status === filters.selectedStatus);
    }

    // Sort
    result.sort((a, b) => {
      const aValue = a[filters.sortBy as keyof InventoryItem];
      const bValue = b[filters.sortBy as keyof InventoryItem];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (filters.sortOrder === 'asc') {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });

    return result;
  }, [inventory, filters]);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(item => item.category));
    return Array.from(cats);
  }, [inventory]);

  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    const lowStock = inventory.filter(item => item.quantity <= item.minStockLevel).length;
    const outOfStock = inventory.filter(item => item.quantity === 0).length;

    return {
      totalItems,
      totalValue,
      lowStock,
      outOfStock
    };
  }, [inventory]);

  return {
    filters,
    filteredInventory,
    categories,
    stats,
    updateFilter,
    setFilters
  };
};
