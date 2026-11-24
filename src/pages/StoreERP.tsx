import React, { useState } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, flashToast } from "../utils/helpers";
import type { StoreItem } from "../store/types";
import {
  Package,
  ShoppingCart,
  Undo,
  PackagePlus,
  FileText,
  RefreshCw,
  Edit3,
  CreditCard,
  Building,
  FileSpreadsheet,
  Receipt,
  Box,
  ShoppingBag,
  CheckCircle,
  Users,
  Building2,
  List,
  Upload,
  Folder,
  Search,
  Plus,
  Trash2,
  Printer,
  DollarSign,
  AlertTriangle,
  ArrowRightLeft,
  Truck,
  FileCheck,
} from "lucide-react";

const INITIAL_STORE_ITEMS: StoreItem[] = [
  { id: "SI-001", code: "ST-SURG-01", name: "Surgical Sterile Gloves 7.5 (Box of 50 pairs)", category: "Disposables & PPE", stock: 140, unit: "Box", unitCost: 450, reorderLevel: 30, supplier: "SurgeCare Lifesciences", location: "Bin A-12" },
  { id: "SI-002", code: "ST-PPE-02", name: "3-Ply Surgical Face Masks (Box of 100)", category: "Disposables & PPE", stock: 260, unit: "Box", unitCost: 120, reorderLevel: 50, supplier: "MedShield Hygiene", location: "Bin A-15" },
  { id: "SI-003", code: "ST-LIN-03", name: "Hospital Bed Linen Bedspread (White Cotton Heavy)", category: "Linen & Bedding", stock: 85, unit: "Nos", unitCost: 380, reorderLevel: 25, supplier: "Apex Healthcare Textiles", location: "Shelf L-02" },
  { id: "SI-004", code: "ST-STAT-04", name: "Patient Case File Folders with Hospital Logo", category: "Hospital Stationery", stock: 450, unit: "Nos", unitCost: 35, reorderLevel: 100, supplier: "Metro Printworks", location: "Shelf S-04" },
  { id: "SI-005", code: "ST-CHEM-05", name: "Surface Disinfectant Floor Cleaner (5L Canister)", category: "Sanitation & Chemical", stock: 34, unit: "Canister", unitCost: 650, reorderLevel: 10, supplier: "CleanBio Solutions", location: "Chem Store Room" },
  { id: "SI-006", code: "ST-INST-06", name: "Artery Forceps Straight 6-inch Stainless", category: "Surgical Instruments", stock: 28, unit: "Nos", unitCost: 420, reorderLevel: 10, supplier: "Precision Surgical Works", location: "Sterile Bay C" },
  { id: "SI-007", code: "ST-DISP-07", name: "Disposable Syringes 5ml with Needle (Box of 100)", category: "Disposables & PPE", stock: 190, unit: "Box", unitCost: 280, reorderLevel: 40, supplier: "SurgeCare Lifesciences", location: "Bin A-18" },
];

interface StoreIndent {
  id: string;
  indentNo: string;
  department: string;
  indentBy: string;
  date: string;
  items: { code: string; name: string; qty: number; unit: string }[];
  status: "Fulfilled" | "Pending" | "Partially Issued";
}

const INITIAL_INDENTS: StoreIndent[] = [
  {
    id: "IND-01",
    indentNo: "IND-2026-0045",
    department: "Intensive Care Unit (ICU)",
    indentBy: "Sarah Thomas, RN",
    date: new Date().toISOString().split("T")[0],
    items: [
      { code: "ST-SURG-01", name: "Surgical Sterile Gloves 7.5", qty: 10, unit: "Box" },
      { code: "ST-DISP-07", name: "Disposable Syringes 5ml", qty: 8, unit: "Box" },
    ],
    status: "Fulfilled",
  },
  {
    id: "IND-02",
    indentNo: "IND-2026-0046",
    department: "Operation Theatre (OT 1)",
    indentBy: "Dr. Arvind Raman",
    date: new Date().toISOString().split("T")[0],
    items: [
      { code: "ST-SURG-01", name: "Surgical Sterile Gloves 7.5", qty: 20, unit: "Box" },
      { code: "ST-PPE-02", name: "3-Ply Surgical Face Masks", qty: 15, unit: "Box" },
      { code: "ST-INST-06", name: "Artery Forceps Straight 6-inch", qty: 4, unit: "Nos" },
    ],
    status: "Fulfilled",
  },
];

