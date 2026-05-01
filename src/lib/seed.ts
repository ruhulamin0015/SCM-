import { db, collection, addDoc, Timestamp } from './firebase';

const PRODUCTS = [
  { name: 'Lithium ION 48V', category: 'Energy', unit: 'units', minStockLevel: 50, currentStock: 120, price: 450, updatedAt: Timestamp.now() },
  { name: 'Steel Girders 20ft', category: 'Construction', unit: 'pieces', minStockLevel: 20, currentStock: 15, price: 1200, updatedAt: Timestamp.now() },
  { name: 'Copper Wiring 100m', category: 'Electrical', unit: 'rolls', minStockLevel: 100, currentStock: 250, price: 85, updatedAt: Timestamp.now() },
  { name: 'Hydraulic Fluid', category: 'Chemicals', unit: 'liters', minStockLevel: 200, currentStock: 180, price: 12, updatedAt: Timestamp.now() },
];

const SUPPLIERS = [
  { name: 'NeoEnergy Corp', email: 'orders@neoenergy.com', phone: '+123456789', categories: ['Energy'], leadTime: 14 },
  { name: 'Global Metals Ltd', email: 'sales@globalmetals.io', phone: '+987654321', categories: ['Construction'], leadTime: 21 },
];

export async function seedDatabase() {
  console.log('Seeding database...');
  
  for (const p of PRODUCTS) {
    await addDoc(collection(db, 'products'), p);
  }
  
  for (const s of SUPPLIERS) {
    const docRef = await addDoc(collection(db, 'suppliers'), s);
    
    // Add a couple of orders for each supplier
    await addDoc(collection(db, 'orders'), {
      supplierId: docRef.id,
      items: [{ productId: 'mock_1', quantity: 100, price: 50 }],
      status: 'shipped',
      totalAmount: 5000,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  // Add some logs
  for (let i = 0; i < 20; i++) {
     await addDoc(collection(db, 'inventoryLogs'), {
        productId: 'mock_id_' + (i % 4),
        change: Math.floor(Math.random() * 50) - 20,
        type: Math.random() > 0.5 ? 'purchase' : 'sale',
        timestamp: Timestamp.fromDate(new Date(Date.now() - (20 - i) * 86400000)),
        note: 'Simulated log'
     });
  }

  console.log('Seeding complete.');
}
