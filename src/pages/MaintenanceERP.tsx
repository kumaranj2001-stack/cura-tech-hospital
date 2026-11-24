import React, { useState } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, flashToast } from "../utils/helpers";
import type { MaintenanceWorkOrder } from "../store/types";
import {
  Wrench,
  Building2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  Plus,
  Clock,
  Printer,
  Search,
  Filter,
  DollarSign,
  Activity,
  HardHat,
} from "lucide-react";

const INITIAL_WORK_ORDERS: MaintenanceWorkOrder[] = [
  {
    id: "WO-01",
    ticketNumber: "WO-2026-051",
    area: "Operation Theatre",
    issue: "OT 2 Laminar airflow HEPA filter differential pressure alarm triggering",
    priority: "Critical",
    assignedTo: "M. Balaji (Sr. Bio-Engg)",
    status: "in_progress",
    reportedDate: "2026-11-24",
    cost: 4500,
  },
  {
    id: "WO-02",
    ticketNumber: "WO-2026-052",
    area: "HVAC & Generator",
    issue: "250 kVA Generator diesel transfer pump solenoid valve leak",
    priority: "High",
    assignedTo: "K. Saravanan (Electrical)",
    status: "open",
    reportedDate: "2026-11-24",
    cost: 2800,
  },
  {
    id: "WO-03",
    ticketNumber: "WO-2026-053",
    area: "Plumbing / RO",
    issue: "Dialysis Unit pure RO water recirculation pressure drop below 2.5 bar",
    priority: "Critical",
    assignedTo: "R. Gopal (Water Systems)",
    status: "resolved",
    reportedDate: "2026-11-23",
    resolvedDate: "2026-11-24",
    cost: 1500,
  },
  {
    id: "WO-04",
    ticketNumber: "WO-2026-054",
    area: "ICU",
    issue: "Bed 6 Oxygen flowmeter wall outlet quick-connect coupler sticking",
    priority: "High",
    assignedTo: "M. Balaji (Sr. Bio-Engg)",
    status: "closed",
    reportedDate: "2026-11-22",
    resolvedDate: "2026-11-23",
    cost: 800,
  },
];

