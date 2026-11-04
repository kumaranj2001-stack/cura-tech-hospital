import React, { useState, useMemo, useRef } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Modal, Badge } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import { getPrescriptionQrUrl } from "../utils/uhidGenerator";
import { LAB_CATALOG } from "../utils/labCatalog";
import type { Consultation, PrescribedMedicine, Patient, Doctor, Appointment, LabOrder } from "../store/types";
import {
  Stethoscope,
  Activity,
  Pill,
  FlaskConical,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Search,
  Plus,
  Trash2,
  Printer,
  Send,
  Calendar,
  ShieldCheck,
  ChevronRight,
  ClipboardList,
  HeartPulse,
} from "lucide-react";

export const DoctorDashboard: React.FC<{
  initialPatientId?: string;
  onNavigateToPharmacy?: () => void;
  onNavigateToLab?: () => void;
  onNavigateToVisitTrail?: (uhid: string) => void;
}> = ({ initialPatientId, onNavigateToPharmacy, onNavigateToLab, onNavigateToVisitTrail }) => {
  const { data, setData, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";

  const doctors = data.doctors || [];
  const patients = data.patients || [];
  const appointments = data.appointments || [];
  const vitalsList = data.vitals || [];
  const medicines = data.medicines || [];
  const consultations = data.consultations || [];

  // Selected Doctor (defaults to match logged in user, or first doctor)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(() => {
    if (currentUser?.role === "doctor") {
      const match = doctors.find((d) => d.name.toLowerCase().includes(currentUser.name.toLowerCase()));
      if (match) return match.id;
    }
    return doctors[0]?.id || "";
  });

  const activeDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  // Active Selected Patient for Consultation
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (initialPatientId) return initialPatientId;
    // Default to first waiting appointment
    const waiting = appointments.find(
      (a) => (a.status === "checked_in" || a.status === "with_nurse") && a.doctorId === selectedDoctorId
    );
    return waiting ? waiting.patientId : patients[0]?.id || "";
  });

  const activePatient = patients.find((p) => p.id === selectedPatientId);

  // Latest vitals for this active patient
  const patientVitals = useMemo(() => {
    if (!activePatient) return null;
    return vitalsList.find((v) => v.patientId === activePatient.id) || null;
  }, [vitalsList, activePatient]);

  // Consultation Form State
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [followUpDays, setFollowUpDays] = useState("5");

  // Prescriptions List
  const [rxList, setRxList] = useState<PrescribedMedicine[]>([
    {
      name: "Paracetamol 650mg",
      dosage: "1 tablet",
      frequency: "1-0-1",
      duration: "5 days",
      foodTiming: "after_food",
      quantity: 10,
      instructions: "Take with warm water",
    },
  ]);

  // Medicine search & add
  const [medSearch, setMedSearch] = useState("");
  const [selectedMedStock, setSelectedMedStock] = useState<string>("");

  // Ordered Lab Tests
  const [orderedLabTests, setOrderedLabTests] = useState<string[]>([]);

  // Print Prescription Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lastSavedConsultation, setLastSavedConsultation] = useState<Consultation | null>(null);

  // Common quick symptoms
  const COMMON_SYMPTOMS = [
    "Fever & Chills",
    "Dry Cough",
    "Productive Cough",
    "Severe Headache",
    "Chest Discomfort",
    "Shortness of Breath",
    "Nausea & Vomiting",
    "Abdominal Pain",
    "Body Ache",
    "Dizziness",
    "Loss of Appetite",
  ];

  // Toggle symptom
  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  // Add prescription line
  const handleAddMedicine = (medName?: string) => {
    const targetName = medName || medSearch.trim();
    if (!targetName) return;

    // Check if matched in pharmacy inventory
    const matched = medicines.find((m) => m.name.toLowerCase() === targetName.toLowerCase());

    const newItem: PrescribedMedicine = {
      medicineId: matched?.id,
      name: targetName,
      dosage: "1 tablet",
      frequency: "1-0-1",
      duration: "5 days",
      foodTiming: "after_food",
      quantity: 10,
      instructions: matched ? `Stock in pharmacy: ${matched.stock} units` : "As directed",
    };

    setRxList([...rxList, newItem]);
    setMedSearch("");
  };

  const removeRxItem = (index: number) => {
    setRxList(rxList.filter((_, i) => i !== index));
  };

  const updateRxItem = (index: number, patch: Partial<PrescribedMedicine>) => {
    setRxList(rxList.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  // Toggle Lab test
  const toggleLabTest = (testName: string) => {
    if (orderedLabTests.includes(testName)) {
      setOrderedLabTests(orderedLabTests.filter((t) => t !== testName));
    } else {
      setOrderedLabTests([...orderedLabTests, testName]);
    }
  };

  // Filtered inventory medicines for autocomplete
  const inventorySuggestions = useMemo(() => {
    if (!medSearch.trim()) return [];
    return medicines
      .filter((m) => m.name.toLowerCase().includes(medSearch.toLowerCase()))
      .slice(0, 5);
  }, [medicines, medSearch]);

  // Active Doctor's Patients Queue for today
  const doctorQueue = useMemo(() => {
    return appointments.filter(
      (a) => a.doctorId === selectedDoctorId && a.status !== "completed" && a.status !== "cancelled"
    );
  }, [appointments, selectedDoctorId]);

  // Handler: Finalize, Sign & Transmit e-Prescription
  const handleFinalizePrescription = () => {
    if (!activePatient) {
      flashToast("Please select a patient first", "warn");
      return;
    }
    if (!diagnosis.trim()) {
      flashToast("Please enter a provisional diagnosis", "warn");
      return;
    }

    const consultId = "cons_" + Date.now();
    const apt = appointments.find((a) => a.patientId === activePatient.id && a.doctorId === selectedDoctorId);

    const followUpDateStr = new Date(Date.now() + parseInt(followUpDays, 10) * 86400000)
      .toISOString()
      .slice(0, 10);

    const newConsultation: Consultation = {
      id: consultId,
      branchId,
      appointmentId: apt?.id,
      patientId: activePatient.id,
      patientName: activePatient.name,
      patientUhid: activePatient.uhid,
      doctorId: activeDoctor.id,
      doctorName: activeDoctor.name,
      date: new Date().toISOString(),
      symptoms: selectedSymptoms,
      chiefComplaints: chiefComplaints.trim(),
      diagnosis: diagnosis.trim(),
      clinicalNotes: clinicalNotes.trim(),
      prescriptions: rxList,
      labTestsOrdered: orderedLabTests,
      followUpDate: followUpDateStr,
      status: "signed",
      createdAt: new Date().toISOString(),
    };

    // Also automatically create Lab Orders in gp_lab_orders if tests were ordered!
    const newLabOrders: LabOrder[] = orderedLabTests.map((tName, idx) => {
      const catalogItem = LAB_CATALOG.find((c) => c.name === tName);
      return {
        id: `lab_${Date.now()}_${idx}`,
        branchId,
        orderNumber: `LAB-${(data.counters.lab || 200) + idx + 1}`,
        patientId: activePatient.id,
        patientName: activePatient.name,
        patientUhid: activePatient.uhid,
        patientAge: activePatient.age,
        patientGender: activePatient.gender,
        doctorId: activeDoctor.id,
        doctorName: activeDoctor.name,
        appointmentId: apt?.id,
        testName: tName,
        category: catalogItem?.category || "General",
        sampleType: catalogItem?.sampleType || "Blood Specimen",
        price: catalogItem?.price || 300,
        status: "ordered",
        parameters: (catalogItem?.parameters || []).map((p) => ({
          name: p.name,
          value: "",
          unit: p.unit,
          referenceRange: p.referenceRange,
        })),
        createdAt: new Date().toISOString(),
      };
    });

    setData((prev) => ({
      ...prev,
      consultations: [newConsultation, ...(prev.consultations || [])],
      labOrders: [...newLabOrders, ...(prev.labOrders || [])],
      counters: {
        ...prev.counters,
        lab: (prev.counters.lab || 200) + newLabOrders.length,
      },
      appointments: (prev.appointments || []).map((a) =>
        a.id === apt?.id ? { ...a, status: "with_doctor" } : a
      ),
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || activeDoctor.name,
          action: "E_PRESCRIPTION_SIGNED",
          details: `e-Rx signed for ${activePatient.name} (${activePatient.uhid}) with ${rxList.length} medicines and ${orderedLabTests.length} lab tests`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    log("E_PRESCRIPTION_SIGNED", `e-Rx signed for ${activePatient.name}`);
    flashToast(`e-Prescription signed! Transmitted to Pharmacy & Lab.`);

    setLastSavedConsultation(newConsultation);
    setPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Doctor Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-sky-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-sky-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-sky-500/30 text-sky-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-400/40 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5" />
              Doctor Clinical Workstation
            </span>
            <span className="text-xs text-sky-300">Synchronized EHR & e-Rx Terminal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Clinical Consultations & e-Prescriptions</h1>
          <p className="text-sky-200/80 text-sm max-w-2xl">
            Access synchronized nursing vitals, record diagnostic findings, formulate care instructions, and generate electronically signed prescriptions routed directly to Pharmacy and Diagnostic Lab.
          </p>
        </div>

        {/* Doctor Switcher */}
        <div className="bg-white/10 p-3 rounded-xl border border-white/20 backdrop-blur-sm shrink-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-500/40 flex items-center justify-center font-bold text-white">
            Dr
          </div>
          <div>
            <Label className="text-[10px] text-sky-300 uppercase mb-0">Active Practitioner</Label>
            <Select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="bg-transparent text-white font-semibold text-sm border-none p-0 focus:ring-0 cursor-pointer"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id} className="text-slate-900">
                  {d.name} — {d.department || "Consultant"}
                </option>
              ))}
            </Select>
            <div className="text-[11px] text-sky-200/80">Reg: {activeDoctor?.regNo || "MCI-48291"}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN: OPD Patient Queue & Patient Selector */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  OPD Queue ({doctorQueue.length})
                </span>
                <span className="text-[11px] text-sky-600 font-semibold bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded">
                  Today
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-2 space-y-1.5 max-h-[520px] overflow-y-auto">
              {doctorQueue.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No patients waiting in queue for {activeDoctor?.name}.
                  <div className="mt-2 text-[11px] text-slate-500">Pick any patient below:</div>
                </div>
              ) : (
                doctorQueue.map((apt) => {
                  const isSelected = apt.patientId === selectedPatientId;
                  const hasVitals = vitalsList.some((v) => v.patientId === apt.patientId);

                  return (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedPatientId(apt.patientId)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-sky-50 dark:bg-sky-950/50 border-sky-300 dark:border-sky-800 shadow-sm"
                          : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                          T-{apt.tokenNumber}
                        </span>
                        {apt.priority === "emergency" ? (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            EMERGENCY
                          </span>
                        ) : hasVitals ? (
                          <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Activity className="w-2.5 h-2.5" /> Vitals OK
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded">
                            Wait Vitals
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-1">
                        {apt.patientName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center justify-between">
                        <span>{apt.patientUhid || "NO-UHID"}</span>
                        <span>{apt.timeSlot}</span>
                      </div>
                    </button>
                  );
                })
              )}

              {/* All Patients Dropdown as Fallback */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <Label className="text-[11px] text-slate-500">Or Select Any Patient:</Label>
                <Select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="text-xs py-1.5"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.uhid || "UHID"})
                    </option>
                  ))}
                </Select>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* RIGHT 3 COLUMNS: Patient 360, Nursing Vitals, Clinical Consultation, e-Prescription */}
        <div className="lg:col-span-3 space-y-6">
          {activePatient ? (
            <>
              {/* ── 1. PATIENT 360 EHR HEADER ── */}
              <Card className="border-sky-200 dark:border-sky-900 bg-sky-50/40 dark:bg-sky-950/20">
                <CardBody className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                        {activePatient.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{activePatient.name}</h2>
                          <span className="bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 font-mono text-xs px-2 py-0.5 rounded font-semibold">
                            {activePatient.uhid || "CURA-2026-PENDING"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{activePatient.age ? `${activePatient.age} yrs` : "Age —"}</span>
                          <span>•</span>
                          <span>{activePatient.gender || "Gender —"}</span>
                          <span>•</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">Blood Group: {activePatient.bloodGroup || "—"}</span>
                          <span>•</span>
                          <span>Ph: {activePatient.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onNavigateToVisitTrail && activePatient.uhid && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onNavigateToVisitTrail(activePatient.uhid!)}
                          className="text-xs"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 text-sky-600" />
                          View Complete Visit Trail
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Allergy & Chronic Condition Alert Bar */}
                  {activePatient.allergies && (
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <b>CRITICAL ALLERGY ALERT:</b> {activePatient.allergies} (Contraindicated medications must not be prescribed).
                      </span>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* ── 2. SYNCHRONIZED NURSING VITALS SNAPSHOT ── */}
              <Card>
                <CardHeader className="py-3 px-4 bg-slate-50/75 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-rose-500 animate-pulse" />
                      Synchronized Nursing Vitals Terminal
                    </span>
                    {patientVitals ? (
                      <span className="text-[11px] text-slate-500">
                        Recorded by <b>{patientVitals.recordedBy}</b> at {fmtDateTime(patientVitals.recordedAt)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200">
                        Vitals not yet recorded by nurse
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardBody className="p-4">
                  {patientVitals ? (
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      {/* Blood Pressure */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Pressure</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                          {patientVitals.systolicBp && patientVitals.diastolicBp
                            ? `${patientVitals.systolicBp}/${patientVitals.diastolicBp}`
                            : "—"}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">mmHg</span>
                        </div>
                        {patientVitals.systolicBp && patientVitals.systolicBp >= 140 && (
                          <span className="text-[9px] font-bold text-rose-600">Stage 2 HTN</span>
                        )}
                      </div>

                      {/* Heart Rate */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Heart Rate</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                          {patientVitals.heartRate || "—"}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">bpm</span>
                        </div>
                        {patientVitals.heartRate && patientVitals.heartRate > 100 && (
                          <span className="text-[9px] font-bold text-amber-600">Tachycardia</span>
                        )}
                      </div>

                      {/* Oxygen Saturation */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">SpO2 Oxygen</span>
                        <div className="text-base font-bold text-sky-600 dark:text-sky-400 mt-1">
                          {patientVitals.spO2 ? `${patientVitals.spO2}%` : "—"}
                        </div>
                        {patientVitals.spO2 && patientVitals.spO2 < 95 && (
                          <span className="text-[9px] font-bold text-rose-600">Hypoxia Alert</span>
                        )}
                      </div>

                      {/* Temperature */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Temperature</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                          {patientVitals.temperature ? `${patientVitals.temperature}°F` : "—"}
                        </div>
                        {patientVitals.temperature && patientVitals.temperature > 99.5 && (
                          <span className="text-[9px] font-bold text-rose-600">Fever</span>
                        )}
                      </div>

                      {/* Blood Sugar */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Blood Glucose</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                          {patientVitals.bloodSugar || "—"}
                          <span className="text-[10px] text-slate-400 font-normal ml-1">mg/dL</span>
                        </div>
                        <span className="text-[9px] text-slate-500 uppercase">{patientVitals.bloodSugarType || "Random"}</span>
                      </div>

                      {/* BMI */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">BMI</span>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1">
                          {patientVitals.bmi || "—"}
                        </div>
                        <span className="text-[9px] text-slate-500">
                          {patientVitals.weightKg ? `${patientVitals.weightKg} kg` : "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">
                      No vitals recorded yet for this visit. The patient can proceed directly, or nursing staff can update them in the Nursing Terminal.
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* ── 3. CLINICAL NOTES & PROVISIONAL DIAGNOSIS ── */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-sky-600" />
                    Clinical Findings & Provisional Diagnosis
                  </span>
                </CardHeader>
                <CardBody className="p-4 space-y-4">
                  {/* Quick Symptoms Chips */}
                  <div>
                    <Label className="text-xs text-slate-500 mb-1.5">Select Chief Symptoms:</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_SYMPTOMS.map((sym) => {
                        const isSelected = selectedSymptoms.includes(sym);
                        return (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => toggleSymptom(sym)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                              isSelected
                                ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                            }`}
                          >
                            {sym}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Provisional Diagnosis *</Label>
                      <Input
                        required
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="e.g. Acute Upper Respiratory Tract Infection (URTI) with Pyrexia"
                      />
                    </div>
                    <div>
                      <Label>Review & Follow-up in</Label>
                      <Select
                        value={followUpDays}
                        onChange={(e) => setFollowUpDays(e.target.value)}
                      >
                        <option value="3">Review after 3 days</option>
                        <option value="5">Review after 5 days</option>
                        <option value="7">Review after 7 days (1 week)</option>
                        <option value="14">Review after 14 days (2 weeks)</option>
                        <option value="30">Review after 1 month</option>
                        <option value="0">SOS / Only if symptoms persist</option>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Detailed Clinical Notes & Examination Findings</Label>
                    <Input
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      placeholder="e.g. Bilateral chest clear, no wheeze. Throat congested with pharyngeal erythema. Advised hydration."
                    />
                  </div>
                </CardBody>
              </Card>

              {/* ── 4. ELECTRONIC PRESCRIPTIONS (e-Rx) STUDIO ── */}
              <Card>
                <CardHeader className="py-3 px-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    Electronic Prescription Studio (Connected to Pharmacy Stock)
                  </span>
                  <span className="text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200">
                    Live Inventory Sync
                  </span>
                </CardHeader>
                <CardBody className="p-4 space-y-4">
                  {/* Medicine Search & Quick Add */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          value={medSearch}
                          onChange={(e) => setMedSearch(e.target.value)}
                          placeholder="Search medicine from hospital pharmacy inventory or type custom name..."
                          className="pl-9"
                        />
                      </div>
                      <Button onClick={() => handleAddMedicine()} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Drug
                      </Button>
                    </div>

                    {/* Autocomplete Suggestions */}
                    {inventorySuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                        {inventorySuggestions.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleAddMedicine(m.name)}
                            className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-100">{m.name}</span>
                              <span className="text-[11px] text-slate-400 ml-2">Batch: {m.batch}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-600 font-medium">Stock: {m.stock}</span>
                              <span className="text-slate-500 font-mono">₹{m.sellingPrice}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Prescription Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                          <th className="py-2.5 px-3">Medicine / Drug Name</th>
                          <th className="py-2.5 px-3">Dosage</th>
                          <th className="py-2.5 px-3">Frequency</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3">Food Timing</th>
                          <th className="py-2.5 px-3">Total Qty</th>
                          <th className="py-2.5 px-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {rxList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                            <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              <Input
                                value={item.name}
                                onChange={(e) => updateRxItem(idx, { name: e.target.value })}
                                className="text-xs py-1"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                value={item.dosage}
                                onChange={(e) => updateRxItem(idx, { dosage: e.target.value })}
                                placeholder="1 tab / 500mg"
                                className="text-xs py-1 w-28"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Select
                                value={item.frequency}
                                onChange={(e) => updateRxItem(idx, { frequency: e.target.value })}
                                className="text-xs py-1 w-28"
                              >
                                <option value="1-0-1">1-0-1 (BD)</option>
                                <option value="1-1-1">1-1-1 (TID)</option>
                                <option value="1-0-0">1-0-0 (Morning)</option>
                                <option value="0-0-1">0-0-1 (Night)</option>
                                <option value="SOS">SOS (As needed)</option>
                                <option value="STAT">STAT (Immediately)</option>
                              </Select>
                            </td>
                            <td className="py-2 px-3">
                              <Select
                                value={item.duration}
                                onChange={(e) => updateRxItem(idx, { duration: e.target.value })}
                                className="text-xs py-1 w-24"
                              >
                                <option value="3 days">3 days</option>
                                <option value="5 days">5 days</option>
                                <option value="7 days">7 days</option>
                                <option value="14 days">14 days</option>
                                <option value="1 month">1 month</option>
                              </Select>
                            </td>
                            <td className="py-2 px-3">
                              <Select
                                value={item.foodTiming}
                                onChange={(e) => updateRxItem(idx, { foodTiming: e.target.value as any })}
                                className="text-xs py-1 w-28"
                              >
                                <option value="after_food">After Food</option>
                                <option value="before_food">Before Food</option>
                                <option value="with_food">With Food</option>
                                <option value="anytime">Any Time</option>
                              </Select>
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateRxItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                                className="text-xs py-1 w-16"
                              />
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeRxItem(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>

              {/* ── 5. DIAGNOSTIC LAB ORDERS ── */}
              <Card>
                <CardHeader className="py-3 px-4 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-indigo-600" />
                    Diagnostic Laboratory Test Orders
                  </span>
                  <span className="text-[11px] text-slate-400">Routes automatically to Diagnostic Lab Queue</span>
                </CardHeader>
                <CardBody className="p-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LAB_CATALOG.map((test) => {
                      const isOrdered = orderedLabTests.includes(test.name);
                      return (
                        <button
                          key={test.id}
                          type="button"
                          onClick={() => toggleLabTest(test.name)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            isOrdered
                              ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 shadow-sm"
                              : "bg-slate-50/70 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase">{test.category}</span>
                              {isOrdered && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                            </div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs mt-1">
                              {test.name}
                            </div>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-2">₹{test.price}</div>
                        </button>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>

              {/* ── 6. SIGN & TRANSMIT BUTTON ── */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="text-xs text-slate-500">
                  Signing this prescription will commit it to the patient's EHR and dispatch medicines to Pharmacy & tests to Lab.
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleFinalizePrescription}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-semibold px-6"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Sign & Transmit e-Prescription
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400">
              Please select a patient from the queue on the left to begin consultation.
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: Official Electronic Medical Prescription Print Preview ── */}
      <Modal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Electronic Medical Prescription (e-Rx)"
        size="lg"
      >
        {lastSavedConsultation && activePatient && (
          <div className="space-y-4">
            <div className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm font-sans space-y-6">
              {/* Prescription Header */}
              <div className="flex items-center justify-between border-b-2 border-sky-600 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-2xl">
                    +
                  </div>
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                      Cura Multispecialty Hospital
                    </h2>
                    <p className="text-xs text-slate-500">
                      Plot 14, Health City, Main Medical Enclave · Phone: +91 9876543210
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-800 text-sm">{activeDoctor?.name}</div>
                  <div className="text-xs text-slate-500">{activeDoctor?.specialization || "MD, Consultant"}</div>
                  <div className="text-[11px] font-mono text-sky-700">Reg: {activeDoctor?.regNo || "MCI-48291"}</div>
                </div>
              </div>

              {/* Patient Demographics & Vitals Row */}
              <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Patient Name</span>
                  <span className="font-bold text-slate-800 text-sm">{activePatient.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Digital UHID</span>
                  <span className="font-mono font-bold text-sky-700">{activePatient.uhid}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Age / Gender / Blood</span>
                  <span className="font-semibold text-slate-800">
                    {activePatient.age || "—"} yrs / {activePatient.gender || "—"} / {activePatient.bloodGroup || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] block">Date & Time</span>
                  <span className="text-slate-800 font-mono">{fmtDateTime(lastSavedConsultation.date)}</span>
                </div>
              </div>

              {/* Vitals summary if present */}
              {patientVitals && (
                <div className="text-xs p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-slate-700 font-mono">
                  <span>BP: <b>{patientVitals.systolicBp}/{patientVitals.diastolicBp}</b> mmHg</span>
                  <span>HR: <b>{patientVitals.heartRate}</b> bpm</span>
                  <span>SpO2: <b>{patientVitals.spO2}%</b></span>
                  <span>Temp: <b>{patientVitals.temperature}°F</b></span>
                  <span>Sugar: <b>{patientVitals.bloodSugar}</b> mg/dL</span>
                </div>
              )}

              {/* Diagnosis */}
              <div className="text-xs">
                <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Provisional Diagnosis:</span>
                <div className="p-2 rounded-lg bg-sky-50 font-semibold text-sky-900 border border-sky-200">
                  {lastSavedConsultation.diagnosis}
                </div>
              </div>

              {/* Rx Prescription Table */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl font-bold font-serif italic text-sky-800">℞</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Prescribed Medications</span>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Medicine</th>
                      <th className="py-2 px-3">Dosage</th>
                      <th className="py-2 px-3">Frequency</th>
                      <th className="py-2 px-3">Duration</th>
                      <th className="py-2 px-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lastSavedConsultation.prescriptions.map((rx, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{rx.name}</td>
                        <td className="py-2 px-3">{rx.dosage}</td>
                        <td className="py-2 px-3 font-mono font-semibold">{rx.frequency}</td>
                        <td className="py-2 px-3">{rx.duration}</td>
                        <td className="py-2 px-3 text-slate-600">{rx.foodTiming.replace("_", " ")} · {rx.instructions || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ordered Lab Tests */}
              {lastSavedConsultation.labTestsOrdered && lastSavedConsultation.labTestsOrdered.length > 0 && (
                <div className="text-xs p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <span className="font-bold text-indigo-900 block mb-1">Diagnostic Laboratory Investigations Advised:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {lastSavedConsultation.labTestsOrdered.map((t, idx) => (
                      <span key={idx} className="bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-800 font-medium">
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up & Doctor Signature Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <img
                    src={getPrescriptionQrUrl(lastSavedConsultation.id, activeDoctor.name, activePatient.uhid || "")}
                    alt="e-Rx QR"
                    className="w-16 h-16"
                  />
                  <div className="text-[11px] text-slate-500">
                    <div><b>Follow-Up:</b> {lastSavedConsultation.followUpDate}</div>
                    <div className="text-slate-400 text-[10px]">Scan QR to verify prescription validity</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-serif italic text-lg text-slate-700">{activeDoctor.name}</div>
                  <div className="border-t border-slate-400 pt-1 text-[11px] text-slate-500">Electronically Signed & Certified</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setPrintModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => window.print()} className="bg-sky-600 text-white">
                <Printer className="w-4 h-4 mr-1.5" />
                Print Electronic Prescription
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DoctorDashboard;
