import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardBody, Button, Badge, Modal, Input, Select, Label, EmptyState, Th, Td } from "../components/ui";
import { fmtCurrency, flashToast, downloadCSV } from "../utils/helpers";
import { erpGet, erpMutate, useErpRealtime } from "../utils/erpApi";
import { Wrench, AlertTriangle, ShieldCheck, Building2, Plus, RefreshCw, Download, CheckCircle2 } from "lucide-react";

interface WorkOrder {
  id: string;
  ticketNumber: string;
  area: string;
  issue: string;
  priority: string;
  assignedTo: string;
  status: string;
  reportedDate: string;
  cost?: number;
}

interface AmcContract {
  id: string;
  system: string;
  vendor: string;
  coverage: string;
  annualFee: number;
  expiry: string;
  status: string;
}

const MAINT_TITLES: Record<string, string> = {
  facility_overview: "Hospital Facility Engineering Overview",
  work_orders: "Preventive & Corrective Work Orders",
  breakdown_tickets: "Critical Breakdown Tickets",
  amc_contracts: "Annual Maintenance Contracts (AMC / CMC)",
};

export const MaintenanceERP: React.FC<{ initialAction?: string; dropdownOption?: string }> = ({
  initialAction = "work_orders",
  dropdownOption,
}) => {
  const [activeTool, setActiveTool] = useState(initialAction);
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [amcContracts, setAmcContracts] = useState<AmcContract[]>([]);

  const [woModalOpen, setWoModalOpen] = useState(false);
  const [amcModalOpen, setAmcModalOpen] = useState(false);

  const [woForm, setWoForm] = useState({ area: "ICU", issue: "", priority: "High", assignedTo: "M. Balaji (Sr. Bio-Engg)", cost: "1500" });
  const [amcForm, setAmcForm] = useState({ system: "", vendor: "", coverage: "Comprehensive (CMC)", annualFee: "250000", expiry: "2027-12-31" });

  useEffect(() => {
    if (initialAction) setActiveTool(initialAction);
  }, [initialAction, dropdownOption]);

  const loadMaintenance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await erpGet("/api/maintenance");
      setWorkOrders(res.workOrders || []);
      setAmcContracts(res.amcContracts || []);
    } catch (err: any) {
      flashToast(err?.message || "Failed loading maintenance module", "warn");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaintenance();
  }, [loadMaintenance]);

  useErpRealtime("maintenance", loadMaintenance);

  const openCount = useMemo(() => workOrders.filter((w) => w.status === "open" || w.status === "in_progress").length, [workOrders]);
  const criticalCount = useMemo(() => workOrders.filter((w) => w.priority === "Critical" && w.status !== "resolved").length, [workOrders]);
  const visibleWorkOrders = useMemo(
    () => (activeTool === "breakdown_tickets" ? workOrders.filter((w) => w.priority === "Critical" || w.priority === "High") : workOrders),
    [workOrders, activeTool]
  );

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!woForm.issue.trim()) return flashToast("Issue description is required", "warn");
    try {
      await erpMutate("/api/maintenance", {
        action: "workOrder",
        ...woForm,
        cost: Number(woForm.cost) || 0,
        status: "open",
      });
      setWoModalOpen(false);
      setWoForm({ area: "ICU", issue: "", priority: "High", assignedTo: "M. Balaji (Sr. Bio-Engg)", cost: "1500" });
      await loadMaintenance();
      flashToast("Maintenance ticket logged", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed creating ticket", "warn");
    }
  };

  const handleResolveWorkOrder = async (wo: WorkOrder) => {
    try {
      await erpMutate("/api/maintenance", { action: "workOrder", id: wo.id, status: "resolved" }, "PUT");
      await loadMaintenance();
      flashToast(`Resolved ${wo.ticketNumber}`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Update failed", "warn");
    }
  };

  const handleAddAmc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amcForm.system.trim() || !amcForm.vendor.trim()) return flashToast("System and vendor required", "warn");
    try {
      await erpMutate("/api/maintenance", {
        action: "amc",
        ...amcForm,
        annualFee: Number(amcForm.annualFee) || 0,
        status: "Active",
      });
      setAmcModalOpen(false);
      setAmcForm({ system: "", vendor: "", coverage: "Comprehensive (CMC)", annualFee: "250000", expiry: "2027-12-31" });
      await loadMaintenance();
      flashToast("AMC contract saved", "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed saving AMC", "warn");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Wrench className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{MAINT_TITLES[activeTool] || "Facility Maintenance"}</h1>
            {loading && <Badge tone="amber">Syncing...</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">HVAC, medical gas pipelines, backup DG sets & vendor AMC lifecycle</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={loadMaintenance}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button variant="secondary" size="sm" onClick={() => setAmcModalOpen(true)}><ShieldCheck className="w-4 h-4" /> New AMC</Button>
          <Button variant="primary" size="sm" onClick={() => setWoModalOpen(true)}><Plus className="w-4 h-4" /> New Ticket</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Work Orders</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{workOrders.length}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Open / In Progress</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{openCount}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Critical Breakdowns</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{criticalCount}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-slate-500 uppercase">Active AMCs</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{amcContracts.length}</div>
        </Card>
      </div>

      {activeTool === "amc_contracts" ? (
        <Card>
          <CardHeader
            title="Active AMC & CMC Contracts"
            right={<Button size="sm" variant="secondary" onClick={() => downloadCSV("amc_contracts.csv", amcContracts as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><Th>System / Equipment</Th><Th>Vendor</Th><Th>Coverage</Th><Th>Expiry</Th><Th className="text-right">Annual Fee</Th><Th>Status</Th></tr></thead>
              <tbody>
                {amcContracts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-semibold"><Building2 className="w-3.5 h-3.5 inline mr-1.5 text-blue-600" />{a.system}</Td>
                    <Td>{a.vendor}</Td><Td>{a.coverage}</Td><Td>{a.expiry}</Td>
                    <Td className="text-right font-bold">{fmtCurrency(a.annualFee)}</Td>
                    <Td><Badge tone="green">{a.status}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title={activeTool === "breakdown_tickets" ? "High & Critical Breakdown Tickets" : "Facility Engineering Work Orders"}
            right={<Button size="sm" variant="secondary" onClick={() => downloadCSV("work_orders.csv", visibleWorkOrders as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>}
          />
          <CardBody className="p-0 overflow-x-auto">
            {visibleWorkOrders.length === 0 ? (
              <EmptyState icon="🔧" title="All facility systems nominal" sub="No open breakdown or work orders." />
            ) : (
              <table className="w-full text-sm">
                <thead><tr><Th>Ticket #</Th><Th>Hospital Area</Th><Th>Issue</Th><Th>Priority</Th><Th>Assigned To</Th><Th>Status</Th><Th className="text-right">Action</Th></tr></thead>
                <tbody>
                  {visibleWorkOrders.map((wo) => (
                    <tr key={wo.id} className="border-t border-slate-100 dark:border-slate-800">
                      <Td className="font-mono text-xs">{wo.ticketNumber}</Td>
                      <Td className="font-medium">{wo.area}</Td>
                      <Td>{wo.issue}</Td>
                      <Td><Badge tone={wo.priority === "Critical" ? "red" : wo.priority === "High" ? "amber" : "blue"}>{wo.priority}</Badge></Td>
                      <Td>{wo.assignedTo}</Td>
                      <Td><Badge tone={wo.status === "resolved" ? "green" : "amber"}>{wo.status.replace("_", " ")}</Badge></Td>
                      <Td className="text-right">
                        {wo.status !== "resolved" && (
                          <Button size="sm" variant="success" onClick={() => handleResolveWorkOrder(wo)}><CheckCircle2 className="w-3.5 h-3.5" /> Resolve</Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {/* Work Order Modal */}
      <Modal open={woModalOpen} onClose={() => setWoModalOpen(false)} title="Log Maintenance Work Order">
        <form onSubmit={handleCreateWorkOrder} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Facility Area</Label>
              <Select value={woForm.area} onChange={(e) => setWoForm({ ...woForm, area: e.target.value })}>
                <option value="ICU">ICU</option><option value="Operation Theatre">Operation Theatre</option>
                <option value="HVAC & Generator">HVAC & Generator</option><option value="Wards">Wards</option><option value="Radiology">Radiology</option>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={woForm.priority} onChange={(e) => setWoForm({ ...woForm, priority: e.target.value })}>
                <option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Routine">Routine</option>
              </Select>
            </div>
          </div>
          <div><Label>Issue Summary *</Label><Input value={woForm.issue} onChange={(e) => setWoForm({ ...woForm, issue: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Assigned Engineer</Label><Input value={woForm.assignedTo} onChange={(e) => setWoForm({ ...woForm, assignedTo: e.target.value })} /></div>
            <div><Label>Est. Cost (INR)</Label><Input type="number" value={woForm.cost} onChange={(e) => setWoForm({ ...woForm, cost: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setWoModalOpen(false)}>Cancel</Button>
            <Button type="submit"><AlertTriangle className="w-3.5 h-3.5" /> Create Ticket</Button>
          </div>
        </form>
      </Modal>

      {/* AMC Modal */}
      <Modal open={amcModalOpen} onClose={() => setAmcModalOpen(false)} title="Add AMC / CMC Service Contract">
        <form onSubmit={handleAddAmc} className="space-y-3">
          <div><Label>System / Asset *</Label><Input value={amcForm.system} onChange={(e) => setAmcForm({ ...amcForm, system: e.target.value })} required /></div>
          <div><Label>Vendor *</Label><Input value={amcForm.vendor} onChange={(e) => setAmcForm({ ...amcForm, vendor: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Annual Fee (INR)</Label><Input type="number" value={amcForm.annualFee} onChange={(e) => setAmcForm({ ...amcForm, annualFee: e.target.value })} /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={amcForm.expiry} onChange={(e) => setAmcForm({ ...amcForm, expiry: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setAmcModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save AMC</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
