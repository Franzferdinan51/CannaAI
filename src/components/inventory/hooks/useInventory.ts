import { useState, useCallback } from 'react';
import { InventoryItem, Category, Supplier, InventoryFormData, SupplierFormData, CategoryFormData } from '../types/inventory';

export const useInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'General Hydroponics Flora Series',
      description: 'Complete nutrient solution for hydroponic systems',
      category: 'Nutrients',
      quantity: 2,
      unit: 'L',
      minStockLevel: 1,
      maxStockLevel: 10,
      cost: 45,
      sellingPrice: 65,
      supplier: 'Hydro Supplier Inc',
      lastRestocked: '2024-05-01',
      expiryDate: '2025-12-01',
      location: 'Storage Room A',
      sku: 'GH-FS-001',
      barcode: '1234567890123',
      notes: 'Popular choice for hydroponic growers',
      status: 'in-stock',
      createdAt: '2024-04-15',
      updatedAt: '2024-05-01'
    },
    {
      id: '2',
      name: 'Fox Farm Ocean Forest',
      description: 'Premium potting soil with beneficial microbes',
      category: 'Soil',
      quantity: 3,
      unit: 'bags',
      minStockLevel: 2,
      maxStockLevel: 20,
      cost: 25,
      sellingPrice: 35,
      supplier: 'Garden Supply Co',
      lastRestocked: '2024-04-15',
      location: 'Storage Room B',
      sku: 'FF-OF-002',
      barcode: '2345678901234',
      status: 'in-stock',
      createdAt: '2024-04-15',
      updatedAt: '2024-04-15'
    },
    {
      id: '3',
      name: 'LED Grow Light 1000W',
      description: 'Full spectrum LED grow light with adjustable intensity',
      category: 'Equipment',
      quantity: 1,
      unit: 'units',
      minStockLevel: 1,
      maxStockLevel: 5,
      cost: 299,
      sellingPrice: 399,
      supplier: 'Grow Equipment Co',
      lastRestocked: '2024-03-20',
      location: 'Storage Room C',
      sku: 'LED-1000W-003',
      barcode: '3456789012345',
      status: 'in-stock',
      createdAt: '2024-03-20',
      updatedAt: '2024-03-20'
    }
  ]);

  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'Nutrients', color: '#10b981', description: 'Nutrient solutions and fertilizers' },
    { id: '2', name: 'Soil', color: '#8b5a2b', description: 'Growing mediums and substrates' },
    { id: '3', name: 'Equipment', color: '#3b82f6', description: 'Grow lights, fans, and tools' }
  ]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: '1',
      name: 'Hydro Supplier Inc',
      contactPerson: 'John Smith',
      email: 'john@hydrosupplier.com',
      phone: '555-0101',
      rating: 5,
      leadTime: 3
    },
    {
      id: '2',
      name: 'Garden Supply Co',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@gardensupply.com',
      phone: '555-0202',
      rating: 4,
      leadTime: 5
    }
  ]);

  const addItem = useCallback((formData: InventoryFormData) => {
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      ...formData,
      lastRestocked: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setInventory(prev => [...prev, newItem]);
  }, []);

  const updateItem = useCallback((id: string, formData: InventoryFormData) => {
    setInventory(prev => prev.map(item =>
      item.id === id
        ? { ...item, ...formData, updatedAt: new Date().toISOString() }
        : item
    ));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  }, []);

  const addCategory = useCallback((formData: CategoryFormData) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      ...formData
    };
    setCategories(prev => [...prev, newCategory]);
  }, []);

  const addSupplier = useCallback((formData: SupplierFormData) => {
    const newSupplier: Supplier = {
      id: Date.now().toString(),
      ...formData
    };
    setSuppliers(prev => [...prev, newSupplier]);
  }, []);

  const updateItemQuantity = useCallback((id: string, quantity: number) => {
    setInventory(prev => prev.map(item =>
      item.id === id
        ? {
            ...item,
            quantity,
            status: quantity === 0 ? 'out-of-stock' : quantity <= item.minStockLevel ? 'low-stock' : 'in-stock',
            updatedAt: new Date().toISOString()
          }
        : item
    ));
  }, []);

  return {
    inventory,
    categories,
    suppliers,
    addItem,
    updateItem,
    deleteItem,
    addCategory,
    addSupplier,
    updateItemQuantity
  };
};
