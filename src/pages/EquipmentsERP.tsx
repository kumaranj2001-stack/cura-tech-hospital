import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Badge, Modal, Input, Select, Label, EmptyState, Th, Td } from "../components/ui";
import { fmtCurrency, flashToast, downloadCSV, today } from "../utils/helpers";
import { erpGet, erpMutate, useErpRealtime } from "../utils/erpApi";
import {
  Box,
  Wrench,
  ClipboardCheck,
  LogOut,
  Upload,
  Plus,
  RefreshCw,
  Download,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface EquipmentItem {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  department: string;
  location: string;
  status: string;
  warrantyExpiry?: string;
  amcVendor?: string;
  lastServiceDate?: string;
  nextServiceDue?: string;
}

interface DailyWorksheet {
  id: string;
  date: string;
  equipmentId?: string;
  equipmentName: string;
  checkedBy: string;
  status: string;
  actionTaken: string;
  remarks?: string;
}

interface GatePass {
  id: string;
  passNumber: string;
  equipmentName: string;
  purpose: string;
  vendorName: string;
  issuedDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: string;
  authorizedBy?: string;
  remarks?: string;
}

interface EquipDocument {
  id: string;
  title: string;
  category: string;
  size: string;
  uploadDate: string;
  uploader: string;
}

interface ServiceLog {
  id: string;
  equipmentId?: string;
  equipmentName: string;
  serviceDate: string;
  engineerName: string;
  description: string;
  cost: number;
}

const EQUIP_TITLES: Record<string, string> = {
  equip_dashboard: "Biomedical Equipments Dashboard",
  equipments_list: "Biomedical Asset & Warranty Register",
  daily_worksheet: "Daily BME Preventive Check Worksheet",
  service_report: "Preventive Maintenance & Service Report",
  worksheet_report: "Daily Inspection Worksheet History",
  gate_pass_mgmt: "Outward / Returnable Equipment Gate Pass",
  gate_pass_report: "Gate Pass Movement Register",
  document_upload: "Upload Calibration & Service Documents",
  documents_report: "Equipment Manuals & Compliance Archive",
};

export const EquipmentsERP: React.FC<{ initialAction?: string; dropdownOption?: string }> = ({
  initialAction = "equip_dashboard",
  dropdownOption,
}) => {
  const { currentBranch, viewBranchId, currentUser, log } = useStore();
  const currentBranchId = viewBranchId || currentBranch?.id || "br_main";
  const [activeTool, setActiveTool] = useState(initialAction);
  const [loading, setLoading] = useState(false);

  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [worksheets, setWorksheets] = useState<DailyWorksheet[]>([]);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [documents, setDocuments] = useState<EquipDocument[]>([]);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);

  const [eqModalOpen, setEqModalOpen] = useState(false);
  const [wsModalOpen, setWsModalOpen] = useState(false);
  const [gpModalOpen, setGpModalOpen] = useState(false);
  const [srvModalOpen, setSrvModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);

  const [eqForm, setEqForm] = useState({ name: "", model: "", serialNumber: "", department: "ICU", location: "ICU Floor 1", status: "working", amcVendor: "", warrantyExpiry: "2027-12-31" });
  const [wsForm, setWsForm] = useState({ equipmentName: "", status: "operational", actionTaken: "Calibration & alarm verification passed", remarks: "" });
  const [gpForm, setGpForm] = useState({ equipmentName: "", purpose: "Calibration", vendorName: "", expectedReturnDate: today(), remarks: "" });
  const [srvForm, setSrvForm] = useState({ equipmentName: "", engineerName: "Engr. Sundar (BME)", description: "", cost: "2500" });
  const [docForm, setDocForm] = useState({ title: "", category: "Calibration Certificate", size: "1.8 MB" });

  useEffect(() => {
    if (initialAction) setActiveTool(initialAction);
  }, [initialAction, dropdownOption]);

  const loadEquipments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpGet("/api/equipments");
      setEquipments(res.equipments || []);
      setWorksheets(res.worksheets || []);
      setGatePasses(res.gatePasses || []);
      setDocuments(res.documents || []);
      setServiceLogs(res.serviceLogs || []);
    } catch (err: any) {
      flashToast(err?.message || "Failed loading equipments ERP", "warn");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEquipments();
  }, [loadEquipments]);

  useErpRealtime("equipments", loadEquipments);

  const maintenanceDueCount = useMemo(() => equipments.filter((e) => e.status !== "working").length, [equipments]);
  const outwardGpCount = useMemo(() => gatePasses.filter((g) => g.status === "outward").length, [gatePasses]);

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqForm.name.trim()) return flashToast("Equipment name required", "warn");
    try {
      await erpMutate("/api/equipments", {
        action: "equipment",
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        ...eqForm,
        lastServiceDate: today(),
      });
      setEqModalOpen(false);
      setEqForm({ name: "", model: "", serialNumber: "", department: "ICU", location: "ICU Floor 1", status: "working", amcVendor: "", warrantyExpiry: "2027-12-31" });
      await loadEquipments();
      flashToast("Biomedical asset registered", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed adding equipment", "warn");
    }
  };

  const handleSaveWorksheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsForm.equipmentName.trim()) return flashToast("Select or enter equipment", "warn");
    try {
      await erpMutate("/api/equipments", {
        action: "worksheet",
        ...wsForm,
        checkedBy: currentUser?.name || "BME Engineer",
        date: today(),
      });
      setWsModalOpen(false);
      setWsForm({ equipmentName: "", status: "operational", actionTaken: "Calibration & alarm verification passed", remarks: "" });
      await loadEquipments();
      flashToast("Daily BME worksheet logged", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed saving worksheet", "warn");
    }
  };

  const handleSaveGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gpForm.equipmentName.trim() || !gpForm.vendorName.trim()) return flashToast("Equipment and vendor required", "warn");
    try {
      await erpMutate("/api/equipments", {
        action: "gate-pass",
        ...gpForm,
        issuedDate: today(),
        status: "outward",
        authorizedBy: currentUser?.name || "BME Desk",
      });
      setGpModalOpen(false);
      setGpForm({ equipmentName: "", purpose: "Calibration", vendorName: "", expectedReturnDate: today(), remarks: "" });
      await loadEquipments();
      flashToast("Outward gate pass issued", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed issuing gate pass", "warn");
    }
  };

  const handleReturnGatePass = async (gp: GatePass) => {
    try {
      await erpMutate("/api/equipments", { action: "gate-pass", id: gp.id, status: "returned", actualReturnDate: today() }, "PUT");
      await loadEquipments();
      flashToast(`Marked ${gp.passNumber} returned`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Gate pass update failed", "warn");
    }
  };

  const handleSaveServiceLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvForm.equipmentName.trim() || !srvForm.description.trim()) return flashToast("Equipment and service description required", "warn");
    try {
      await erpMutate("/api/equipments", {
        action: "service",
        ...srvForm,
        cost: Number(srvForm.cost) || 0,
        serviceDate: today(),
      });
      log("EQUIPMENT_SERVICE", `Logged service for ${srvForm.equipmentName}`);
      setSrvModalOpen(false);
      setSrvForm({ equipmentName: "", engineerName: "Engr. Sundar (BME)", description: "", cost: "2500" });
      await loadEquipments();
      flashToast("Equipment service report logged", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed logging service", "warn");
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title.trim()) return flashToast("Document title required", "warn");
    try {
      await erpMutate("/api/equipments", {
        action: "document",
        ...docForm,
        uploader: currentUser?.name || "BME Desk",
      });
      setDocModalOpen(false);
      setDocForm({ title: "", category: "Calibration Certificate", size: "1.8 MB" });
      await loadEquipments();
      flashToast("Equipment document archived", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed uploading document", "warn");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Box className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{EQUIP_TITLES[activeTool] || "Biomedical Equipments ERP"}</h1>
            {loading && <Badge tone="amber">Syncing...</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Asset lifecycle, NABL calibration logs, outward gate passes & BME documentation</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={loadEquipments}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button variant="secondary" size="sm" onClick={() => setWsModalOpen(true)}><ClipboardCheck className="w-4 h-4" /> Log Worksheet</Button>
          <Button variant="primary" size="sm" onClick={() => setEqModalOpen(true)}><Plus className="w-4 h-4" /> Add Equipment</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Registered Assets</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{equipments.length}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Calibration / Service Due</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{maintenanceDueCount}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Outward Gate Passes</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{outwardGpCount}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Compliance Docs</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{documents.length}</div>
        </Card>
      </div>

      {/* Conditional Sections */}
      {activeTool === "daily_worksheet" || activeTool === "worksheet_report" ? (
        <Card>
          <CardHeader
            title="Daily Biomedical Inspection Worksheets"
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadCSV("bme_worksheets.csv", worksheets as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>
                <Button size="sm" onClick={() => setWsModalOpen(true)}><Plus className="w-3.5 h-3.5" /> New Entry</Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Date</Th><Th>Equipment</Th><Th>Engineer</Th><Th>Action Taken</Th><Th>Status</Th></tr></thead>
              <tbody>
                {worksheets.map((w) => (
                  <tr key={w.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td>{w.date}</Td><Td className="font-semibold">{w.equipmentName}</Td><Td>{w.checkedBy}</Td>
                    <Td>{w.actionTaken}</Td><Td><Badge tone={w.status === "operational" ? "green" : "amber"}>{w.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "service_report" ? (
        <Card>
          <CardHeader
            title="Preventive & Breakdown Service Reports"
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadCSV("equipment_service_report.csv", serviceLogs as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>
                <Button size="sm" onClick={() => setSrvModalOpen(true)}><Wrench className="w-3.5 h-3.5" /> Log Service</Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Date</Th><Th>Equipment</Th><Th>Engineer</Th><Th>Service Description</Th><Th className="text-right">Cost</Th></tr></thead>
              <tbody>
                {serviceLogs.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td>{s.serviceDate}</Td><Td className="font-semibold">{s.equipmentName}</Td><Td>{s.engineerName}</Td>
                    <Td>{s.description}</Td><Td className="text-right font-bold">{fmtCurrency(s.cost)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "gate_pass_mgmt" || activeTool === "gate_pass_report" ? (
        <Card>
          <CardHeader
            title="Equipment Outward / Returnable Gate Pass Register"
            right={
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => downloadCSV("gate_passes.csv", gatePasses as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>
                <Button size="sm" onClick={() => setGpModalOpen(true)}><LogOut className="w-3.5 h-3.5" /> Issue Gate Pass</Button>
              </div>
            }
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Pass #</Th><Th>Equipment</Th><Th>Purpose</Th><Th>Vendor</Th><Th>Expected Return</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody>
                {gatePasses.map((gp) => (
                  <tr key={gp.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-mono text-xs">{gp.passNumber}</Td><Td className="font-semibold">{gp.equipmentName}</Td>
                    <Td>{gp.purpose}</Td><Td>{gp.vendorName}</Td><Td>{gp.expectedReturnDate}</Td>
                    <Td><Badge tone={gp.status === "returned" ? "green" : "amber"}>{gp.status}</Badge></Td>
                    <Td className="text-right">
                      {gp.status === "outward" && (
                        <Button size="sm" variant="success" onClick={() => handleReturnGatePass(gp)}><CheckCircle2 className="w-3.5 h-3.5" /> Mark Returned</Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : activeTool === "document_upload" || activeTool === "documents_report" ? (
        <Card>
          <CardHeader
            title="Equipment Manuals & Calibration Documents"
            right={<Button size="sm" onClick={() => setDocModalOpen(true)}><Upload className="w-3.5 h-3.5" /> Upload Document</Button>}
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>Document Title</Th><Th>Category</Th><Th>Size</Th><Th>Uploaded Date</Th><Th>Uploader</Th></tr></thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-semibold"><FileText className="w-3.5 h-3.5 inline mr-1.5 text-blue-600" />{d.title}</Td>
                    <Td><Badge tone="blue">{d.category}</Badge></Td><Td>{d.size}</Td><Td>{d.uploadDate}</Td><Td>{d.uploader}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : (
        /* equip_dashboard & equipments_list */
        <Card>
          <CardHeader
            title="Biomedical Asset Registry"
            right={<Button size="sm" variant="secondary" onClick={() => downloadCSV("biomedical_equipments.csv", equipments as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <CardBody className="p-0 overflow-x-auto">
            {equipments.length === 0 ? (
              <EmptyState icon="🩺" title="No equipments registered" sub="Add a ventilator, monitor, or analyzer asset." />
            ) : (
              <table className="w-full text-sm">
                <thead><tr><Th>Equipment Name</Th><Th>Model / Serial</Th><Th>Department</Th><Th>AMC Vendor</Th><Th>Next Service Due</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {equipments.map((eq) => (
                    <tr key={eq.id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td className="font-semibold">{eq.name}</Td>
                      <Td className="text-xs font-mono">{eq.model} / {eq.serialNumber}</Td>
                      <Td>{eq.department}</Td>
                      <Td>{eq.amcVendor || "—"}</Td>
                      <Td>{eq.nextServiceDue || "—"}</Td>
                      <Td><Badge tone={eq.status === "working" ? "green" : eq.status === "calibration_due" ? "amber" : "red"}>{eq.status.replace("_", " ")}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {/* Modals */}
      <Modal open={eqModalOpen} onClose={() => setEqModalOpen(false)} title="Register Biomedical Equipment">
        <form onSubmit={handleSaveEquipment} className="space-y-3">
          <div><Label>Equipment Name *</Label><Input value={eqForm.name} onChange={(e) => setEqForm({ ...eqForm, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Model</Label><Input value={eqForm.model} onChange={(e) => setEqForm({ ...eqForm, model: e.target.value })} /></div>
            <div><Label>Serial Number</Label><Input value={eqForm.serialNumber} onChange={(e) => setEqForm({ ...eqForm, serialNumber: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Department</Label><Input value={eqForm.department} onChange={(e) => setEqForm({ ...eqForm, department: e.target.value })} /></div>
            <div><Label>AMC Vendor</Label><Input value={eqForm.amcVendor} onChange={(e) => setEqForm({ ...eqForm, amcVendor: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setEqModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Asset</Button>
          </div>
        </form>
      </Modal>

      <Modal open={wsModalOpen} onClose={() => setWsModalOpen(false)} title="Log Daily BME Worksheet">
        <form onSubmit={handleSaveWorksheet} className="space-y-3">
          <div>
            <Label>Equipment Name *</Label>
            <Select value={wsForm.equipmentName} onChange={(e) => setWsForm({ ...wsForm, equipmentName: e.target.value })}>
              <option value="">-- Select Registered Asset --</option>
              {equipments.map((eq) => <option key={eq.id} value={eq.name}>{eq.name}</option>)}
            </Select>
          </div>
          <div><Label>Checklist Action Taken</Label><Input value={wsForm.actionTaken} onChange={(e) => setWsForm({ ...wsForm, actionTaken: e.target.value })} /></div>
          <div>
            <Label>Operational Status</Label>
            <Select value={wsForm.status} onChange={(e) => setWsForm({ ...wsForm, status: e.target.value })}>
              <option value="operational">Operational</option><option value="needs_attention">Needs Calibration / Attention</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setWsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="success">Save Worksheet</Button>
          </div>
        </form>
      </Modal>

      <Modal open={gpModalOpen} onClose={() => setGpModalOpen(false)} title="Issue Outward Equipment Gate Pass">
        <form onSubmit={handleSaveGatePass} className="space-y-3">
          <div><Label>Equipment Name *</Label><Input value={gpForm.equipmentName} onChange={(e) => setGpForm({ ...gpForm, equipmentName: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vendor / Service Center *</Label><Input value={gpForm.vendorName} onChange={(e) => setGpForm({ ...gpForm, vendorName: e.target.value })} required /></div>
            <div><Label>Expected Return</Label><Input type="date" value={gpForm.expectedReturnDate} onChange={(e) => setGpForm({ ...gpForm, expectedReturnDate: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setGpModalOpen(false)}>Cancel</Button>
            <Button type="submit">Issue Pass</Button>
          </div>
        </form>
      </Modal>

      <Modal open={srvModalOpen} onClose={() => setSrvModalOpen(false)} title="Log Equipment Service / PM Record">
        <form onSubmit={handleSaveServiceLog} className="space-y-3">
          <div><Label>Equipment Name *</Label><Input value={srvForm.equipmentName} onChange={(e) => setSrvForm({ ...srvForm, equipmentName: e.target.value })} required /></div>
          <div><Label>Service Description *</Label><Input value={srvForm.description} onChange={(e) => setSrvForm({ ...srvForm, description: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Engineer</Label><Input value={srvForm.engineerName} onChange={(e) => setSrvForm({ ...srvForm, engineerName: e.target.value })} /></div>
            <div><Label>Cost (INR)</Label><Input type="number" value={srvForm.cost} onChange={(e) => setSrvForm({ ...srvForm, cost: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setSrvModalOpen(false)}>Cancel</Button>
            <Button type="submit">Log Service</Button>
          </div>
        </form>
      </Modal>

      <Modal open={docModalOpen} onClose={() => setDocModalOpen(false)} title="Archive Equipment Calibration / Manual">
        <form onSubmit={handleUploadDoc} className="space-y-3">
          <div><Label>Document Title *</Label><Input value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label><Input value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })} /></div>
            <div><Label>File Size / Ref</Label><Input value={docForm.size} onChange={(e) => setDocForm({ ...docForm, size: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setDocModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Document</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
