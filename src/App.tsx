import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { 
  Package, Boxes, TrendingUp, AlertTriangle, Users, ShoppingCart, 
  LayoutDashboard, Search, Bell, Menu, X, Plus, ChevronRight,
  Loader2, Wallet, Factory, Box, FileText, Upload, CheckCircle2,
  PackageSearch, ShieldAlert, Cpu
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, User, db, collection, query, onSnapshot, orderBy, limit, addDoc, Timestamp, doc, updateDoc } from './lib/firebase';
import { getDemandForecast, getSmartAlerts, analyzeDocument } from './lib/gemini';
import { seedDatabase } from './lib/seed';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  minStockLevel: number;
  currentStock: number;
  price: number;
}

interface Order {
  id: string;
  supplierName: string;
  status: string;
  totalAmount: number;
  createdAt: any;
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inventory', icon: Boxes, label: 'Inventory' },
    { id: 'orders', icon: ShoppingCart, label: 'Orders' },
    { id: 'suppliers', icon: Factory, label: 'Suppliers' },
    { id: 'docai', icon: PackageSearch, label: 'Document AI' },
    { id: 'forecasting', icon: TrendingUp, label: 'AI Forecast' },
  ];

  return (
    <div className="w-60 h-screen bg-[#080808] border-r border-white/5 text-white flex flex-col p-4 fixed overflow-y-auto">
      <div className="flex items-center gap-3 mb-10 px-4 py-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">S</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-white">SmartChain <span className="text-blue-500">AI</span></h1>
      </div>

      <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4 px-4">Management</div>
      <nav className="flex-1 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200",
              activeTab === tab.id 
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <tab.icon size={20} />
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border border-white/20 overflow-hidden">
            {auth.currentUser?.photoURL ? <img src={auth.currentUser.photoURL} alt="Avatar" /> : null}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{auth.currentUser?.displayName || 'User'}</p>
            <p className="text-[10px] text-white/40 truncate">{auth.currentUser?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, trend, trendLabel }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[#111111] border border-white/5 p-6 rounded-2xl shadow-xl group hover:border-white/10 transition-all duration-300"
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-white/40 font-medium">{label}</p>
      <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-white/40">
        <Icon size={18} />
      </div>
    </div>
    <div className="flex items-end gap-3 translate-x-0">
      <h2 className="text-3xl font-light text-white tracking-tight">{value}</h2>
      {trend && (
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full mb-1", trend > 0 ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400")}>
          {trend > 0 ? '+' : ''}{trend}%
          {trendLabel && <span className="ml-1 opacity-60 font-normal italic lowercase">{trendLabel}</span>}
        </span>
      )}
    </div>
    <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div className={cn("h-full transition-all duration-1000", color || "bg-blue-500")} style={{ width: '65%' }}></div>
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [data, setData] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [seeding, setSeeding] = useState(false);
  
  useEffect(() => {
    const unsubProducts = onSnapshot(query(collection(db, 'products'), limit(10)), (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    const unsubSuppliers = onSnapshot(query(collection(db, 'suppliers')), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubOrders = onSnapshot(query(collection(db, 'orders')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubProducts(); unsubSuppliers(); unsubOrders(); };
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDatabase();
    } finally {
      setSeeding(false);
    }
  };

  const totalValue = data.reduce((acc, p) => acc + (p.currentStock * p.price), 0);
  const lowStockCount = data.filter(p => p.currentStock <= p.minStockLevel).length;

  const supplierRiskCount = suppliers.reduce((acc, s) => {
    const activeOrders = orders.filter(o => o.supplierId === s.id && ['pending', 'processing', 'shipped'].includes(o.status));
    const delays = activeOrders.filter(o => {
      const createdDate = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const daysSinceCreation = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCreation > (s.leadTime || 14);
    }).length;
    return acc + (delays > 0 ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-light text-white tracking-tight mb-1">Logistics Overview</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] w-fit">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
            <span className="text-white/60 font-medium">System Status: Active v1.2.0</span>
          </div>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={handleSeed}
             disabled={seeding}
             className="px-4 py-2 bg-white/5 text-white/60 text-xs font-semibold rounded-lg hover:text-white transition-all flex items-center gap-2 border border-white/10"
           >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Load Demo SKUs
          </button>
           <button className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20">
            Export Audit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard label="Inventory Valuation" value={data.length > 0 ? `$${totalValue.toLocaleString()}` : "$0"} icon={Wallet} color="bg-blue-500" trend={data.length > 0 ? 4.2 : null} />
        <StatCard label="Vendor Risk" value={supplierRiskCount > 0 ? `${supplierRiskCount} Delayed` : "Nominal"} icon={Factory} color="bg-red-500" trend={supplierRiskCount} trendLabel="Critical Delays" />
        <StatCard label="AI System Health" value={data.length > 0 ? `${lowStockCount} Alerts` : "Nominal"} icon={AlertTriangle} color="bg-orange-500" trend={lowStockCount > 0 ? -1 : 0} trendLabel={data.length > 0 ? "Requires Action" : "No issues"} />
      </div>

      {data.length === 0 && !seeding && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 p-10 rounded-2xl text-center"
        >
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(37,99,235,0.3)] border border-blue-500/30">
            <Package size={32} className="text-blue-400" />
          </div>
          <h3 className="text-2xl font-light text-white mb-2 tracking-tight">Welcome to SmartChain AI</h3>
          <p className="text-sm text-white/40 max-w-md mx-auto mb-8 font-medium">Your supply chain digital twin is active. Begin by seeding the database with demo units or register your first SKU to activate the AI demand forecasting engine.</p>
          <button 
            onClick={handleSeed}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-600/30 flex items-center gap-3 mx-auto"
          >
            <Plus size={20} />
            Initialize Demo Environment
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111111] border border-white/5 p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-medium">Stock Performance <span className="text-xs font-normal text-white/40 ml-2">Powered by Prophet AI</span></h3>
             <select className="bg-black border border-white/10 rounded px-3 py-1 text-[10px] text-white/40 outline-none uppercase tracking-widest font-bold">
              <option>Next 30 Days</option>
              <option>Next 90 Days</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#444" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="currentStock" stroke="#2563eb" fillOpacity={1} fill="url(#colorStock)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-8 rounded-2xl flex flex-col">
          <h3 className="text-lg font-medium mb-8">Category Spread</h3>
          <div className="flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  stroke="none"
                  paddingAngle={5}
                  dataKey="currentStock"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#2563eb', '#8b5cf6', '#3b82f6', '#1d4ed8'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-6">
            {['Raw Materials', 'Retail', 'Logistics', 'Packaging'].map((name, i) => (
               <div key={name} className="flex items-center gap-2">
                 <div className={cn("w-1.5 h-1.5 rounded-full", i === 0 ? "bg-blue-600" : i === 1 ? "bg-purple-500" : i === 2 ? "bg-blue-400" : "bg-blue-800")} />
                 <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{name}</span>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const Inventory = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', category: '', unit: 'units', minStockLevel: 10, currentStock: 0, price: 0 });

    useEffect(() => {
        const q = query(collection(db, 'products'), orderBy('currentStock', 'asc'));
        return onSnapshot(q, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        });
    }, []);

    const handleAddProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const docRef = await addDoc(collection(db, 'products'), { ...newProduct, updatedAt: Timestamp.now() });
        // Create an initial log
        await addDoc(collection(db, 'inventoryLogs'), {
          productId: docRef.id,
          change: newProduct.currentStock,
          type: 'adjustment',
          timestamp: Timestamp.now(),
          note: 'Initial stock registration'
        });
        setIsAddModalOpen(false);
        setNewProduct({ name: '', category: '', unit: 'units', minStockLevel: 10, currentStock: 0, price: 0 });
      } catch (error) {
        console.error(error);
      }
    };

    const adjustStock = async (productId: string, currentStock: number, adjustment: number) => {
      try {
        const newStock = currentStock + adjustment;
        if (newStock < 0) return;
        
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, { 
          currentStock: newStock,
          updatedAt: Timestamp.now()
        });

        await addDoc(collection(db, 'inventoryLogs'), {
          productId,
          change: adjustment,
          type: adjustment > 0 ? 'purchase' : 'sale',
          timestamp: Timestamp.now(),
          note: `Manual stock adjustment: ${adjustment > 0 ? '+' : ''}${adjustment}`
        });
      } catch (error) {
        console.error(error);
      }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-[#111111] border border-white/5 p-8 rounded-2xl shadow-xl">
                <div>
                     <h2 className="text-3xl font-light tracking-tight text-white">Inventory Management</h2>
                     <p className="text-sm text-white/40 font-medium">Monitoring {products.length} live stock units across distribution.</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-600/20"
                >
                    <Plus size={16} />
                    Register SKU
                </button>
            </div>

            {isAddModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#111111] border border-white/10 p-10 rounded-2xl w-full max-w-lg shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-medium tracking-tight">New Inventory Entry</h3>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleAddProduct} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Item Name</label>
                      <input 
                        type="text" 
                        required
                        className="w-full bg-black border border-white/10 p-3 rounded-lg outline-none focus:border-blue-500 transition-colors" 
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Classification</label>
                        <input 
                          type="text" 
                          required
                          className="w-full bg-black border border-white/10 p-3 rounded-lg outline-none focus:border-blue-500"
                          value={newProduct.category}
                          onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">UOM</label>
                        <input 
                          type="text" 
                          className="w-full bg-black border border-white/10 p-3 rounded-lg outline-none focus:border-blue-500"
                          value={newProduct.unit}
                          onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Qty</label>
                        <input 
                          type="number" 
                          className="w-full bg-black border border-white/10 p-3 rounded-lg outline-none focus:border-blue-500"
                          value={newProduct.currentStock}
                          onChange={e => setNewProduct({...newProduct, currentStock: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Threshold</label>
                        <input 
                          type="number" 
                          className="w-full bg-black border border-white/10 p-3 rounded-lg outline-none focus:border-blue-500"
                          value={newProduct.minStockLevel}
                          onChange={e => setNewProduct({...newProduct, minStockLevel: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Cost ($)</label>
                        <input 
                          type="number" 
                          className="w-full bg-black border border-white/10 p-3 rounded-lg outline-none focus:border-blue-500"
                          value={newProduct.price}
                          onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all mt-4 shadow-lg shadow-blue-600/20">
                      Commit SKU to Database
                    </button>
                  </form>
                </motion.div>
              </div>
            )}

            <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Asset Name</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Classification</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">Stock Level</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Health</th>
                            <th className="px-8 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Market Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <motion.tr 
                              key={p.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                            >
                                <td className="px-8 py-5 font-medium text-white/80 group-hover:text-blue-400 transition-colors">{p.name}</td>
                                <td className="px-8 py-5 text-white/40 text-sm italic">{p.category}</td>
                                <td className="px-8 py-5 text-center">
                                  <div className="flex items-center justify-center gap-3">
                                    <button 
                                      onClick={() => adjustStock(p.id, p.currentStock, -1)}
                                      className="w-6 h-6 rounded flex items-center justify-center border border-white/10 hover:bg-white/5 text-white/40"
                                    >-</button>
                                    <div className="font-mono text-sm font-medium w-12 text-center">
                                      {p.currentStock} <span className="text-white/20 text-[10px] uppercase">{p.unit}</span>
                                    </div>
                                    <button 
                                      onClick={() => adjustStock(p.id, p.currentStock, 1)}
                                      className="w-6 h-6 rounded flex items-center justify-center border border-white/10 hover:bg-white/5 text-white/40"
                                    >+</button>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                    {p.currentStock <= p.minStockLevel ? (
                                        <span className="flex items-center gap-1.5 text-orange-400 text-[10px] font-bold uppercase tracking-widest">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Critical
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-blue-500 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Optimal
                                        </span>
                                    )}
                                </td>
                                <td className="px-8 py-5 text-right font-mono text-sm text-white/60 font-semibold">${(p.currentStock * p.price).toLocaleString()}</td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const Forecasting = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'products'));
    return onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
  }, []);

  const runForecast = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    const product = products.find(p => p.id === selectedProduct);
    // Simulate historical logs
    const mockLogs = [
      { change: -10, timestamp: '2026-02-01' },
      { change: -15, timestamp: '2026-03-01' },
      { change: -12, timestamp: '2026-04-01' },
    ];
    const result = await getDemandForecast(product?.name || '', mockLogs);
    setForecasts(result || []);
    
    // Save to database
    if (result) {
      for (const res of result) {
        await addDoc(collection(db, 'forecasts'), {
          productId: selectedProduct,
          predictedDemand: res.predictedDemand,
          period: res.month,
          confidence: res.confidence,
          insights: res.insights,
          createdAt: Timestamp.now()
        });
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="bg-[#111] border border-[#222] p-8 rounded-[40px] flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Demand Forecasting</h2>
          <p className="text-zinc-500 italic font-medium">Using Gemini-3-Flash for predictive intelligence.</p>
        </div>
        <div className="flex gap-4">
          <select 
            className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl outline-none"
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
          >
            <option value="">Select SKU...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button 
            disabled={loading || !selectedProduct}
            onClick={runForecast}
            className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Analyze Demand"}
          </button>
        </div>
      </div>

      {forecasts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#111] border border-[#222] p-8 rounded-[40px]"
          >
            <h3 className="text-xl font-bold mb-8">Prediction Pipeline</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecasts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="month" stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#555" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                  />
                  <Bar dataKey="predictedDemand" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <div className="space-y-4">
            {forecasts.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#111] border border-[#222] p-6 rounded-3xl flex justify-between items-center"
              >
                <div>
                  <h4 className="text-lg font-bold text-white">{f.month}</h4>
                  <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">{f.insights}</p>
                </div>
                <div className="text-right">
                   <div className="text-2xl font-mono font-black text-orange-500">+{f.predictedDemand}</div>
                   <div className="text-[10px] text-zinc-600 tracking-tighter uppercase font-bold">{(f.confidence * 100).toFixed(0)}% Confidence</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const DocumentAI = () => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    return onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);

    try {
      let text = "";
      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        text = fullText;
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        text = XLSX.utils.sheet_to_txt(worksheet);
      } else {
        text = await file.text();
      }

      const historicalData = products.map(p => ({
        name: p.name,
        price: p.price
      }));

      const analysis = await analyzeDocument(text, historicalData);
      setResult(analysis);
    } catch (error) {
      console.error(error);
      alert("Error processing document. Ensure it's a valid PDF or Excel file.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#111111] border border-white/5 p-8 rounded-2xl shadow-xl flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-white">Document Intelligence</h2>
          <p className="text-sm text-white/40 font-medium">Upload invoices or quotes to compare price delta with historical logs.</p>
        </div>
        <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-500/20">
          <FileText size={24} className="text-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#111111] border border-white/5 p-8 rounded-2xl flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <input 
            type="file" 
            id="doc-upload" 
            className="hidden" 
            accept=".pdf,.xlsx,.xls,.csv,.txt"
            onChange={handleFileUpload}
          />
          
          <label 
            htmlFor="doc-upload"
            className="flex flex-col items-center cursor-pointer relative z-10"
          >
            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-white/10">
              <Upload size={32} className="text-white/40 group-hover:text-blue-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">{file ? file.name : "Select Document"}</h3>
            <p className="text-xs text-white/20 uppercase font-black tracking-widest italic">PDF • EXCEL • CSV</p>
          </label>

          {file && (
            <button 
              onClick={processFile}
              disabled={analyzing}
              className="mt-10 px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 flex items-center gap-3"
            >
              {analyzing ? <Loader2 size={20} className="animate-spin" /> : <PackageSearch size={20} />}
              {analyzing ? "Synthesizing Data..." : "Analyze Price Delta"}
            </button>
          )}
        </div>

        <div className="space-y-6">
          {!result && !analyzing && (
            <div className="h-full border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-white/10 p-12 text-center">
              <FileText size={48} className="mb-4 opacity-50" />
              <p className="text-[10px] uppercase font-black tracking-[0.3em]">Awaiting Data Feed</p>
            </div>
          )}

          {analyzing && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
              ))}
            </div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-2xl border border-blue-500/20 p-6">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">Executive Summary</h4>
                <p className="text-sm leading-relaxed text-white/80 italic mb-4">
                  "{result.summary}"
                </p>
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <p className="text-xs font-medium text-white/60">{result.recommendation}</p>
                </div>
              </div>

              <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Item</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">New vs Old</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-white/30 uppercase tracking-widest text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.comparisons.map((c: any, i: number) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-white/80">{c.itemName}</p>
                          <p className="text-[10px] text-white/30 uppercase font-bold">{c.status}</p>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs">
                          <span className="text-blue-400">${c.extractedPrice}</span>
                          <span className="mx-2 text-white/10">|</span>
                          <span className="text-white/30">${c.historicalPrice}</span>
                        </td>
                        <td className={cn(
                          "px-6 py-4 text-right font-mono text-xs font-bold",
                          c.changePercent > 0 ? "text-orange-400" : c.changePercent < 0 ? "text-green-400" : "text-white/40"
                        )}>
                          {c.changePercent > 0 ? '+' : ''}{c.changePercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ supplierId: '', amount: 0 });

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const sq = query(collection(db, 'suppliers'));
    
    const unsubOrders = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubSuppliers = onSnapshot(sq, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubOrders(); unsubSuppliers(); };
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.supplierId) return;
    
    try {
      await addDoc(collection(db, 'orders'), {
        supplierId: newOrder.supplierId,
        status: 'pending',
        totalAmount: newOrder.amount,
        items: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setIsModalOpen(false);
      setNewOrder({ supplierId: '', amount: 0 });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'delivered',
        deliveredAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-[#111111] border border-white/5 p-8 rounded-2xl shadow-xl">
          <div>
              <h2 className="text-3xl font-light tracking-tight text-white">Purchase Orders</h2>
              <p className="text-sm text-white/40 font-medium">Tracking {orders.length} active multi-warehouse shipments.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-600/20"
          >
              <ShoppingCart size={16} />
              Provision Order
          </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111111] border border-white/10 p-10 rounded-2xl w-full max-w-md shadow-2xl"
          >
            <h3 className="text-xl font-medium mb-6">Create Purchase Order</h3>
            <form onSubmit={handleCreateOrder} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Select Vendor</label>
                <select 
                  className="w-full bg-black border border-white/10 p-3 rounded-lg outline-none focus:border-blue-500"
                  value={newOrder.supplierId}
                  onChange={e => setNewOrder({...newOrder, supplierId: e.target.value})}
                  required
                >
                  <option value="">Choose Supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Order Value ($)</label>
                <input 
                  type="number" 
                  className="w-full bg-black border border-white/10 p-3 rounded-lg outline-none focus:border-blue-500"
                  value={newOrder.amount}
                  onChange={e => setNewOrder({...newOrder, amount: Number(e.target.value)})}
                  required
                />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white/5 text-white/40 font-bold rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20">Submit PO</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {orders.length === 0 ? (
          <div className="py-20 text-center text-white/20 italic font-bold tracking-widest uppercase text-[10px] border border-dashed border-white/5 rounded-2xl">
            No active order cycles detected.
          </div>
        ) : (
          orders.map(o => (
            <div key={o.id} className="bg-[#111111] border border-white/5 p-6 rounded-2xl flex items-center justify-between hover:border-white/10 transition-all group">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-white/30 group-hover:text-blue-400 group-hover:border-blue-500/20 transition-all">
                  <Box size={24} />
                </div>
                <div>
                  <h4 className="font-medium text-white/80 mb-1 tracking-tight">Order Identification: #{o.id.slice(-6).toUpperCase()}</h4>
                  <p className="text-[10px] text-white/30 uppercase font-black font-mono tracking-tighter">Vendor-Ref: {o.supplierId.slice(0, 8)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-12 text-right">
                <div>
                   <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1">Logistics status</p>
                   <div className="flex items-center gap-2">
                     <span className={cn(
                       "text-[10px] font-black uppercase px-3 py-1 rounded-full",
                       o.status === 'delivered' ? "text-green-400 bg-green-500/10 border border-green-500/20" : "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                     )}>
                       {o.status}
                     </span>
                     {o.status !== 'delivered' && (
                       <button 
                         onClick={() => handleDeliverOrder(o.id)}
                         className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[8px] font-bold text-white/40 hover:text-green-400 hover:border-green-500/20 transition-all hover:bg-green-500/5 uppercase"
                       >
                         Confirm
                       </button>
                     )}
                   </div>
                </div>
                <div className="min-w-[120px]">
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1 text-right">Transaction Value</p>
                  <p className="text-xl font-mono font-light text-white tracking-tighter">${o.totalAmount.toLocaleString()}</p>
                </div>
                <ChevronRight className="text-white/10" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const unsubSuppliers = onSnapshot(query(collection(db, 'suppliers')), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubOrders = onSnapshot(query(collection(db, 'orders')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubSuppliers(); unsubOrders(); };
  }, []);

  const getSupplierAlerts = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return [];
    
    const activeOrders = orders.filter(o => o.supplierId === supplierId && ['pending', 'processing', 'shipped'].includes(o.status));
    const alerts: any[] = [];

    activeOrders.forEach(order => {
      const createdDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const daysSinceCreation = Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceCreation > (supplier.leadTime || 14)) {
        alerts.push({
          type: 'error',
          message: `Order #${order.id.slice(-4)} exceeds lead time by ${daysSinceCreation - supplier.leadTime} days.`
        });
      } else if (daysSinceCreation > (supplier.leadTime * 0.8)) {
        alerts.push({
          type: 'warning',
          message: `Order #${order.id.slice(-4)} approaching lead time limit.`
        });
      }
    });

    return alerts;
  };

  const getSupplierPerformance = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return { onTimeRate: 0, avgAdherence: 0, totalDelivered: 0 };

    const deliveredOrders = orders.filter(o => o.supplierId === supplierId && o.status === 'delivered' && o.deliveredAt && o.createdAt);
    if (deliveredOrders.length === 0) return { onTimeRate: 100, avgAdherence: 100, totalDelivered: 0 };

    let onTimeCount = 0;
    let totalAdherence = 0;

    deliveredOrders.forEach(order => {
      const created = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const delivered = order.deliveredAt.toDate ? order.deliveredAt.toDate() : new Date(order.deliveredAt);
      const actualLeadTime = Math.ceil((delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      
      const expectedLeadTime = supplier.leadTime || 14;
      if (actualLeadTime <= expectedLeadTime) {
        onTimeCount++;
      }
      totalAdherence += (expectedLeadTime / Math.max(actualLeadTime, 1)) * 100;
    });

    return {
      onTimeRate: Math.round((onTimeCount / deliveredOrders.length) * 100),
      avgAdherence: Math.round(totalAdherence / deliveredOrders.length),
      totalDelivered: deliveredOrders.length
    };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(s => {
          const alerts = getSupplierAlerts(s.id);
          const hasCritical = alerts.some(a => a.type === 'error');
          const performance = getSupplierPerformance(s.id);
          
          return (
            <div key={s.id} className={cn(
              "bg-[#111111] border p-8 rounded-2xl hover:border-white/20 transition-all group shadow-xl relative overflow-hidden",
              hasCritical ? "border-red-500/30" : "border-white/5"
            )}>
              {hasCritical && <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 blur-2xl -mr-12 -mt-12" />}
              
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 bg-white/5 border border-white/5 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Factory size={20} className={cn("text-white/40", hasCritical && "text-red-500")} />
                </div>
                {alerts.length > 0 && (
                  <div className="flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                    <AlertTriangle size={10} />
                    {alerts.length} Alerts
                  </div>
                )}
              </div>

              <h3 className="text-lg font-medium text-white mb-1 tracking-tight">{s.name}</h3>
              <p className="text-xs text-white/30 mb-6 font-mono tracking-tighter">{s.email}</p>
              
              {/* Performance Metrics Section */}
              <div className="grid grid-cols-2 gap-3 mb-6 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                <div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">On-Time Rate</p>
                  <p className={cn(
                    "text-lg font-mono font-bold tracking-tighter",
                    performance.onTimeRate >= 90 ? "text-green-400" : performance.onTimeRate >= 70 ? "text-orange-400" : "text-red-400"
                  )}>
                    {performance.onTimeRate}%
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Lead Adherence</p>
                  <p className={cn(
                    "text-lg font-mono font-bold tracking-tighter",
                    performance.avgAdherence >= 90 ? "text-blue-400" : "text-white/60"
                  )}>
                    {performance.avgAdherence}%
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {alerts.map((a, i) => (
                  <div key={i} className={cn(
                    "p-2 rounded border text-[10px] font-medium flex gap-2",
                    a.type === 'error' ? "bg-red-500/5 border-red-500/10 text-red-400" : "bg-orange-500/5 border-orange-500/10 text-orange-400"
                  )}>
                    <div className="mt-0.5 shrink-0">
                      {a.type === 'error' ? <X size={10} /> : <AlertTriangle size={10} />}
                    </div>
                    {a.message}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {s.categories?.map((c: string) => (
                  <span key={c} className="text-[9px] font-black px-2 py-0.5 bg-white/5 border border-white/5 rounded text-white/40 uppercase tracking-widest">{c}</span>
                ))}
              </div>
              
              <div className="pt-6 border-t border-white/5 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                <span className="text-white/20">SLA Cycle: <span className="text-blue-500">{s.leadTime}D</span></span>
                <ChevronRight size={14} className="text-white/10" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError("This domain is not authorized in Firebase. Please add this URL to 'Authorized Domains' in your Firebase Console.");
      } else {
        setLoginError(error.message || "Login failed. Please check your connection.");
      }
    }
  };

  const diagnostics = {
    domain: window.location.hostname,
    firebase: !!db,
    gemini: !!process.env.GEMINI_API_KEY,
    protocol: window.location.protocol,
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-[10px] uppercase font-black tracking-[0.4em] text-white/20">Initializing SmartChain AI</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md bg-[#111]/80 backdrop-blur-xl border border-white/10 p-12 rounded-[50px] shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-blue-600/20 rotate-12 transition-transform">
            <Package size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">SmartChain <span className="text-blue-500">AI</span></h1>
          <p className="text-sm text-white/40 mb-10 font-medium leading-relaxed italic">
            Enterprise supply chain intelligence powered by neural inventory logic.
          </p>

          {loginError && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-left"
            >
              <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-400 font-medium leading-relaxed">{loginError}</p>
            </motion.div>
          )}

          <button 
            onClick={handleLogin}
            className="w-full py-5 bg-white hover:bg-zinc-200 text-black font-bold rounded-3xl transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] group shadow-xl"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Access Terminal
          </button>

          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full mt-6 py-2 text-[10px] uppercase font-black tracking-widest text-white/20 hover:text-white/40 transition-colors flex items-center justify-center gap-2"
          >
            <Cpu size={12} />
            System Diagnostics
          </button>

          <AnimatePresence>
            {showDiagnostics && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-white/5 space-y-3 overflow-hidden text-[10px] font-mono text-left text-white/30"
              >
                <div className="flex justify-between">
                  <span>DEPLOYMENT NODE:</span>
                  <span className="text-blue-400 uppercase">{diagnostics.domain}</span>
                </div>
                <div className="flex justify-between">
                  <span>FIREBASE CORE:</span>
                  <span className={diagnostics.firebase ? "text-green-500" : "text-red-500"}>{diagnostics.firebase ? "STABLE" : "DISCONNECTED"}</span>
                </div>
                <div className="flex justify-between">
                  <span>GEMINI API KEY:</span>
                  <span className={diagnostics.gemini ? "text-green-500" : "text-red-500"}>{diagnostics.gemini ? "VALIDATED" : "MISSING"}</span>
                </div>
                <div className="flex justify-between">
                  <span>SSL HANDSHAKE:</span>
                  <span className={diagnostics.protocol === 'https:' ? "text-green-500" : "text-orange-500"}>{diagnostics.protocol === 'https:' ? "SECURE" : "UNSECURE"}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="pl-60 min-h-screen flex flex-col">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-10 bg-[#0A0A0A] sticky top-0 z-40">
          <div className="flex items-center gap-3">
             <div className="flex-1 max-w-xl relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Query SKU database, supplier metadata, or AI predictions..." 
                className="w-[400px] bg-white/[0.03] border border-white/5 px-10 py-1.5 rounded-lg outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all font-medium text-xs tracking-tight placeholder:text-white/20 placeholder:italic"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] text-white/60">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"></span>
              <span>API Terminal v1.0.4</span>
            </div>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 text-white/20 hover:text-white transition-colors relative">
              <Bell size={16} />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full border-2 border-[#0A0A0A]" />
            </button>
             <button 
              onClick={() => auth.signOut()}
              className="text-[10px] font-black text-white/20 hover:text-rose-500 transition-colors uppercase tracking-[0.2em]"
            >
              Secure Exit
            </button>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'inventory' && <Inventory />}
              {activeTab === 'forecasting' && <Forecasting />}
              {activeTab === 'suppliers' && <Suppliers />}
              {activeTab === 'orders' && <Orders />}
              {activeTab === 'docai' && <DocumentAI />}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="h-8 border-t border-white/5 bg-[#080808] px-10 flex items-center justify-between text-[10px] text-white/20 mt-10">
          <div className="flex gap-4 font-bold uppercase tracking-widest">
            <span>Core: <span className="text-white/40">SC-NODE-332</span></span>
            <span>Database: <span className="text-green-500">Connected (Firebase Enterprise)</span></span>
          </div>
          <div className="flex gap-6 font-bold uppercase tracking-widest">
            <span className="animate-pulse text-blue-500">ML Forecast Engine: Online</span>
            <span>v1.2.0-STABLE</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
