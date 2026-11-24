import React, { useState } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import type { BiomedicalEquipment, GatePass, DailyWorksheetEntry } from "../store/types";
import {
  Box,
  LayoutDashboard,
  Wrench,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  LogOut,
  History,
  Upload,
  FolderArchive,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Download,
} from "lucide-react";

export const EquipmentsERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "equip_dashboard" }) => {
  const { data, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";

  const [activeTool, setActiveTool] = useState<string>(initialAction);
  const [searchQuery, setSearchQuery] = useState("");
  const [equipModalOpen, setEquipModalOpen] = useState(false);
  const [gatePassModalOpen, setGatePassModalOpen] = useState(false);
  const [worksheetModalOpen, setWorksheetModalOpen] = useState(false);

  // In-memory Biomedical Equipments Register
  const [equipments, setEquipments] = useState<BiomedicalEquipment[]>([
    {
      id: "eq_1",
      branchId,
      name: "Hamilton C6 Intensive Care Ventilator",
      model: "HAM-C6-PRO",
      serialNumber: "SN-VNT-88192",
      department: "ICU (Bay 1)",
      location: "Main ICU Complex Room 102",
      status: "working",
      purchaseDate: "2024-03-15",
      warrantyExpiry: "2027-03-14",
      amcVendor: "Hamilton Medical India",
      lastServiceDate: "2026-10-12",
      nextServiceDue: "2027-01-12",
      createdAt: new Date().toISOString(),
    },
    {
      id: "eq_2",
      branchId,
      name: "Philips HeartStart XL+ Biphasic Defibrillator",
      model: "XL-PLUS-2024",
      serialNumber: "SN-DFB-40912",
      department: "Emergency / Trauma",
      location: "Crash Cart Bay A",
      status: "working",
      purchaseDate: "2023-08-10",
      warrantyExpiry: "2026-08-09",
      amcVendor: "Philips Healthcare",
      lastServiceDate: "2026-11-01",
      nextServiceDue: "2027-02-01",
      createdAt: new Date().toISOString(),
    },
    {
      id: "eq_3",
      branchId,
      name: "Mindray BeneView T8 Multi-Para Patient Monitor",
      model: "BV-T8-ULTRA",
      serialNumber: "SN-MON-99102",
      department: "Operation Theatre (OT 2)",
      location: "Main Surgical Suite",
      status: "calibration_due",
      purchaseDate: "2024-01-20",
      warrantyExpiry: "2027-01-19",
      amcVendor: "Mindray Bio-Medical",
      lastServiceDate: "2026-08-15",
      nextServiceDue: "2026-11-15",
      createdAt: new Date().toISOString(),
    },
    {
      id: "eq_4",
      branchId,
      name: "Tuttnauer 3870E Large Autoclave Sterilizer",
      model: "3870E-AUTO",
      serialNumber: "SN-STZ-11928",
      department: "CSSD (Sterilization)",
      location: "Ground Floor CSSD Dept",
      status: "under_maintenance",
      purchaseDate: "2023-11-05",
      amcVendor: "Tuttnauer India Support",
      lastServiceDate: "2026-11-18",
      nextServiceDue: "2026-11-26",
      createdAt: new Date().toISOString(),
    },
  ]);

  // Gate Passes Register
  const [gatePasses, setGatePasses] = useState<GatePass[]>([
    {
      id: "gp_1",
      passNumber: "GP-2026-084",
      equipmentId: "eq_4",
      equipmentName: "Tuttnauer 3870E Steam Pressure Chamber Assembly",
      purpose: "Repair",
      vendorName: "Precision Bio-Engineering Services",
      issuedDate: "2026-11-20",
      expectedReturnDate: "2026-11-27",
      status: "outward",
      authorizedBy: "Biomedical Engr. Sundar",
      contactPerson: "Mr. Karthik (+91 98400 12345)",
      remarks: "High pressure chamber seal replacement under warranty",
      createdAt: new Date().toISOString(),
    },
    {
      id: "gp_2",
      passNumber: "GP-2026-085",
      equipmentName: "Drager Anesthesia Vaporizer (Sevoflurane)",
      purpose: "Calibration",
      vendorName: "Drager Medical India Calibration Lab",
      issuedDate: "2026-11-15",
      expectedReturnDate: "2026-11-22",
      actualReturnDate: "2026-11-21",
      status: "returned",
      authorizedBy: "Biomedical Engr. Sundar",
      contactPerson: "Service Desk (+91 44 2400 9000)",
      remarks: "Annual NABL calibration certificate obtained",
      createdAt: new Date().toISOString(),
    },
  ]);

  // Daily Worksheets Log
  const [worksheets, setWorksheets] = useState<DailyWorksheetEntry[]>([
    {
      id: "ws_1",
      date: "2026-11-24",
      equipmentId: "eq_1",
      equipmentName: "Hamilton C6 Ventilator",
      checkedBy: "Engr. Sundar (BME)",
      status: "operational",
      actionTaken: "Pre-use calibration test & O2 cell sensor check passed.",
      remarks: "All pressure alarms functioning within tolerance.",
    },
    {
      id: "ws_2",
      date: "2026-11-24",
      equipmentId: "eq_2",
      equipmentName: "Philips HeartStart Defibrillator",
      checkedBy: "Engr. Sundar (BME)",
      status: "operational",
      actionTaken: "30-Joule discharge self-test verified. Battery status 100%.",
      remarks: "Pads expiration checked: Valid till Oct 2027.",
    },
    {
      id: "ws_3",
      date: "2026-11-24",
      equipmentId: "eq_3",
      equipmentName: "Mindray Patient Monitor T8",
      checkedBy: "Engr. Sundar (BME)",
      status: "minor_fault",
      actionTaken: "SpO2 cable sensor connector intermittent.",
      remarks: "Replaced with backup adult sensor cable. Primary sent for repair.",
    },
  ]);

  // Document Uploads State
  const [documents, setDocuments] = useState([
    { id: "doc_1", title: "Hamilton C6 Ventilator - Service Manual & Schematics", category: "Service Manual", size: "14.2 MB", uploadDate: "2026-03-15", uploader: "Admin" },
    { id: "doc_2", title: "Philips Defibrillator NABL Calibration Certificate 2026", category: "Calibration Certificate", size: "2.8 MB", uploadDate: "2026-08-10", uploader: "Engr. Sundar" },
    { id: "doc_3", title: "Comprehensive Annual Maintenance Contract (CAMC) Agreement", category: "AMC Contract", size: "4.5 MB", uploadDate: "2026-01-10", uploader: "Admin" },
  ]);

  // Form states
  const [newEquipForm, setNewEquipForm] = useState({
    name: "",
    model: "",
    serialNumber: "",
    department: "ICU (Bay 1)",
    location: "Main Medical Wing",
    status: "working" as any,
    amcVendor: "",
    nextServiceDue: "2027-02-15",
  });

  const [newGatePassForm, setNewGatePassForm] = useState({
    equipmentName: "",
    purpose: "Repair" as any,
    vendorName: "",
    expectedReturnDate: "2026-12-01",
    contactPerson: "",
    remarks: "",
  });

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipForm.name.trim() || !newEquipForm.serialNumber.trim()) {
      flashToast("Please provide equipment name and serial number", "warn");
      return;
    }

    const newEquip: BiomedicalEquipment = {
      id: "eq_" + Date.now(),
      branchId,
      name: newEquipForm.name.trim(),
      model: newEquipForm.model.trim() || "STD-2026",
      serialNumber: newEquipForm.serialNumber.trim(),
      department: newEquipForm.department,
      location: newEquipForm.location,
      status: newEquipForm.status,
      purchaseDate: new Date().toISOString().slice(0, 10),
      amcVendor: newEquipForm.amcVendor.trim() || "Authorized Service Partner",
      nextServiceDue: newEquipForm.nextServiceDue,
      createdAt: new Date().toISOString(),
    };

    setEquipments([newEquip, ...equipments]);
    log("EQUIPMENT_REGISTERED", `Added ${newEquip.name} (${newEquip.serialNumber})`);
    flashToast(`Biomedical asset ${newEquip.name} registered!`);
    setEquipModalOpen(false);
  };

  const handleCreateGatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGatePassForm.equipmentName.trim() || !newGatePassForm.vendorName.trim()) {
      flashToast("Please provide equipment and vendor name", "warn");
      return;
    }

    const passNumber = `GP-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newPass: GatePass = {
      id: "gp_" + Date.now(),
      passNumber,
      equipmentName: newGatePassForm.equipmentName.trim(),
      purpose: newGatePassForm.purpose,
      vendorName: newGatePassForm.vendorName.trim(),
      issuedDate: new Date().toISOString().slice(0, 10),
      expectedReturnDate: newGatePassForm.expectedReturnDate,
      status: "outward",
      authorizedBy: currentUser?.name || "Biomedical Engineer",
      contactPerson: newGatePassForm.contactPerson.trim(),
      remarks: newGatePassForm.remarks.trim(),
      createdAt: new Date().toISOString(),
    };

    setGatePasses([newPass, ...gatePasses]);
    log("GATE_PASS_ISSUED", `Issued outward pass ${passNumber} for ${newPass.equipmentName}`);
    flashToast(`Gate Pass ${passNumber} issued!`);
    setGatePassModalOpen(false);
  };

  const filteredEquipments = equipments.filter((eq) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      eq.name.toLowerCase().includes(q) ||
      eq.serialNumber.toLowerCase().includes(q) ||
      eq.department.toLowerCase().includes(q) ||
      eq.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-lg border border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-sky-500/30 text-sky-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-400/40">
              Biomedical Engineering & Assets
            </span>
            <span className="text-xs text-slate-300">Equipments · Daily Worksheets · Gate Passes · Documents</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hospital Equipments & Asset Management</h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Maintain master biomedical assets (Ventilators, Defibrillators, Monitors, Dialysis Units), log daily inspection worksheets, issue outward repair gate passes, and track service contracts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-md"
            onClick={() => setEquipModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Equipment
          </Button>
          <Button
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            onClick={() => setGatePassModalOpen(true)}
          >
            <LogOut className="w-3.5 h-3.5 mr-1 text-amber-300" />
            Issue Gate Pass
          </Button>
        </div>
      </div>

      {/* Tool Navigation Switcher */}
      <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs overflow-x-auto">
        <div className="flex items-center gap-2 font-medium">
          <span className="text-slate-400 font-mono uppercase">ACTIVE TOOL:</span>
          <span className="bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-md font-bold shadow-xs">
            {activeTool.replace("_", " ").toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTool("equip_dashboard")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 font-medium"
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTool("equipments_list")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 font-medium"
          >
            Equipments List
          </button>
          <button
            onClick={() => setActiveTool("daily_worksheet")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 font-medium"
          >
            Daily Worksheet
          </button>
          <button
            onClick={() => setActiveTool("gate_pass_mgmt")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 font-medium"
          >
            Gate Pass
          </button>
          <button
            onClick={() => setActiveTool("documents_report")}
            className="px-2.5 py-1 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 font-medium"
          >
            Documents
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Total Biomedical Assets</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{equipments.length}</div>
          <span className="text-xs text-slate-500">Master register</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Operational & Working</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {equipments.filter((e) => e.status === "working").length}
          </div>
          <span className="text-xs text-slate-500">100% Verified in wards</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Active Gate Passes</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {gatePasses.filter((g) => g.status === "outward").length}
          </div>
          <span className="text-xs text-slate-500">Items outside for repair</span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Daily Inspections Logged</div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-2">{worksheets.length}</div>
          <span className="text-xs text-slate-500">Today's engineer checklist</span>
        </div>
      </div>

      {/* ── TOOL VIEW: Dashboard & Equipments Master List ── */}
      {(activeTool === "equip_dashboard" || activeTool === "equipments_list") && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-600" />
                Master Biomedical Equipment Inventory & Status
              </h2>
              <p className="text-xs text-slate-500">Asset locations, serial tags, AMC contracts, and next service calibration dates.</p>
            </div>
            <div className="w-72">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search equipment or serial #..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Equipment Name</th>
                    <th className="py-3 px-4">Model & Serial #</th>
                    <th className="py-3 px-4">Department & Location</th>
                    <th className="py-3 px-4">AMC Vendor</th>
                    <th className="py-3 px-4">Next Service Due</th>
                    <th className="py-3 px-4">Operational Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredEquipments.map((eq) => (
                    <tr key={eq.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{eq.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        <div>{eq.model}</div>
                        <div className="text-[10px] text-slate-400">{eq.serialNumber}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{eq.department}</div>
                        <div className="text-[10px] text-slate-400">{eq.location}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{eq.amcVendor}</td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{fmtDate(eq.nextServiceDue)}</td>
                      <td className="py-3 px-4">
                        <Badge
                          tone={
                            eq.status === "working"
                              ? "green"
                              : eq.status === "calibration_due"
                              ? "amber"
                              : "red"
                          }
                        >
                          {eq.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7 px-2"
                          onClick={() => flashToast(`Service worksheet logged for ${eq.name}`)}
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                          Inspect
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

      {/* ── TOOL VIEW: Daily Worksheet ── */}
      {(activeTool === "daily_worksheet" || activeTool === "worksheet_report") && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              Biomedical Engineer Daily Inspection Worksheet
            </h2>
            <p className="text-xs text-slate-500">Routine pre-use checks, electrical safety, calibration readings, and sensor tests.</p>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Equipment Inspected</th>
                    <th className="py-3 px-4">Inspecting Engineer</th>
                    <th className="py-3 px-4">Status & Finding</th>
                    <th className="py-3 px-4">Action Taken & Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {worksheets.map((ws) => (
                    <tr key={ws.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">{fmtDate(ws.date)}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{ws.equipmentName}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{ws.checkedBy}</td>
                      <td className="py-3 px-4">
                        <Badge tone={ws.status === "operational" ? "green" : "amber"}>
                          {ws.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                        <div>{ws.actionTaken}</div>
                        <div className="text-[11px] text-slate-400">{ws.remarks}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── TOOL VIEW: Gate Pass Management ── */}
      {(activeTool === "gate_pass_mgmt" || activeTool === "gate_pass_report") && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <LogOut className="w-4 h-4 text-amber-500" />
                Equipment Outward Gate Pass Register
              </h2>
              <p className="text-xs text-slate-500">Security authorization for biomedical units taken outside hospital premises for repair.</p>
            </div>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs" onClick={() => setGatePassModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Gate Pass
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Pass #</th>
                    <th className="py-3 px-4">Equipment Dispatched</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Vendor & Contact</th>
                    <th className="py-3 px-4">Dispatch Date</th>
                    <th className="py-3 px-4">Expected Return</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {gatePasses.map((gp) => (
                    <tr key={gp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">{gp.passNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{gp.equipmentName}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{gp.purpose}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div>{gp.vendorName}</div>
                        <div className="text-[10px] text-slate-400">{gp.contactPerson}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{fmtDate(gp.issuedDate)}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{fmtDate(gp.expectedReturnDate)}</td>
                      <td className="py-3 px-4">
                        <Badge tone={gp.status === "returned" ? "green" : "amber"}>{gp.status.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7 px-2"
                          onClick={() => window.print()}
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          Print Pass
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

      {/* ── TOOL VIEW: Documents & Manuals Repository ── */}
      {(activeTool === "document_upload" || activeTool === "documents_report") && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-indigo-500" />
                Equipment Manuals, Schematics & AMC Document Vault
              </h2>
              <p className="text-xs text-slate-500">Repository of digital PDF operator guides, calibration certificates, and service contracts.</p>
            </div>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              onClick={() => flashToast("Document upload dialog launched!")}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Upload PDF
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">File Size</th>
                    <th className="py-3 px-4">Upload Date</th>
                    <th className="py-3 px-4">Uploaded By</th>
                    <th className="py-3 px-4 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        {doc.title}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">{doc.category}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{doc.size}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{fmtDate(doc.uploadDate)}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{doc.uploader}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7 px-2"
                          onClick={() => flashToast(`Downloading ${doc.title}`)}
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          View
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

      {/* ── MODAL: Add Equipment ── */}
      <Modal
        open={equipModalOpen}
        onClose={() => setEquipModalOpen(false)}
        title="Register New Biomedical Equipment"
        size="md"
      >
        <form onSubmit={handleAddEquipment} className="space-y-4">
          <div>
            <Label>Equipment Name & Description *</Label>
            <Input
              required
              value={newEquipForm.name}
              onChange={(e) => setNewEquipForm({ ...newEquipForm, name: e.target.value })}
              placeholder="e.g. Hamilton C6 ICU Ventilator"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Model Number</Label>
              <Input
                value={newEquipForm.model}
                onChange={(e) => setNewEquipForm({ ...newEquipForm, model: e.target.value })}
                placeholder="e.g. C6-PRO-2026"
              />
            </div>
            <div>
              <Label>Serial Tag # *</Label>
              <Input
                required
                value={newEquipForm.serialNumber}
                onChange={(e) => setNewEquipForm({ ...newEquipForm, serialNumber: e.target.value })}
                placeholder="e.g. SN-881920"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <Select
                value={newEquipForm.department}
                onChange={(e) => setNewEquipForm({ ...newEquipForm, department: e.target.value })}
              >
                <option value="ICU (Bay 1)">ICU (Bay 1)</option>
                <option value="Operation Theatre (OT 2)">Operation Theatre</option>
                <option value="Emergency / Trauma">Emergency / Trauma</option>
                <option value="CSSD (Sterilization)">CSSD Dept</option>
                <option value="Dialysis Unit">Dialysis Unit</option>
              </Select>
            </div>
            <div>
              <Label>Operational Status</Label>
              <Select
                value={newEquipForm.status}
                onChange={(e) => setNewEquipForm({ ...newEquipForm, status: e.target.value as any })}
              >
                <option value="working">Working (Operational)</option>
                <option value="calibration_due">Calibration Due</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="breakdown">Breakdown</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>AMC / CMC Service Vendor</Label>
            <Input
              value={newEquipForm.amcVendor}
              onChange={(e) => setNewEquipForm({ ...newEquipForm, amcVendor: e.target.value })}
              placeholder="e.g. Philips Healthcare Support"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setEquipModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-semibold">
              Save Equipment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Issue Gate Pass ── */}
      <Modal
        open={gatePassModalOpen}
        onClose={() => setGatePassModalOpen(false)}
        title="Issue Outward Equipment Gate Pass"
        size="md"
      >
        <form onSubmit={handleCreateGatePass} className="space-y-4">
          <div>
            <Label>Equipment Item to Dispatch *</Label>
            <Input
              required
              value={newGatePassForm.equipmentName}
              onChange={(e) => setNewGatePassForm({ ...newGatePassForm, equipmentName: e.target.value })}
              placeholder="e.g. Drager Anesthesia Vaporizer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dispatch Purpose</Label>
              <Select
                value={newGatePassForm.purpose}
                onChange={(e) => setNewGatePassForm({ ...newGatePassForm, purpose: e.target.value as any })}
              >
                <option value="Repair">Repair / Overhaul</option>
                <option value="Calibration">NABL Calibration</option>
                <option value="Transfer">Inter-Branch Transfer</option>
                <option value="Vendor Demo">Vendor Demo Return</option>
                <option value="Scrap">Condemned / Scrap</option>
              </Select>
            </div>
            <div>
              <Label>Expected Return Date</Label>
              <Input
                type="date"
                value={newGatePassForm.expectedReturnDate}
                onChange={(e) => setNewGatePassForm({ ...newGatePassForm, expectedReturnDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Service Center / Vendor *</Label>
              <Input
                required
                value={newGatePassForm.vendorName}
                onChange={(e) => setNewGatePassForm({ ...newGatePassForm, vendorName: e.target.value })}
                placeholder="e.g. Mindray Precision Care"
              />
            </div>
            <div>
              <Label>Vendor Contact Person / Phone</Label>
              <Input
                value={newGatePassForm.contactPerson}
                onChange={(e) => setNewGatePassForm({ ...newGatePassForm, contactPerson: e.target.value })}
                placeholder="e.g. Mr. Rajesh (98401 23456)"
              />
            </div>
          </div>

          <div>
            <Label>Remarks / Fault Description</Label>
            <Input
              value={newGatePassForm.remarks}
              onChange={(e) => setNewGatePassForm({ ...newGatePassForm, remarks: e.target.value })}
              placeholder="e.g. Flow sensor calibration error during OT run"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setGatePassModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
              <LogOut className="w-4 h-4 mr-1.5" />
              Authorize & Print Gate Pass
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EquipmentsERP;
