import React, { useState, useMemo } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import type { LabOrder } from "../store/types";
import {
  FlaskConical,
  LayoutDashboard,
  Share2,
  Clock,
  Edit3,
  Building2,
  AlertCircle,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Scan,
  Timer,
  ShoppingCart,
  FilePlus,
  RefreshCw,
  CreditCard,
  Wrench,
  Droplets,
  Radio,
  ScanLine,
  TestTube,
  Activity,
  Eye,
  CheckCircle2,
  Search,
  Plus,
  Printer,
  FileCheck,
} from "lucide-react";

export const LabERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "lab_dashboard", dropdownOption }) => {
  const { data, setData, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";

  const [activeTool, setActiveTool] = useState<string>(initialAction);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [resultEntryModalOpen, setResultEntryModalOpen] = useState(false);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<LabOrder | null>(null);

  // Parameter entry form state
  const [paramValues, setParamValues] = useState<Record<string, string>>({
    Hemoglobin: "14.2",
    "RBC Count": "4.8",
    "WBC Total": "7200",
    Platelets: "240000",
    "Fasting Blood Sugar": "98",
  });

  // Reagents & Lab Stock State
  const [reagentStock, setReagentStock] = useState([
    { id: "reg_1", name: "CBC Diluent (20L)", batch: "DIL-9812", stock: 14, minStock: 5, unitCost: 1800, vendor: "Sysmex India" },
    { id: "reg_2", name: "Biochemistry Lyse Reagent", batch: "LYS-4421", stock: 3, minStock: 6, unitCost: 3200, vendor: "Roche Diagnostics" },
    { id: "reg_3", name: "Blood Glucose Hexokinase Cartridges", batch: "GLU-1092", stock: 28, minStock: 10, unitCost: 950, vendor: "Beckman Coulter" },
    { id: "reg_4", name: "Urine 10-Parameter Test Strips", batch: "URS-8824", stock: 50, minStock: 20, unitCost: 450, vendor: "Siemens Healthineers" },
  ]);

  // External Diagnostics Partners
  const [externalLabs, setExternalLabs] = useState([
    { id: "ext_1", name: "Metropolis Healthcare Ltd", accNo: "MET-CHN-402", contact: "+91 44 4299 8000", pendingDispatches: 3, tatHrs: "24-48 hrs" },
    { id: "ext_2", name: "Dr. Lal PathLabs", accNo: "LAL-7812", contact: "+91 44 2822 5500", pendingDispatches: 1, tatHrs: "12-24 hrs" },
    { id: "ext_3", name: "SRL Diagnostics Reference Center", accNo: "SRL-9901", contact: "+91 44 4500 1000", pendingDispatches: 0, tatHrs: "36-72 hrs" },
  ]);

  // Orders list
  const orders = data.labOrders || [];

  const pendingOrders = orders.filter((o) => o.status === "ordered" || o.status === "sample_collected" || o.status === "processing");
  const completedOrders = orders.filter((o) => o.status === "completed");

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchCat = filterCategory === "all" || o.category === filterCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        o.patientName.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.testName.toLowerCase().includes(q) ||
        (o.patientUhid && o.patientUhid.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [orders, filterCategory, searchQuery]);

  // Turnaround Time (TAT) metrics
  const avgTatHours = 2.4;

  const handleAuthorizeResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForEdit) return;

    const updatedParams = [
      { name: "Hemoglobin", value: paramValues.Hemoglobin || "13.8", unit: "g/dL", referenceRange: "13.0 - 17.0" },
      { name: "Total WBC", value: paramValues["WBC Total"] || "7400", unit: "cells/mcL", referenceRange: "4,000 - 11,000" },
      { name: "Platelet Count", value: paramValues.Platelets || "250000", unit: "/mcL", referenceRange: "150,000 - 450,000" },
    ];

    const updatedOrder: LabOrder = {
      ...selectedOrderForEdit,
      status: "completed",
      completedAt: new Date().toISOString(),
      parameters: updatedParams,
      technicianNotes: "Verified on Sysmex XN-550 Automated 5-Part Cell Counter. Values within biological reference range.",
    };

    setData((prev) => ({
      ...prev,
      labOrders: (prev.labOrders || []).map((o) => (o.id === updatedOrder.id ? updatedOrder : o)),
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || "Lab Tech",
          action: "LAB_TEST_AUTHORIZED",
          details: `Authorized verified results for ${selectedOrderForEdit.orderNumber} (${selectedOrderForEdit.testName})`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    log("LAB_TEST_AUTHORIZED", `Authorized test ${selectedOrderForEdit.orderNumber}`);
    flashToast(`Test results for ${selectedOrderForEdit.orderNumber} authorized & verified!`);
    setResultEntryModalOpen(false);
    setSelectedOrderForEdit(null);
  };

  return (
    <div className="space-y-6">
      {/* Module Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-600 via-teal-700 to-indigo-800 text-white p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-teal-500/30 text-teal-100 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-teal-400/40">
              Laboratory & Diagnostics Sub-ERP
            </span>
            <span className="text-xs text-teal-200">Hematology · Biochemistry · Radiology · External Reference</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Diagnostics & Pathology Management</h1>
          <p className="text-teal-100/80 text-sm max-w-xl">
            Accession specimens, manage auto-analyzer result uploads, monitor turnaround times (TAT), order diagnostic reagents, and track external reference testing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={() => setActiveTool("auto_uploads")}
          >
            <UploadCloud className="w-4 h-4 mr-1 text-emerald-300" />
            Auto-Uploads
          </Button>
          <Button
            className="bg-teal-500 hover:bg-teal-600 text-white font-semibold shadow-md"
            onClick={() => setActiveTool("pending_test")}
          >
            <Clock className="w-4 h-4 mr-1" />
            Pending Tests ({pendingOrders.length})
          </Button>
        </div>
      </div>

      {/* Ribbon Navigation Breadcrumb / Tool Switcher */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs overflow-x-auto">
        <div className="flex items-center gap-2 font-medium">
          <span className="text-slate-400 font-mono uppercase">ACTIVE TOOL:</span>
          <span className="bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-md font-bold shadow-xs">
            {activeTool.replace("_", " ").toUpperCase()}
          </span>
          {dropdownOption && (
            <span className="bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 font-mono">
              Mode: {dropdownOption}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTool("lab_dashboard")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-teal-600 font-medium"
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTool("diagnostics")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-teal-600 font-medium"
          >
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTool("external_lab")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-teal-600 font-medium"
          >
            External Labs
          </button>
          <button
            onClick={() => setActiveTool("stock_purchase")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-teal-600 font-medium"
          >
            Reagent Stock
          </button>
          <button
            onClick={() => setActiveTool("tat_report")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-teal-600 font-medium"
          >
            TAT Analysis
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Orders</span>
            <FlaskConical className="w-5 h-5 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{orders.length}</div>
          <span className="text-xs text-slate-500">Accessioned specimens</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Pending Tests</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{pendingOrders.length}</div>
          <span className="text-xs text-slate-500">Awaiting sign-off</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Completed & Verified</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{completedOrders.length}</div>
          <span className="text-xs text-slate-500">Authorized reports</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Average TAT</span>
            <Timer className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-2">{avgTatHours} hrs</div>
          <span className="text-xs text-slate-500">Collection to sign-off</span>
        </div>
      </div>

      {/* ── TOOL VIEW: Diagnostics / Pending Test / Edit Diagnostics ── */}
      {(activeTool === "lab_dashboard" ||
        activeTool === "diagnostics" ||
        activeTool === "pending_test" ||
        activeTool === "edit_diag" ||
        activeTool === "ext_pending") && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-600" />
                {activeTool === "pending_test" ? "Pending Lab Tests Queue" : "Diagnostic Worklist & Accession Roster"}
              </h2>
              <p className="text-xs text-slate-500">
                Specimen accessioning, cell counter integration, and pathologist clinical authorization.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-40 text-xs py-1.5"
              >
                <option value="all">All Categories</option>
                <option value="Hematology">Hematology</option>
                <option value="Biochemistry">Biochemistry</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Radiology">Radiology</option>
                <option value="Pathology">Pathology</option>
              </Select>

              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search order #, patient, UHID..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <FlaskConical className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">No diagnostic orders matching current filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Patient / UHID</th>
                      <th className="py-3 px-4">Investigation & Category</th>
                      <th className="py-3 px-4">Sample Specimen</th>
                      <th className="py-3 px-4">Date & Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                          {ord.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{ord.patientName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{ord.patientUhid || "NO-UHID"}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700 dark:text-slate-200">{ord.testName}</div>
                          <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {ord.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {ord.sampleType || "Venous Blood (EDTA)"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge tone={ord.status === "completed" ? "green" : ord.status === "processing" ? "blue" : "amber"}>
                            {ord.status.replace("_", " ")}
                          </Badge>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">{fmtDate(ord.createdAt)}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {ord.status !== "completed" ? (
                              <Button
                                size="sm"
                                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-2"
                                onClick={() => {
                                  setSelectedOrderForEdit(ord);
                                  setResultEntryModalOpen(true);
                                }}
                              >
                                <Edit3 className="w-3.5 h-3.5 mr-1" />
                                Enter Results
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-xs h-7 px-2 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                                onClick={() => {
                                  setSelectedOrderForEdit(ord);
                                  setResultEntryModalOpen(true);
                                }}
                              >
                                <FileCheck className="w-3.5 h-3.5 mr-1" />
                                View Report
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: External Labs & Reference Centers ── */}
      {activeTool === "external_lab" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                External Reference Laboratories & Dispatches
              </h2>
              <p className="text-xs text-slate-500">Outsourced specialized investigations, courier sample dispatch, and digital report returns.</p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Partner Lab</th>
                    <th className="py-3 px-4">Account Code</th>
                    <th className="py-3 px-4">Helpline</th>
                    <th className="py-3 px-4">Pending Dispatches</th>
                    <th className="py-3 px-4">Expected TAT</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {externalLabs.map((lab) => (
                    <tr key={lab.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{lab.name}</td>
                      <td className="py-3 px-4 font-mono text-teal-600 dark:text-teal-400">{lab.accNo}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">{lab.contact}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {lab.pendingDispatches} samples
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{lab.tatHrs}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7 px-2"
                          onClick={() => flashToast(`Opening dispatch manifest for ${lab.name}`)}
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" />
                          Dispatch Sample
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: Reagent Stock & Purchase Orders ── */}
      {activeTool === "stock_purchase" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-600" />
                Diagnostic Reagent Inventory & Purchase Orders
              </h2>
              <p className="text-xs text-slate-500">Auto-analyzer diluents, lyse solutions, test strips, and calibration controls.</p>
            </div>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create Reagent PO
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Reagent / Consumable</th>
                    <th className="py-3 px-4">Batch #</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Unit Cost</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {reagentStock.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">{reg.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{reg.batch}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-200">{reg.stock} packs</td>
                      <td className="py-3 px-4 font-mono">₹{reg.unitCost.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{reg.vendor}</td>
                      <td className="py-3 px-4 text-right">
                        {reg.stock <= reg.minStock ? (
                          <Badge tone="red">Reorder Alert</Badge>
                        ) : (
                          <Badge tone="green">Adequate</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: Auto Uploaded Results (LIS Auto-Analyzer) ── */}
      {activeTool === "auto_uploads" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-500" />
                LIS Automated Analyzer Result Feed (ASTM / HL7)
              </h2>
              <p className="text-xs text-slate-500">Live incoming data streams from connected laboratory analyzers.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ANALYZER FEED LIVE
            </span>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-2 border border-slate-800">
              <div className="text-emerald-400 font-bold flex items-center gap-2">
                <span>[HL7 INCOMING] Sysmex XN-550 (IP: 192.168.1.182:5000)</span>
                <span className="text-[10px] text-slate-400">· 2 mins ago</span>
              </div>
              <div className="text-slate-300">
                MSH|^~\&|Sysmex|Hematology|CURA_LIS|Hospital|202611241245||ORU^R01|MSG00982|P|2.3.1
              </div>
              <div className="text-slate-300">
                OBX|1|NM|Hb^Hemoglobin|1|14.2|g/dL|13.0-17.0|N|||F
              </div>
              <div className="text-slate-300">
                OBX|2|NM|WBC^Total Leukocytes|1|7.2|10^3/mcL|4.0-11.0|N|||F
              </div>
              <div className="text-slate-300">
                OBX|3|NM|PLT^Platelets|1|240|10^3/mcL|150-450|N|||F
              </div>
              <div className="text-emerald-300 text-[11px] pt-1">
                ✓ Auto-matched to Patient Sample Tube #BAR-90184 (Rajesh Kumar · UHID: CURA-2026-104)
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => flashToast("Auto-ingested 4 cell counter findings into patient EHR records!")}
              >
                Accept All Verified Auto-Uploads
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: TAT Report (Turnaround Time Analysis) ── */}
      {activeTool === "tat_report" && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Timer className="w-4 h-4 text-sky-600" />
              Laboratory Turnaround Time (TAT) Analytics
            </h2>
            <p className="text-xs text-slate-500">Benchmark comparison of phlebotomy collection time vs pathologist authorization.</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 uppercase font-mono">Routine Hematology</span>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">1.8 hrs</div>
                <span className="text-[11px] text-slate-500">Benchmark: &lt; 3.0 hrs (98% compliant)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 uppercase font-mono">Biochemistry Panel</span>
                <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">2.4 hrs</div>
                <span className="text-[11px] text-slate-500">Benchmark: &lt; 4.0 hrs (95% compliant)</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-400 uppercase font-mono">Microbiology Cultures</span>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">44.0 hrs</div>
                <span className="text-[11px] text-slate-500">Incubation standard: 48-72 hrs</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── MODAL: Enter & Authorize Diagnostic Test Parameters ── */}
      <Modal
        open={resultEntryModalOpen}
        onClose={() => {
          setResultEntryModalOpen(false);
          setSelectedOrderForEdit(null);
        }}
        title="Pathology Diagnostic Result Entry & Authorization"
        size="lg"
      >
        {selectedOrderForEdit && (
          <form onSubmit={handleAuthorizeResults} className="space-y-4">
            <div className="bg-teal-50 dark:bg-teal-950/40 p-4 rounded-xl border border-teal-200 dark:border-teal-800 text-xs flex justify-between items-center">
              <div>
                <div className="font-bold text-teal-900 dark:text-teal-200 text-sm">
                  {selectedOrderForEdit.testName} ({selectedOrderForEdit.orderNumber})
                </div>
                <div className="text-teal-700 dark:text-teal-400 mt-0.5">
                  Patient: <b>{selectedOrderForEdit.patientName}</b> · UHID: {selectedOrderForEdit.patientUhid || "NO-UHID"}
                </div>
              </div>
              <Badge tone="blue">{selectedOrderForEdit.category}</Badge>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Parameter Readings & Reference Ranges
              </h4>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <Label>Hemoglobin (g/dL)</Label>
                  <Input
                    value={paramValues.Hemoglobin}
                    onChange={(e) => setParamValues({ ...paramValues, Hemoglobin: e.target.value })}
                  />
                  <span className="text-[10px] text-slate-400">Ref: 13.0 - 17.0</span>
                </div>
                <div>
                  <Label>Total WBC (cells/mcL)</Label>
                  <Input
                    value={paramValues["WBC Total"]}
                    onChange={(e) => setParamValues({ ...paramValues, "WBC Total": e.target.value })}
                  />
                  <span className="text-[10px] text-slate-400">Ref: 4,000 - 11,000</span>
                </div>
                <div>
                  <Label>Platelet Count (/mcL)</Label>
                  <Input
                    value={paramValues.Platelets}
                    onChange={(e) => setParamValues({ ...paramValues, Platelets: e.target.value })}
                  />
                  <span className="text-[10px] text-slate-400">Ref: 150,000 - 450,000</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Pathologist Clinical Commentary & Impression</Label>
              <Input
                defaultValue="Erythrocyte morphology normocytic normochromic. Platelets adequate on smear."
                placeholder="Pathology remarks"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setResultEntryModalOpen(false);
                  setSelectedOrderForEdit(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Sign & Authorize Diagnostic Report
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default LabERP;
