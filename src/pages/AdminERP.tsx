import React, { useState, useMemo } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, flashToast } from "../utils/helpers";
import type { UserRole } from "../store/types";
import {
  Shield,
  UserPlus,
  Key,
  Calendar,
  Building,
  QrCode,
  RotateCcw,
  CheckSquare,
  Wrench,
  UserCheck,
  Users,
  Clock,
  Briefcase,
  Banknote,
  CheckCircle,
  GitMerge,
  Grid,
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  RefreshCw,
  FileText,
  DollarSign,
  Activity,
  Layers,
} from "lucide-react";

interface Employee {
  id: string;
  code: string;
  name: string;
  department: string;
  designation: string;
  role: UserRole;
  phone: string;
  email: string;
  dateOfJoin: string;
  basicSalary: number;
  status: "Active" | "On Leave" | "Resigned";
}

interface DoctorSchedule {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  opdDays: string[];
  timing: string;
  room: string;
  maxTokens: number;
  status: "Available" | "In OT" | "On Leave";
}

interface AttendanceLog {
  id: string;
  empCode: string;
  name: string;
  department: string;
  date: string;
  inTime: string;
  outTime: string;
  status: "Present" | "Late" | "Absent" | "Half Day";
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "EMP-101", code: "CURA-EMP-001", name: "Dr. Arvind Raman", department: "Cardiology", designation: "Chief Cardiologist", role: "doctor", phone: "+91 98401 22334", email: "arvind.raman@curatech.org", dateOfJoin: "2022-01-15", basicSalary: 185000, status: "Active" },
  { id: "EMP-102", code: "CURA-EMP-002", name: "Dr. Deepa Nair", department: "Pediatrics", designation: "Consultant Pediatrician", role: "doctor", phone: "+91 98402 33445", email: "deepa.nair@curatech.org", dateOfJoin: "2023-03-01", basicSalary: 160000, status: "Active" },
  { id: "EMP-103", code: "CURA-EMP-003", name: "Sarah Thomas, RN", department: "ICU Nursing", designation: "Head Nurse", role: "nurse", phone: "+91 98403 44556", email: "sarah.t@curatech.org", dateOfJoin: "2021-08-10", basicSalary: 55000, status: "Active" },
  { id: "EMP-104", code: "CURA-EMP-004", name: "K. Mohan Kumar", department: "Front Desk", designation: "Senior Receptionist", role: "receptionist", phone: "+91 98404 55667", email: "mohan.reception@curatech.org", dateOfJoin: "2023-11-01", basicSalary: 32000, status: "Active" },
  { id: "EMP-105", code: "CURA-EMP-005", name: "Vikram Sethi", department: "Diagnostics", designation: "Chief Lab Technologist", role: "lab_tech", phone: "+91 98405 66778", email: "vikram.lab@curatech.org", dateOfJoin: "2022-06-20", basicSalary: 48000, status: "Active" },
  { id: "EMP-106", code: "CURA-EMP-006", name: "Ananya Iyer", department: "Central Pharmacy", designation: "Lead Pharmacist", role: "admin_pharmacist", phone: "+91 98406 77889", email: "ananya.pharma@curatech.org", dateOfJoin: "2022-02-14", basicSalary: 52000, status: "Active" },
  { id: "EMP-107", code: "CURA-EMP-007", name: "R. Suresh Kumar", department: "Accounts", designation: "Billing Cashier", role: "cashier", phone: "+91 98407 88990", email: "suresh.cashier@curatech.org", dateOfJoin: "2024-01-05", basicSalary: 30000, status: "Active" },
  { id: "EMP-108", code: "CURA-EMP-008", name: "M. Balaji", department: "Biomedical Engg", designation: "Senior Service Engineer", role: "maintenance", phone: "+91 98408 99001", email: "balaji.maint@curatech.org", dateOfJoin: "2020-04-18", basicSalary: 45000, status: "Active" },
];

