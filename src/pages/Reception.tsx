import React, { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Modal, Badge } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import { generateUhid, formatTokenNumber, getPatientQrUrl } from "../utils/uhidGenerator";
import type {
  Patient,
  Appointment,
  AppointmentStatus,
  AppointmentPriority,
  InpatientAdmission,
  InpatientWard,
  DischargeCondition,
  PaymentMethod,
} from "../store/types";
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
  Bed,
  LogOut,
  HeartPulse,
  Plus,
  DoorOpen,
  Volume2,
  Tv,
  Minimize2,
  Maximize2,
  Receipt,
  Banknote,
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

export const WARD_OPTIONS: {
  ward: InpatientWard;
  dailyRate: number;
  bedPrefix: string;
  description: string;
  badgeColor: string;
}[] = [
  {
    ward: "General Ward",
    dailyRate: 1200,
    bedPrefix: "GW",
    description: "Shared multi-bed ward with 24/7 nursing supervision",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
  },
  {
    ward: "Semi-Private",
    dailyRate: 2500,
    bedPrefix: "SP",
    description: "Twin-sharing air-conditioned room with attendant couch",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700",
  },
  {
    ward: "Private Deluxe",
    dailyRate: 5000,
    bedPrefix: "PD",
    description: "Single private room with en-suite bath and full privacy",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700",
  },
  {
    ward: "ICU",
    dailyRate: 10000,
    bedPrefix: "ICU",
    description: "Intensive Care Unit with continuous hemodynamic telemetry & ventilator",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700",
  },
  {
    ward: "NICU",
    dailyRate: 8000,
    bedPrefix: "NICU",
    description: "Neonatal Intensive Care Unit with warmers and phototherapy",
    badgeColor: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700",
  },
  {
    ward: "Emergency / Trauma",
    dailyRate: 3500,
    bedPrefix: "EMG",
    description: "Emergency observation bay with immediate triage monitoring",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  },
  {
    ward: "Day Care",
    dailyRate: 1500,
    bedPrefix: "DC",
    description: "Short-stay infusion and post-procedure recovery bed",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  },
];

export type DoctorAvailability = "available" | "in_consultation" | "on_rounds" | "on_break" | "off_duty";