export const MaintenanceERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "work_orders", dropdownOption }) => {
  const [activeTab, setActiveTab] = useState<string>(initialAction || "work_orders");
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>(INITIAL_WORK_ORDERS);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    area: "Operation Theatre" as MaintenanceWorkOrder["area"],
    issue: "",
    priority: "High" as MaintenanceWorkOrder["priority"],
    assignedTo: "M. Balaji (Sr. Bio-Engg)",
  });

  React.useEffect(() => {
    if (initialAction) setActiveTab(initialAction);
  }, [initialAction]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.issue) return;

    const created: MaintenanceWorkOrder = {
      id: `WO-${Date.now().toString().slice(-3)}`,
      ticketNumber: `WO-2026-${(workOrders.length + 55).toString().padStart(3, "0")}`,
      area: newTicket.area,
      issue: newTicket.issue,
      priority: newTicket.priority,
      assignedTo: newTicket.assignedTo,
      status: "open",
      reportedDate: new Date().toISOString().split("T")[0],
    };

    setWorkOrders([created, ...workOrders]);
    flashToast(`Work Order #${created.ticketNumber} logged & assigned`, "success");
    setShowNewTicketModal(false);
    setNewTicket({
      area: "Operation Theatre",
      issue: "",
      priority: "High",
      assignedTo: "M. Balaji (Sr. Bio-Engg)",
    });
  };

  const handleToggleResolve = (id: string) => {
    setWorkOrders(
      workOrders.map((wo) =>
        wo.id === id
          ? {
              ...wo,
              status: wo.status === "resolved" ? "closed" : "resolved",
              resolvedDate: new Date().toISOString().split("T")[0],
            }
          : wo
      )
    );
    flashToast("Work Order ticket status updated", "success");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* ── Sub-Navigation / Header ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300 rounded-lg">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Hospital Facility & Biomedical Engineering Maintenance
              {dropdownOption && <Badge variant="info">{dropdownOption}</Badge>}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Work Order Ticketing, Breakdown Prevention, AMC Contracts & Utility Plants
            </p>
          </div>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab("facility_overview")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "facility_overview"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Facility Overview
          </button>
          <button
            onClick={() => setActiveTab("work_orders")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "work_orders"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Work Orders
          </button>
          <button
            onClick={() => setActiveTab("breakdown_tickets")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "breakdown_tickets"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Breakdowns
          </button>
          <button
            onClick={() => setActiveTab("amc_contracts")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "amc_contracts"
                ? "bg-amber-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            AMC Contracts
          </button>
        </div>
      </div>

      {/* ── KPI METRICS ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-l-amber-500">
          <div className="text-xs text-slate-500 uppercase font-semibold">Active Work Orders</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {workOrders.filter((w) => w.status === "open" || w.status === "in_progress").length}
          </div>
          <div className="text-xs text-amber-600 mt-1">Pending engineer resolution</div>
        </Card>
        <Card className="p-3 border-l-4 border-l-rose-500">
          <div className="text-xs text-slate-500 uppercase font-semibold">Critical Breakdown Tickets</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {workOrders.filter((w) => w.priority === "Critical" && w.status !== "closed").length}
          </div>
          <div className="text-xs text-slate-500 mt-1">OT & Dialysis Plant</div>
        </Card>
        <Card className="p-3 border-l-4 border-l-emerald-500">
          <div className="text-xs text-slate-500 uppercase font-semibold">Resolved This Week</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {workOrders.filter((w) => w.status === "resolved" || w.status === "closed").length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Mean Time to Repair: 3.4 hrs</div>
        </Card>
        <Card className="p-3 border-l-4 border-l-sky-500">
          <div className="text-xs text-slate-500 uppercase font-semibold">Active AMC Warranties</div>
          <div className="text-2xl font-bold text-sky-600 mt-1">8 Systems</div>
          <div className="text-xs text-slate-500 mt-1">Siemens, Philips & Cummins</div>
        </Card>
      </div>

      {/* ── 1. WORK ORDERS & BREAKDOWN TICKETS ── */}
      {(activeTab === "work_orders" || activeTab === "breakdown_tickets") && (
        <Card>
          <CardHeader className="py-3 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                Work Order & Breakdown Management Console
              </h3>
            </div>
            <Button size="sm" onClick={() => setShowNewTicketModal(true)} className="text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Log Work Order
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                    <th className="p-3">Ticket No.</th>
                    <th className="p-3">Location / Area</th>
                    <th className="p-3">Issue Description</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Assigned Technician</th>
                    <th className="p-3">Reported</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {workOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{wo.ticketNumber}</td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{wo.area}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs">{wo.issue}</td>
                      <td className="p-3">
                        <Badge
                          variant={wo.priority === "Critical" ? "danger" : wo.priority === "High" ? "warning" : "default"}
                          className="text-[10px]"
                        >
                          {wo.priority}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{wo.assignedTo}</td>
                      <td className="p-3 text-slate-500 font-mono">{wo.reportedDate}</td>
                      <td className="p-3">
                        <Badge
                          variant={wo.status === "closed" ? "success" : wo.status === "resolved" ? "info" : "warning"}
                          className="text-[10px]"
                        >
                          {wo.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleResolve(wo.id)}
                          className="text-[11px] py-1 px-2"
                        >
                          {wo.status === "resolved" ? "Close" : "Resolve"}
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

      {/* ── 2. FACILITY OVERVIEW ── */}
      {activeTab === "facility_overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Card className="p-4 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" /> Plant & Energy Systems Status
            </h4>
            <div className="space-y-2">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border flex justify-between items-center">
                <span>Central HVAC Chiller Plant:</span>
                <span className="font-bold text-emerald-600">Running (7.2°C Supply)</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border flex justify-between items-center">
                <span>Medical Gas Pipeline (MGPS O2):</span>
                <span className="font-bold text-emerald-600">4.1 Bar (Pressure Stable)</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border flex justify-between items-center">
                <span>RO Dialysis Filtration Plant:</span>
                <span className="font-bold text-emerald-600">18 ppm TDS (Optimal)</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border flex justify-between items-center">
                <span>Solar Rooftop Array (50 kWp):</span>
                <span className="font-bold text-emerald-600">Generating 38.4 kW</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Life Safety & Fire Suppression
            </h4>
            <div className="space-y-2">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border flex justify-between items-center">
                <span>Fire Jockey Pump Pressure:</span>
                <span className="font-bold text-emerald-600">7.5 kg/cm2 (Active Standby)</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border flex justify-between items-center">
                <span>Smoke Detectors (Addressable):</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">184 / 184 Healthy</span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border flex justify-between items-center">
                <span>Fire NOC Certificate Validity:</span>
                <span className="font-bold text-emerald-600">Valid until Dec 2027</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── 3. AMC CONTRACTS ── */}
      {activeTab === "amc_contracts" && (
        <Card>
          <CardHeader className="py-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              Annual Maintenance Contracts (AMC / CMC) Register
            </h3>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                    <th className="p-3">Equipment / System</th>
                    <th className="p-3">Contractor / Vendor</th>
                    <th className="p-3">Coverage Type</th>
                    <th className="p-3">Annual Fee</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[
                    { sys: "Siemens Magnetom 1.5T MRI", vendor: "Siemens Healthcare India", type: "Comprehensive (CMC)", fee: "₹12,50,000", expiry: "2027-03-31", status: "Active" },
                    { sys: "GE Healthcare Optima CT660", vendor: "GE Medical Systems", type: "Comprehensive (CMC)", fee: "₹9,80,000", expiry: "2027-06-30", status: "Active" },
                    { sys: "Cummins 250 kVA Diesel Genset", vendor: "Cummins India Service", type: "Labor & PM (AMC)", fee: "₹95,000", expiry: "2026-12-31", status: "Renewing Soon" },
                    { sys: "OT Laminar Flow & Chiller AHU", vendor: "Voltas Commercial Aircon", type: "Quarterly PM (AMC)", fee: "₹1,80,000", expiry: "2027-08-31", status: "Active" },
                  ].map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{item.sys}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{item.vendor}</td>
                      <td className="p-3 font-medium text-sky-600 dark:text-sky-400">{item.type}</td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{item.fee}</td>
                      <td className="p-3 font-mono text-slate-500">{item.expiry}</td>
                      <td className="p-3">
                        <Badge variant={item.status === "Active" ? "success" : "warning"} className="text-[10px]">
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── MODAL: LOG WORK ORDER ── */}
      {showNewTicketModal && (
        <Modal open={showNewTicketModal} onClose={() => setShowNewTicketModal(false)} title="Log Facility / Biomedical Maintenance Work Order">
          <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
            <div>
              <Label>Location / Department</Label>
              <Select
                value={newTicket.area}
                onChange={(e) => setNewTicket({ ...newTicket, area: e.target.value as any })}
              >
                <option value="Operation Theatre">Operation Theatre</option>
                <option value="ICU">Intensive Care Unit (ICU)</option>
                <option value="Wards">Inpatient Wards</option>
                <option value="Radiology">Radiology & Imaging</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="HVAC & Generator">HVAC & Generator</option>
                <option value="Plumbing / RO">Plumbing / RO Plant</option>
              </Select>
            </div>
            <div>
              <Label>Issue Breakdown Description</Label>
              <Input
                placeholder="Describe fault, symptoms, warning codes"
                value={newTicket.issue}
                onChange={(e) => setNewTicket({ ...newTicket, issue: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Priority Level</Label>
                <Select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                >
                  <option value="Critical">🚨 Critical (Safety Risk / Bed Block)</option>
                  <option value="High">High (Immediate Repair)</option>
                  <option value="Medium">Medium (Routine)</option>
                  <option value="Routine">Routine Scheduled Maintenance</option>
                </Select>
              </div>
              <div>
                <Label>Assigned Engineer</Label>
                <Input
                  value={newTicket.assignedTo}
                  onChange={(e) => setNewTicket({ ...newTicket, assignedTo: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowNewTicketModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Create Ticket</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default MaintenanceERP;
