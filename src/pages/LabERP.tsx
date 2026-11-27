import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Badge, Modal, Input, Select, Label, EmptyState, Th, Td } from "../components/ui";
import { fmtCurrency, flashToast, downloadCSV, today } from "../utils/helpers";
import { erpGet, erpMutate, useErpRealtime } from "../utils/erpApi";
import {
  FlaskConical,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  ShoppingCart,
  Building2,
  Plus,
  RefreshCw,
  Wrench,
  UploadCloud,
  Edit3,
  CreditCard,
  Share2,
  Download,
} from "lucide-react";
import type { LabOrder } from "../store/types";

interface ReagentItem {
  id: string;
  branchId?: string;
  name: string;
  batch: string;
  stock: number;
  minStock: number;
  unitCost: number;
  vendor: string;
  expiry: string;
}

interface ExternalLab {
  id: string;
  name: string;
  accNo: string;
  contact: string;
  pendingDispatches: number;
  tatHrs: string;
}

interface ExternalDispatch {
  id: string;
  branchId?: string;
  patientName: string;
  patientUhid?: string;
  testName: string;
  partnerLab: string;
  sampleId: string;
  dispatchedAt: string;
  status: string;
  cost: number;
}

interface LabPO {
  id: string;
  branchId?: string;
  poNumber: string;
  vendor: string;
  itemName: string;
  qty: number;
  unitCost: number;
  total: number;
  date: string;
  status: string;
  paymentStatus: string;
}

interface AnalyzerAsset {
  id: string;
  name: string;
  serial: string;
  department: string;
  lastCalibration: string;
  nextCalibration: string;
  amcStatus: string;
  status: string;
}

interface TestCatalogEntry {
  id: string;
  type: string;
  code: string;
  name: string;
  department: string;
  sampleType: string;
  price: number;
  tatHours: number;
  active: boolean;
}

interface AutoUploadResult {
  id: string;
  analyzer: string;
  barcode: string;
  patientName: string;
  patientUhid: string;
  testName: string;
  hl7Summary: string;
  receivedAt: string;
  status: string;
}

const TEST_CATALOG_META: Record<string, { title: string; subtitle: string; defaultDept: string }> = {
  bloodtest: { title: "Blood Test Master", subtitle: "Hematology, Biochemistry & Serology Panels", defaultDept: "Hematology" },
  xray_type: { title: "X-Ray Modality Master", subtitle: "Digital Radiography & Views Configuration", defaultDept: "Radiology" },
  scan_type: { title: "CT / MRI / USG Scan Types", subtitle: "Cross-sectional & Ultrasound Protocol Tariff", defaultDept: "Radiology" },
  other_test: { title: "Other Diagnostic Tests", subtitle: "ECG, PFT, TMT & Special Diagnostics", defaultDept: "Cardiology" },
  physiotherapy_test: { title: "Physiotherapy Eval Tests", subtitle: "EMG, Nerve Conduction & Gait Assessments", defaultDept: "Physiotherapy" },
  ophthalmology: { title: "Ophthalmology Investigations", subtitle: "OCT, Perimetry, Tonometry & Fundus Tests", defaultDept: "Ophthalmology" },
};

const ACTION_TITLES: Record<string, string> = {
  lab_dashboard: "Laboratory Command Dashboard",
  external_diag: "External Diagnostics Referrals",
  diagnostics: "All Diagnostics Worklist",
  pending_test: "Pending Tests Queue",
  edit_diag: "Edit Diagnostics & Verify Results",
  external_lab: "External Partner Labs",
  ext_pending: "External Pending Samples",
  auto_uploads: "Auto Uploaded Results (LIS / HL7)",
  lab_eod: "Lab EOD Summary Report",
  ext_lab_report: "External Lab Billing & Dispatch Report",
  scan_diag_report: "Scan & Radiology Diagnosis Report",
  tat_report: "Turnaround Time (TAT) Compliance Report",
  stock_purchase: "Lab Reagent Stock & Purchase",
  purchase_order: "Reagent Purchase Orders",
  lab_report_drop: "Laboratory Stock & QC Analytics",
  inventory_update: "Reagent Inventory Adjustments",
  pending_payments: "Pending Lab Vendor Payments",
  lab_inventory: "Analyzer & Equipment Maintenance",
};