const INITIAL_SCHEDULES: DoctorSchedule[] = [
  { id: "SCH-1", doctorId: "DOC-1", doctorName: "Dr. Arvind Raman", specialty: "Interventional Cardiology", opdDays: ["Mon", "Tue", "Wed", "Thu", "Fri"], timing: "09:00 AM - 01:00 PM", room: "OPD Suite 101", maxTokens: 30, status: "Available" },
  { id: "SCH-2", doctorId: "DOC-2", doctorName: "Dr. Deepa Nair", specialty: "Neonatal & Pediatrics", opdDays: ["Mon", "Wed", "Fri", "Sat"], timing: "10:00 AM - 02:00 PM", room: "OPD Suite 105", maxTokens: 25, status: "Available" },
  { id: "SCH-3", doctorId: "DOC-3", doctorName: "Dr. R. Rajesh", specialty: "Orthopedic Surgery", opdDays: ["Tue", "Thu", "Sat"], timing: "02:00 PM - 06:00 PM", room: "OPD Suite 108", maxTokens: 20, status: "In OT" },
  { id: "SCH-4", doctorId: "DOC-4", doctorName: "Dr. Sunita Kapoor", specialty: "Dermatology & Cosmetology", opdDays: ["Mon", "Tue", "Wed", "Fri"], timing: "11:00 AM - 04:00 PM", room: "Derm Care Room 2", maxTokens: 20, status: "Available" },
];

