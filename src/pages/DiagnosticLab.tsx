import React, { useState, useMemo } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Modal, Badge } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import { LAB_CATALOG, checkParameterAbnormal } from "../utils/labCatalog";
import { getLabReportQrUrl } from "../utils/uhidGenerator";
import type { LabOrder, LabTestParameter } from "../store/types";
import {
  FlaskConical,
  TestTube,
  CheckCircle2,
  Clock,
  Printer,
  Search,
  AlertTriangle,
  FileText,
  User,
  Plus,
  Send,
  Droplet,
  ShieldCheck,
  ChevronRight,
  Filter,
} from "lucide-react";

export const DiagnosticLab: React.FC<{
  onNavigateToBilling?: () => void;
  onNavigateToVisitTrail?: (uhid: string) => void;
}> = ({ onNavigateToBilling, onNavigateToVisitTrail }) => {
  const { data, setData, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";

  const labOrders = data.labOrders || [];
  const patients = data.patients || [];
  const doctors = data.doctors || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Manual Order Modal
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    patientId: patients[0]?.id || "",
    doctorId: doctors[0]?.id || "",
    catalogTestId: LAB_CATALOG[0]?.id || "",
  });

  // Result Entry Modal State
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedOrderForResults, setSelectedOrderForResults] = useState<LabOrder | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [technicianNotes, setTechnicianNotes] = useState("");

  // Report Print Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<LabOrder | null>(null);

  // Metrics
  const pendingCollection = labOrders.filter((o) => o.status === "ordered").length;
  const processingCount = labOrders.filter((o) => o.status === "sample_collected" || o.status === "processing").length;
  const completedCount = labOrders.filter((o) => o.status === "completed").length;

  // Filtered Lab Orders
  const filteredOrders = useMemo(() => {
    return labOrders.filter((o) => {
      const matchStatus = filterStatus === "all" || o.status === filterStatus;
      const matchCat = filterCategory === "all" || o.category === filterCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.patientName.toLowerCase().includes(q) ||
        (o.patientUhid && o.patientUhid.toLowerCase().includes(q)) ||
        o.testName.toLowerCase().includes(q);
      return matchStatus && matchCat && matchQuery;
    });
  }, [labOrders, filterStatus, filterCategory, searchQuery]);

  // Handler: Create manual lab order
  const handleCreateManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === orderForm.patientId);
    const doctor = doctors.find((d) => d.id === orderForm.doctorId);
    const catalogItem = LAB_CATALOG.find((c) => c.id === orderForm.catalogTestId);

    if (!patient || !catalogItem) {
      flashToast("Select patient and test", "warn");
      return;
    }

    const nextCounter = (data.counters.lab || 200) + 1;
    const orderNumber = `LAB-${nextCounter}`;

    const newOrder: LabOrder = {
      id: "lab_" + Date.now(),
      branchId,
      orderNumber,
      patientId: patient.id,
      patientName: patient.name,
      patientUhid: patient.uhid,
      patientAge: patient.age,
      patientGender: patient.gender,
      doctorId: doctor?.id,
      doctorName: doctor?.name,
      testName: catalogItem.name,
      category: catalogItem.category,
      sampleType: catalogItem.sampleType,
      price: catalogItem.price,
      status: "ordered",
      parameters: catalogItem.parameters.map((p) => ({
        name: p.name,
        value: "",
        unit: p.unit,
        referenceRange: p.referenceRange,
      })),
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      labOrders: [newOrder, ...(prev.labOrders || [])],
      counters: { ...prev.counters, lab: nextCounter },
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || "Lab Tech",
          action: "LAB_TEST_ORDERED",
          details: `Order ${orderNumber}: ${catalogItem.name} for ${patient.name}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    flashToast(`Order ${orderNumber} created for ${patient.name}`);
    setNewOrderModalOpen(false);
  };

  // Handler: Phlebotomy Sample Collected
  const handleMarkSampleCollected = (orderId: string) => {
    setData((prev) => ({
      ...prev,
      labOrders: (prev.labOrders || []).map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "sample_collected",
              collectedAt: new Date().toISOString(),
            }
          : o
      ),
    }));
    flashToast("Sample accessioned & collected!");
  };

  // Open Result Entry
  const openResultEntry = (order: LabOrder) => {
    setSelectedOrderForResults(order);
    const initialMap: Record<string, string> = {};
    const catItem = LAB_CATALOG.find((c) => c.name === order.testName);

    order.parameters.forEach((param) => {
      const defaultVal = catItem?.parameters.find((cp) => cp.name === param.name)?.defaultValue || "";
      initialMap[param.name] = param.value || defaultVal;
    });

    setParamValues(initialMap);
    setTechnicianNotes(order.technicianNotes || "Sample run on automated analyzer. Controls verified.");
    setResultModalOpen(true);
  };

  // Save Results & Complete Order
  const handleSaveResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForResults) return;

    const catItem = LAB_CATALOG.find((c) => c.name === selectedOrderForResults.testName);

    const updatedParams: LabTestParameter[] = selectedOrderForResults.parameters.map((p) => {
      const val = paramValues[p.name] || "";
      const catParam = catItem?.parameters.find((cp) => cp.name === p.name);
      const isAbnormal = checkParameterAbnormal(val, catParam?.lowThreshold, catParam?.highThreshold);

      return {
        ...p,
        value: val,
        isAbnormal,
      };
    });

    setData((prev) => ({
      ...prev,
      labOrders: (prev.labOrders || []).map((o) =>
        o.id === selectedOrderForResults.id
          ? {
              ...o,
              parameters: updatedParams,
              technicianNotes: technicianNotes.trim(),
              status: "completed",
              completedAt: new Date().toISOString(),
            }
          : o
      ),
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || "Lab Tech",
          action: "LAB_RESULTS_VERIFIED",
          details: `Verified report for ${selectedOrderForResults.orderNumber} (${selectedOrderForResults.testName})`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    flashToast(`Diagnostic report for ${selectedOrderForResults.orderNumber} verified!`);
    setResultModalOpen(false);

    // Auto open print preview
    const completedObj = {
      ...selectedOrderForResults,
      parameters: updatedParams,
      status: "completed" as const,
      completedAt: new Date().toISOString(),
      technicianNotes,
    };
    setSelectedOrderForPrint(completedObj);
    setPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-indigo-700/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/30 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-400/40 flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5" />
              Integrated Diagnostic Laboratory Module
            </span>
            <span className="text-xs text-indigo-300">Biochemistry, Hematology & Pathology</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Diagnostic Test Orders & Lab Results</h1>
          <p className="text-indigo-100/80 text-sm max-w-2xl">
            Track test requisitions from doctors and reception, record phlebotomy sample accessioning, evaluate parameter values against biological reference intervals, and generate certified diagnostic reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow-md"
            onClick={() => setNewOrderModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Order Lab Investigation
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Investigations</span>
            <FlaskConical className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{labOrders.length}</div>
          <span className="text-xs text-slate-500">Orders placed</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Awaiting Sample</span>
            <TestTube className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{pendingCollection}</div>
          <span className="text-xs text-slate-500">Pending phlebotomy</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">In Processing</span>
            <Clock className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-2">{processingCount}</div>
          <span className="text-xs text-slate-500">Running on analyzer</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Reports Verified</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{completedCount}</div>
          <span className="text-xs text-slate-500">Reports ready to print</span>
        </div>
      </div>

      {/* Filters & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-40 text-xs py-1.5"
          >
            <option value="all">All Statuses</option>
            <option value="ordered">Awaiting Sample</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="completed">Completed / Verified</option>
          </Select>

          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-40 text-xs py-1.5"
          >
            <option value="all">All Categories</option>
            <option value="Hematology">Hematology</option>
            <option value="Biochemistry">Biochemistry</option>
            <option value="Pathology">Pathology</option>
            <option value="Radiology">Radiology</option>
            <option value="General">General / ECG</option>
          </Select>
        </div>

        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, patient name, UHID, or test..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Lab Orders Queue Table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <TestTube className="w-4 h-4 text-indigo-600" />
              Laboratory Requisition & Processing Queue ({filteredOrders.length})
            </span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <FlaskConical className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">No lab investigations match this filter</p>
              <Button size="sm" onClick={() => setNewOrderModalOpen(true)}>
                Create New Lab Order
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Patient / UHID</th>
                    <th className="py-3 px-4">Investigation Test</th>
                    <th className="py-3 px-4">Specimen Type</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{ord.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{ord.patientUhid || "NO-UHID"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{ord.testName}</div>
                        <span className="text-[10px] text-slate-400">{ord.category}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {ord.sampleType}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-200">
                        ₹{ord.price}
                      </td>
                      <td className="py-3 px-4">
                        <Badge tone={
                          ord.status === "completed"
                            ? "green"
                            : ord.status === "sample_collected"
                            ? "blue"
                            : "amber"
                        }>
                          {ord.status === "ordered" ? "Awaiting Sample" : ord.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ord.status === "ordered" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-7 px-2"
                              onClick={() => handleMarkSampleCollected(ord.id)}
                            >
                              <TestTube className="w-3 h-3 mr-1 text-amber-500" />
                              Collect Sample
                            </Button>
                          )}

                          {ord.status === "sample_collected" && (
                            <Button
                              size="sm"
                              className="text-xs h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => openResultEntry(ord)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Enter Results
                            </Button>
                          )}

                          {ord.status === "completed" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-7 px-2 text-indigo-700 dark:text-indigo-300"
                              onClick={() => {
                                setSelectedOrderForPrint(ord);
                                setPrintModalOpen(true);
                              }}
                            >
                              <Printer className="w-3 h-3 mr-1" />
                              Report
                            </Button>
                          )}

                          {onNavigateToVisitTrail && ord.patientUhid && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-1.5"
                              onClick={() => onNavigateToVisitTrail(ord.patientUhid!)}
                            >
                              Trail
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

      {/* ── MODAL: Create Manual Lab Order ── */}
      <Modal
        open={newOrderModalOpen}
        onClose={() => setNewOrderModalOpen(false)}
        title="Requisition Diagnostic Laboratory Test"
        size="md"
      >
        <form onSubmit={handleCreateManualOrder} className="space-y-4">
          <div>
            <Label>Patient *</Label>
            <Select
              required
              value={orderForm.patientId}
              onChange={(e) => setOrderForm({ ...orderForm, patientId: e.target.value })}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.uhid || "UHID"})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Referring Doctor</Label>
            <Select
              value={orderForm.doctorId}
              onChange={(e) => setOrderForm({ ...orderForm, doctorId: e.target.value })}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.department || "Consultant"})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Select Diagnostic Test from Catalog *</Label>
            <Select
              required
              value={orderForm.catalogTestId}
              onChange={(e) => setOrderForm({ ...orderForm, catalogTestId: e.target.value })}
            >
              {LAB_CATALOG.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.name} — {test.category} (₹{test.price})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setNewOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Place Lab Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Result Entry & Biological Reference Checking ── */}
      <Modal
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title={`Enter Diagnostic Findings: ${selectedOrderForResults?.testName} (${selectedOrderForResults?.orderNumber})`}
        size="lg"
      >
        {selectedOrderForResults && (
          <form onSubmit={handleSaveResults} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex items-center justify-between border border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100">{selectedOrderForResults.patientName}</span>
                <span className="text-slate-400 font-mono ml-2">UHID: {selectedOrderForResults.patientUhid}</span>
              </div>
              <span className="text-slate-500">Specimen: <b>{selectedOrderForResults.sampleType}</b></span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">Parameter Name</th>
                    <th className="py-2.5 px-3">Measured Result Value</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Biological Reference Interval</th>
                    <th className="py-2.5 px-3">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {selectedOrderForResults.parameters.map((param, idx) => {
                    const val = paramValues[param.name] || "";
                    const catItem = LAB_CATALOG.find((c) => c.name === selectedOrderForResults.testName);
                    const catParam = catItem?.parameters.find((cp) => cp.name === param.name);
                    const isAbnormal = checkParameterAbnormal(val, catParam?.lowThreshold, catParam?.highThreshold);

                    return (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {param.name}
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            required
                            value={val}
                            onChange={(e) => setParamValues({ ...paramValues, [param.name]: e.target.value })}
                            className="text-xs py-1 w-32 font-bold"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono">{param.unit || "—"}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{param.referenceRange}</td>
                        <td className="py-2 px-3">
                          {val ? (
                            isAbnormal ? (
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-bold border border-rose-200 text-[10px]">
                                ABNORMAL
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium text-[10px]">
                                Normal
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <Label>Technician / Pathologist Observations</Label>
              <Input
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                placeholder="e.g. Repeated and verified on Cobas Analyzer. Internal controls OK."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button variant="secondary" onClick={() => setResultModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Verify & Finalize Diagnostic Report
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MODAL: Printable Diagnostic Laboratory Report ── */}
      <Modal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Diagnostic Laboratory Examination Report"
        size="lg"
      >
        {selectedOrderForPrint && (
          <div className="space-y-4">
            <div className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Report Header */}
              <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl">
                    +
                  </div>
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                      Cura Multispecialty Hospital
                    </h2>
                    <p className="text-xs text-slate-500">
                      Department of Diagnostic Pathology & Clinical Laboratory · NABL Accredited Standard
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-indigo-700 text-sm">{selectedOrderForPrint.orderNumber}</span>
                  <div className="text-[11px] text-slate-500">Ref: {selectedOrderForPrint.doctorName || "Self / OPD"}</div>
                </div>
              </div>

              {/* Patient Banner */}
              <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Patient Name</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedOrderForPrint.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Digital UHID</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedOrderForPrint.patientUhid}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Age / Gender</span>
                  <span className="font-semibold text-slate-800">{selectedOrderForPrint.patientAge || "—"} yrs / {selectedOrderForPrint.patientGender || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Collected / Reported</span>
                  <span className="text-slate-800 font-mono">{fmtDateTime(selectedOrderForPrint.completedAt || new Date().toISOString())}</span>
                </div>
              </div>

              {/* Test Name & Category Banner */}
              <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-900 text-sm">{selectedOrderForPrint.testName}</span>
                <span className="text-indigo-700 font-medium">Specimen: {selectedOrderForPrint.sampleType}</span>
              </div>

              {/* Parameter Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100 text-[11px] uppercase text-slate-600 font-bold">
                    <th className="py-2 px-3">Test Investigation Parameter</th>
                    <th className="py-2 px-3">Observed Value</th>
                    <th className="py-2 px-3">Unit</th>
                    <th className="py-2 px-3">Reference Range</th>
                    <th className="py-2 px-3">Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedOrderForPrint.parameters.map((p, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-sm">
                        <span className={p.isAbnormal ? "text-rose-600 font-extrabold" : "text-slate-900"}>
                          {p.value}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{p.unit || "—"}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.referenceRange}</td>
                      <td className="py-2.5 px-3">
                        {p.isAbnormal ? (
                          <span className="text-rose-600 font-bold text-[11px]">ABNORMAL</span>
                        ) : (
                          <span className="text-emerald-600 font-medium text-[11px]">NORMAL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedOrderForPrint.technicianNotes && (
                <div className="text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                  <b>Pathologist Remarks:</b> {selectedOrderForPrint.technicianNotes}
                </div>
              )}

              {/* Signatures & QR Authentication Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <img
                    src={getLabReportQrUrl(selectedOrderForPrint.orderNumber, selectedOrderForPrint.patientUhid || "")}
                    alt="Lab Report QR"
                    className="w-16 h-16"
                  />
                  <div className="text-[11px] text-slate-500">
                    <div><b>Certified Diagnostic Report</b></div>
                    <div className="text-slate-400 text-[10px]">Digitally signed and cryptographically verifiable</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-serif italic text-base text-slate-800">Dr. M. K. Sen, MD (Pathology)</div>
                  <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">Chief Pathologist & Lab Director</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setPrintModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => window.print()} className="bg-indigo-600 text-white">
                <Printer className="w-4 h-4 mr-1.5" />
                Print Certified Lab Report
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DiagnosticLab;
