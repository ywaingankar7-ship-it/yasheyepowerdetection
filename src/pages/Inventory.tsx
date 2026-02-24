import React, { useState, useEffect } from "react";
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  AlertCircle,
  TrendingDown
} from "lucide-react";
import { InventoryItem } from "../types";
import { motion, AnimatePresence } from "motion/react";

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({
    brand: "",
    model: "",
    type: "frame",
    price: 0,
    stock: 0
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = () => {
    fetch("/api/inventory", {
      headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` }
    })
    .then(res => res.json())
    .then(data => {
      setItems(data);
      setLoading(false);
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("visionx_token")}` 
        },
        body: JSON.stringify(newItem),
      });
      if (response.ok) {
        fetchInventory();
        setShowModal(false);
        setNewItem({ brand: "", model: "", type: "frame", price: 0, stock: 0 });
      }
    } catch (err) {
      alert("Failed to add item");
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = (item.brand + " " + item.model).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-slate-400 mt-1">Manage frames, lenses, and optical equipment stock.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="gradient-bg px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" />
          Add New Item
        </button>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-md relative z-10"
            >
              <h2 className="text-2xl font-bold mb-6">Add Inventory Item</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Brand</label>
                    <input 
                      required
                      value={newItem.brand}
                      onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="e.g. Ray-Ban"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Model</label>
                    <input 
                      required
                      value={newItem.model}
                      onChange={(e) => setNewItem({ ...newItem, model: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="e.g. Aviator"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Type</label>
                  <select 
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="frame">Frames (Specs)</option>
                    <option value="sunglasses">Sunglasses</option>
                    <option value="lens">Lenses</option>
                    <option value="accessory">Accessory</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Price ($)</label>
                    <input 
                      type="number"
                      required
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Stock Quantity</label>
                    <input 
                      type="number"
                      required
                      value={newItem.stock}
                      onChange={(e) => setNewItem({ ...newItem, stock: parseInt(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 gradient-bg rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    Add to Inventory
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Items</p>
            <h3 className="text-xl font-bold">{items.length}</h3>
          </div>
        </div>
        <div className="glass-card flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Low Stock</p>
            <h3 className="text-xl font-bold">{items.filter(i => i.stock < 5).length}</h3>
          </div>
        </div>
        <div className="glass-card flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Out of Stock</p>
            <h3 className="text-xl font-bold">{items.filter(i => i.stock === 0).length}</h3>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by brand or model..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent text-sm focus:outline-none py-2"
              >
                <option value="all">All Types</option>
                <option value="frame">Frames</option>
                <option value="sunglasses">Sunglasses</option>
                <option value="lens">Lenses</option>
                <option value="accessory">Accessories</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-widest text-slate-500 border-b border-white/10">
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8 h-12 bg-white/5"></td>
                  </tr>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{item.brand}</p>
                          <p className="text-xs text-slate-500">{item.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        item.type === 'frame' ? 'bg-blue-400/10 text-blue-400' : 'bg-violet-400/10 text-violet-400'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">${item.price.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{item.stock}</span>
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.stock > 10 ? 'bg-emerald-500' : item.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(item.stock * 5, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.stock > 10 ? (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> In Stock
                        </span>
                      ) : item.stock > 0 ? (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Low Stock
                        </span>
                      ) : (
                        <span className="text-xs text-rose-400 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-400 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-rose-400/10 rounded-lg text-slate-400 hover:text-rose-400 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <Package className="w-12 h-12" />
                      <p>No inventory items found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