export const AdminERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "create_user", dropdownOption }) => {
  const { users, currentUser, branches, addUser, updateUser, viewBranchId, patients } = useStore();

  const [activeTab, setActiveTab] = useState<string>(initialAction || "create_user");
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>(INITIAL_SCHEDULES);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewEmpModal, setShowNewEmpModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [selectedEmpForPayroll, setSelectedEmpForPayroll] = useState<Employee | null>(null);

  // New User Form State
  const [userForm, setUserForm] = useState({
    username: "",
    name: "",
    password: "",
    role: "receptionist" as UserRole,
    branchId: viewBranchId || "BR-01",
    pin: "1234",
  });

  // New Employee Form State
  const [empForm, setEmpForm] = useState({
    name: "",
    department: "Clinical Care",
    designation: "Staff Specialist",
    role: "nurse" as UserRole,
    phone: "",
    email: "",
    basicSalary: 35000,
  });

  // PHN Merge State
  const [mergePrimaryUhid, setMergePrimaryUhid] = useState("");
  const [mergeDuplicateUhid, setMergeDuplicateUhid] = useState("");
  const [mergeReason, setMergeReason] = useState("Duplicate registration at Emergency Desk");

  // Sync tab with ribbon click
  React.useEffect(() => {
    if (initialAction) {
      setActiveTab(initialAction);
    }
  }, [initialAction]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username || !userForm.password) {
      flashToast("Please enter a valid username and password", "error");
      return;
    }
    const id = `USR-${Date.now().toString().slice(-4)}`;
    addUser({
      id,
      username: userForm.username.trim().toLowerCase(),
      name: userForm.name || userForm.username,
      password: userForm.password,
      role: userForm.role,
      branchId: userForm.branchId,
      pin: userForm.pin,
    } as any);

    flashToast(`User account '${userForm.username}' created successfully!`, "success");
    setShowCreateUserModal(false);
    setUserForm({
      username: "",
      name: "",
      password: "",
      role: "receptionist",
      branchId: viewBranchId || "BR-01",
      pin: "1234",
    });
  };

  const handleResetPassword = () => {
    if (!selectedUserForReset || !newPassword) return;
    updateUser(selectedUserForReset.id, { password: newPassword });
    flashToast(`Password for ${selectedUserForReset.username} has been reset.`, "success");
    setShowResetPasswordModal(false);
    setSelectedUserForReset(null);
    setNewPassword("");
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name || !empForm.phone) {
      flashToast("Please fill in employee name and phone number", "error");
      return;
    }
    const newEmp: Employee = {
      id: `EMP-${Date.now().toString().slice(-3)}`,
      code: `CURA-EMP-${(employees.length + 1).toString().padStart(3, "0")}`,
      name: empForm.name,
      department: empForm.department,
      designation: empForm.designation,
      role: empForm.role,
      phone: empForm.phone,
      email: empForm.email || `${empForm.name.toLowerCase().replace(/\s+/g, ".")}@curatech.org`,
      dateOfJoin: new Date().toISOString().split("T")[0],
      basicSalary: Number(empForm.basicSalary) || 30000,
      status: "Active",
    };
    setEmployees([newEmp, ...employees]);
    flashToast(`Employee '${newEmp.name}' onboarded with Code ${newEmp.code}`, "success");
    setShowNewEmpModal(false);
  };

  const handleExecutePhnMerge = () => {
    if (!mergePrimaryUhid || !mergeDuplicateUhid) {
      flashToast("Please provide both Primary UHID and Duplicate UHID", "error");
      return;
    }
    if (mergePrimaryUhid.trim().toUpperCase() === mergeDuplicateUhid.trim().toUpperCase()) {
      flashToast("Primary UHID and Duplicate UHID cannot be identical", "error");
      return;
    }
    flashToast(`PHN Merger Complete: ${mergeDuplicateUhid} merged into master record ${mergePrimaryUhid}`, "success");
    setMergeDuplicateUhid("");
    setMergePrimaryUhid("");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* ── Sub-Navigation / Quick View Switcher ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Admin & Enterprise Management Console
              {dropdownOption && (
                <Badge variant="info" className="text-xs">
                  {dropdownOption}
                </Badge>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              User Access, HR Payroll, Clinical Calendars, Facility Ops & System Utilities
            </p>
          </div>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab("create_user")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "create_user" || activeTab === "user_role_mgmt"
                ? "bg-sky-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Users & Roles
          </button>
          <button
            onClick={() => setActiveTab("doctors_calendar")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "doctors_calendar"
                ? "bg-sky-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Doctors Calendar
          </button>
          <button
            onClick={() => setActiveTab("facility_mgmt")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "facility_mgmt" || activeTab === "allotment" || activeTab === "operation_maintenance"
                ? "bg-sky-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Hospital Ops
          </button>
          <button
            onClick={() => setActiveTab("view_employees")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "view_employees" || activeTab === "new_employee" || activeTab === "attendance" || activeTab === "payroll_generation"
                ? "bg-sky-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            HR & Payroll
          </button>
          <button
            onClick={() => setActiveTab("merge_phn")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "merge_phn" || activeTab === "acquittance" || activeTab === "menu_mapping"
                ? "bg-sky-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            System Utilities
          </button>
        </div>
      </div>

      {/* ── 1. USER ACCESS & ROLE MANAGEMENT ── */}
      {(activeTab === "create_user" || activeTab === "reset_password" || activeTab === "user_role_mgmt") && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="p-4 border-l-4 border-l-sky-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Total System Users</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{users.length}</div>
              <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> All security policies active
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Active Attending Clinicians</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {users.filter((u) => u.role === "doctor").length || 3}
              </div>
              <div className="text-xs text-slate-500 mt-1">Exclusive Rx & Diagnostics</div>
            </Card>
            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Front Desk & Billing</div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {users.filter((u) => u.role === "receptionist" || u.role === "cashier").length || 4}
              </div>
              <div className="text-xs text-slate-500 mt-1">UHID & Ledger Access</div>
            </Card>
            <Card className="p-4 border-l-4 border-l-purple-500">
              <div className="text-xs text-slate-500 uppercase font-semibold">Enterprise RBAC Status</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">17 Roles</div>
              <div className="text-xs text-slate-500 mt-1">Strict Department Routing</div>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-sky-500" />
                  System User Directory & Department Roles
                </h3>
                <p className="text-xs text-slate-500">Manage user authentication credentials, passwords, and permissions</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search user / role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 text-xs py-1"
                />
                <Button size="sm" onClick={() => setShowCreateUserModal(true)} className="flex items-center gap-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white">
                  <UserPlus className="w-3.5 h-3.5" /> Create New User
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold tracking-wider">
                      <th className="p-3">User & ID</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">Assigned Role</th>
                      <th className="p-3">Primary Branch</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Security Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users
                      .filter(
                        (u) =>
                          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.role.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{u.username}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{u.id}</div>
                          </td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{u.name || u.username}</td>
                          <td className="p-3">
                            <Badge
                              variant={
                                u.role === "doctor"
                                  ? "indigo"
                                  : u.role === "nurse"
                                  ? "emerald"
                                  : u.role === "receptionist"
                                  ? "sky"
                                  : u.role === "superadmin" || u.role === "admin"
                                  ? "danger"
                                  : "default"
                              }
                              className="text-[11px] uppercase tracking-wider"
                            >
                              {u.role.replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {branches.find((b) => b.id === u.branchId)?.name || u.branchId || "Central Hospital"}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUserForReset(u);
                                  setShowResetPasswordModal(true);
                                }}
                                className="text-[11px] py-1 px-2 flex items-center gap-1 text-slate-600 dark:text-slate-300"
                              >
                                <Key className="w-3 h-3 text-amber-500" /> Reset Pwd
                              </Button>
                            </div>
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

      {/* ── 2. DOCTORS CALENDAR ── */}
      {activeTab === "doctors_calendar" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-sky-500" />
                  Physicians Master Clinical Roster & OPD Timetable
                </h3>
                <p className="text-xs text-slate-500">Live consultation schedules, room allocations, token limits & OT shifts</p>
              </div>
              <Button size="sm" onClick={() => flashToast("Doctor schedule exported to PDF", "info")} className="text-xs flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" /> Print Timetable
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                      <th className="p-3">Doctor & Specialty</th>
                      <th className="p-3">Assigned OPD Room</th>
                      <th className="p-3">Consultation Days</th>
                      <th className="p-3">Timings</th>
                      <th className="p-3">Token Quota</th>
                      <th className="p-3">Current Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {schedules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{s.doctorName}</div>
                          <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">{s.specialty}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{s.room}</td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {s.opdDays.map((day) => (
                              <span key={day} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                {day}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{s.timing}</td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{s.maxTokens} Patients / Day</td>
                        <td className="p-3">
                          <Badge
                            variant={s.status === "Available" ? "success" : s.status === "In OT" ? "warning" : "danger"}
                            className="text-[11px]"
                          >
                            {s.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updated = schedules.map((item) =>
                                item.id === s.id
                                  ? { ...item, status: item.status === "Available" ? "In OT" : ("Available" as any) }
                                  : item
                              );
                              setSchedules(updated);
                              flashToast(`Status updated for ${s.doctorName}`, "success");
                            }}
                            className="text-xs py-1 px-2"
                          >
                            Toggle Status
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

      {/* ── 3. HOSPITAL OPERATIONS & FACILITY MANAGEMENT ── */}
      {(activeTab === "facility_mgmt" ||
        activeTab === "allotment" ||
        activeTab === "operation_maintenance" ||
        activeTab === "cancel_ip_discharge" ||
        activeTab === "id_card_forward") && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sky-600 font-semibold text-sm mb-2">
                <Building className="w-4 h-4" /> Facility Occupancy & Wards
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">General Ward (Male):</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">18 / 24 Beds (75%)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">General Ward (Female):</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">14 / 20 Beds (70%)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Intensive Care Unit (ICU):</span>
                  <span className="font-bold text-rose-600">8 / 10 Beds (80%)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Operation Theatres (OT):</span>
                  <span className="font-bold text-emerald-600">2 / 3 Active</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm mb-2">
                <Wrench className="w-4 h-4" /> Utility & Energy Diagnostics
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Hospital DG Set (250 kVA):</span>
                  <span className="font-semibold text-emerald-600">Standby (Diesel 88%)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Central Oxygen Manifold:</span>
                  <span className="font-semibold text-emerald-600">14.2 Bar (Nominal)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Water RO / Dialysis Supply:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">TDS 18 ppm (Optimal)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Bio-Hazard Waste Clearance:</span>
                  <span className="font-semibold text-sky-600">Dispatched Today 08:30 AM</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm mb-2">
                <RotateCcw className="w-4 h-4" /> Cancel IP Discharge Recovery
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Reinstate patient admission if discharge was processed inadvertently or readmission is ordered.
              </p>
              <div className="flex gap-2">
                <Input placeholder="Enter Inpatient IPD No..." className="text-xs py-1" />
                <Button size="sm" variant="danger" onClick={() => flashToast("Discharge cancelled: Patient IPD reinstated", "success")} className="text-xs shrink-0">
                  Reinstate IP
                </Button>
              </div>
            </Card>
          </div>

          {/* Operation Maintenance Group Drill-Down */}
          <Card>
            <CardHeader className="py-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                Hospital Infrastructure & Operational Maintenance Logs
              </h3>
            </CardHeader>
            <CardBody className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Civil Engineering</div>
                <p className="text-slate-500 text-[11px] mb-2">Plumbing, structural checks, roof waterproofing, wall painting.</p>
                <Badge variant="success">Inspection Completed</Badge>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">HVAC & Chiller</div>
                <p className="text-slate-500 text-[11px] mb-2">HEPA filters in OT 1 & 2, laminar airflow positive pressure.</p>
                <Badge variant="info">Airflow 0.45 m/s</Badge>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Generator & UPS</div>
                <p className="text-slate-500 text-[11px] mb-2">Battery impedance test, automatic transfer switch (ATS) weekly test.</p>
                <Badge variant="success">Passed 0.4s Switch</Badge>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Biomedical Waste</div>
                <p className="text-slate-500 text-[11px] mb-2">Yellow, Red, White, Blue bag weight registry & Barcode logging.</p>
                <Badge variant="warning">Daily Log Signed</Badge>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── 4. HR & PAYROLL MODULE ── */}
      {(activeTab === "view_employees" ||
        activeTab === "new_employee" ||
        activeTab === "attendance" ||
        activeTab === "payroll_generation" ||
        activeTab === "employee_drop") && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-emerald-500" />
                  Hospital Staff Directory & HR Management
                </h3>
                <p className="text-xs text-slate-500">Employee profiles, salary structures, payroll generation & biometric attendance</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setShowNewEmpModal(true)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Onboard New Employee
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedEmpForPayroll(employees[0]);
                    setShowPayrollModal(true);
                  }}
                  className="text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
                >
                  <Banknote className="w-3.5 h-3.5 text-sky-500" /> Generate Payroll
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                      <th className="p-3">Emp Code</th>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3">Basic Salary</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Payroll Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{emp.code}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{emp.name}</div>
                          <div className="text-[10px] text-slate-400">Joined: {emp.dateOfJoin}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{emp.department}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{emp.designation}</td>
                        <td className="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          ₹{emp.basicSalary.toLocaleString("en-IN")}/mo
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400">
                          <div>{emp.phone}</div>
                          <div className="text-slate-400">{emp.email}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant={emp.status === "Active" ? "success" : "warning"} className="text-[10px]">
                            {emp.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEmpForPayroll(emp);
                              setShowPayrollModal(true);
                            }}
                            className="text-[11px] py-1 px-2"
                          >
                            Pay Slip
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

      {/* ── 5. SYSTEM UTILITIES: MERGE PHN, ACQUITTANCE & MENU MAPPING ── */}
      {(activeTab === "merge_phn" || activeTab === "acquittance" || activeTab === "menu_mapping") && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PHN Merge Utility */}
            <Card>
              <CardHeader className="py-3">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-amber-500" />
                  Duplicate UHID / Patient Health Number (PHN) Merger
                </h3>
                <p className="text-xs text-slate-500">
                  Safely consolidate duplicate registrations, migrating clinical visit trails, lab tests and billing records to master UHID.
                </p>
              </CardHeader>
              <CardBody className="p-4 space-y-3 text-xs">
                <div>
                  <Label>Master / Primary Target UHID (Retained Record)</Label>
                  <Input
                    placeholder="e.g. UHID-2026-0010"
                    value={mergePrimaryUhid}
                    onChange={(e) => setMergePrimaryUhid(e.target.value)}
                    className="text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <Label>Duplicate UHID (To Be Merged & Archived)</Label>
                  <Input
                    placeholder="e.g. UHID-2026-0042"
                    value={mergeDuplicateUhid}
                    onChange={(e) => setMergeDuplicateUhid(e.target.value)}
                    className="text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <Label>Reason for PHN Merger</Label>
                  <Input
                    value={mergeReason}
                    onChange={(e) => setMergeReason(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>All historical prescriptions, nursing vitals and unpaid ledgers will link to the Primary UHID.</span>
                </div>
                <Button onClick={handleExecutePhnMerge} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs">
                  Execute Safe PHN Consolidation
                </Button>
              </CardBody>
            </Card>

            {/* User Role Menu Mapping */}
            <Card>
              <CardHeader className="py-3">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Grid className="w-4 h-4 text-sky-500" />
                  Role-to-Ribbon Menu Permission Mapping
                </h3>
                <p className="text-xs text-slate-500">Active operational authority granted across all seventeen ERP modules</p>
              </CardHeader>
              <CardBody className="p-3 text-xs space-y-2 max-h-80 overflow-y-auto">
                {[
                  { role: "Super Admin", access: "Full unrestricted 17-module authority & database administration" },
                  { role: "Doctor / Clinician", access: "EHR, E-Prescriptions, Clinical Rounds, Diagnostic Orders" },
                  { role: "Nurse (RN)", access: "Vitals Recording, Medication Administration (MAR), Nursing Plans" },
                  { role: "Receptionist", access: "New UHID Intake, Outpatient Tokens, Inpatient Admission, Billing" },
                  { role: "Lab Technician", access: "Queue, Auto Analyzer HL7 Simulator, Diagnostics Verification" },
                  { role: "Staff Pharmacist", access: "Prescription Dispensing Queue, Batch Expiry, Pharmacy Sales" },
                  { role: "Cashier", access: "Cash Collection, Receipts, Daily Shift Close, Pre-Booking Ledgers" },
                  { role: "Accountant", access: "Physical Denomination Close, Voucher Register, Doctor TDS Payouts" },
                  { role: "Maintenance", access: "Work Orders, Breakdown Tickets, Facility Infrastructure" },
                  { role: "Store Manager", access: "Central Stores, Disposables, PPE, Purchase Orders & Indents" },
                  { role: "Ambulance Driver", access: "Emergency Dispatch, Trip Odometers, Oxygen Manifold Checks" },
                  { role: "Skin Specialist", access: "Dermatology Procedures, Chemical Peel & Laser Regimens" },
                ].map((item, idx) => (
                  <div key={idx} className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.role}:</span>
                      <span className="text-slate-500 ml-1">{item.access}</span>
                    </div>
                    <Badge variant="success" className="text-[10px] shrink-0">Enforced</Badge>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE NEW USER ── */}
      {showCreateUserModal && (
        <Modal open={showCreateUserModal} onClose={() => setShowCreateUserModal(false)} title="Create Hospital Staff Account">
          <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
            <div>
              <Label>Username (Login Handle)</Label>
              <Input
                placeholder="e.g. dr.ananya or nurse.leela"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Full Staff Name</Label>
              <Input
                placeholder="e.g. Dr. Ananya Mukherjee, MBBS, MD"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Assigned Role (Operational Scope)</Label>
              <Select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
              >
                <option value="doctor">Attending Clinician (Doctor)</option>
                <option value="nurse">Nursing Staff (RN)</option>
                <option value="receptionist">Receptionist (Front Desk)</option>
                <option value="lab_tech">Lab Technician (Diagnostics)</option>
                <option value="staff_pharmacist">Staff Pharmacist (Dispensing)</option>
                <option value="admin_pharmacist">Admin Pharmacist (Pharmacy Incharge)</option>
                <option value="cashier">Hospital Cashier</option>
                <option value="accountant">Chief Accountant</option>
                <option value="maintenance">Biomedical Engineer (Maintenance)</option>
                <option value="physiotherapy">Physiotherapist (Rehab)</option>
                <option value="store_manager">Central Store Manager</option>
                <option value="ambulance">Ambulance Fleet Coordinator</option>
                <option value="skin_specialist">Dermatologist (Skin Clinic)</option>
                <option value="admin">Hospital Administrator</option>
              </Select>
            </div>
            <div>
              <Label>Login Password</Label>
              <Input
                type="password"
                placeholder="Enter secure initial password..."
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Assigned Hospital Branch</Label>
              <Select
                value={userForm.branchId}
                onChange={(e) => setUserForm({ ...userForm, branchId: e.target.value })}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setShowCreateUserModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white">
                Create Account
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: RESET PASSWORD ── */}
      {showResetPasswordModal && selectedUserForReset && (
        <Modal open={showResetPasswordModal} onClose={() => setShowResetPasswordModal(false)} title="Reset User Password">
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
              <div className="font-bold text-slate-800 dark:text-slate-100">{selectedUserForReset.name || selectedUserForReset.username}</div>
              <div className="text-slate-500">Handle: {selectedUserForReset.username} | Role: {selectedUserForReset.role}</div>
            </div>
            <div>
              <Label>Enter New Password</Label>
              <Input
                type="password"
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowResetPasswordModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleResetPassword} className="bg-amber-600 hover:bg-amber-700 text-white">
                Update Password
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL: ONBOARD NEW EMPLOYEE ── */}
      {showNewEmpModal && (
        <Modal open={showNewEmpModal} onClose={() => setShowNewEmpModal(false)} title="Onboard New Hospital Employee">
          <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Employee Full Name</Label>
                <Input
                  placeholder="Dr. / Mr. / Ms."
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Department</Label>
                <Input
                  placeholder="e.g. Cardiology, Billing, ICU"
                  value={empForm.department}
                  onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Designation</Label>
                <Input
                  placeholder="e.g. Senior Resident, Staff Nurse"
                  value={empForm.designation}
                  onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Role Access</Label>
                <Select
                  value={empForm.role}
                  onChange={(e) => setEmpForm({ ...empForm, role: e.target.value as UserRole })}
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="lab_tech">Lab Tech</option>
                  <option value="cashier">Cashier</option>
                  <option value="accountant">Accountant</option>
                  <option value="maintenance">Maintenance</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mobile Phone</Label>
                <Input
                  placeholder="+91 98400 00000"
                  value={empForm.phone}
                  onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Monthly Basic Salary (₹)</Label>
                <Input
                  type="number"
                  placeholder="35000"
                  value={empForm.basicSalary}
                  onChange={(e) => setEmpForm({ ...empForm, basicSalary: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setShowNewEmpModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Add to Employee Register
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: PAYROLL GENERATION & SLIP ── */}
      {showPayrollModal && selectedEmpForPayroll && (
        <Modal open={showPayrollModal} onClose={() => setShowPayrollModal(false)} title="Employee Salary Slip & Payroll Voucher">
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{selectedEmpForPayroll.name}</div>
                <div className="text-slate-500 font-mono text-[11px]">{selectedEmpForPayroll.code} | {selectedEmpForPayroll.designation}</div>
              </div>
              <Badge variant="success">October 2026</Badge>
            </div>

            <div className="space-y-1.5 border p-3 rounded-lg border-slate-200 dark:border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Basic Pay:</span>
                <span className="font-mono font-semibold">₹{selectedEmpForPayroll.basicSalary.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">House Rent Allowance (HRA 40%):</span>
                <span className="font-mono text-emerald-600">+₹{(selectedEmpForPayroll.basicSalary * 0.4).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Medical & Special Allowance:</span>
                <span className="font-mono text-emerald-600">+₹5,000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Provident Fund (EPF 12%):</span>
                <span className="font-mono text-rose-600">-₹{(selectedEmpForPayroll.basicSalary * 0.12).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Professional Tax & TDS:</span>
                <span className="font-mono text-rose-600">-₹2,500</span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-bold border-t-2 border-slate-200 dark:border-slate-700">
                <span className="text-slate-800 dark:text-slate-100">Net Take-Home Pay:</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono">
                  ₹{(selectedEmpForPayroll.basicSalary * 1.28 + 2500).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPayrollModal(false)}>
                Close
              </Button>
              <Button onClick={() => flashToast("Salary Voucher Dispatched & Stamped", "success")} className="bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Print & Disburse
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminERP;