export const LabERP: React.FC<{ initialAction?: string; dropdownOption?: string }> = ({
  initialAction = "lab_dashboard",
  dropdownOption,
}) => {
  const { data, setData, currentBranch, viewBranchId, log } = useStore();
  const currentBranchId = viewBranchId || currentBranch?.id || "br_main";
  const [activeTool, setActiveTool] = useState(initialAction);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [reagents, setReagents] = useState<ReagentItem[]>([]);
  const [externalLabs, setExternalLabs] = useState<ExternalLab[]>([]);
  const [externalDispatches, setExternalDispatches] = useState<ExternalDispatch[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<LabPO[]>([]);
  const [analyzers, setAnalyzers] = useState<AnalyzerAsset[]>([]);
  const [testCatalog, setTestCatalog] = useState<TestCatalogEntry[]>([]);
  const [autoUploads, setAutoUploads] = useState<AutoUploadResult[]>([]);

  // Modals
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [resultModalOrder, setResultModalOrder] = useState<LabOrder | null>(null);
  const [reagentModalOpen, setReagentModalOpen] = useState(false);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);

  // Forms
  const [orderForm, setOrderForm] = useState({ patientId: "", testCatalogId: "", doctorName: "Dr. Arvind Sharma", notes: "" });
  const [resultForm, setResultForm] = useState({ status: "completed" as LabOrder["status"], notes: "", paramValues: "" });
  const [reagentForm, setReagentForm] = useState({ name: "", batch: "", stock: "10", minStock: "5", unitCost: "1200", vendor: "", expiry: "2027-12-31" });
  const [poForm, setPoForm] = useState({ vendor: "Roche Diagnostics", itemName: "", qty: "5", unitCost: "2000" });
  const [dispatchForm, setDispatchForm] = useState({ patientName: "", patientUhid: "", testName: "", partnerLab: "Metropolis Healthcare Ltd", cost: "1800" });
  const [catalogForm, setCatalogForm] = useState({ code: "", name: "", department: "Hematology", sampleType: "Serum", price: "600", tatHours: "4" });

  useEffect(() => {
    if (initialAction) setActiveTool(initialAction);
  }, [initialAction, dropdownOption]);

  const loadLabData = useCallback(async () => {
    setLoading(true);
    try {
      const q = currentBranchId && currentBranchId !== "all" ? `?branchId=${encodeURIComponent(currentBranchId)}` : "";
      const res = await erpGet(`/api/lab${q}`);
      setReagents(res.reagents || []);
      setExternalLabs(res.externalLabs || []);
      setExternalDispatches(res.externalDispatches || []);
      setPurchaseOrders(res.purchaseOrders || []);
      setAnalyzers(res.analyzers || []);
      setTestCatalog(res.testCatalog || []);
      setAutoUploads(res.autoUploads || []);
    } catch (err: any) {
      flashToast(err?.message || "Failed to load Lab ERP data", "warn");
    } finally {
      setLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    loadLabData();
  }, [loadLabData]);

  useErpRealtime("lab", loadLabData);

  const labOrders = data.labOrders || [];
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return labOrders.filter((o) => {
      if (activeTool === "pending_test" && (o.status === "completed" || o.status === "cancelled")) return false;
      if (activeTool === "scan_diag_report" && o.category !== "Radiology" && !/scan|x-ray|ct|mri|ultrasound/i.test(o.testName)) return false;
      if (!q) return true;
      return `${o.orderNumber} ${o.patientName} ${o.testName} ${o.doctorName || ""}`.toLowerCase().includes(q);
    });
  }, [labOrders, activeTool, searchQuery]);

  const pendingCount = useMemo(() => labOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length, [labOrders]);
  const completedToday = useMemo(() => labOrders.filter((o) => o.status === "completed").length, [labOrders]);
  const lowReagentCount = useMemo(() => reagents.filter((r) => r.stock <= r.minStock).length, [reagents]);
  const totalRevenue = useMemo(() => labOrders.reduce((s, o) => s + (o.price || 0), 0), [labOrders]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = (data.patients || []).find((p) => p.id === orderForm.patientId) || data.patients?.[0];
    const catalogItem = testCatalog.find((t) => t.id === orderForm.testCatalogId) || testCatalog[0];
    if (!patient || !catalogItem) {
      flashToast("Select a valid patient and diagnostic test", "warn");
      return;
    }
    const newOrder: LabOrder = {
      id: `lab_${Date.now()}`,
      branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
      orderNumber: `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: patient.id,
      patientName: patient.name,
      patientUhid: patient.uhid,
      patientAge: patient.age,
      patientGender: patient.gender,
      doctorName: orderForm.doctorName,
      testName: catalogItem.name,
      category: (catalogItem.department as LabOrder["category"]) || "General",
      sampleType: catalogItem.sampleType,
      price: catalogItem.price,
      status: "ordered",
      parameters: [{ name: catalogItem.name, value: "Pending", unit: "-", referenceRange: "Within Normal Limits" }],
      technicianNotes: orderForm.notes,
      billed: false,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, labOrders: [newOrder, ...(prev.labOrders || [])] }));
    log("LAB_ORDER_CREATED", `Ordered ${newOrder.testName} for ${newOrder.patientName}`);
    setOrderModalOpen(false);
    flashToast(`Created ${newOrder.orderNumber} for ${newOrder.patientName}`, "ok");
  };

  const handleSaveResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultModalOrder) return;
    const updatedParams = resultModalOrder.parameters.length
      ? resultModalOrder.parameters.map((p, idx) => (idx === 0 && resultForm.paramValues ? { ...p, value: resultForm.paramValues } : p))
      : [{ name: resultModalOrder.testName, value: resultForm.paramValues || "Normal", unit: "-", referenceRange: "Reference" }];

    setData((prev) => ({
      ...prev,
      labOrders: (prev.labOrders || []).map((o) =>
        o.id === resultModalOrder.id
          ? {
              ...o,
              status: resultForm.status,
              technicianNotes: resultForm.notes || o.technicianNotes,
              parameters: updatedParams,
              completedAt: resultForm.status === "completed" ? new Date().toISOString() : o.completedAt,
            }
          : o
      ),
    }));
    log("LAB_RESULT_UPDATED", `${resultModalOrder.orderNumber} marked ${resultForm.status}`);
    setResultModalOrder(null);
    flashToast(`Updated ${resultModalOrder.orderNumber}`, "ok");
  };

  const handleVerifyAutoUpload = async (au: AutoUploadResult) => {
    try {
      await erpMutate("/api/lab", { action: "ingest-auto", id: au.id });
      const linkedOrder: LabOrder = {
        id: `lab_lis_${Date.now()}`,
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        orderNumber: `LIS-${au.barcode}`,
        patientId: "p_lis",
        patientName: au.patientName,
        patientUhid: au.patientUhid,
        testName: au.testName,
        category: "Hematology",
        sampleType: "Analyzer Barcode",
        price: 450,
        status: "completed",
        parameters: [{ name: au.testName, value: au.hl7Summary, unit: "HL7", referenceRange: "Verified" }],
        technicianNotes: `Auto-ingested from ${au.analyzer}`,
        completedAt: new Date().toISOString(),
        billed: false,
        createdAt: new Date().toISOString(),
      };
      setData((prev) => ({ ...prev, labOrders: [linkedOrder, ...(prev.labOrders || [])] }));
      await loadLabData();
      flashToast(`Verified HL7 payload ${au.barcode} to patient EHR`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed to verify upload", "warn");
    }
  };

  const handleAddReagent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reagentForm.name.trim()) return flashToast("Reagent name is required", "warn");
    try {
      await erpMutate("/api/lab", {
        action: "reagent",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        name: reagentForm.name.trim(),
        batch: reagentForm.batch || `LOT-${Date.now().toString().slice(-4)}`,
        stock: Number(reagentForm.stock) || 0,
        minStock: Number(reagentForm.minStock) || 5,
        unitCost: Number(reagentForm.unitCost) || 0,
        vendor: reagentForm.vendor || "Direct Supply",
        expiry: reagentForm.expiry,
      });
      setReagentModalOpen(false);
      setReagentForm({ name: "", batch: "", stock: "10", minStock: "5", unitCost: "1200", vendor: "", expiry: "2027-12-31" });
      await loadLabData();
      flashToast("Reagent batch recorded", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed to save reagent", "warn");
    }
  };

  const handleAdjustReagentStock = async (r: ReagentItem, delta: number) => {
    try {
      await erpMutate("/api/lab", { action: "reagent", id: r.id, stock: Math.max(0, r.stock + delta) }, "PUT");
      await loadLabData();
      flashToast(`Updated ${r.name} stock to ${Math.max(0, r.stock + delta)}`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Stock update failed", "warn");
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.itemName.trim()) return flashToast("Item description is required", "warn");
    const qty = Number(poForm.qty) || 1;
    const unitCost = Number(poForm.unitCost) || 0;
    try {
      await erpMutate("/api/lab", {
        action: "po",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        vendor: poForm.vendor,
        itemName: poForm.itemName.trim(),
        qty,
        unitCost,
        total: qty * unitCost,
        date: today(),
        status: "Pending",
        paymentStatus: "Pending",
      });
      setPoModalOpen(false);
      setPoForm({ vendor: "Roche Diagnostics", itemName: "", qty: "5", unitCost: "2000" });
      await loadLabData();
      flashToast("Lab Purchase Order created", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed to create PO", "warn");
    }
  };

  const handlePoAction = async (po: LabPO, patch: Partial<LabPO>) => {
    try {
      await erpMutate("/api/lab", { action: "po", id: po.id, ...patch }, "PUT");
      await loadLabData();
      flashToast(`Updated ${po.poNumber}`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "PO update failed", "warn");
    }
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchForm.patientName.trim() || !dispatchForm.testName.trim()) return flashToast("Patient and test name required", "warn");
    try {
      await erpMutate("/api/lab", {
        action: "dispatch",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        patientName: dispatchForm.patientName.trim(),
        patientUhid: dispatchForm.patientUhid || "EXT-WALKIN",
        testName: dispatchForm.testName.trim(),
        partnerLab: dispatchForm.partnerLab,
        sampleId: `EXT-BAR-${Date.now().toString().slice(-4)}`,
        cost: Number(dispatchForm.cost) || 0,
      });
      setDispatchModalOpen(false);
      setDispatchForm({ patientName: "", patientUhid: "", testName: "", partnerLab: externalLabs[0]?.name || "Metropolis Healthcare Ltd", cost: "1800" });
      await loadLabData();
      flashToast("Sample dispatched to partner lab", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Dispatch creation failed", "warn");
    }
  };

  const handleSaveCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeCatalogType = TEST_CATALOG_META[activeTool] ? activeTool : "bloodtest";
    if (!catalogForm.name.trim()) return flashToast("Test name required", "warn");
    try {
      await erpMutate("/api/lab", {
        action: "test-catalog",
        type: activeCatalogType,
        code: catalogForm.code.trim() || `TST-${Date.now().toString().slice(-4)}`,
        name: catalogForm.name.trim(),
        department: catalogForm.department || TEST_CATALOG_META[activeCatalogType].defaultDept,
        sampleType: catalogForm.sampleType,
        price: Number(catalogForm.price) || 0,
        tatHours: Number(catalogForm.tatHours) || 2,
        active: true,
      });
      setCatalogModalOpen(false);
      setCatalogForm({ code: "", name: "", department: "Hematology", sampleType: "Serum", price: "600", tatHours: "4" });
      await loadLabData();
      flashToast("Diagnostic test added to master catalog", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed to save catalog test", "warn");
    }
  };

  const handleCalibrateAnalyzer = async (anz: AnalyzerAsset) => {
    try {
      const next = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      await erpMutate("/api/lab", { action: "analyzer", id: anz.id, lastCalibration: today(), nextCalibration: next, status: "Operational" }, "PUT");
      await loadLabData();
      flashToast(`Calibration logged for ${anz.name}`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Calibration update failed", "warn");
    }
  };

  const catalogMeta = TEST_CATALOG_META[activeTool];
  const currentCatalogItems = useMemo(() => {
    if (!catalogMeta) return testCatalog;
    return testCatalog.filter((t) => t.type === activeTool);
  }, [testCatalog, activeTool, catalogMeta]);

  const title = catalogMeta ? catalogMeta.title : ACTION_TITLES[activeTool] || "Laboratory Information System";

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-600" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
            {dropdownOption && <Badge tone="blue">{dropdownOption}</Badge>}
            {loading && <Badge tone="amber">Syncing...</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {catalogMeta ? catalogMeta.subtitle : "Cura-Tech Hospital Diagnostic Laboratory, HL7 Analyzers & Reagent ERP"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadLabData}>
            <RefreshCw className="w-4 h-4" /> Sync
          </Button>
          <Button variant="primary" size="sm" onClick={() => setOrderModalOpen(true)}>
            <Plus className="w-4 h-4" /> New Lab Order
          </Button>
        </div>
      </div>

      {/* Dashboard KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-cyan-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Orders</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{labOrders.length}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Pending Samples</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Verified Results</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{completedToday}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Low Reagents</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{lowReagentCount}</div>
        </Card>
      </div>

      {/* Main Content Router */}
      {catalogMeta ? (
        <Card>
          <CardHeader
            title={catalogMeta.title}
            subtitle={catalogMeta.subtitle}
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadCSV(`lab_${activeTool}.csv`, currentCatalogItems as any[])}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button size="sm" onClick={() => setCatalogModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Test
                </Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            {currentCatalogItems.length === 0 ? (
              <EmptyState icon="🧪" title="No tests configured in this category" sub="Add a standardized test code and tariff." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Code</Th>
                    <Th>Investigation Name</Th>
                    <Th>Department</Th>
                    <Th>Sample / Modality</Th>
                    <Th>Target TAT</Th>
                    <Th className="text-right">Tariff</Th>
                  </tr>
                </thead>
                <tbody>
                  {currentCatalogItems.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <Td className="font-mono text-xs">{t.code}</Td>
                      <Td className="font-semibold">{t.name}</Td>
                      <Td>{t.department}</Td>
                      <Td>{t.sampleType}</Td>
                      <Td><Badge tone="blue">{t.tatHours} hrs</Badge></Td>
                      <Td className="text-right font-bold">{fmtCurrency(t.price)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      ) : activeTool === "auto_uploads" ? (
        <Card>
          <CardHeader title="HL7 / LIS Automated Analyzer Feed" subtitle="Direct bidirectional import from interfaced laboratory analyzers" />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Barcode</Th>
                  <Th>Analyzer</Th>
                  <Th>Patient</Th>
                  <Th>Test</Th>
                  <Th>HL7 Summary</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {autoUploads.map((au) => (
                  <tr key={au.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-mono text-xs">{au.barcode}</Td>
                    <Td>{au.analyzer}</Td>
                    <Td className="font-medium">{au.patientName}</Td>
                    <Td>{au.testName}</Td>
                    <Td className="text-xs font-mono text-cyan-700 dark:text-cyan-400">{au.hl7Summary}</Td>
                    <Td><Badge tone={au.status === "verified" ? "green" : "amber"}>{au.status}</Badge></Td>
                    <Td className="text-right">
                      {au.status !== "verified" && (
                        <Button size="sm" variant="success" onClick={() => handleVerifyAutoUpload(au)}>
                          <UploadCloud className="w-3.5 h-3.5" /> Verify to EHR
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "external_lab" || activeTool === "external_diag" || activeTool === "ext_pending" || activeTool === "ext_lab_report" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {externalLabs.map((ext) => (
              <Card key={ext.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-cyan-600" /> {ext.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Acc: {ext.accNo} • {ext.contact}</div>
                  </div>
                  <Badge tone="blue">TAT {ext.tatHrs}</Badge>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span>Pending Samples: <strong>{ext.pendingDispatches}</strong></span>
                  <Button size="sm" variant="secondary" onClick={() => setDispatchModalOpen(true)}>
                    <Share2 className="w-3.5 h-3.5" /> Refer Sample
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader
              title="Outsourced Reference Lab Dispatches"
              right={
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => downloadCSV("external_lab_dispatches.csv", externalDispatches as any[])}>
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                  <Button size="sm" onClick={() => setDispatchModalOpen(true)}>
                    <Plus className="w-3.5 h-3.5" /> New Dispatch
                  </Button>
                </div>
              }
            />
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Sample Barcode</Th>
                    <Th>Patient</Th>
                    <Th>Outsourced Test</Th>
                    <Th>Partner Lab</Th>
                    <Th>Dispatched</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Partner Cost</Th>
                  </tr>
                </thead>
                <tbody>
                  {externalDispatches
                    .filter((d) => (activeTool === "ext_pending" ? d.status !== "reported" : true))
                    .map((d) => (
                      <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
                        <Td className="font-mono text-xs">{d.sampleId}</Td>
                        <Td className="font-medium">{d.patientName}</Td>
                        <Td>{d.testName}</Td>
                        <Td>{d.partnerLab}</Td>
                        <Td>{d.dispatchedAt}</Td>
                        <Td><Badge tone={d.status === "reported" ? "green" : "amber"}>{d.status}</Badge></Td>
                        <Td className="text-right font-semibold">{fmtCurrency(d.cost)}</Td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      ) : activeTool === "stock_purchase" || activeTool === "lab_report_drop" || activeTool === "inventory_update" ? (
        <Card>
          <CardHeader
            title={dropdownOption || "Laboratory Reagent Stock & Batch Control"}
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadCSV("lab_reagents.csv", reagents as any[])}>
                  <Download className="w-3.5 h-3.5" /> Export
                </Button>
                <Button size="sm" onClick={() => setReagentModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Reagent
                </Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Reagent / Kit Name</Th>
                  <Th>Batch / Lot</Th>
                  <Th>Vendor</Th>
                  <Th>Expiry</Th>
                  <Th>Available Qty</Th>
                  <Th className="text-right">Unit Cost</Th>
                  <Th className="text-right">Adjust Stock</Th>
                </tr>
              </thead>
              <tbody>
                {reagents.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-semibold">{r.name}</Td>
                    <Td className="font-mono text-xs">{r.batch}</Td>
                    <Td>{r.vendor}</Td>
                    <Td>{r.expiry}</Td>
                    <Td>
                      <Badge tone={r.stock <= r.minStock ? "red" : "green"}>
                        {r.stock} (Min {r.minStock})
                      </Badge>
                    </Td>
                    <Td className="text-right">{fmtCurrency(r.unitCost)}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="secondary" onClick={() => handleAdjustReagentStock(r, -1)}>-1</Button>
                        <Button size="sm" variant="primary" onClick={() => handleAdjustReagentStock(r, +1)}>+1</Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "purchase_order" || activeTool === "pending_payments" ? (
        <Card>
          <CardHeader
            title={activeTool === "pending_payments" ? "Pending Lab Vendor Payments" : `Lab Purchase Orders${dropdownOption ? ` — ${dropdownOption}` : ""}`}
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadCSV("lab_pos.csv", purchaseOrders as any[])}>
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button size="sm" onClick={() => setPoModalOpen(true)}>
                  <ShoppingCart className="w-3.5 h-3.5" /> New Lab PO
                </Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>PO #</Th>
                  <Th>Vendor</Th>
                  <Th>Reagent / Item</Th>
                  <Th>Qty</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Approval</Th>
                  <Th>Payment</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders
                  .filter((po) => {
                    if (activeTool === "pending_payments") return po.paymentStatus !== "Paid";
                    if (dropdownOption === "Pending POs") return po.status === "Pending";
                    if (dropdownOption === "Approved POs") return po.status === "Approved";
                    return true;
                  })
                  .map((po) => (
                    <tr key={po.id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td className="font-mono text-xs">{po.poNumber}</Td>
                      <Td className="font-medium">{po.vendor}</Td>
                      <Td>{po.itemName}</Td>
                      <Td>{po.qty}</Td>
                      <Td className="text-right font-bold">{fmtCurrency(po.total)}</Td>
                      <Td><Badge tone={po.status === "Approved" ? "green" : "amber"}>{po.status}</Badge></Td>
                      <Td><Badge tone={po.paymentStatus === "Paid" ? "green" : "red"}>{po.paymentStatus}</Badge></Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          {po.status !== "Approved" && (
                            <Button size="sm" variant="secondary" onClick={() => handlePoAction(po, { status: "Approved" })}>Approve</Button>
                          )}
                          {po.paymentStatus !== "Paid" && (
                            <Button size="sm" variant="success" onClick={() => handlePoAction(po, { paymentStatus: "Paid" })}>
                              <CreditCard className="w-3.5 h-3.5" /> Pay
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "lab_inventory" ? (
        <Card>
          <CardHeader title={`Analyzer Calibration & Maintenance${dropdownOption ? ` — ${dropdownOption}` : ""}`} />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <Th>Analyzer</Th>
                  <Th>Serial #</Th>
                  <Th>Department</Th>
                  <Th>Last Calibration</Th>
                  <Th>Next Due</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Log Calibration</Th>
                </tr>
              </thead>
              <tbody>
                {analyzers.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-semibold">{a.name}</Td>
                    <Td className="font-mono text-xs">{a.serial}</Td>
                    <Td>{a.department}</Td>
                    <Td>{a.lastCalibration}</Td>
                    <Td>{a.nextCalibration}</Td>
                    <Td><Badge tone={a.status === "Operational" ? "green" : "amber"}>{a.status}</Badge></Td>
                    <Td className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => handleCalibrateAnalyzer(a)}>
                        <Wrench className="w-3.5 h-3.5" /> Calibrate Now
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : (
        /* Diagnostics Worklist, Dashboard, Edit, Pending, EOD, Scan Diag & TAT Reports */
        <Card>
          <CardHeader
            title={ACTION_TITLES[activeTool] || "Diagnostics Worklist"}
            subtitle={activeTool === "lab_eod" ? `Day Revenue: ${fmtCurrency(totalRevenue)} (${labOrders.length} investigations)` : "Live lab orders synced across clinical & cashier modules"}
            right={
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search UHID, patient, order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 sm:w-64"
                />
                <Button size="sm" variant="secondary" onClick={() => downloadCSV(`lab_${activeTool}.csv`, filteredOrders as any[])}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                </Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            {filteredOrders.length === 0 ? (
              <EmptyState icon="🔬" title="No matching lab orders" sub="Place a new diagnostic order or adjust your filter." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th>Order #</Th>
                    <Th>Patient / UHID</Th>
                    <Th>Investigation</Th>
                    <Th>Category</Th>
                    <Th>{activeTool === "tat_report" ? "TAT" : "Status"}</Th>
                    <Th className="text-right">Fee</Th>
                    <Th className="text-right">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <Td className="font-mono text-xs">{o.orderNumber}</Td>
                      <Td>
                        <div className="font-semibold">{o.patientName}</div>
                        <div className="text-xs text-slate-400">{o.patientUhid || o.patientId}</div>
                      </Td>
                      <Td className="font-medium">{o.testName}</Td>
                      <Td>{o.category}</Td>
                      <Td>
                        {activeTool === "tat_report" ? (
                          <Badge tone={o.status === "completed" ? "green" : "amber"}>
                            {o.completedAt ? "Within SLA (<4h)" : "In Progress"}
                          </Badge>
                        ) : (
                          <Badge tone={o.status === "completed" ? "green" : o.status === "cancelled" ? "red" : "amber"}>
                            {o.status.replace("_", " ")}
                          </Badge>
                        )}
                      </Td>
                      <Td className="text-right font-semibold">{fmtCurrency(o.price)}</Td>
                      <Td className="text-right">
                        <Button
                          size="sm"
                          variant={o.status === "completed" ? "secondary" : "primary"}
                          onClick={() => {
                            setResultModalOrder(o);
                            setResultForm({
                              status: o.status === "ordered" ? "completed" : o.status,
                              notes: o.technicianNotes || "",
                              paramValues: o.parameters?.[0]?.value || "",
                            });
                          }}
                        >
                          {o.status === "completed" ? <Edit3 className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          {o.status === "completed" ? "Edit" : "Verify Result"}
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {/* New Lab Order Modal */}
      <Modal open={orderModalOpen} onClose={() => setOrderModalOpen(false)} title="Create Diagnostic Lab Order">
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <Label>Patient</Label>
            <Select value={orderForm.patientId} onChange={(e) => setOrderForm({ ...orderForm, patientId: e.target.value })}>
              <option value="">-- Select Registered Patient --</option>
              {(data.patients || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.uhid || p.id})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Test / Scan Investigation</Label>
            <Select value={orderForm.testCatalogId} onChange={(e) => setOrderForm({ ...orderForm, testCatalogId: e.target.value })}>
              <option value="">-- Select Test --</option>
              {testCatalog.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({fmtCurrency(t.price)})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Referring Doctor</Label>
            <Input value={orderForm.doctorName} onChange={(e) => setOrderForm({ ...orderForm, doctorName: e.target.value })} />
          </div>
          <div>
            <Label>Clinical Notes</Label>
            <Input value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} placeholder="Fasting / STAT instructions" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setOrderModalOpen(false)}>Cancel</Button>
            <Button type="submit">Place Order</Button>
          </div>
        </form>
      </Modal>

      {/* Verify / Edit Diagnostic Result Modal */}
      <Modal open={!!resultModalOrder} onClose={() => setResultModalOrder(null)} title={`Edit / Verify ${resultModalOrder?.orderNumber || ""}`}>
        <form onSubmit={handleSaveResult} className="space-y-4">
          <div>
            <Label>Status</Label>
            <Select value={resultForm.status} onChange={(e) => setResultForm({ ...resultForm, status: e.target.value as LabOrder["status"] })}>
              <option value="ordered">Ordered</option>
              <option value="sample_collected">Sample Collected</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed & Verified</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <div>
            <Label>Primary Parameter Observation</Label>
            <Input value={resultForm.paramValues} onChange={(e) => setResultForm({ ...resultForm, paramValues: e.target.value })} placeholder="e.g. 13.8 g/dL or Normal Study" />
          </div>
          <div>
            <Label>Pathologist / Technician Notes</Label>
            <Input value={resultForm.notes} onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })} placeholder="Clinical interpretation" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setResultModalOrder(null)}>Cancel</Button>
            <Button type="submit" variant="success">Save Result</Button>
          </div>
        </form>
      </Modal>

      {/* Reagent Stock Modal */}
      <Modal open={reagentModalOpen} onClose={() => setReagentModalOpen(false)} title="Add Lab Reagent Stock">
        <form onSubmit={handleAddReagent} className="space-y-3">
          <div><Label>Reagent Name</Label><Input value={reagentForm.name} onChange={(e) => setReagentForm({ ...reagentForm, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Batch</Label><Input value={reagentForm.batch} onChange={(e) => setReagentForm({ ...reagentForm, batch: e.target.value })} /></div>
            <div><Label>Expiry</Label><Input type="date" value={reagentForm.expiry} onChange={(e) => setReagentForm({ ...reagentForm, expiry: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Qty</Label><Input type="number" value={reagentForm.stock} onChange={(e) => setReagentForm({ ...reagentForm, stock: e.target.value })} /></div>
            <div><Label>Min Level</Label><Input type="number" value={reagentForm.minStock} onChange={(e) => setReagentForm({ ...reagentForm, minStock: e.target.value })} /></div>
            <div><Label>Unit Cost</Label><Input type="number" value={reagentForm.unitCost} onChange={(e) => setReagentForm({ ...reagentForm, unitCost: e.target.value })} /></div>
          </div>
          <div><Label>Vendor</Label><Input value={reagentForm.vendor} onChange={(e) => setReagentForm({ ...reagentForm, vendor: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setReagentModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Reagent</Button>
          </div>
        </form>
      </Modal>

      {/* Lab PO Modal */}
      <Modal open={poModalOpen} onClose={() => setPoModalOpen(false)} title="Raise Reagent Purchase Order">
        <form onSubmit={handleCreatePO} className="space-y-3">
          <div><Label>Vendor</Label><Input value={poForm.vendor} onChange={(e) => setPoForm({ ...poForm, vendor: e.target.value })} required /></div>
          <div><Label>Reagent / Supply Item</Label><Input value={poForm.itemName} onChange={(e) => setPoForm({ ...poForm, itemName: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantity</Label><Input type="number" value={poForm.qty} onChange={(e) => setPoForm({ ...poForm, qty: e.target.value })} /></div>
            <div><Label>Unit Cost (INR)</Label><Input type="number" value={poForm.unitCost} onChange={(e) => setPoForm({ ...poForm, unitCost: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setPoModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit PO</Button>
          </div>
        </form>
      </Modal>

      {/* External Dispatch Modal */}
      <Modal open={dispatchModalOpen} onClose={() => setDispatchModalOpen(false)} title="Dispatch Sample to External Reference Lab">
        <form onSubmit={handleCreateDispatch} className="space-y-3">
          <div><Label>Patient Name</Label><Input value={dispatchForm.patientName} onChange={(e) => setDispatchForm({ ...dispatchForm, patientName: e.target.value })} required /></div>
          <div><Label>Outsourced Investigation</Label><Input value={dispatchForm.testName} onChange={(e) => setDispatchForm({ ...dispatchForm, testName: e.target.value })} required /></div>
          <div>
            <Label>Reference Partner Lab</Label>
            <Select value={dispatchForm.partnerLab} onChange={(e) => setDispatchForm({ ...dispatchForm, partnerLab: e.target.value })}>
              {externalLabs.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
            </Select>
          </div>
          <div><Label>Partner Fee (INR)</Label><Input type="number" value={dispatchForm.cost} onChange={(e) => setDispatchForm({ ...dispatchForm, cost: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setDispatchModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Dispatch</Button>
          </div>
        </form>
      </Modal>

      {/* Catalog Modal */}
      <Modal open={catalogModalOpen} onClose={() => setCatalogModalOpen(false)} title="Add Master Diagnostic Test">
        <form onSubmit={handleSaveCatalogItem} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Test Code</Label><Input value={catalogForm.code} onChange={(e) => setCatalogForm({ ...catalogForm, code: e.target.value })} placeholder="BLD-THY" /></div>
            <div><Label>Sample / Modality</Label><Input value={catalogForm.sampleType} onChange={(e) => setCatalogForm({ ...catalogForm, sampleType: e.target.value })} /></div>
          </div>
          <div><Label>Test Name</Label><Input value={catalogForm.name} onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tariff (INR)</Label><Input type="number" value={catalogForm.price} onChange={(e) => setCatalogForm({ ...catalogForm, price: e.target.value })} /></div>
            <div><Label>TAT (Hours)</Label><Input type="number" value={catalogForm.tatHours} onChange={(e) => setCatalogForm({ ...catalogForm, tatHours: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCatalogModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Test</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