export const Reception: React.FC<{
  onNavigateToDoctor?: (patientId: string) => void;
  onNavigateToNurse?: (patientId: string) => void;
  onNavigateToVisitTrail?: (uhid: string) => void;
  onNavigateToBilling?: (patientId?: string) => void;
}> = ({ onNavigateToDoctor, onNavigateToNurse, onNavigateToVisitTrail, onNavigateToBilling }) => {
  const { data, setData, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";
  const isReceptionistRole = currentUser?.role === "receptionist";

  // Active Tab
  const [activeTab, setActiveTab] = useState<"tokenBoard" | "queue" | "inpatient" | "billing" | "patients">("queue");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWard, setFilterWard] = useState("all");
  const [filterInpatientStatus, setFilterInpatientStatus] = useState<"all" | "admitted" | "discharged">("admitted");

  // TV / Kiosk Display Mode for Waiting Rooms
  const [isTvMode, setIsTvMode] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState(new Date().toLocaleTimeString());

  // Clock ticker for TV mode
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Doctor Availability & Chamber Allocation State
  const [doctorChambers, setDoctorChambers] = useState<Record<string, { status: DoctorAvailability; chamber: string }>>({
    doc_1: { status: "in_consultation", chamber: "Chamber 101" },
    doc_2: { status: "available", chamber: "Chamber 102" },
    doc_3: { status: "on_rounds", chamber: "Chamber 103" },
    doc_4: { status: "available", chamber: "Chamber 104" },
  });

  const getDoctorChamber = (docId: string, idx: number) => {
    if (doctorChambers[docId]) return doctorChambers[docId];
    return {
      status: "available" as DoctorAvailability,
      chamber: `Chamber ${101 + (idx % 8)}`,
    };
  };

  const handleUpdateDoctorStatus = (docId: string, status: DoctorAvailability) => {
    setDoctorChambers((prev) => ({
      ...prev,
      [docId]: {
        chamber: prev[docId]?.chamber || "Chamber 101",
        status,
      },
    }));
    flashToast(`Doctor status updated to ${status.replace("_", " ")}`);
  };

  // Web Audio API Sound Chime for OPD Token Announcements
  const [isChiming, setIsChiming] = useState(false);
  const playTokenChime = (tokenText?: string) => {
    setIsChiming(true);
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Primary chime tone (E5 ~659.25Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        // Harmonic response tone (A5 ~880Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, now + 0.22);
        gain2.gain.setValueAtTime(0.3, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.9);
      }
    } catch {
      // AudioContext unavailable or blocked by policy
    }
    setTimeout(() => setIsChiming(false), 1200);
    if (tokenText) {
      flashToast(`📢 Now Announcing Token: ${tokenText}`);
    }
  };

  // Registration Modal State & Duplicate Protection
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false);
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

  // Appointment Modal State (OPD)
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

  // Inpatient Admission Modal State (IPD)
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [admitForm, setAdmitForm] = useState({
    patientId: "",
    doctorId: data.doctors[0]?.id || "",
    ward: "General Ward" as InpatientWard,
    bedNumber: "GW-04",
    admissionReason: "",
    provisionalDiagnosis: "",
    dailyBedCharge: 1200,
    initialDeposit: 5000,
  });

  // Inpatient Discharge Modal State
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [selectedAdmissionForDischarge, setSelectedAdmissionForDischarge] = useState<InpatientAdmission | null>(null);
  const [dischargeForm, setDischargeForm] = useState({
    dischargeCondition: "Recovered" as DischargeCondition,
    dischargeSummary: "",
    openLedgerImmediately: true,
  });

  // Digital ID Card Modal State
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [selectedPatientForCard, setSelectedPatientForCard] = useState<Patient | null>(null);
  const printCardRef = useRef<HTMLDivElement>(null);

  // Consolidated Hospital Financial Ledger State
  const [selectedPatientForLedger, setSelectedPatientForLedger] = useState<string>("");
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI / QR" | "Card" | "Net Banking">("Cash");
  const [paymentRefNumber, setPaymentRefNumber] = useState("");
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [printableInvoiceModalOpen, setPrintableInvoiceModalOpen] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<{
    invoiceNumber: string;
    date: string;
    patient: Patient;
    doctorItems: { description: string; doctorName: string; fee: number; date: string }[];
    bedItems: { ward: string; bedNumber: string; days: number; rate: number; total: number; deposit: number }[];
    labItems: { testName: string; category: string; price: number }[];
    pharmacyItems: { name: string; qty: number; price: number; total: number }[];
    grossTotal: number;
    depositDeducted: number;
    discount: number;
    netPaid: number;
    paymentMode: string;
    refNo: string;
    cashier: string;
  } | null>(null);

  const appointments = data.appointments || [];
  const admissions = data.admissions || [];
  const patients = data.patients || [];
  const doctors = data.doctors || [];
  const labOrders = data.labOrders || [];
  const invoices = data.invoices || [];

  // Active & Discharged Inpatients
  const activeInpatients = useMemo(() => admissions.filter((a) => a.status === "admitted"), [admissions]);
  const dischargedInpatients = useMemo(() => admissions.filter((a) => a.status === "discharged"), [admissions]);

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

  // Filtered Inpatients
  const filteredAdmissions = useMemo(() => {
    return admissions.filter((adm) => {
      const matchWard = filterWard === "all" || adm.ward === filterWard;
      const matchStatus = filterInpatientStatus === "all" || adm.status === filterInpatientStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        adm.patientName.toLowerCase().includes(q) ||
        (adm.patientUhid && adm.patientUhid.toLowerCase().includes(q)) ||
        (adm.patientPhone && adm.patientPhone.includes(q)) ||
        adm.admissionNumber.toLowerCase().includes(q) ||
        adm.bedNumber.toLowerCase().includes(q) ||
        (adm.doctorName && adm.doctorName.toLowerCase().includes(q));
      return matchWard && matchStatus && matchQuery;
    });
  }, [admissions, filterWard, filterInpatientStatus, searchQuery]);

  // Metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter((a) => a.date === todayStr);
  const waitingCount = todayAppointments.filter((a) => a.status === "checked_in" || a.status === "scheduled").length;
  const inConsultCount = todayAppointments.filter((a) => a.status === "with_doctor" || a.status === "with_nurse").length;
  const completedCount = todayAppointments.filter((a) => a.status === "completed").length;

  // Active Token being called right now
  const nowCallingApt = useMemo(() => {
    const inDoc = appointments.find((a) => a.status === "with_doctor");
    if (inDoc) return inDoc;
    const withNurse = appointments.find((a) => a.status === "with_nurse");
    if (withNurse) return withNurse;
    const checkedIn = appointments.find((a) => a.status === "checked_in");
    return checkedIn || null;
  }, [appointments]);

  // Duplicate Check during Registration
  const normalizedPhoneInput = regForm.phone.replace(/\D/g, "");
  const duplicatePhoneMatch = useMemo(() => {
    if (normalizedPhoneInput.length < 10) return null;
    return patients.find((p) => p.phone.replace(/\D/g, "") === normalizedPhoneInput) || null;
  }, [normalizedPhoneInput, patients]);

  const duplicateNameMatch = useMemo(() => {
    const trimmed = regForm.name.trim().toLowerCase();
    if (trimmed.length < 3) return null;
    return patients.find((p) => p.name.trim().toLowerCase() === trimmed) || null;
  }, [regForm.name, patients]);

  const activeDuplicateWarning = duplicatePhoneMatch || duplicateNameMatch;

  // Handler: Register Patient & Issue UHID
  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.phone.trim()) {
      flashToast("Please provide patient name and phone number", "warn");
      return;
    }

    if (duplicatePhoneMatch && !allowDuplicateOverride) {
      flashToast("Duplicate Phone Detected! Confirm override or select existing UHID.", "warn");
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
    setAllowDuplicateOverride(false);

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

    playTokenChime(`Token ${formatTokenNumber(nextTokenNum)}`);
    flashToast(`Token ${formatTokenNumber(nextTokenNum)} issued for ${patient.name}`);
    setApptModalOpen(false);
  };

  // Update appointment status
  const updateStatus = (aptId: string, status: AppointmentStatus) => {
    setData((prev) => ({
      ...prev,
      appointments: (prev.appointments || []).map((a) => (a.id === aptId ? { ...a, status } : a)),
    }));
    if (status === "with_doctor") {
      const apt = appointments.find((a) => a.id === aptId);
      playTokenChime(apt ? `Token ${formatTokenNumber(apt.tokenNumber)} to Doctor` : undefined);
    }
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

  // Modal Openers
  const handleOpenAdmitModal = (preselectedPatientId?: string) => {
    const targetPatientId = preselectedPatientId || (patients[0]?.id || "");
    const firstDoc = doctors[0];
    const defaultWard: InpatientWard = "General Ward";
    const wardObj = WARD_OPTIONS.find((w) => w.ward === defaultWard);
    setAdmitForm({
      patientId: targetPatientId,
      doctorId: firstDoc?.id || "",
      ward: defaultWard,
      bedNumber: `${wardObj?.bedPrefix || "GW"}-04`,
      admissionReason: "",
      provisionalDiagnosis: "",
      dailyBedCharge: wardObj?.dailyRate || 1200,
      initialDeposit: 5000,
    });
    setAdmitModalOpen(true);
  };

  const handleOpenDischargeModal = (adm: InpatientAdmission) => {
    setSelectedAdmissionForDischarge(adm);
    setDischargeForm({
      dischargeCondition: "Recovered",
      dischargeSummary: `Patient admitted with ${adm.provisionalDiagnosis || adm.admissionReason}. Successfully stabilized after inpatient clinical management. Prescribed routine post-discharge care.`,
      openLedgerImmediately: true,
    });
    setDischargeModalOpen(true);
  };

  // Handler: Admit Inpatient & Assign Bed
  const handleAdmitPatient = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find((p) => p.id === admitForm.patientId);
    const doctor = doctors.find((d) => d.id === admitForm.doctorId);

    if (!patient || !doctor) {
      flashToast("Select a valid patient and admitting doctor", "warn");
      return;
    }
    if (!admitForm.bedNumber.trim()) {
      flashToast("Please assign a valid bed number", "warn");
      return;
    }

    const nextCounter = (data.counters.admission || 300) + 1;
    const admissionNumber = `IPD-${nextCounter}`;

    const newAdmission: InpatientAdmission = {
      id: "adm_" + Date.now(),
      branchId,
      admissionNumber,
      patientId: patient.id,
      patientUhid: patient.uhid,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientAge: patient.age,
      patientGender: patient.gender,
      doctorId: doctor.id,
      doctorName: doctor.name,
      department: doctor.department || "General Medicine",
      ward: admitForm.ward,
      bedNumber: admitForm.bedNumber.trim().toUpperCase(),
      admittedAt: new Date().toISOString(),
      admissionReason: admitForm.admissionReason.trim() || "Inpatient Care & Observation",
      provisionalDiagnosis: admitForm.provisionalDiagnosis.trim() || "Under Medical Evaluation",
      dailyBedCharge: Number(admitForm.dailyBedCharge) || 1200,
      initialDeposit: Number(admitForm.initialDeposit) || 0,
      status: "admitted",
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      admissions: [newAdmission, ...(prev.admissions || [])],
      counters: { ...prev.counters, admission: nextCounter },
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || "Reception",
          action: "INPATIENT_ADMITTED",
          details: `Admitted ${patient.name} (${admissionNumber}) to ${newAdmission.ward} [Bed ${newAdmission.bedNumber}] under ${doctor.name}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    log("INPATIENT_ADMITTED", `Admitted ${patient.name} to ${newAdmission.ward} (Bed ${newAdmission.bedNumber})`);
    flashToast(`Admitted ${patient.name} to ${newAdmission.ward} (Bed ${newAdmission.bedNumber})`);
    setAdmitModalOpen(false);
    setActiveTab("inpatient");
  };

  // Handler: Discharge Inpatient
  const handleDischargePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmissionForDischarge) return;
    const adm = selectedAdmissionForDischarge;

    const updatedAdmission: InpatientAdmission = {
      ...adm,
      status: "discharged",
      dischargedAt: new Date().toISOString(),
      dischargeCondition: dischargeForm.dischargeCondition,
      dischargeSummary: dischargeForm.dischargeSummary.trim() || "Discharged in stable clinical condition with prescribed discharge medications.",
    };

    setData((prev) => ({
      ...prev,
      admissions: (prev.admissions || []).map((a) => (a.id === adm.id ? updatedAdmission : a)),
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || "Reception",
          action: "INPATIENT_DISCHARGED",
          details: `Discharged ${adm.patientName} (${adm.admissionNumber}) from ${adm.ward} [Condition: ${dischargeForm.dischargeCondition}]`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    log("INPATIENT_DISCHARGED", `Discharged ${adm.patientName} (${adm.admissionNumber})`);
    flashToast(`Patient ${adm.patientName} discharged (${dischargeForm.dischargeCondition})`);
    setDischargeModalOpen(false);
    setSelectedAdmissionForDischarge(null);

    if (dischargeForm.openLedgerImmediately) {
      setSelectedPatientForLedger(adm.patientId);
      setActiveTab("billing");
    }
  };

  // ── Consolidated Patient Financial Ledger Calculations ──
  const activeLedgerPatient = useMemo(() => {
    if (!selectedPatientForLedger && patients.length > 0) {
      return patients[0];
    }
    return patients.find((p) => p.id === selectedPatientForLedger) || patients[0] || null;
  }, [selectedPatientForLedger, patients]);

  const patientFinancialLedger = useMemo(() => {
    if (!activeLedgerPatient) return null;
    const pId = activeLedgerPatient.id;

    // 1. Doctor Consultations
    const docConsultations = appointments
      .filter((a) => a.patientId === pId)
      .map((a) => ({
        id: a.id,
        description: `${a.department || "OPD"} Consultation (Token ${formatTokenNumber(a.tokenNumber)})`,
        doctorName: a.doctorName,
        date: a.date,
        fee: a.consultationFee || 500,
        status: a.status,
      }));

    // 2. Inpatient Stays & Accommodations
    const inpatientStays = admissions
      .filter((adm) => adm.patientId === pId)
      .map((adm) => {
        const stayDays = Math.max(
          1,
          Math.ceil(
            (new Date(adm.dischargedAt || Date.now()).getTime() - new Date(adm.admittedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        const rate = adm.dailyBedCharge || 1200;
        const total = stayDays * rate;
        return {
          id: adm.id,
          admissionNumber: adm.admissionNumber,
          ward: adm.ward,
          bedNumber: adm.bedNumber,
          admittedAt: adm.admittedAt,
          dischargedAt: adm.dischargedAt,
          days: stayDays,
          rate,
          total,
          deposit: adm.initialDeposit || 0,
          status: adm.status,
        };
      });

    // 3. Diagnostic Lab Orders & Pathology
    const labItems = labOrders
      .filter((lo) => lo.patientId === pId)
      .map((lo) => ({
        id: lo.id,
        orderNumber: lo.orderNumber,
        testName: lo.testName,
        category: lo.category,
        price: lo.price || 450,
        status: lo.status,
      }));

    // 4. Pharmacy Medications Dispensed
    const pharmacyItems = invoices
      .filter((inv) => inv.patientId === pId)
      .flatMap((inv) =>
        (inv.items || []).map((it) => ({
          id: `${inv.id}_${it.medicineId}`,
          invoiceNumber: inv.number,
          medicineName: it.name,
          qty: it.qty,
          price: it.price,
          total: it.qty * it.price,
        }))
      );

    // Summing Department Totals
    const doctorFeesTotal = docConsultations.reduce((sum, item) => sum + item.fee, 0);
    const bedChargesTotal = inpatientStays.reduce((sum, item) => sum + item.total, 0);
    const depositsPaidTotal = inpatientStays.reduce((sum, item) => sum + item.deposit, 0);
    const labChargesTotal = labItems.reduce((sum, item) => sum + item.price, 0);
    const pharmacyChargesTotal = pharmacyItems.reduce((sum, item) => sum + item.total, 0);

    const grossHospitalTotal = doctorFeesTotal + bedChargesTotal + labChargesTotal + pharmacyChargesTotal;
    const netPayable = Math.max(0, grossHospitalTotal - depositsPaidTotal - customDiscount);

    return {
      patient: activeLedgerPatient,
      docConsultations,
      inpatientStays,
      labItems,
      pharmacyItems,
      doctorFeesTotal,
      bedChargesTotal,
      depositsPaidTotal,
      labChargesTotal,
      pharmacyChargesTotal,
      grossHospitalTotal,
      discount: customDiscount,
      netPayable,
    };
  }, [activeLedgerPatient, appointments, admissions, labOrders, invoices, customDiscount]);

  // Handler: Collect Payment & Launch Official Printable Tax Invoice
  const handleCollectHospitalPayment = () => {
    if (!patientFinancialLedger) return;
    const invNumber = `HOSP-INV-${Date.now().toString().slice(-6)}`;
    const newInvoiceToPrint = {
      invoiceNumber: invNumber,
      date: new Date().toISOString(),
      patient: patientFinancialLedger.patient,
      doctorItems: patientFinancialLedger.docConsultations.map((d) => ({
        description: d.description,
        doctorName: d.doctorName,
        fee: d.fee,
        date: d.date,
      })),
      bedItems: patientFinancialLedger.inpatientStays.map((b) => ({
        ward: b.ward,
        bedNumber: b.bedNumber,
        days: b.days,
        rate: b.rate,
        total: b.total,
        deposit: b.deposit,
      })),
      labItems: patientFinancialLedger.labItems.map((l) => ({
        testName: l.testName,
        category: l.category,
        price: l.price,
      })),
      pharmacyItems: patientFinancialLedger.pharmacyItems.map((p) => ({
        name: p.medicineName,
        qty: p.qty,
        price: p.price,
        total: p.total,
      })),
      grossTotal: patientFinancialLedger.grossHospitalTotal,
      depositDeducted: patientFinancialLedger.depositsPaidTotal,
      discount: patientFinancialLedger.discount,
      netPaid: patientFinancialLedger.netPayable,
      paymentMode,
      refNo: paymentRefNumber.trim() || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      cashier: currentUser?.username || "Reception Cashier",
    };

    // Log to audit
    setData((prev) => ({
      ...prev,
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || "Reception",
          action: "PAYMENT_COLLECTED",
          details: `Processed settlement ₹${patientFinancialLedger.netPayable.toLocaleString()} for ${patientFinancialLedger.patient.name} (${invNumber}) via ${paymentMode}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    setInvoiceToPrint(newInvoiceToPrint);
    setPrintableInvoiceModalOpen(true);
    flashToast(`Payment of ₹${patientFinancialLedger.netPayable.toLocaleString()} recorded successfully!`);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // FULLSCREEN / TV DISPLAY MODE (WAITING ROOM KIOSK)
  // ══════════════════════════════════════════════════════════════════════════════
  if (isTvMode) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6 overflow-hidden select-none">
        {/* TV Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-extrabold text-2xl text-white shadow-xl shadow-sky-500/20">
              +
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wide uppercase text-white flex items-center gap-2">
                Cura Multispecialty Hospital
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  LIVE OPD TOKEN BOARD
                </span>
              </h1>
              <p className="text-xs text-sky-400 font-mono tracking-wider">
                REAL-TIME PATIENT QUEUE & CONSULTING DOCTORS · CENTRAL RECEPTION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-sky-300">{currentTimeStr}</div>
              <div className="text-xs text-slate-400 font-mono">{fmtDate(todayStr)}</div>
            </div>
            <Button
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => setIsTvMode(false)}
            >
              <Minimize2 className="w-4 h-4 mr-1.5" />
              Exit TV View
            </Button>
          </div>
        </div>

        {/* TV Body Grid */}
        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Left Hero Card: Currently Calling Spotlight */}
          <div className="col-span-7 flex flex-col gap-4">
            <div className={`flex-1 rounded-3xl p-8 flex flex-col justify-between border shadow-2xl transition-all duration-300 ${
              isChiming
                ? "bg-gradient-to-br from-emerald-950/80 via-slate-900 to-sky-950 border-emerald-400/80 ring-4 ring-emerald-500/40 animate-pulse"
                : "bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 border-sky-500/30"
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    NOW CALLING FOR CONSULTATION
                  </span>
                  <button
                    onClick={() => playTokenChime(nowCallingApt ? `Token ${formatTokenNumber(nowCallingApt.tokenNumber)}` : undefined)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                    title="Re-play Chime Announcement"
                  >
                    <Volume2 className={`w-5 h-5 ${isChiming ? "text-emerald-400" : "text-sky-300"}`} />
                  </button>
                </div>

                <div className="mt-8 text-center">
                  <div className="text-xs font-mono font-bold tracking-widest uppercase text-sky-400">
                    TOKEN IDENTIFIER
                  </div>
                  <div className="text-7xl font-black font-mono tracking-tight text-white mt-2 drop-shadow-lg">
                    {nowCallingApt ? formatTokenNumber(nowCallingApt.tokenNumber) : "NO TOKEN"}
                  </div>

                  <div className="mt-6">
                    <h2 className="text-3xl font-extrabold text-slate-100">
                      {nowCallingApt?.patientName || "Waiting for next patient..."}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-2 font-mono text-sm text-slate-400">
                      <span className="bg-sky-900/60 text-sky-300 px-2.5 py-0.5 rounded-md border border-sky-700/50">
                        {nowCallingApt?.patientUhid || "OPD PATIENT"}
                      </span>
                      <span>·</span>
                      <span>{nowCallingApt?.priority === "emergency" ? "🚨 EMERGENCY PRIORITY" : "ROUTINE CONSULTATION"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Doctor Chamber Destination */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">PROCEED TO CLINICAL ROOM</span>
                  <div className="text-xl font-bold text-emerald-300 flex items-center gap-2 mt-0.5">
                    <DoorOpen className="w-5 h-5 text-emerald-400" />
                    {nowCallingApt?.doctorName ? (
                      <>
                        {nowCallingApt.doctorName} · {getDoctorChamber(nowCallingApt.doctorId, 0).chamber}
                      </>
                    ) : (
                      "Please proceed to Main OPD Chamber"
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{nowCallingApt?.department || "General Consultation"}</div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400">TIME SLOT</span>
                  <div className="text-lg font-mono font-bold text-white">{nowCallingApt?.timeSlot || "LIVE"}</div>
                </div>
              </div>
            </div>

            {/* TV Bottom Quick Status Bar */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-medium">WAITING IN QUEUE</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{waitingCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-medium">IN CONSULTATION</div>
                <div className="text-2xl font-bold text-sky-400 mt-1">{inConsultCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-medium">COMPLETED TODAY</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{completedCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 font-medium">BEDS OCCUPIED</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{activeInpatients.length}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Physician Chambers & Upcoming Token Queue */}
          <div className="col-span-5 flex flex-col gap-4 min-h-0">
            {/* Doctor Chamber Status Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>PHYSICIAN AVAILABILITY & CHAMBERS</span>
                <span className="text-emerald-400">LIVE SYNC</span>
              </h3>
              <div className="space-y-2.5">
                {doctors.slice(0, 4).map((doc, idx) => {
                  const ch = getDoctorChamber(doc.id, idx);
                  const isAvailable = ch.status === "available" || ch.status === "in_consultation";
                  return (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-sky-900/60 border border-sky-700/40 flex items-center justify-center font-bold text-sky-300 text-sm">
                          {doc.name.replace("Dr. ", "").charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-100">{doc.name}</div>
                          <div className="text-xs text-slate-400">{doc.department || "Consultant"} · <span className="font-mono text-sky-400">{ch.chamber}</span></div>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          ch.status === "available"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : ch.status === "in_consultation"
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                            : ch.status === "on_rounds"
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        }`}
                      >
                        {ch.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Tokens List */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col min-h-0 overflow-y-auto">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
                UPCOMING TOKENS IN LOUNGE
              </h3>
              <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {appointments
                  .filter((a) => a.status === "checked_in")
                  .slice(0, 6)
                  .map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-base text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                          {formatTokenNumber(apt.tokenNumber)}
                        </span>
                        <div>
                          <div className="font-semibold text-sm text-slate-200">{apt.patientName}</div>
                          <div className="text-xs text-slate-400">{apt.doctorName} · {apt.timeSlot}</div>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {apt.priority}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* TV Bottom Live Marquee */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Cura Multispecialty Hospital · NABH Accredited · Emergency Hotline: +91 44 2800 9108
          </span>
          <span>Please carry your Digital UHID Card to all clinical consultations</span>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // STANDARD INTERACTIVE RECEPTION CONSOLE
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metric Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-600 via-sky-700 to-indigo-800 text-white p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-sky-500/30 text-sky-100 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-400/40">
              Centralized Reception Hub
            </span>
            <span className="text-xs text-sky-200">Patient Intake · OPD Queue · IPD Desk · Consolidated Billing</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Front-Desk & Intake Management</h1>
          <p className="text-sky-100/80 text-sm max-w-xl">
            Register verified UHIDs, govern live OPD tokens, manage inpatient bed admissions, and compute comprehensive multi-department billing ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
            onClick={() => setIsTvMode(true)}
            title="Launch TV Waiting Room Kiosk Mode"
          >
            <Tv className="w-4 h-4 mr-1 text-amber-300" />
            TV Token Screen
          </Button>
          <Button
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
            onClick={() => {
              setAllowDuplicateOverride(false);
              setRegModalOpen(true);
            }}
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
          <Button
            className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-md font-semibold"
            onClick={() => {
              if (patients.length === 0) {
                flashToast("Please register a patient first", "warn");
                setRegModalOpen(true);
                return;
              }
              handleOpenAdmitModal();
            }}
          >
            <Bed className="w-4 h-4 mr-1 text-indigo-200" />
            Admit Inpatient (IPD)
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
          <span className="text-xs text-slate-500">Master Patients Directory</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">OPD Waiting</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{waitingCount}</div>
          <span className="text-xs text-slate-500">Live Lounge Tokens</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Active Inpatients</span>
            <Bed className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{activeInpatients.length}</div>
          <span className="text-xs text-slate-500">Admitted in IPD Wards</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Discharges & Visits</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{completedCount + dischargedInpatients.length}</div>
          <span className="text-xs text-slate-500">Finalized Care Episodes</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit flex-wrap">
          <button
            onClick={() => setActiveTab("tokenBoard")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "tokenBoard"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-sky-500" />
            Live OPD Token Board
          </button>
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "queue"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            OPD Token Queue ({filteredAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab("inpatient")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "inpatient"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
            }`}
          >
            <Bed className="w-3.5 h-3.5 text-indigo-500" />
            Inpatient Admissions (IPD)
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              {activeInpatients.length} Beds
            </span>
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "billing"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-500" />
            Financial Ledger & Billing
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "patients"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-sky-500" />
            Master Patients ({patients.length})
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

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: DEDICATED LIVE OPD TOKEN BOARD & PHYSICIAN AVAILABILITY
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tokenBoard" && (
        <div className="space-y-6">
          {/* Hero Calling Spotlight Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className={`lg:col-span-7 rounded-2xl p-6 border shadow-md flex flex-col justify-between transition-all duration-300 ${
              isChiming
                ? "bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-emerald-950/60 dark:via-slate-900 dark:to-sky-950/60 border-emerald-400 ring-2 ring-emerald-500/30"
                : "bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-900 dark:via-sky-950/40 dark:to-slate-900 border-sky-200 dark:border-sky-800"
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border border-sky-300 dark:border-sky-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Now Calling Token
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => playTokenChime(nowCallingApt ? `Token ${formatTokenNumber(nowCallingApt.tokenNumber)}` : undefined)}
                    >
                      <Volume2 className="w-3.5 h-3.5 mr-1 text-sky-600" />
                      Play Chime
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => setIsTvMode(true)}
                    >
                      <Maximize2 className="w-3.5 h-3.5 mr-1" />
                      TV Mode
                    </Button>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <div className="text-xs font-mono font-semibold uppercase text-slate-400 tracking-wider">
                    CURRENT ACTIVE TOKEN
                  </div>
                  <div className="text-6xl font-black font-mono tracking-tight text-sky-600 dark:text-sky-400 mt-2">
                    {nowCallingApt ? formatTokenNumber(nowCallingApt.tokenNumber) : "NO TOKEN"}
                  </div>

                  <div className="mt-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {nowCallingApt?.patientName || "Waiting for patient to check in..."}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-1.5 font-mono text-xs text-slate-500">
                      <span className="bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                        {nowCallingApt?.patientUhid || "NO-UHID"}
                      </span>
                      <span>·</span>
                      <span>{nowCallingApt?.patientPhone || "No Phone"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consultation Details */}
              <div className="mt-6 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase">Assigned Consulting Physician</span>
                  <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Stethoscope className="w-4 h-4 text-sky-500" />
                    {nowCallingApt?.doctorName || "General OPD"}
                    <span className="font-normal text-xs text-slate-500">({nowCallingApt?.department || "OPD"})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {nowCallingApt && nowCallingApt.status === "checked_in" && (
                    <Button
                      size="sm"
                      className="bg-sky-600 hover:bg-sky-700 text-white text-xs"
                      onClick={() => updateStatus(nowCallingApt.id, "with_doctor")}
                    >
                      Call into Chamber
                    </Button>
                  )}
                  {nowCallingApt && nowCallingApt.status === "with_doctor" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      onClick={() => updateStatus(nowCallingApt.id, "completed")}
                    >
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Physician Availability Board */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <Card className="h-full">
                <CardHeader className="flex items-center justify-between pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-sky-500" />
                      Physician Availability & Chambers
                    </h3>
                    <p className="text-xs text-slate-500">Real-time status toggles for reception queue routing</p>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                    {doctors.map((doc, idx) => {
                      const ch = getDoctorChamber(doc.id, idx);
                      const waitingForDoc = appointments.filter((a) => a.doctorId === doc.id && a.status === "checked_in").length;
                      return (
                        <div key={doc.id} className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              {doc.name}
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {ch.chamber}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {doc.department || "Consultant"} · {waitingForDoc} waiting
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Select
                              value={ch.status}
                              onChange={(e) => handleUpdateDoctorStatus(doc.id, e.target.value as DoctorAvailability)}
                              className="text-xs py-1 h-7 w-32"
                            >
                              <option value="available">🟢 Available</option>
                              <option value="in_consultation">🔵 In Consult</option>
                              <option value="on_rounds">🟣 On Rounds</option>
                              <option value="on_break">🟡 Break</option>
                              <option value="off_duty">⚪ Off Duty</option>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: OPD TOKEN QUEUE & WORKFLOW ACTIONS
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "queue" && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                Live OPD Token Queue
              </h2>
              <p className="text-xs text-slate-500">Real-time status transitions across reception intake, nursing vitals, and physician consultations.</p>
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
                      <th className="py-3 px-4 text-right">Front-Desk Workflow Actions</th>
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
                            {/* Announce / Chime */}
                            <button
                              onClick={() => playTokenChime(`Token ${formatTokenNumber(apt.tokenNumber)}`)}
                              className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                              title="Announce with Chime"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Status transitions strictly restricted for front-desk */}
                            {apt.status === "checked_in" && (
                              <button
                                onClick={() => {
                                  updateStatus(apt.id, "with_nurse");
                                  if (!isReceptionistRole && onNavigateToNurse) {
                                    onNavigateToNurse(apt.patientId);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1"
                                title="Send patient to Nursing for vitals check"
                              >
                                <Activity className="w-3.5 h-3.5" />
                                Send to Nurse
                              </button>
                            )}

                            {(apt.status === "checked_in" || apt.status === "with_nurse") && (
                              <button
                                onClick={() => {
                                  updateStatus(apt.id, "with_doctor");
                                  if (!isReceptionistRole && onNavigateToDoctor) {
                                    onNavigateToDoctor(apt.patientId);
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1"
                                title="Call patient into Doctor's room"
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                Call to Doctor
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

                            {/* Consolidated Ledger Button */}
                            <button
                              onClick={() => {
                                setSelectedPatientForLedger(apt.patientId);
                                setActiveTab("billing");
                              }}
                              className="px-2 py-1 text-xs rounded-md bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 font-medium"
                              title="Open Consolidated Financial Ledger"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Ledger & Bill
                            </button>

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

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: INPATIENT ADMISSIONS (IPD) & BED MANAGEMENT
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "inpatient" && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Bed className="w-4 h-4 text-indigo-600" />
                Inpatient (IPD) Admissions & Bed Ward Management
              </h2>
              <p className="text-xs text-slate-500">Live bed allocations, attending physicians, provisional diagnoses, and inpatient discharge processing.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={filterWard}
                onChange={(e) => setFilterWard(e.target.value)}
                className="w-44 text-xs py-1.5"
              >
                <option value="all">All Wards</option>
                {WARD_OPTIONS.map((w) => (
                  <option key={w.ward} value={w.ward}>
                    {w.ward}
                  </option>
                ))}
              </Select>

              <Select
                value={filterInpatientStatus}
                onChange={(e) => setFilterInpatientStatus(e.target.value as any)}
                className="w-36 text-xs py-1.5"
              >
                <option value="all">All Records</option>
                <option value="admitted">Admitted (Active Beds)</option>
                <option value="discharged">Discharged</option>
              </Select>

              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => handleOpenAdmitModal()}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Admit Patient
              </Button>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            {filteredAdmissions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <Bed className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">No inpatient admissions matching your filters</p>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleOpenAdmitModal()}>
                  Admit First Patient
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Admission #</th>
                      <th className="py-3 px-4">Patient / UHID</th>
                      <th className="py-3 px-4">Ward & Bed</th>
                      <th className="py-3 px-4">Attending Doctor</th>
                      <th className="py-3 px-4">Provisional Diagnosis & Stay</th>
                      <th className="py-3 px-4">Status & Deposit</th>
                      <th className="py-3 px-4 text-right">Inpatient Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                    {filteredAdmissions.map((adm) => {
                      const wardInfo = WARD_OPTIONS.find((w) => w.ward === adm.ward);
                      const isAdmitted = adm.status === "admitted";
                      const stayDays = Math.max(
                        1,
                        Math.ceil(
                          (new Date(adm.dischargedAt || Date.now()).getTime() - new Date(adm.admittedAt).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      );

                      return (
                        <tr key={adm.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                              {adm.admissionNumber}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-1 font-mono">
                              {fmtDate(adm.admittedAt)}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              {adm.patientName}
                              {adm.patientAge && (
                                <span className="text-xs text-slate-500 font-normal">
                                  ({adm.patientAge}y {adm.patientGender?.[0]})
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-1.5 py-0.2 rounded text-[10px]">
                                {adm.patientUhid || "NO-UHID"}
                              </span>
                              {adm.patientPhone && (
                                <>
                                  <span>·</span>
                                  <span>{adm.patientPhone}</span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${
                                  wardInfo?.badgeColor || "bg-slate-100 text-slate-800 border-slate-200"
                                }`}
                              >
                                {adm.ward}
                              </span>
                              <span className="font-mono font-bold text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-1.5 py-0.5 rounded">
                                Bed {adm.bedNumber}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              ₹{adm.dailyBedCharge || wardInfo?.dailyRate || 1200}/day
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-700 dark:text-slate-200">{adm.doctorName}</div>
                            <div className="text-xs text-slate-400">{adm.department || "General Medicine"}</div>
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate">
                              {adm.provisionalDiagnosis || adm.admissionReason}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Stay: <span className="font-semibold text-slate-600 dark:text-slate-300">{stayDays} day{stayDays > 1 ? "s" : ""}</span>
                              {isAdmitted ? " (Active)" : ` · Discharged: ${adm.dischargeCondition || "Recovered"}`}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div>
                              {isAdmitted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Admitted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                  Discharged
                                </span>
                              )}
                            </div>
                            {adm.initialDeposit ? (
                              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                                Dep: ₹{adm.initialDeposit.toLocaleString()}
                              </div>
                            ) : null}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isAdmitted && (
                                <Button
                                  size="sm"
                                  className="text-xs h-7 px-2 bg-rose-600 hover:bg-rose-700 text-white"
                                  onClick={() => handleOpenDischargeModal(adm)}
                                  title="Discharge patient from ward"
                                >
                                  <DoorOpen className="w-3.5 h-3.5 mr-1" />
                                  Discharge
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-xs h-7 px-2 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                onClick={() => {
                                  setSelectedPatientForLedger(adm.patientId);
                                  setActiveTab("billing");
                                }}
                                title="Open Inpatient Financial Ledger & Settle Bill"
                              >
                                <Receipt className="w-3.5 h-3.5 mr-1" />
                                Ledger
                              </Button>

                              {onNavigateToVisitTrail && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-xs h-7 px-2"
                                  onClick={() => onNavigateToVisitTrail(adm.patientUhid || "")}
                                  title="View complete 360° visit timeline"
                                >
                                  <FileText className="w-3.5 h-3.5 mr-1" />
                                  Trail
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 4: CONSOLIDATED PATIENT FINANCIAL LEDGER & HOSPITAL BILLING
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Patient Selector Bar */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Consolidated Patient Financial Ledger
                </h2>
                <p className="text-xs text-slate-500">
                  Aggregates all billable entries: Doctor Consultation Fee Structures, Inpatient Accommodations, Lab Diagnostics, and Pharmacy Dispensing.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-80">
                <Select
                  value={selectedPatientForLedger || (patients[0]?.id || "")}
                  onChange={(e) => setSelectedPatientForLedger(e.target.value)}
                  className="text-xs py-1.5"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.uhid || "NO UHID"}) · {p.phone}
                    </option>
                  ))}
                </Select>
              </div>
            </CardHeader>

            {patientFinancialLedger && (
              <CardBody className="border-t border-slate-100 dark:border-slate-700/60 p-5 space-y-6">
                {/* Patient Summary Header Box */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded text-xs border border-sky-200 dark:border-sky-800">
                        {patientFinancialLedger.patient.uhid || "UHID PENDING"}
                      </span>
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                        {patientFinancialLedger.patient.name}
                      </h3>
                      {patientFinancialLedger.patient.age && (
                        <span className="text-xs text-slate-500 font-medium">
                          ({patientFinancialLedger.patient.age}y / {patientFinancialLedger.patient.gender || "—"})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3 font-mono">
                      <span>Phone: {patientFinancialLedger.patient.phone}</span>
                      <span>·</span>
                      <span>Blood Group: {patientFinancialLedger.patient.bloodGroup || "—"}</span>
                      {patientFinancialLedger.patient.emergencyContact && (
                        <>
                          <span>·</span>
                          <span>Emg: {patientFinancialLedger.patient.emergencyContact}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => {
                        setSelectedPatientForCard(patientFinancialLedger.patient);
                        setCardModalOpen(true);
                      }}
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1" />
                      Digital Card
                    </Button>
                  </div>
                </div>

                {/* Ledger Breakdown Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* SECTION 1: Doctor Consultations */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <div className="px-4 py-3 bg-sky-50/70 dark:bg-sky-950/40 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-900 dark:text-sky-200 uppercase flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-sky-600" />
                        Doctor Consultations ({patientFinancialLedger.docConsultations.length})
                      </span>
                      <span className="font-bold text-xs text-sky-700 dark:text-sky-300 font-mono">
                        ₹{patientFinancialLedger.doctorFeesTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-0">
                      {patientFinancialLedger.docConsultations.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No OPD consultation charges recorded</div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                          {patientFinancialLedger.docConsultations.map((c) => (
                            <div key={c.id} className="p-3 flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{c.description}</div>
                                <div className="text-[11px] text-slate-400">{c.doctorName} · {fmtDate(c.date)}</div>
                              </div>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                ₹{c.fee.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 2: Inpatient Bed Stays & Accommodations */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <div className="px-4 py-3 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase flex items-center gap-1.5">
                        <Bed className="w-4 h-4 text-indigo-600" />
                        Inpatient Accommodations ({patientFinancialLedger.inpatientStays.length})
                      </span>
                      <span className="font-bold text-xs text-indigo-700 dark:text-indigo-300 font-mono">
                        ₹{patientFinancialLedger.bedChargesTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-0">
                      {patientFinancialLedger.inpatientStays.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No inpatient stays on record</div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                          {patientFinancialLedger.inpatientStays.map((s) => (
                            <div key={s.id} className="p-3 flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {s.ward} · Bed {s.bedNumber} ({s.admissionNumber})
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {s.days} day{s.days > 1 ? "s" : ""} @ ₹{s.rate}/day
                                  {s.deposit > 0 && ` · Initial Deposit: ₹${s.deposit.toLocaleString()}`}
                                </div>
                              </div>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                ₹{s.total.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 3: Diagnostic Lab Orders */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <div className="px-4 py-3 bg-purple-50/70 dark:bg-purple-950/40 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-purple-600" />
                        Diagnostic Lab Investigations ({patientFinancialLedger.labItems.length})
                      </span>
                      <span className="font-bold text-xs text-purple-700 dark:text-purple-300 font-mono">
                        ₹{patientFinancialLedger.labChargesTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-0">
                      {patientFinancialLedger.labItems.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No diagnostic investigations recorded</div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                          {patientFinancialLedger.labItems.map((l) => (
                            <div key={l.id} className="p-3 flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{l.testName}</div>
                                <div className="text-[11px] text-slate-400">{l.category} · {l.orderNumber}</div>
                              </div>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                ₹{l.price.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 4: Pharmacy Dispensed Medications */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <div className="px-4 py-3 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        Pharmacy Dispensed Medications ({patientFinancialLedger.pharmacyItems.length})
                      </span>
                      <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                        ₹{patientFinancialLedger.pharmacyChargesTotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-0">
                      {patientFinancialLedger.pharmacyItems.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No pharmacy medications billed yet</div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                          {patientFinancialLedger.pharmacyItems.map((m) => (
                            <div key={m.id} className="p-3 flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{m.medicineName}</div>
                                <div className="text-[11px] text-slate-400">Qty: {m.qty} · ₹{m.price}/unit</div>
                              </div>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                ₹{m.total.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Net Settlement & Payment Collection Panel */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/20">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Financial Summary */}
                    <div className="lg:col-span-6 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Doctor Consultation Fees:</span>
                        <span className="font-mono font-semibold">₹{patientFinancialLedger.doctorFeesTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Inpatient Bed Accommodations:</span>
                        <span className="font-mono font-semibold">₹{patientFinancialLedger.bedChargesTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Diagnostic Lab Investigations:</span>
                        <span className="font-mono font-semibold">₹{patientFinancialLedger.labChargesTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Pharmacy Medication Billing:</span>
                        <span className="font-mono font-semibold">₹{patientFinancialLedger.pharmacyChargesTotal.toLocaleString()}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-slate-200 font-semibold">
                        <span>Gross Hospital Total:</span>
                        <span className="font-mono text-sm">₹{patientFinancialLedger.grossHospitalTotal.toLocaleString()}</span>
                      </div>
                      {patientFinancialLedger.depositsPaidTotal > 0 && (
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>Less Inpatient Admission Deposits Paid:</span>
                          <span className="font-mono font-semibold">-₹{patientFinancialLedger.depositsPaidTotal.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-600 flex items-center justify-between text-lg font-bold text-white">
                        <span className="text-emerald-300">Net Balance Due for Settlement:</span>
                        <span className="font-mono text-2xl text-emerald-400">
                          ₹{patientFinancialLedger.netPayable.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Payment Processing Form */}
                    <div className="lg:col-span-6 bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" />
                        COLLECT PAYMENT & GENERATE TAX INVOICE
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-slate-300 text-[11px]">Payment Mode</Label>
                          <Select
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value as any)}
                            className="bg-slate-800 text-white border-slate-700 text-xs py-1.5"
                          >
                            <option value="Cash">💵 Cash</option>
                            <option value="UPI / QR">📱 UPI / QR Code</option>
                            <option value="Card">💳 Credit / Debit Card</option>
                            <option value="Net Banking">🏦 Net Banking</option>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-slate-300 text-[11px]">Ref / Transaction ID</Label>
                          <Input
                            value={paymentRefNumber}
                            onChange={(e) => setPaymentRefNumber(e.target.value)}
                            placeholder="e.g. UPI-9872412"
                            className="bg-slate-800 text-white border-slate-700 text-xs py-1.5"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                          onClick={handleCollectHospitalPayment}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 shadow-lg shadow-emerald-500/20 text-sm"
                        >
                          <Receipt className="w-4 h-4 mr-2" />
                          Collect ₹{patientFinancialLedger.netPayable.toLocaleString()} & Print Tax Invoice
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 5: MASTER PATIENTS DIRECTORY & DIGITAL UHID
      ══════════════════════════════════════════════════════════════════════════ */}
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
            <Button
              size="sm"
              onClick={() => {
                setAllowDuplicateOverride(false);
                setRegModalOpen(true);
              }}
            >
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
                              Card
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

                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-7 px-2 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                              onClick={() => handleOpenAdmitModal(p.id)}
                              title="Admit patient to Inpatient (IPD) ward & assign bed"
                            >
                              <Bed className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                              Admit (IPD)
                            </Button>

                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-7 px-2 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              onClick={() => {
                                setSelectedPatientForLedger(p.id);
                                setActiveTab("billing");
                              }}
                              title="Open Consolidated Financial Ledger"
                            >
                              <Receipt className="w-3.5 h-3.5 mr-1" />
                              Ledger
                            </Button>
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

      {/* ── MODAL: Register New Patient & Auto-Generate UHID with Live Duplicate Guard ── */}
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

          {/* DUPLICATE DETECTION WARNING BANNER */}
          {activeDuplicateWarning && (
            <div className="bg-amber-50 dark:bg-amber-950/60 p-4 rounded-xl border border-amber-300 dark:border-amber-700 text-xs space-y-2.5 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                Existing Patient Record Found ({activeDuplicateWarning.uhid})
              </div>
              <p className="text-amber-800 dark:text-amber-300">
                A patient matching this contact information is already registered in the hospital master directory. Maintaining a single UHID prevents duplicate clinical histories.
              </p>
              <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 font-mono text-slate-800 dark:text-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <b>{activeDuplicateWarning.name}</b> · UHID: <span className="text-sky-600 font-bold">{activeDuplicateWarning.uhid}</span> · Phone: {activeDuplicateWarning.phone}
                </div>
                <Button
                  size="sm"
                  type="button"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                  onClick={() => {
                    setSelectedPatientForLedger(activeDuplicateWarning.id);
                    setRegModalOpen(false);
                    flashToast(`Selected existing patient: ${activeDuplicateWarning.name} (${activeDuplicateWarning.uhid})`);
                  }}
                >
                  Use Existing Patient Profile
                </Button>
              </div>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-amber-900 dark:text-amber-300">
                <input
                  type="checkbox"
                  id="overrideDuplicate"
                  checked={allowDuplicateOverride}
                  onChange={(e) => setAllowDuplicateOverride(e.target.checked)}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <label htmlFor="overrideDuplicate" className="cursor-pointer">
                  Shared contact number for family member (confirm intentional separate registration)
                </label>
              </div>
            </div>
          )}

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
              <Label>Contact Phone Number (10 Digits) *</Label>
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
            <Button type="submit" disabled={Boolean(duplicatePhoneMatch && !allowDuplicateOverride)}>
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

      {/* ── MODAL: Admit Patient to Inpatient Bed Ward (IPD) ── */}
      <Modal
        open={admitModalOpen}
        onClose={() => setAdmitModalOpen(false)}
        title="Inpatient (IPD) Admission & Bed Allocation"
        size="lg"
      >
        <form onSubmit={handleAdmitPatient} className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-indigo-900 dark:text-indigo-200">Formal Inpatient Admission</div>
              <div className="text-indigo-700 dark:text-indigo-400">
                Next Admission Number: IPD-{(data.counters.admission || 300) + 1}
              </div>
            </div>
            <Bed className="w-6 h-6 text-indigo-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Select Registered Patient *</Label>
              <Select
                value={admitForm.patientId}
                onChange={(e) => setAdmitForm({ ...admitForm, patientId: e.target.value })}
                required
              >
                <option value="" disabled>-- Select Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.uhid || "No UHID"}) · {p.phone}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Admitting Doctor *</Label>
              <Select
                value={admitForm.doctorId}
                onChange={(e) => {
                  const docId = e.target.value;
                  setAdmitForm({
                    ...admitForm,
                    doctorId: docId,
                  });
                }}
                required
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.department || "General"})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Ward Category *</Label>
              <Select
                value={admitForm.ward}
                onChange={(e) => {
                  const selectedWard = e.target.value as InpatientWard;
                  const wardMeta = WARD_OPTIONS.find((w) => w.ward === selectedWard);
                  setAdmitForm({
                    ...admitForm,
                    ward: selectedWard,
                    dailyBedCharge: wardMeta?.dailyRate || 1200,
                    bedNumber: `${wardMeta?.bedPrefix || "BED"}-01`,
                  });
                }}
                required
              >
                {WARD_OPTIONS.map((w) => (
                  <option key={w.ward} value={w.ward}>
                    {w.ward} (₹{w.dailyRate}/day)
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-slate-500 mt-1">
                {WARD_OPTIONS.find((w) => w.ward === admitForm.ward)?.description}
              </p>
            </div>

            <div>
              <Label>Bed / Room Number *</Label>
              <Input
                required
                value={admitForm.bedNumber}
                onChange={(e) => setAdmitForm({ ...admitForm, bedNumber: e.target.value })}
                placeholder="e.g. GW-04, ICU-02, PD-01"
              />
              <p className="text-[11px] text-slate-500 mt-1">Format: [WardPrefix]-[BedNumber]</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Daily Bed Charge (₹/day)</Label>
              <Input
                type="number"
                value={admitForm.dailyBedCharge}
                onChange={(e) => setAdmitForm({ ...admitForm, dailyBedCharge: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label>Initial Admission Deposit (₹)</Label>
              <Input
                type="number"
                value={admitForm.initialDeposit}
                onChange={(e) => setAdmitForm({ ...admitForm, initialDeposit: Number(e.target.value) })}
                placeholder="e.g. 5000"
              />
            </div>
          </div>

          <div>
            <Label>Provisional Diagnosis *</Label>
            <Input
              required
              value={admitForm.provisionalDiagnosis}
              onChange={(e) => setAdmitForm({ ...admitForm, provisionalDiagnosis: e.target.value })}
              placeholder="e.g. Acute exacerbation of bronchial asthma, Bilateral pneumonia"
            />
          </div>

          <div>
            <Label>Admission Clinical Reason & Indication</Label>
            <Input
              value={admitForm.admissionReason}
              onChange={(e) => setAdmitForm({ ...admitForm, admissionReason: e.target.value })}
              placeholder="e.g. Requires continuous IV fluids, oxygen support, and hourly vitals monitoring"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setAdmitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Bed className="w-4 h-4 mr-1.5" />
              Confirm Inpatient Admission
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Discharge Patient from Inpatient Bed Ward ── */}
      <Modal
        open={dischargeModalOpen}
        onClose={() => {
          setDischargeModalOpen(false);
          setSelectedAdmissionForDischarge(null);
        }}
        title="Inpatient Clinical Discharge & Departure"
        size="md"
      >
        {selectedAdmissionForDischarge && (
          <form onSubmit={handleDischargePatient} className="space-y-4">
            <div className="bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 text-xs">
              <div className="font-semibold text-rose-900 dark:text-rose-200">
                Discharge: {selectedAdmissionForDischarge.patientName} ({selectedAdmissionForDischarge.admissionNumber})
              </div>
              <div className="text-rose-700 dark:text-rose-400 mt-0.5">
                Ward: {selectedAdmissionForDischarge.ward} · Bed: {selectedAdmissionForDischarge.bedNumber} · Attending: {selectedAdmissionForDischarge.doctorName}
              </div>
            </div>

            <div>
              <Label>Discharge Clinical Condition *</Label>
              <Select
                value={dischargeForm.dischargeCondition}
                onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeCondition: e.target.value as any })}
                required
              >
                <option value="Recovered">Recovered - Full resolution of acute symptoms</option>
                <option value="Clinically Stable">Clinically Stable - Home management indicated</option>
                <option value="Referred / Transferred">Referred / Transferred to higher tertiary center</option>
                <option value="LAMA (Left Against Medical Advice)">LAMA (Left Against Medical Advice)</option>
              </Select>
            </div>

            <div>
              <Label>Discharge Summary & Post-Hospital Care Advice *</Label>
              <textarea
                rows={3}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={dischargeForm.dischargeSummary}
                onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeSummary: e.target.value })}
                placeholder="Enter discharge instructions, medication plan, and follow-up guidance..."
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                id="openLedgerCheck"
                checked={dischargeForm.openLedgerImmediately}
                onChange={(e) => setDischargeForm({ ...dischargeForm, openLedgerImmediately: e.target.checked })}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
              />
              <label htmlFor="openLedgerCheck" className="cursor-pointer">
                Navigate directly to Inpatient Financial Ledger & Settle Balance
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setDischargeModalOpen(false);
                  setSelectedAdmissionForDischarge(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">
                <DoorOpen className="w-4 h-4 mr-1.5" />
                Finalize Discharge
              </Button>
            </div>
          </form>
        )}
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

      {/* ── MODAL: OFFICIAL HOSPITAL TAX INVOICE PRINTABLE ── */}
      <Modal
        open={printableInvoiceModalOpen}
        onClose={() => setPrintableInvoiceModalOpen(false)}
        title="Official Hospital Tax Invoice & Settlement Receipt"
        size="lg"
      >
        {invoiceToPrint && (
          <div className="space-y-4">
            <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-300 shadow-sm font-sans print:border-none print:shadow-none">
              {/* Hospital Letterhead Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-700 text-white flex items-center justify-center font-black text-2xl">
                    +
                  </div>
                  <div>
                    <h2 className="font-black text-lg uppercase tracking-tight text-slate-900">
                      Cura Multispecialty Hospital
                    </h2>
                    <p className="text-xs text-slate-600">
                      108 Healthcare Boulevard, Anna Nagar, Chennai - 600040 · Ph: +91 44 2800 9000
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      GSTIN: 33AAAAA0000A1Z5 · NABH & ISO 9001:2026 Certified
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white text-xs font-bold font-mono">
                    TAX INVOICE
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1">
                    {invoiceToPrint.invoiceNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">{fmtDateTime(invoiceToPrint.date)}</div>
                </div>
              </div>

              {/* Patient Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Patient Name</span>
                  <div className="font-bold text-slate-900">{invoiceToPrint.patient.name}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Digital UHID</span>
                  <div className="font-mono font-bold text-sky-700">{invoiceToPrint.patient.uhid || "NO-UHID"}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Age / Gender</span>
                  <div className="text-slate-800 font-medium">
                    {invoiceToPrint.patient.age ? `${invoiceToPrint.patient.age} yrs` : "—"} / {invoiceToPrint.patient.gender || "—"}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Contact Phone</span>
                  <div className="font-mono text-slate-800">{invoiceToPrint.patient.phone}</div>
                </div>
              </div>

              {/* Consolidated Line Items Table */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-700 uppercase font-mono text-[10px]">
                      <th className="py-2 px-3">Dept</th>
                      <th className="py-2 px-3">Service / Item Description</th>
                      <th className="py-2 px-3 text-center">Qty / Days</th>
                      <th className="py-2 px-3 text-right">Unit Rate (₹)</th>
                      <th className="py-2 px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Doctor Fees */}
                    {invoiceToPrint.doctorItems.map((d, i) => (
                      <tr key={`doc_${i}`}>
                        <td className="py-2 px-3 font-semibold text-sky-700">Doctor</td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {d.description} · <span className="text-slate-500">{d.doctorName}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono">1</td>
                        <td className="py-2 px-3 text-right font-mono">₹{d.fee.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">₹{d.fee.toLocaleString()}</td>
                      </tr>
                    ))}

                    {/* Bed Stays */}
                    {invoiceToPrint.bedItems.map((b, i) => (
                      <tr key={`bed_${i}`}>
                        <td className="py-2 px-3 font-semibold text-indigo-700">Inpatient</td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {b.ward} Stay (Bed {b.bedNumber})
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{b.days}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{b.rate.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">₹{b.total.toLocaleString()}</td>
                      </tr>
                    ))}

                    {/* Lab Investigations */}
                    {invoiceToPrint.labItems.map((l, i) => (
                      <tr key={`lab_${i}`}>
                        <td className="py-2 px-3 font-semibold text-purple-700">Diagnostic</td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {l.testName} ({l.category})
                        </td>
                        <td className="py-2 px-3 text-center font-mono">1</td>
                        <td className="py-2 px-3 text-right font-mono">₹{l.price.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">₹{l.price.toLocaleString()}</td>
                      </tr>
                    ))}

                    {/* Pharmacy Medications */}
                    {invoiceToPrint.pharmacyItems.map((p, i) => (
                      <tr key={`rx_${i}`}>
                        <td className="py-2 px-3 font-semibold text-emerald-700">Pharmacy</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{p.name}</td>
                        <td className="py-2 px-3 text-center font-mono">{p.qty}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{p.price.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">₹{p.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Settlement Totals */}
              <div className="flex justify-end mb-6">
                <div className="w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Charges:</span>
                    <span className="font-mono">₹{invoiceToPrint.grossTotal.toLocaleString()}</span>
                  </div>
                  {invoiceToPrint.depositDeducted > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Less IPD Deposit:</span>
                      <span className="font-mono">-₹{invoiceToPrint.depositDeducted.toLocaleString()}</span>
                    </div>
                  )}
                  {invoiceToPrint.discount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Less Discount:</span>
                      <span className="font-mono">-₹{invoiceToPrint.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t-2 border-slate-800 flex justify-between font-bold text-sm text-slate-900">
                    <span>Amount Paid ({invoiceToPrint.paymentMode}):</span>
                    <span className="font-mono text-base text-emerald-700">₹{invoiceToPrint.netPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Payment Ref: {invoiceToPrint.refNo}</span>
                    <span>Status: SETTLED</span>
                  </div>
                </div>
              </div>

              {/* Footer Signatures */}
              <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600">
                <div>
                  <div className="font-semibold text-slate-800">Cashier: {invoiceToPrint.cashier}</div>
                  <div>Thank you for choosing Cura Multispecialty Hospital.</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">For Cura Multispecialty Hospital</div>
                  <div className="mt-8 border-t border-slate-400 pt-1 text-[10px] text-slate-500">
                    Authorized Signatory & Seal
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setPrintableInvoiceModalOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Hospital Tax Invoice
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reception;
