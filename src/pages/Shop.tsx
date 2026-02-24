import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  ShoppingCart,
  ArrowRight,
  Star,
  Zap,
  Plus
} from "lucide-react";
import { InventoryItem } from "../types";
import { motion, AnimatePresence } from "motion/react";

import { useNavigate } from "react-router-dom";

export default function Shop() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetch("/api/inventory", {
      headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` }
    })
    .then(res => res.json())
    .then(data => {
      setItems(data);
      setLoading(false);
    });

    // Load cart from session if exists
    const savedCart = sessionStorage.getItem("visionx_cart");
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  const addToCart = (item: InventoryItem) => {
    if (item.stock <= 0) return;
    const newCart = [...cart, item];
    setCart(newCart);
    sessionStorage.setItem("visionx_cart", JSON.stringify(newCart));
  };

  const goToBilling = () => {
    navigate("/billing");
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === "all" || item.type === filter;
    const matchesSearch = item.brand.toLowerCase().includes(search.toLowerCase()) || 
                         item.model.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Optical Shop</h1>
          <p className="text-slate-400 mt-1">Premium frames, lenses, and optical accessories.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-64"
            />
          </div>
          <button 
            onClick={goToBilling}
            className="glass p-2.5 rounded-xl relative hover:bg-white/10 transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'frame', 'sunglasses', 'lens', 'accessory'].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-6 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap transition-all ${
              filter === t ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {t === 'frame' ? 'Specs/Frames' : t === 'all' ? 'All Products' : t + 's'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass-card h-80 animate-pulse bg-white/5"></div>
            ))
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card group flex flex-col h-full"
              >
                <div className="relative aspect-[4/3] mb-4 bg-slate-900/50 rounded-xl overflow-hidden flex items-center justify-center">
                  <img 
                    src={`https://picsum.photos/seed/${item.brand}${item.model}/400/300`} 
                    alt={item.model}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500 opacity-60"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10">
                      {item.type}
                    </span>
                  </div>
                  {item.stock < 5 && (
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 backdrop-blur-md rounded-lg text-[10px] font-bold uppercase tracking-widest border border-amber-500/30 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Low Stock
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{item.brand}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-bold">4.8</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg leading-tight">{item.model}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    Premium quality {item.type} designed for comfort and style. Part of our exclusive VisionX collection.
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
                  <p className="text-xl font-black text-white">${item.price}</p>
                  <button 
                    onClick={() => addToCart(item)}
                    disabled={item.stock <= 0}
                    className="gradient-bg p-2.5 rounded-xl shadow-lg shadow-cyan-500/20 hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center opacity-50">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-bold">No products found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="glass-card bg-gradient-to-r from-cyan-500/10 to-violet-500/10 p-8 rounded-3xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-cyan-500/20 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold mb-4">Need a Professional Eye Test?</h2>
            <p className="text-slate-400">
              Our AI-powered diagnostic system can analyze your vision in seconds. Get a digital prescription and shop with confidence.
            </p>
            <button className="mt-6 flex items-center gap-2 font-bold text-cyan-400 hover:text-cyan-300 transition-colors group">
              Start AI Diagnosis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="w-32 h-32 gradient-bg rounded-3xl flex items-center justify-center shadow-2xl shadow-cyan-500/20 group-hover:rotate-12 transition-transform duration-500">
            <Eye className="w-16 h-16 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