export const StoreERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "store_sales", dropdownOption }) => {
  const [activeTab, setActiveTab] = useState<string>(initialAction || "store_sales");
  const [items, setItems] = useState<StoreItem[]>(INITIAL_STORE_ITEMS);
  const [indents, setIndents] = useState<StoreIndent[]>(INITIAL_INDENTS);

  // New Store Indent / Sales Form
  const [indentDept, setIndentDept] = useState("ICU");
  const [indentBy, setIndentBy] = useState("Ward Sister");
  const [indentItems, setIndentItems] = useState<{ itemId: string; qty: number }[]>([]);

  // Item Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItem, setNewItem] = useState({
    code: "",
    name: "",
    category: "Disposables & PPE" as StoreItem["category"],
    stock: 50,
    unit: "Box",
    unitCost: 200,
    reorderLevel: 15,
    supplier: "SurgeCare Lifesciences",
    location: "Rack B-01",
  });

  React.useEffect(() => {
    if (initialAction) setActiveTab(initialAction);
  }, [initialAction]);

  const handleCreateIndent = (e: React.FormEvent) => {
    e.preventDefault();
    if (indentItems.length === 0) {
      flashToast("Please select at least one item to issue", "warning");
      return;
    }

    const newIndent: StoreIndent = {
      id: `IND-${Date.now().toString().slice(-3)}`,
      indentNo: `IND-2026-${(indents.length + 1).toString().padStart(4, "0")}`,
      department: indentDept,
      indentBy: indentBy,
      date: new Date().toISOString().split("T")[0],
      items: indentItems.map((ii) => {
        const item = items.find((i) => i.id === ii.itemId);
        return {
          code: item?.code || "N/A",
          name: item?.name || "Unknown Item",
          qty: ii.qty,
          unit: item?.unit || "Nos",
        };
      }),
      status: "Fulfilled",
    };

    // Deduct stock
    setItems(
      items.map((i) => {
        const req = indentItems.find((ii) => ii.itemId === i.id);
        if (req) {
          return { ...i, stock: Math.max(0, i.stock - req.qty) };
        }
        return i;
      })
    );

    setIndents([newIndent, ...indents]);
    flashToast(`Store Indent #${newIndent.indentNo} issued to ${indentDept}`, "success");
    setIndentItems([]);
  };

  const handleAddItemToIndent = (itemId: string, qty: number) => {
    const existing = indentItems.find((i) => i.itemId === itemId);
    if (existing) {
      setIndentItems(indentItems.map((i) => (i.itemId === itemId ? { ...i, qty: i.qty + qty } : i)));
    } else {
      setIndentItems([...indentItems, { itemId, qty }]);
    }
  };

  const handleSaveMasterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name) return;
    const created: StoreItem = {
      id: `SI-${(items.length + 1).toString().padStart(3, "0")}`,
      code: newItem.code || `ST-GEN-${items.length + 1}`,
      name: newItem.name,
      category: newItem.category,
      stock: Number(newItem.stock) || 0,
      unit: newItem.unit,
      unitCost: Number(newItem.unitCost) || 0,
      reorderLevel: Number(newItem.reorderLevel) || 10,
      supplier: newItem.supplier,
      location: newItem.location,
    };
    setItems([...items, created]);
    flashToast(`Item '${created.name}' registered into Central Stores`, "success");
    setShowItemModal(false);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* ── Sub-Navigation / Header ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Central Hospital Store & Supply Chain Management
              {dropdownOption && <Badge variant="info">{dropdownOption}</Badge>}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Departmental Indents, Surgical Instruments, Hospital Linens, Vendor POs & Documents
            </p>
          </div>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab("store_sales")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "store_sales" || activeTab === "store_sales_return"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Store Sales / Indents
          </button>
          <button
            onClick={() => setActiveTab("store_purchase_stock")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab.includes("purchase") || activeTab === "store_stock_update" || activeTab === "store_pending_payment"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Stock & POs
          </button>
          <button
            onClick={() => setActiveTab("store_inhouse_eod")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab.includes("eod") || activeTab.includes("report") || activeTab === "store_stock_avail" || activeTab === "store_stock_by_supplier"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Store Reports
          </button>
          <button
            onClick={() => setActiveTab("store_item_master")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "store_item_master" || activeTab === "store_vendor_master"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Catalog Masters
          </button>
          <button
            onClick={() => setActiveTab("store_document")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "store_document" || activeTab === "store_view_documents"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Documents
          </button>
        </div>
      </div>

      {/* ── 1. SALES & DEPARTMENT INDENTS ── */}
      {(activeTab === "store_sales" || activeTab === "store_sales_return") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardHeader className="py-2.5 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-indigo-600" />
                  Central Store Inventory & Dispensing Rack
                </h3>
                <span className="text-[11px] text-slate-500">{items.length} materials cataloged</span>
              </CardHeader>
              <CardBody className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-indigo-400 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{item.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            {item.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.category} • Location: {item.location}</div>
                      </div>

                      <div className="mt-3 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Cost: ₹{item.unitCost}/{item.unit}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            Stock: <strong className={item.stock <= item.reorderLevel ? "text-rose-600" : "text-emerald-600"}>{item.stock} {item.unit}</strong>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddItemToIndent(item.id, 1)}
                          disabled={item.stock <= 0}
                          className="text-xs py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Issue
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Issue Indent Terminal */}
          <div className="space-y-3">
            <Card className="border-indigo-200 dark:border-indigo-900 shadow-sm">
              <CardHeader className="py-2.5 bg-indigo-50/60 dark:bg-indigo-950/40">
                <h3 className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                  Department Issue Voucher (Indent)
                </h3>
              </CardHeader>
              <CardBody className="p-3 space-y-3 text-xs">
                <div>
                  <Label>Receiving Department / Unit</Label>
                  <Select value={indentDept} onChange={(e) => setIndentDept(e.target.value)}>
                    <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                    <option value="Operation Theatre (OT 1 & 2)">Operation Theatre (OT 1 & 2)</option>
                    <option value="Emergency & Trauma">Emergency & Trauma</option>
                    <option value="General Wards (Male & Female)">General Wards</option>
                    <option value="Dialysis Suite">Dialysis Suite</option>
                    <option value="Diagnostic Laboratory">Diagnostic Laboratory</option>
                  </Select>
                </div>
                <div>
                  <Label>Indenting Officer / Nurse</Label>
                  <Input value={indentBy} onChange={(e) => setIndentBy(e.target.value)} className="text-xs py-1" />
                </div>

                {/* Selected Items */}
                <div className="border rounded-lg border-slate-200 dark:border-slate-700 p-2 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50/50 dark:bg-slate-900/50">
                  {indentItems.length === 0 ? (
                    <div className="text-center py-4 text-slate-400">No items selected. Click "Issue" on left.</div>
                  ) : (
                    indentItems.map((ii) => {
                      const it = items.find((i) => i.id === ii.itemId);
                      return (
                        <div key={ii.itemId} className="flex justify-between items-center text-xs py-1 border-b border-slate-200/50 dark:border-slate-800">
                          <div className="min-w-0 pr-2">
                            <div className="font-medium truncate text-slate-800 dark:text-slate-200">{it?.name}</div>
                            <div className="text-[10px] text-slate-400">{it?.code}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min="1"
                              max={it?.stock}
                              value={ii.qty}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val <= 0) {
                                  setIndentItems(indentItems.filter((x) => x.itemId !== ii.itemId));
                                } else {
                                  setIndentItems(indentItems.map((x) => (x.itemId === ii.itemId ? { ...x, qty: val } : x)));
                                }
                              }}
                              className="w-12 text-center text-xs border rounded p-0.5"
                            />
                            <span className="text-[10px] text-slate-500">{it?.unit}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <Button
                  onClick={handleCreateIndent}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Authorize & Dispatch Voucher
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ── 2. STOCK & POs ── */}
      {(activeTab === "store_purchase_stock" ||
        activeTab === "store_purchase_order" ||
        activeTab === "store_purchase_update" ||
        activeTab === "store_stock_update" ||
        activeTab === "store_pending_payment") && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  Central Store Purchase Inward & Pending Payments
                </h3>
              </div>
              <Button size="sm" onClick={() => flashToast("New Vendor Purchase Order Initiated", "info")} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-3 h-3 mr-1" /> New Purchase Order
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Vendor / Supplier</th>
                      <th className="p-3">Order Description</th>
                      <th className="p-3">Total Value</th>
                      <th className="p-3">Payment Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { po: "PO-ST-9912", vendor: "SurgeCare Lifesciences", desc: "Gloves, Syringes & PPE (150 Boxes)", amount: 58500, payStatus: "Pending", due: "15 Days" },
                      { po: "PO-ST-9913", vendor: "Apex Healthcare Textiles", desc: "Heavy White Cotton Bedspreads (100 Nos)", amount: 38000, payStatus: "Cleared", due: "Paid Net-30" },
                      { po: "PO-ST-9914", vendor: "CleanBio Solutions", desc: "Surface Disinfectant & Fumigants (20 Cans)", amount: 13000, payStatus: "Pending", due: "7 Days" },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{row.po}</td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{row.vendor}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{row.desc}</td>
                        <td className="p-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">₹{row.amount.toLocaleString("en-IN")}</td>
                        <td className="p-3">
                          <Badge variant={row.payStatus === "Cleared" ? "success" : "danger"} className="text-[10px]">
                            {row.payStatus} ({row.due})
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => flashToast(`Printing GRN Challan for ${row.po}`, "info")} className="text-[11px] py-1 px-2">
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

      {/* ── 3. STORE REPORTS ── */}
      {(activeTab === "store_inhouse_eod" ||
        activeTab === "store_eod" ||
        activeTab === "store_sales_by_bill" ||
        activeTab === "store_stock_avail" ||
        activeTab === "store_purchase_report" ||
        activeTab === "store_payment_report" ||
        activeTab === "store_stock_by_supplier") && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-3 border-l-4 border-l-indigo-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Total Central Store Valuation</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                ₹{items.reduce((s, i) => s + i.unitCost * i.stock, 0).toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-slate-500 mt-1">{items.length} Product Categories</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-emerald-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Today's Department Issues</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{indents.length}</div>
              <div className="text-xs text-emerald-600 mt-1">ICU, OT & Wards fulfilled</div>
            </Card>
            <Card className="p-3 border-l-4 border-l-amber-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Pending Vendor Invoices</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">₹71,500</div>
              <div className="text-xs text-slate-500 mt-1">2 Inward Orders Awaiting Clearance</div>
            </Card>
          </div>

          <Card>
            <CardHeader className="py-3 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Department Issue Register (InHouse Store EOD)
                </h3>
              </div>
              <Button size="sm" onClick={() => flashToast("Exporting Central Store Ledger to CSV", "info")} className="text-xs flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                      <th className="p-3">Indent No.</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Requested By</th>
                      <th className="p-3">Items Dispatched</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {indents.map((ind) => (
                      <tr key={ind.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{ind.indentNo}</td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{ind.department}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{ind.indentBy}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {ind.items.map((i) => `${i.name} (${i.qty} ${i.unit})`).join(", ")}
                        </td>
                        <td className="p-3 text-slate-500">{ind.date}</td>
                        <td className="p-3">
                          <Badge variant="success" className="text-[10px]">{ind.status}</Badge>
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

      {/* ── 4. CATALOG MASTERS ── */}
      {(activeTab === "store_item_master" || activeTab === "store_vendor_master") && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <List className="w-3.5 h-3.5 text-indigo-600" />
                  Central Hospital Store Master Catalog
                </h3>
              </div>
              <Button size="sm" onClick={() => setShowItemModal(true)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Store Item
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                      <th className="p-3">Material Code</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Stock on Hand</th>
                      <th className="p-3">Unit Cost</th>
                      <th className="p-3">Primary Supplier</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{item.code}</td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                        <td className="p-3 text-slate-500">{item.category}</td>
                        <td className="p-3 font-semibold">
                          <span className={item.stock <= item.reorderLevel ? "text-rose-600 font-bold" : "text-emerald-600"}>
                            {item.stock} {item.unit}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold">₹{item.unitCost}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{item.supplier}</td>
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

      {/* ── 5. DOCUMENTS ── */}
      {(activeTab === "store_document" || activeTab === "store_view_documents") && (
        <Card>
          <CardHeader className="py-3 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-indigo-600" />
                Store Invoices, Delivery Challans (DC) & Vendor Contracts
              </h3>
            </div>
            <Button size="sm" onClick={() => flashToast("Document uploaded to Cloud Archive", "success")} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" /> Upload Document
            </Button>
          </CardHeader>
          <CardBody className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {[
              { title: "SurgeCare DC #DC-4401", date: "2026-10-18", size: "1.4 MB", type: "Delivery Challan" },
              { title: "Apex Textiles Annual Contract 2026", date: "2026-08-10", size: "4.8 MB", type: "MOU / Agreement" },
              { title: "CleanBio MSDS Safety Sheets", date: "2026-09-01", size: "2.1 MB", type: "Material Safety Data" },
            ].map((doc, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">{doc.title}</div>
                  <div className="text-[10px] text-slate-400">{doc.type} • {doc.date} • {doc.size}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => flashToast(`Downloading ${doc.title}`, "info")} className="text-xs py-1 px-2">
                  View
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* ── MODAL: ADD STORE ITEM ── */}
      {showItemModal && (
        <Modal open={showItemModal} onClose={() => setShowItemModal(false)} title="Register New Material to Central Stores">
          <form onSubmit={handleSaveMasterItem} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Material Code</Label>
                <Input
                  placeholder="e.g. ST-PPE-08"
                  value={newItem.code}
                  onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                >
                  <option value="Disposables & PPE">Disposables & PPE</option>
                  <option value="Linen & Bedding">Linen & Bedding</option>
                  <option value="Hospital Stationery">Hospital Stationery</option>
                  <option value="Sanitation & Chemical">Sanitation & Chemical</option>
                  <option value="Surgical Instruments">Surgical Instruments</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description / Item Name</Label>
              <Input
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
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
                <Label>Unit (e.g. Box, Nos)</Label>
                <Input
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Unit Cost (₹)</Label>
                <Input
                  type="number"
                  value={newItem.unitCost}
                  onChange={(e) => setNewItem({ ...newItem, unitCost: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowItemModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Item</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default StoreERP;
