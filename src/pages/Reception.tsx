import React, { useState, useMemo, useRef } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Modal, Badge } from "../components/ui";
import { fmtDate, flashToast } from "../utils/helpers";
import { generateUhid, formatTokenNumber, getPatientQrUrl } from "../utils/uhidGenerator";
import type { Patient, Appointment, AppointmentStatus, AppointmentPriority } from "../store/types";
import {
  UserPlus,
  Calendar,
  Clock,
  QrCode,
  Printer,
  Search,
  CheckCircle2,
  Stethoscope,
  Activity,
  AlertCircle,
  FileText,
  Phone,
  ShieldCheck,
  CreditCard,
  Building2,
  ChevronRight,
  UserCheck,
} from "lucide-react";

export const Reception: React.FC<{
  onNavigateToDoctor?: (patientId: string) => void;
  onNavigateToNurse?: (patientId: string) => void;
  onNavigateToVisitTrail?: (uhid: string) => void;
  onNavigateToBilling?: (patientId?: string) => void;
}> = ({ onNavigateToDoctor, onNavigateToNurse, onNavigateToVisitTrail, onNavigateToBilling }) => {
  const { data, setData, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";

  const [activeTab, setActiveTab] = useState<"queue" | "patients">("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Registration Modal State
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    age: "",
    gender: "Male" as "Male" | "Female" | "Other",
    bloodGroup: "O+",
    address: "",
    emergencyContact: "",
    allergies: "",
    medicalHistory: "",
  });

  // Appointment Modal State
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [apptForm, setApptForm] = useState({
    patientId: "",
    doctorId: data.doctors[0]?.id || "",
    department: data.doctors[0]?.department || "General Medicine",
    timeSlot: "10:00 AM",
    priority: "routine" as AppointmentPriority,
    reason: "",
    consultationFee: data.doctors[0]?.consultationFee || 500,
  });

  // Digital ID Card Modal State
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [selectedPatientForCard, setSelectedPatientForCard] = useState<Patient | null>(null);
  const printCardRef = useRef<HTMLDivElement>(null);

  const appointments = data.appointments || [];
  const patients = data.patients || [];
  const doctors = data.doctors || [];

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchDoctor = filterDoctor === "all" || apt.doctorId === filterDoctor;
      const matchStatus = filterStatus === "all" || apt.status === filterStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        apt.patientName.toLowerCase().includes(q) ||
        (apt.patientUhid && apt.patientUhid.toLowerCase().includes(q)) ||
        (apt.patientPhone && apt.patientPhone.includes(q));
      return matchDoctor && matchStatus && matchQuery;
    });
  }, [appointments, filterDoctor, filterStatus, searchQuery]);

  // Filtered Patients
  const filteredPatients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.uhid && p.uhid.toLowerCase().includes(q)) ||
        p.phone.includes(q) ||
        (p.bloodGroup && p.bloodGroup.toLowerCase().includes(q))
    );
  }, [patients, searchQuery]);

  // Metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((a) => a.date === todayStr);
  const waitingCount = todayAppointments.filter((a) => a.status === "checked_in" || a.status === "scheduled").length;
  const inConsultCount = todayAppointments.filter((a) => a.status === "with_doctor" || a.status === "with_nurse").length;
  const completedCount = todayAppointments.filter((a) => a.status === "completed").length;

  // Handler: Register New Patient & Issue UHID
  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.phone.trim()) {
      flashToast("Please provide patient name and phone number", "warn");
      return;
    }

    const nextCounter = (data.counters.uhid || 1000) + 1;
    const uhid = generateUhid(nextCounter);
    const newPatient: Patient = {
      id: "p_" + Date.now(),
      branchId,
      uhid,
      name: regForm.name.trim(),
      phone: regForm.phone.trim(),
      age: regForm.age ? parseInt(regForm.age, 10) : undefined,
      gender: regForm.gender,
      bloodGroup: regForm.bloodGroup,
      address: regForm.address.trim(),
      emergencyContact: regForm.emergencyContact.trim(),
      allergies: regForm.allergies.trim(),
      medicalHistory: regForm.medicalHistory.trim(),
      qrCodeUrl: getPatientQrUrl(uhid, regForm.name.trim(), regForm.phone.trim()),
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      patients: [newPatient, ...prev.patients],
      counters: { ...prev.counters, uhid: nextCounter },
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || "Reception",
          action: "PATIENT_REGISTERED",
          details: `Registered ${newPatient.name} with Digital UHID ${uhid}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    log("PATIENT_REGISTERED", `UHID ${uhid} issued to ${newPatient.name}`);
    flashToast(`Patient registered! UHID: ${uhid}`);
    setRegModalOpen(false);

    // Auto open digital ID card preview
    setSelectedPatientForCard(newPatient);
    setCardModalOpen(true);

    // Reset Form
    setRegForm({
      name: "",
      phone: "",
      age: "",
      gender: "Male",
      bloodGroup: "O+",
      address: "",
      emergencyContact: "",
      allergies: "",
      medicalHistory: "",
    });
  };

  // Handler: Book Appointment & Issue Token
  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === apptForm.patientId);
    const doctor = doctors.find((d) => d.id === apptForm.doctorId);

    if (!patient || !doctor) {
      flashToast("Select a valid patient and doctor", "warn");
      return;
    }

    const nextTokenNum = (data.counters.appointment || 100) + 1;
    const newApt: Appointment = {
      id: "apt_" + Date.now(),
      branchId,
      tokenNumber: nextTokenNum,
      patientId: patient.id,
      patientName: patient.name,
      patientUhid: patient.uhid,
      patientPhone: patient.phone,
      doctorId: doctor.id,
      doctorName: doctor.name,
      department: doctor.department || apptForm.department,
      date: todayStr,
      timeSlot: apptForm.timeSlot,
      reason: apptForm.reason.trim() || "OPD Consultation",
      status: "checked_in",
      priority: apptForm.priority,
      consultationFee: doctor.consultationFee || apptForm.consultationFee || 500,
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      appointments: [newApt, ...(prev.appointments || [])],
      counters: { ...prev.counters, appointment: nextTokenNum },
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || "Reception",
          action: "APPOINTMENT_BOOKED",
          details: `Token ${formatTokenNumber(nextTokenNum)} booked for ${patient.name} with ${doctor.name}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    flashToast(`Token ${formatTokenNumber(nextTokenNum)} issued for ${patient.name}`);
    setApptModalOpen(false);
  };

  // Update appointment status
  const updateStatus = (aptId: string, status: AppointmentStatus) => {
    setData((prev) => ({
      ...prev,
      appointments: (prev.appointments || []).map((a) => (a.id === aptId ? { ...a, status } : a)),
    }));
    flashToast(`Status updated to ${status.replace("_", " ")}`);
  };

  const statusTone = (st: AppointmentStatus) => {
    switch (st) {
      case "scheduled": return "slate";
      case "checked_in": return "blue";
      case "with_nurse": return "amber";
      case "with_doctor": return "blue";
      case "in_lab": return "amber";
      case "in_pharmacy": return "blue";
      case "completed": return "green";
      case "cancelled": return "red";
      default: return "slate";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metric Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-800 text-white p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-sky-500/30 text-sky-100 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-400/40">
              Centralized Reception Module
            </span>
            <span className="text-xs text-sky-200">OPD & Digital UHID Desk</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Registration & Appointments</h1>
          <p className="text-sky-100/80 text-sm max-w-xl">
            Register new hospital patients, automatically assign unique digital identifiers (UHID), issue patient smart cards, and manage the live OPD token queue.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
            onClick={() => setRegModalOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-1 text-emerald-300" />
            New Patient (UHID)
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-md font-semibold"
            onClick={() => {
              if (patients.length === 0) {
                flashToast("Please register a patient first", "warn");
                setRegModalOpen(true);
                return;
              }
              setApptForm((prev) => ({ ...prev, patientId: patients[0]?.id || "" }));
              setApptModalOpen(true);
            }}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Book OPD Token
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Total Registered</span>
            <UserCheck className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{patients.length}</div>
          <span className="text-xs text-slate-500">Patients with UHID</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Waiting in Queue</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{waitingCount}</div>
          <span className="text-xs text-slate-500">Checked-in tokens</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">In Clinical Care</span>
            <Stethoscope className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{inConsultCount}</div>
          <span className="text-xs text-slate-500">With Doctor / Nurse</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Completed Today</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{completedCount}</div>
          <span className="text-xs text-slate-500">Visits finalized</span>
        </div>
      </div>

      {/* Tabs & Search Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "queue"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
            }`}
          >
            OPD Token Queue ({filteredAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "patients"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
            }`}
          >
            Master Patients Directory ({patients.length})
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by UHID, patient name, or phone..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: OPD Token Queue */}
      {activeTab === "queue" && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                Live OPD Token Board
              </h2>
              <p className="text-xs text-slate-500">Real-time status transitions across reception, nursing, and doctors.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="w-44 text-xs py-1.5"
              >
                <option value="all">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>

              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-36 text-xs py-1.5"
              >
                <option value="all">All Statuses</option>
                <option value="checked_in">Checked In</option>
                <option value="with_nurse">With Nurse</option>
                <option value="with_doctor">With Doctor</option>
                <option value="in_lab">In Lab</option>
                <option value="in_pharmacy">In Pharmacy</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">No appointments or tokens in this queue</p>
                <Button size="sm" onClick={() => setApptModalOpen(true)}>
                  Issue First OPD Token
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Token #</th>
                      <th className="py-3 px-4">Patient / UHID</th>
                      <th className="py-3 px-4">Doctor & Dept</th>
                      <th className="py-3 px-4">Slot & Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                    {filteredAppointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          {formatTokenNumber(apt.tokenNumber)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{apt.patientName}</div>
                          <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-1.5 py-0.2 rounded text-[10px]">
                              {apt.patientUhid || "NO-UHID"}
                            </span>
                            <span>·</span>
                            <span>{apt.patientPhone || "No Phone"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700 dark:text-slate-200">{apt.doctorName}</div>
                          <div className="text-xs text-slate-400">{apt.department || "OPD"}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{apt.timeSlot}</div>
                          <div className="mt-0.5">
                            {apt.priority === "emergency" ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200">
                                🚨 Emergency
                              </span>
                            ) : apt.priority === "urgent" ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200">
                                ⚠️ Urgent
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                Routine
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge tone={statusTone(apt.status)}>
                            {apt.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {apt.status === "checked_in" && (
                              <button
                                onClick={() => {
                                  updateStatus(apt.id, "with_nurse");
                                  if (onNavigateToNurse) onNavigateToNurse(apt.patientId);
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1"
                                title="Send to Nursing for Vitals check"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                Take Vitals
                              </button>
                            )}

                            {(apt.status === "checked_in" || apt.status === "with_nurse") && (
                              <button
                                onClick={() => {
                                  updateStatus(apt.id, "with_doctor");
                                  if (onNavigateToDoctor) onNavigateToDoctor(apt.patientId);
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1"
                                title="Call patient into Doctor's room"
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                Consult
                              </button>
                            )}

                            {apt.status !== "completed" && apt.status !== "cancelled" && (
                              <button
                                onClick={() => updateStatus(apt.id, "completed")}
                                className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200"
                                title="Mark visit finished"
                              >
                                Done
                              </button>
                            )}

                            {onNavigateToBilling && (
                              <button
                                onClick={() => onNavigateToBilling(apt.patientId)}
                                className="px-2 py-1 text-xs rounded-md bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 font-medium"
                                title="Generate Patient Invoice & Process Billing"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Bill
                              </button>
                            )}

                            {onNavigateToVisitTrail && apt.patientUhid && (
                              <button
                                onClick={() => onNavigateToVisitTrail(apt.patientUhid!)}
                                className="px-2 py-1 text-xs rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                title="View full 360 visit timeline"
                              >
                                Trail
                              </button>
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

      {/* TAB 2: Master Patients Directory */}
      {activeTab === "patients" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-600" />
                Master Patient Directory with Digital UHIDs
              </h2>
              <p className="text-xs text-slate-500">Each patient holds a verified UHID identifier and digital health QR code badge.</p>
            </div>
            <Button size="sm" onClick={() => setRegModalOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1" />
              Register Patient
            </Button>
          </CardHeader>

          <CardBody className="p-0">
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                No patients found. Click "Register Patient" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Digital UHID</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Age / Gender</th>
                      <th className="py-3 px-4">Blood Group</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Allergies / Alerts</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                    {filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          <span className="bg-sky-100/70 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded text-xs">
                            {p.uhid || "CURA-2026-PENDING"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">
                          {p.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {p.age ? `${p.age} yrs` : "—"} / {p.gender || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs">
                            {p.bloodGroup || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">
                          <div>{p.phone}</div>
                          {p.emergencyContact && (
                            <div className="text-[11px] text-slate-400">Emg: {p.emergencyContact}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {p.allergies ? (
                            <span className="inline-flex items-center text-[11px] text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded border border-rose-200">
                              ⚠️ {p.allergies}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No known allergies</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-7 px-2"
                              onClick={() => {
                                setSelectedPatientForCard(p);
                                setCardModalOpen(true);
                              }}
                            >
                              <QrCode className="w-3.5 h-3.5 mr-1" />
                              Digital Card
                            </Button>

                            <Button
                              size="sm"
                              className="text-xs h-7 px-2"
                              onClick={() => {
                                setApptForm((prev) => ({ ...prev, patientId: p.id }));
                                setApptModalOpen(true);
                              }}
                            >
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              Book
                            </Button>

                            {onNavigateToBilling && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-xs h-7 px-2 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                onClick={() => onNavigateToBilling(p.id)}
                                title="Generate Patient Invoice & Process Billing"
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Invoice
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

      {/* ── MODAL: Register New Patient & Auto-Generate UHID ── */}
      <Modal
        open={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        title="Patient Registration & Unique Digital ID Issuance"
        size="lg"
      >
        <form onSubmit={handleRegisterPatient} className="space-y-4">
          <div className="bg-sky-50 dark:bg-sky-950/40 p-3.5 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-sky-900 dark:text-sky-200">Automated UHID Generator Active</div>
              <div className="text-sky-700 dark:text-sky-400">Next ID: {generateUhid((data.counters.uhid || 1000) + 1)}</div>
            </div>
            <ShieldCheck className="w-6 h-6 text-sky-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                required
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
              />
            </div>
            <div>
              <Label>Contact Phone Number *</Label>
              <Input
                required
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                placeholder="10-digit mobile number"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Age (Years)</Label>
              <Input
                type="number"
                value={regForm.age}
                onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                placeholder="e.g. 38"
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select
                value={regForm.gender}
                onChange={(e) => setRegForm({ ...regForm, gender: e.target.value as any })}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div>
              <Label>Blood Group</Label>
              <Select
                value={regForm.bloodGroup}
                onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Emergency Contact (Name / Phone)</Label>
              <Input
                value={regForm.emergencyContact}
                onChange={(e) => setRegForm({ ...regForm, emergencyContact: e.target.value })}
                placeholder="e.g. Spouse: 9876543210"
              />
            </div>
            <div>
              <Label>Known Drug / Food Allergies</Label>
              <Input
                value={regForm.allergies}
                onChange={(e) => setRegForm({ ...regForm, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Sulfa, Peanuts"
              />
            </div>
          </div>

          <div>
            <Label>Address / City</Label>
            <Input
              value={regForm.address}
              onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
              placeholder="Residential address"
            />
          </div>

          <div>
            <Label>Past Medical History / Chronic Conditions</Label>
            <Input
              value={regForm.medicalHistory}
              onChange={(e) => setRegForm({ ...regForm, medicalHistory: e.target.value })}
              placeholder="e.g. Type-2 Diabetes (5 yrs), Hypertension"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setRegModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Register & Issue Smart Card
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Book OPD Consultation Token ── */}
      <Modal
        open={apptModalOpen}
        onClose={() => setApptModalOpen(false)}
        title="Schedule OPD Appointment & Issue Live Token"
        size="md"
      >
        <form onSubmit={handleBookAppointment} className="space-y-4">
          <div>
            <Label>Select Patient *</Label>
            <Select
              required
              value={apptForm.patientId}
              onChange={(e) => setApptForm({ ...apptForm, patientId: e.target.value })}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.uhid || "No UHID"}) — {p.phone}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Attending Doctor *</Label>
              <Select
                required
                value={apptForm.doctorId}
                onChange={(e) => {
                  const doc = doctors.find((d) => d.id === e.target.value);
                  setApptForm({
                    ...apptForm,
                    doctorId: e.target.value,
                    department: doc?.department || "General Medicine",
                    consultationFee: doc?.consultationFee || 500,
                  });
                }}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.department || "OPD"})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Department</Label>
              <Input
                value={apptForm.department}
                onChange={(e) => setApptForm({ ...apptForm, department: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Time Slot</Label>
              <Select
                value={apptForm.timeSlot}
                onChange={(e) => setApptForm({ ...apptForm, timeSlot: e.target.value })}
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="09:30 AM">09:30 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="10:30 AM">10:30 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="02:30 PM">02:30 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select
                value={apptForm.priority}
                onChange={(e) => setApptForm({ ...apptForm, priority: e.target.value as any })}
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency / Triage</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Reason for Visit / Primary Symptoms</Label>
            <Input
              value={apptForm.reason}
              onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })}
              placeholder="e.g. High fever for 3 days, acute headache"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">OPD Consultation Fee:</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">₹{apptForm.consultationFee}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setApptModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Confirm & Issue Token
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Digital Patient Smart Card Preview & Print ── */}
      <Modal
        open={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        title="Unique Digital Patient Identifier Card"
        size="md"
      >
        {selectedPatientForCard && (
          <div className="space-y-4">
            <div
              ref={printCardRef}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-white p-6 shadow-xl border border-sky-500/30"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Hospital Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center font-bold text-lg text-white shadow-md">
                    +
                  </div>
                  <div>
                    <h3 className="font-bold text-sm tracking-wide uppercase text-white">Cura Multispecialty Hospital</h3>
                    <p className="text-[10px] text-sky-300 font-mono tracking-wider">OFFICIAL DIGITAL HEALTH IDENTIFIER</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  VERIFIED UHID
                </span>
              </div>

              {/* Card Body */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="col-span-2 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-sky-400/80 font-mono">Patient Name</span>
                    <h2 className="text-xl font-bold tracking-tight text-white">{selectedPatientForCard.name}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Age / Sex</span>
                      <div className="font-semibold text-slate-200">
                        {selectedPatientForCard.age ? `${selectedPatientForCard.age} yrs` : "—"} / {selectedPatientForCard.gender || "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Blood Group</span>
                      <div className="font-bold text-rose-400">{selectedPatientForCard.bloodGroup || "—"}</div>
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Mobile Contact</span>
                    <div className="font-mono text-slate-200">{selectedPatientForCard.phone}</div>
                  </div>

                  {selectedPatientForCard.allergies && (
                    <div className="p-1.5 rounded bg-rose-500/20 border border-rose-500/30 text-[11px] text-rose-200">
                      <b>Allergies:</b> {selectedPatientForCard.allergies}
                    </div>
                  )}
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-900 shadow-md">
                  <img
                    src={selectedPatientForCard.qrCodeUrl || getPatientQrUrl(selectedPatientForCard.uhid || "UHID", selectedPatientForCard.name, selectedPatientForCard.phone)}
                    alt="Patient Digital UHID QR"
                    className="w-28 h-28 object-contain"
                  />
                  <span className="text-[9px] font-mono font-bold tracking-tight text-slate-600 mt-1">SCAN FOR EHR</span>
                </div>
              </div>

              {/* UHID Barcode Footer */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400">UHID:</span>{" "}
                  <span className="font-bold text-sky-400 text-sm tracking-wider">{selectedPatientForCard.uhid || "CURA-2026-0001"}</span>
                </div>
                <div className="text-[10px] text-slate-400">ISSUED: {fmtDate(selectedPatientForCard.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                This digital identifier links directly to Doctor, Nursing, Lab, and Pharmacy terminals.
              </span>
              <Button
                onClick={() => window.print()}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Smart ID Card
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reception;
