import React, { useState, useEffect } from "react";
import { 
  Receipt, 
  Plus, 
  Search, 
  Trash2, 
  Download, 
  CreditCard, 
  User, 
  Package,
  CheckCircle2,
  Printer
} from "lucide-react";
import { Customer, InventoryItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function Billing() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/customers", { headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` } }).then(res => res.json()),
      fetch("/api/inventory", { headers: { Authorization: `Bearer ${localStorage.getItem("visionx_token")}` } }).then(res => res.json())
    ]).then(([custData, invData]) => {
      setCustomers(custData);
      setInventory(invData);
      setLoading(false);
    });

    // Load cart from shop if exists
    const savedCart = sessionStorage.getItem("visionx_cart");
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      setCart(parsedCart.map((item: any) => ({ ...item, cartId: Math.random() })));
      sessionStorage.removeItem("visionx_cart"); // Clear after loading
    }
  }, []);

  const addToCart = (item: InventoryItem) => {
    if (item.stock <= 0) return alert("Out of stock");
    setCart(prev => [...prev, { ...item, cartId: Date.now() }]);
  };

  const removeFromCart = (cartId: number) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (!selectedCustomer || cart.length === 0) return;

    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("visionx_token")}` 
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          total,
          items: cart
        }),
      });

      if (response.ok) {
        setSuccess(true);
        generateInvoicePDF();
        setCart([]);
        setSelectedCustomer(null);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      alert("Checkout failed");
    }
  };

  const generateInvoicePDF = () => {
    const doc = new jsPDF() as any;
    const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("VISIONX AI OPTICAL", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("CLINICAL-GRADE OPTICAL ERP", 20, 32);
    
    doc.setTextColor(255, 255, 255);
    doc.text("GST NO: 29AAAAA0000A1Z5", 140, 25);
    doc.text("LICENSE: OPT-99283-X", 140, 32);

    // Company Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text("123 Vision Tech Park, Suite 400", 20, 50);
    doc.text("Optic City, KA 560001", 20, 55);
    doc.text("Phone: +91 98765 43210", 20, 60);
    doc.text("Email: billing@visionx.ai", 20, 65);

    // Invoice Meta
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE DETAILS", 140, 50);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice #: ${invoiceNo}`, 140, 55);
    doc.text(`Date: ${date}`, 140, 60);
    doc.text(`Time: ${time}`, 140, 65);

    doc.line(20, 75, 190, 75);

    // Customer Info
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 20, 85);
    doc.setFontSize(14);
    doc.text(selectedCustomer?.name || "Walk-in Customer", 20, 93);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Email: ${selectedCustomer?.email || "N/A"}`, 20, 100);
    doc.text(`Phone: ${selectedCustomer?.phone || "N/A"}`, 20, 105);
    doc.text(`Address: ${selectedCustomer?.address || "N/A"}`, 20, 110);

    const tableData = cart.map((item, i) => [
      i + 1,
      `${item.brand} ${item.model}`,
      item.type.toUpperCase(),
      `$${item.price.toFixed(2)}`,
      "1",
      `$${item.price.toFixed(2)}`
    ]);

    (doc as any).autoTable({
      startY: 120,
      head: [["#", "Item Description", "Category", "Unit Price", "Qty", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "center" },
        5: { halign: "right" }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Summary Box
    doc.setFillColor(248, 250, 252);
    doc.rect(130, finalY - 5, 60, 35, "F");
    
    doc.setFont("helvetica", "normal");
    doc.text(`Subtotal:`, 135, finalY + 5);
    doc.text(`$${subtotal.toFixed(2)}`, 185, finalY + 5, { align: "right" });
    
    doc.text(`GST (18%):`, 135, finalY + 12);
    doc.text(`$${tax.toFixed(2)}`, 185, finalY + 12, { align: "right" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`GRAND TOTAL:`, 135, finalY + 22);
    doc.text(`$${total.toFixed(2)}`, 185, finalY + 22, { align: "right" });

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("Terms & Conditions:", 20, 270);
    doc.text("1. Goods once sold will not be taken back.", 20, 275);
    doc.text("2. Warranty as per manufacturer policy.", 20, 280);
    
    doc.setFont("helvetica", "bold");
    doc.text("Authorized Signatory", 160, 275);
    doc.line(150, 270, 190, 270);

    doc.save(`invoice-${selectedCustomer?.name || "customer"}-${invoiceNo}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing & Invoicing</h1>
            <p className="text-slate-400 mt-1">Create new invoices, manage sales, and process payments.</p>
          </div>
          <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center">
            <Receipt className="text-cyan-400 w-6 h-6" />
          </div>
        </div>

        <div className="glass-card">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            1. Select Customer
          </h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none"
              onChange={(e) => setSelectedCustomer(customers.find(c => c.id === parseInt(e.target.value)) || null)}
              value={selectedCustomer?.id || ""}
            >
              <option value="">-- Select a Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </div>
        </div>

        <div className="glass-card">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            2. Add Items to Invoice
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {inventory.map(item => (
              <button 
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.stock <= 0}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-left group disabled:opacity-50"
              >
                <div>
                  <p className="font-bold text-sm">{item.brand} {item.model}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">{item.type} • Stock: {item.stock}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-cyan-400">${item.price}</p>
                  <Plus className="w-4 h-4 ml-auto mt-1 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="glass-card sticky top-28 flex flex-col h-[calc(100vh-140px)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Order Summary</h3>
            <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-lg text-[10px] font-bold">{cart.length} Items</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <motion.div 
                    key={item.cartId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group"
                  >
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm truncate">{item.brand} {item.model}</p>
                      <p className="text-xs text-slate-500">${item.price}</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.cartId)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                  <Package className="w-12 h-12" />
                  <p className="text-sm">Your cart is empty</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-3 pt-6 border-t border-white/10">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-mono font-bold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Tax (18% GST)</span>
              <span className="font-mono font-bold">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-black pt-3 border-t border-white/5">
              <span className="gradient-text">Total</span>
              <span className="text-white">${total.toFixed(2)}</span>
            </div>

            <div className="pt-6 space-y-3">
              <button 
                onClick={handleCheckout}
                disabled={!selectedCustomer || cart.length === 0 || success}
                className="w-full gradient-bg py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
              >
                {success ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Complete Checkout
                  </>
                )}
              </button>
              <button 
                onClick={generateInvoicePDF}
                disabled={cart.length === 0}
                className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Printer className="w-5 h-5" />
                Print Draft Invoice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
