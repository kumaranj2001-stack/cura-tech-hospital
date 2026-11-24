import React, { useState } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import type { PhysioItem, PhysioSale } from "../store/types";
import {
  Activity,
  ShoppingBag,
  RotateCcw,
  Truck,
  FilePlus,
  RefreshCw,
  Edit,
  FileText,
  Receipt,
  Layers,
  FileSpreadsheet,
  Landmark,
  Settings,
  Briefcase,
  Search,
  Plus,
  Trash2,
  Printer,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const INITIAL_PHYSIO_ITEMS: PhysioItem[] = [
  { id: "PHY-001", name: "Cervical Collar (Soft Firm - Medium)", category: "Support & Braces", price: 650, stock: 32, reorderLevel: 10, unit: "Pcs" },
  { id: "PHY-002", name: "Lumbo-Sacral (L.S.) Support Belt (Large)", category: "Support & Braces", price: 1450, stock: 24, reorderLevel: 8, unit: "Pcs" },
  { id: "PHY-003", name: "TENS Digital Electrode Gel Pads (Set of 4)", category: "Electrotherapy Acc", price: 380, stock: 85, reorderLevel: 25, unit: "Sets" },
  { id: "PHY-004", name: "TheraBand Resistance Loop Band (Heavy Blue)", category: "Resistance & Exercise", price: 520, stock: 45, reorderLevel: 15, unit: "Pcs" },
  { id: "PHY-005", name: "Swiss Balance Ball (65 cm with Pump)", category: "Resistance & Exercise", price: 1200, stock: 12, reorderLevel: 5, unit: "Pcs" },
  { id: "PHY-006", name: "Ultrasound Therapy Transmission Gel (5 Litre Can)", category: "Therapy Modality", price: 850, stock: 18, reorderLevel: 6, unit: "Cans" },
  { id: "PHY-007", name: "Hinged Knee Brace with Dual Side Stabilizer", category: "Support & Braces", price: 1850, stock: 15, reorderLevel: 5, unit: "Pcs" },
  { id: "PHY-008", name: "Reusable Hot & Cold Gel Compress Pack", category: "Therapy Modality", price: 290, stock: 60, reorderLevel: 20, unit: "Pcs" },
];

const INITIAL_PHYSIO_SALES: PhysioSale[] = [
  {
    id: "PS-2026-001",
    billNumber: "PHY-BILL-1001",
    patientId: "P-101",
    patientName: "K. Rajeshwari",
    patientUhid: "UHID-2026-0012",
    items: [
      { itemId: "PHY-002", name: "Lumbo-Sacral (L.S.) Support Belt (Large)", qty: 1, price: 1450, total: 1450 },
      { itemId: "PHY-008", name: "Reusable Hot & Cold Gel Compress Pack", qty: 2, price: 290, total: 580 },
    ],
    subtotal: 2030,
    discount: 100,
    total: 1930,
    paymentMode: "UPI",
    date: new Date().toISOString().split("T")[0],
    attendedBy: "Dr. K. Senthil, PT",
  },
  {
    id: "PS-2026-002",
    billNumber: "PHY-BILL-1002",
    patientId: "P-104",
    patientName: "M. Abdul Rahim",
    patientUhid: "UHID-2026-0015",
    items: [
      { itemId: "PHY-003", name: "TENS Digital Electrode Gel Pads (Set of 4)", qty: 2, price: 380, total: 760 },
      { itemId: "PHY-004", name: "TheraBand Resistance Loop Band (Heavy Blue)", qty: 1, price: 520, total: 520 },
    ],
    subtotal: 1280,
    discount: 0,
    total: 1280,
    paymentMode: "Cash",
    date: new Date().toISOString().split("T")[0],
    attendedBy: "Dr. K. Senthil, PT",
  },
];

const PHYSIO_VENDORS = [
  { id: "V-PHY-1", name: "Apex Ortho & Rehabilitation Supplies", contact: "+91 94440 11223", city: "Chennai", gstin: "33AABCA1234F1Z1" },
  { id: "V-PHY-2", name: "TheraHealth Electro-Med Equipment Corp", contact: "+91 94441 22334", city: "Bengaluru", gstin: "29AABCT5678F1Z2" },
  { id: "V-PHY-3", name: "ProActive Physio & Mobility Care", contact: "+91 94442 33445", city: "Coimbatore", gstin: "33AABCP9012F1Z3" },
];

export const PhysiotherapyERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "physio_sales", dropdownOption }) => {
  const { patients, currentUser } = useStore();

  const [activeTab, setActiveTab] = useState<string>(initialAction || "physio_sales");
  const [items, setItems] = useState<PhysioItem[]>(INITIAL_PHYSIO_ITEMS);
  const [sales, setSales] = useState<PhysioSale[]>(INITIAL_PHYSIO_SALES);
  const [vendors] = useState(PHYSIO_VENDORS);

  // New Sale POS State
  const [salePatientName, setSalePatientName] = useState("");
  const [salePatientUhid, setSalePatientUhid] = useState("");
  const [cart, setCart] = useState<{ item: PhysioItem; qty: number }[]>([]);
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Card">("Cash");
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "Support & Braces" as PhysioItem["category"],
    price: 500,
    stock: 20,
    reorderLevel: 5,
    unit: "Pcs",
  });
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<PhysioSale | null>(null);

  React.useEffect(() => {
    if (initialAction) setActiveTab(initialAction);
  }, [initialAction]);

  const addToCart = (item: PhysioItem) => {
    const existing = cart.find((c) => c.item.id === item.id);
    if (existing) {
      if (existing.qty >= item.stock) {
        flashToast(`Cannot exceed available stock (${item.stock} ${item.unit})`, "warning");
        return;
      }
      setCart(cart.map((c) => (c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      if (item.stock < 1) {
        flashToast("Item is out of stock", "error");
        return;
      }
      setCart([...cart, { item, qty: 1 }]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((c) => c.item.id !== itemId));
  };

  const updateCartQty = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    const item = items.find((i) => i.id === itemId);
    if (item && qty > item.stock) {
      flashToast(`Maximum available stock is ${item.stock}`, "warning");
      return;
    }
    setCart(cart.map((c) => (c.item.id === itemId ? { ...c, qty } : c)));
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  const cartTotal = Math.max(0, cartSubtotal - discountAmount);

  const handleCheckoutSale = () => {
    if (cart.length === 0) {
      flashToast("Please add items to cart before checkout", "warning");
      return;
    }
    const newSale: PhysioSale = {
      id: `PS-${Date.now().toString().slice(-4)}`,
      billNumber: `PHY-BILL-${1000 + sales.length + 1}`,
      patientId: `P-${Date.now().toString().slice(-3)}`,
      patientName: salePatientName.trim() || "Walk-In Patient",
      patientUhid: salePatientUhid.trim() || "UHID-WALKIN",
      items: cart.map((c) => ({
        itemId: c.item.id,
        name: c.item.name,
        qty: c.qty,
        price: c.item.price,
        total: c.item.price * c.qty,
      })),
      subtotal: cartSubtotal,
      discount: discountAmount,
      total: cartTotal,
      paymentMode,
      date: new Date().toISOString().split("T")[0],
      attendedBy: currentUser?.name || "Attending Physiotherapist",
    };

    // Deduct stock
    setItems(
      items.map((i) => {
        const found = cart.find((c) => c.item.id === i.id);
        if (found) {
          return { ...i, stock: i.stock - found.qty };
        }
        return i;
      })
    );

    setSales([newSale, ...sales]);
    flashToast(`Physiotherapy Sale Bill #${newSale.billNumber} created successfully!`, "success");
    setSelectedSaleForPrint(newSale);
    // Reset cart
    setCart([]);
    setSalePatientName("");
    setSalePatientUhid("");
    setDiscountAmount(0);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name) return;
    const created: PhysioItem = {
      id: `PHY-${(items.length + 1).toString().padStart(3, "0")}`,
      name: newItem.name,
      category: newItem.category,
      price: Number(newItem.price) || 100,
      stock: Number(newItem.stock) || 0,
      reorderLevel: Number(newItem.reorderLevel) || 5,
      unit: newItem.unit,
    };
    setItems([...items, created]);
    flashToast(`Item '${created.name}' added to Master Catalog`, "success");
    setShowItemModal(false);
    setNewItem({
      name: "",
      category: "Support & Braces",
      price: 500,
      stock: 20,
      reorderLevel: 5,
      unit: "Pcs",
    });
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* ── Header Ribbon Bar Notice ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Physiotherapy & Rehabilitation ERP
              {dropdownOption && <Badge variant="info">{dropdownOption}</Badge>}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Point of Sale, Orthotic Appliances, Electrotherapy Consumables & Stock Control
            </p>
          </div>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab("physio_sales")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "physio_sales" || activeTab === "physio_sale_return"
                ? "bg-teal-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Sales POS
          </button>
          <button
            onClick={() => setActiveTab("physio_purchase_stock")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab.includes("purchase") || activeTab === "physio_stock_update"
                ? "bg-teal-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Stock & Purchase
          </button>
          <button
            onClick={() => setActiveTab("physio_eod")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab.includes("eod") || activeTab.includes("report") || activeTab === "physio_sales_by_bill" || activeTab === "physio_stock_avail"
                ? "bg-teal-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab("physio_item_master")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "physio_item_master" || activeTab === "physio_vendor_master"
                ? "bg-teal-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Masters
          </button>
        </div>
      </div>

      {/* ── 1. SALES POS MODULE ── */}
      {(activeTab === "physio_sales" || activeTab === "physio_sale_return") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Item Selector (2 columns on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardHeader className="py-2.5 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-teal-600" />
                  Available Rehabilitation Inventory
                </h3>
                <span className="text-[11px] text-slate-500">{items.length} items cataloged</span>
              </CardHeader>
              <CardBody className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-teal-400 dark:hover:border-teal-500 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 leading-snug">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            {item.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.category}</div>
                      </div>

                      <div className="mt-3 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-sm font-extrabold text-teal-700 dark:text-teal-400 font-mono">
                            ₹{item.price}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            Stock: <strong className={item.stock <= item.reorderLevel ? "text-rose-500" : "text-slate-600 dark:text-slate-300"}>{item.stock}</strong> {item.unit}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          disabled={item.stock <= 0}
                          className="text-xs py-1 px-2.5 bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Cart & Billing Checkout (1 column) */}
          <div className="space-y-3">
            <Card className="border-teal-200 dark:border-teal-900 shadow-sm">
              <CardHeader className="py-2.5 bg-teal-50/60 dark:bg-teal-950/40">
                <h3 className="font-bold text-xs text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-teal-600" />
                  Point of Sale Bill & Checkout
                </h3>
              </CardHeader>
              <CardBody className="p-3 space-y-3 text-xs">
                <div>
                  <Label>Patient Name</Label>
                  <Input
                    placeholder="Patient / Buyer Name"
                    value={salePatientName}
                    onChange={(e) => setSalePatientName(e.target.value)}
                    className="text-xs py-1"
                  />
                </div>
                <div>
                  <Label>Patient UHID / Mobile No.</Label>
                  <Input
                    placeholder="e.g. UHID-2026-0012 or phone"
                    value={salePatientUhid}
                    onChange={(e) => setSalePatientUhid(e.target.value)}
                    className="text-xs py-1"
                  />
                </div>

                {/* Items in cart */}
                <div className="border rounded-lg border-slate-200 dark:border-slate-700 p-2 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50">
                  {cart.length === 0 ? (
                    <div className="text-center py-4 text-slate-400">Cart is empty. Select items to add.</div>
                  ) : (
                    cart.map((c) => (
                      <div key={c.item.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-200/50 dark:border-slate-800">
                        <div className="min-w-0 pr-2">
                          <div className="font-medium truncate text-slate-800 dark:text-slate-200">{c.item.name}</div>
                          <div className="text-[10px] text-slate-400">₹{c.item.price} each</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max={c.item.stock}
                            value={c.qty}
                            onChange={(e) => updateCartQty(c.item.id, Number(e.target.value))}
                            className="w-12 text-center text-xs border rounded p-0.5 bg-white dark:bg-slate-800"
                          />
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-14 text-right">
                            ₹{c.item.price * c.qty}
                          </span>
                          <button onClick={() => removeFromCart(c.item.id)} className="text-rose-500 hover:text-rose-700 p-0.5">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{cartSubtotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Discount (₹):</span>
                    <Input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                      className="w-20 text-xs py-0.5 text-right font-mono"
                    />
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <span>Net Total:</span>
                    <span className="text-teal-700 dark:text-teal-400 font-mono">₹{cartTotal}</span>
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <Label>Payment Mode</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["Cash", "UPI", "Card"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`py-1 text-xs rounded border font-medium ${
                          paymentMode === mode
                            ? "bg-teal-600 text-white border-teal-600"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCheckoutSale}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" /> Issue Bill & Collect ₹{cartTotal}
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ── 2. STOCK & PURCHASE MODULE ── */}
      {(activeTab === "physio_purchase_stock" ||
        activeTab === "physio_purchase_order" ||
        activeTab === "physio_stock_update" ||
        activeTab === "physio_purchase_update") && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-teal-600" />
                  Stock Procurement & Purchase Orders
                </h3>
                <p className="text-[11px] text-slate-500">Track vendor shipments, inward GRNs and purchase billing</p>
              </div>
              <Button size="sm" onClick={() => flashToast("Purchase order generated for low stock items", "success")} className="text-xs bg-teal-600 hover:bg-teal-700 text-white">
                <FilePlus className="w-3 h-3 mr-1" /> New Purchase Indent
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Vendor / Supplier</th>
                      <th className="p-3">Item Category</th>
                      <th className="p-3">Order Value</th>
                      <th className="p-3">Order Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { po: "PO-PHY-8801", vendor: "Apex Ortho Supplies", category: "Support & Braces (Collars, Belts)", amount: 38500, date: "2026-10-18", status: "Delivered & Inwarded" },
                      { po: "PO-PHY-8802", vendor: "TheraHealth Electro-Med", category: "TENS Electrodes & Gel Cans", amount: 19400, date: "2026-10-22", status: "In Transit" },
                      { po: "PO-PHY-8803", vendor: "ProActive Physio Care", category: "TheraBands & Gym Balls", amount: 24200, date: "2026-10-24", status: "Awaiting Dispatch" },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{row.po}</td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{row.vendor}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{row.category}</td>
                        <td className="p-3 font-mono font-semibold text-teal-700 dark:text-teal-400">₹{row.amount.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-slate-500">{row.date}</td>
                        <td className="p-3">
                          <Badge variant={row.status.includes("Delivered") ? "success" : "warning"} className="text-[10px]">
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => flashToast(`Viewing invoice for ${row.po}`, "info")} className="text-[11px] py-1 px-2">
                            View GRN
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── 3. REPORTS MODULE ── */}
      {(activeTab === "physio_eod" ||
        activeTab === "physio_sales_by_bill" ||
        activeTab === "physio_stock_avail" ||
        activeTab === "physio_purchase_report" ||
        activeTab === "physio_inhouse_eod") && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-3 border-l-4 border-l-teal-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Today's Physio Revenue</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                ₹{sales.reduce((sum, s) => sum + s.total, 0).toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-emerald-600 mt-1">{sales.length} Bills Dispensed Today</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-sky-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Total Stock Holding Value</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                ₹{items.reduce((sum, i) => sum + i.price * i.stock, 0).toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-slate-500 mt-1">{items.reduce((sum, i) => sum + i.stock, 0)} Total Units in Stock</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-rose-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Low Stock Reorder Alerts</div>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {items.filter((i) => i.stock <= i.reorderLevel).length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Items below safe buffer</div>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-3 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-teal-600" />
                  Sales by Bill Ledger (InHouse Physiotherapy EOD)
                </h3>
              </div>
              <Button size="sm" onClick={() => flashToast("Exporting Physio EOD Excel", "info")} className="text-xs flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export EOD Excel
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                      <th className="p-3">Bill No.</th>
                      <th className="p-3">Patient & UHID</th>
                      <th className="p-3">Items Purchased</th>
                      <th className="p-3">Pay Mode</th>
                      <th className="p-3">Net Bill</th>
                      <th className="p-3">Dispensed By</th>
                      <th className="p-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{sale.billNumber}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{sale.patientName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{sale.patientUhid}</div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {sale.items.map((i) => `${i.name} (${i.qty})`).join(", ")}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">{sale.paymentMode}</Badge>
                        </td>
                        <td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                          ₹{sale.total.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{sale.attendedBy}</td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSaleForPrint(sale)}
                            className="text-[11px] py-1 px-2 flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" /> Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── 4. ITEM & VENDOR MASTER ── */}
      {(activeTab === "physio_item_master" || activeTab === "physio_vendor_master") && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-teal-600" />
                  Physiotherapy Item Master Catalog & Price Matrix
                </h3>
              </div>
              <Button size="sm" onClick={() => setShowItemModal(true)} className="text-xs bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Master Item
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                      <th className="p-3">Item Code</th>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Therapeutic Category</th>
                      <th className="p-3">Selling Price</th>
                      <th className="p-3">Current Stock</th>
                      <th className="p-3">Reorder Point</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{item.id}</td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                        <td className="p-3 text-slate-500">{item.category}</td>
                        <td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-400">₹{item.price}</td>
                        <td className="p-3 font-semibold">
                          <span className={item.stock <= item.reorderLevel ? "text-rose-600 font-bold" : "text-slate-700 dark:text-slate-300"}>
                            {item.stock} {item.unit}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">{item.reorderLevel} {item.unit}</td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => flashToast(`Editing ${item.name}`, "info")} className="text-[11px] py-1 px-2">
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── MODAL: ADD MASTER ITEM ── */}
      {showItemModal && (
        <Modal open={showItemModal} onClose={() => setShowItemModal(false)} title="Add Item to Physiotherapy Master">
          <form onSubmit={handleAddItem} className="space-y-3 text-xs">
            <div>
              <Label>Item Name</Label>
              <Input
                placeholder="e.g. Ankle Stirrup Splint (Universal)"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
              >
                <option value="Support & Braces">Support & Braces</option>
                <option value="Therapy Modality">Therapy Modality</option>
                <option value="Resistance & Exercise">Resistance & Exercise</option>
                <option value="Electrotherapy Acc">Electrotherapy Acc</option>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Opening Stock</Label>
                <Input
                  type="number"
                  value={newItem.stock}
                  onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Reorder Level</Label>
                <Input
                  type="number"
                  value={newItem.reorderLevel}
                  onChange={(e) => setNewItem({ ...newItem, reorderLevel: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setShowItemModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">
                Save to Catalog
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: PRINT BILL RECEIPT ── */}
      {selectedSaleForPrint && (
        <Modal open={Boolean(selectedSaleForPrint)} onClose={() => setSelectedSaleForPrint(null)} title="Physiotherapy Dispensing Tax Invoice">
          <div className="space-y-3 text-xs p-2">
            <div className="text-center border-b pb-2">
              <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100">CURA TECH MULTISPECIALTY HOSPITAL</div>
              <div className="text-[11px] text-slate-500">Department of Physical Medicine & Rehabilitation</div>
              <div className="font-mono text-[10px] text-slate-400 mt-1">Bill No: {selectedSaleForPrint.billNumber} | Date: {selectedSaleForPrint.date}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-900 p-2 rounded">
              <div>
                <span className="text-slate-400">Patient:</span> <strong className="text-slate-800 dark:text-slate-100">{selectedSaleForPrint.patientName}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400">UHID:</span> <strong className="font-mono">{selectedSaleForPrint.patientUhid}</strong>
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-slate-500 font-semibold">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Price</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedSaleForPrint.items.map((i, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{i.name}</td>
                    <td className="py-1 text-center">{i.qty}</td>
                    <td className="py-1 text-right font-mono">₹{i.price}</td>
                    <td className="py-1 text-right font-mono font-bold">₹{i.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t pt-2 space-y-1 text-right">
              <div>Subtotal: <span className="font-mono">₹{selectedSaleForPrint.subtotal}</span></div>
              {selectedSaleForPrint.discount > 0 && (
                <div className="text-rose-500">Discount: <span className="font-mono">-₹{selectedSaleForPrint.discount}</span></div>
              )}
              <div className="text-sm font-bold text-teal-700 dark:text-teal-400">
                Total Paid ({selectedSaleForPrint.paymentMode}): <span className="font-mono">₹{selectedSaleForPrint.total}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setSelectedSaleForPrint(null)}>Close</Button>
              <Button onClick={() => flashToast("Sent to Thermal POS Printer", "success")} className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PhysiotherapyERP;
