import React, { useState, useMemo } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import type { PatientVitals, CarePlan, CarePlanMedication, Patient } from "../store/types";
import {
  HeartPulse,
  Activity,
  Thermometer,
  Wind,
  Droplet,
  Weight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Search,
  Plus,
  ClipboardCheck,
  ShieldAlert,
  Send,
  Bed,
  FileCheck,
} from "lucide-react";

export const NursingStation: React.FC<{
  initialPatientId?: string;
  onNavigateToDoctor?: (patientId: string) => void;
  onNavigateToVisitTrail?: (uhid: string) => void;
}> = ({ initialPatientId, onNavigateToDoctor, onNavigateToVisitTrail }) => {
  const { data, setData, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";

  const patients = data.patients || [];
  const appointments = data.appointments || [];
  const vitalsList = data.vitals || [];
  const carePlans = data.carePlans || [];

  const [activeTab, setActiveTab] = useState<"vitals" | "careplans" | "history">("vitals");
  const [searchQuery, setSearchQuery] = useState("");

  // Patient Selection
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (initialPatientId) return initialPatientId;
    const waiting = appointments.find((a) => a.status === "checked_in" || a.status === "with_nurse");
    return waiting ? waiting.patientId : patients[0]?.id || "";
  });

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Vitals Form State
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("98.6");
  const [spO2, setSpO2] = useState("98");
  const [respiratoryRate, setRespiratoryRate] = useState("16");
  const [bloodSugar, setBloodSugar] = useState("");
  const [bloodSugarType, setBloodSugarType] = useState<"random" | "fasting" | "post_prandial">("random");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [painScore, setPainScore] = useState("0");
  const [vitalsNotes, setVitalsNotes] = useState("");

  // Care Plan Form State
  const [shift, setShift] = useState<"Morning" | "Afternoon" | "Night">("Morning");
  const [nursingAssessment, setNursingAssessment] = useState("");
  const [interventions, setInterventions] = useState<string[]>([
    "Routine Vitals Monitoring (Q4H)",
    "Fall Risk Precautions",
  ]);
  const [medsList, setMedsList] = useState<CarePlanMedication[]>([
    { medicineName: "Inj. Pantoprazole 40mg", dosage: "1 vial", route: "IV", time: "08:00 AM", status: "given", administeredBy: currentUser?.name || "Nurse" },
  ]);
  const [dietPlan, setDietPlan] = useState("Regular Soft Diet");
  const [mobilityStatus, setMobilityStatus] = useState<"Bedrest" | "Assisted" | "Independent">("Independent");

  // Automated BMI Calculation
  const bmiCalculated = useMemo(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm) / 100;
    if (w > 0 && h > 0) {
      const val = w / (h * h);
      let cat = "Normal";
      if (val < 18.5) cat = "Underweight";
      else if (val >= 25 && val < 29.9) cat = "Overweight";
      else if (val >= 30) cat = "Obese";
      return { val: val.toFixed(1), cat };
    }
    return null;
  }, [weightKg, heightCm]);

  // Automated BP Classification
  const bpAnalysis = useMemo(() => {
    const sys = parseInt(systolic, 10);
    const dia = parseInt(diastolic, 10);
    if (!sys || !dia) return null;
    if (sys > 180 || dia > 120) return { label: "Hypertensive Crisis", tone: "red" as const, alert: true };
    if (sys >= 140 || dia >= 90) return { label: "Stage 2 Hypertension", tone: "red" as const, alert: true };
    if (sys >= 130 || dia >= 80) return { label: "Stage 1 Hypertension", tone: "amber" as const, alert: false };
    if (sys >= 120 && dia < 80) return { label: "Elevated BP", tone: "amber" as const, alert: false };
    if (sys < 90 || dia < 60) return { label: "Hypotension", tone: "amber" as const, alert: true };
    return { label: "Normal BP", tone: "green" as const, alert: false };
  }, [systolic, diastolic]);

  // SpO2 warning
  const spO2Warning = useMemo(() => {
    const s = parseInt(spO2, 10);
    if (!s) return null;
    if (s < 90) return { text: "Critical Hypoxia Alert (<90%)", isCritical: true };
    if (s < 95) return { text: "Low Oxygen Saturation (<95%)", isCritical: false };
    return null;
  }, [spO2]);

  // Heart Rate warning
  const hrWarning = useMemo(() => {
    const hr = parseInt(heartRate, 10);
    if (!hr) return null;
    if (hr > 100) return "Tachycardia (>100 bpm)";
    if (hr < 60) return "Bradycardia (<60 bpm)";
    return null;
  }, [heartRate]);

  // Temp warning
  const tempWarning = useMemo(() => {
    const t = parseFloat(temperature);
    if (!t) return null;
    if (t > 100.4) return "High Fever (>100.4°F)";
    if (t > 99.5) return "Mild Pyrexia / Low Grade Fever";
    return null;
  }, [temperature]);

  // Filtered patients for queue
  const waitingPatients = useMemo(() => {
    return appointments.filter(
      (a) => a.status === "checked_in" || a.status === "with_nurse"
    );
  }, [appointments]);

  // Historical vitals for selected patient
  const patientVitalsHistory = useMemo(() => {
    if (!selectedPatient) return [];
    return vitalsList.filter((v) => v.patientId === selectedPatient.id);
  }, [vitalsList, selectedPatient]);

  // Historical care plans for selected patient
  const patientCarePlanHistory = useMemo(() => {
    if (!selectedPatient) return [];
    return carePlans.filter((c) => c.patientId === selectedPatient.id);
  }, [carePlans, selectedPatient]);

  // Handler: Submit Vitals
  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      flashToast("Select a patient first", "warn");
      return;
    }

    const alerts: string[] = [];
    if (bpAnalysis?.alert) alerts.push(bpAnalysis.label);
    if (spO2Warning) alerts.push(spO2Warning.text);
    if (hrWarning) alerts.push(hrWarning);
    if (tempWarning) alerts.push(tempWarning);

    const apt = appointments.find((a) => a.patientId === selectedPatient.id);

    const newVitals: PatientVitals = {
      id: "vit_" + Date.now(),
      branchId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      patientUhid: selectedPatient.uhid,
      appointmentId: apt?.id,
      recordedBy: currentUser?.name || "Nursing Staff",
      recordedAt: new Date().toISOString(),
      systolicBp: systolic ? parseInt(systolic, 10) : undefined,
      diastolicBp: diastolic ? parseInt(diastolic, 10) : undefined,
      heartRate: heartRate ? parseInt(heartRate, 10) : undefined,
      temperature: temperature ? parseFloat(temperature) : undefined,
      spO2: spO2 ? parseInt(spO2, 10) : undefined,
      respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : undefined,
      bloodSugar: bloodSugar ? parseInt(bloodSugar, 10) : undefined,
      bloodSugarType,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      bmi: bmiCalculated ? parseFloat(bmiCalculated.val) : undefined,
      painScore: parseInt(painScore, 10) || 0,
      alerts,
      notes: vitalsNotes.trim(),
    };

    setData((prev) => ({
      ...prev,
      vitals: [newVitals, ...(prev.vitals || [])],
      appointments: (prev.appointments || []).map((a) =>
        a.id === apt?.id ? { ...a, status: "with_nurse" } : a
      ),
      audit: [
        {
          id: "a_" + Date.now(),
          branchId,
          user: currentUser?.username || "Nursing",
          action: "VITALS_RECORDED",
          details: `Recorded vitals for ${selectedPatient.name} (${selectedPatient.uhid}): BP ${systolic}/${diastolic}, SpO2 ${spO2}%`,
          timestamp: new Date().toISOString(),
        },
        ...prev.audit,
      ].slice(0, 1000),
    }));

    log("VITALS_RECORDED", `Vitals logged for ${selectedPatient.name}`);
    flashToast(`Vitals recorded for ${selectedPatient.name}! Synced with Doctor.`);
  };

  // Handler: Save Care Plan
  const handleSaveCarePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const newCarePlan: CarePlan = {
      id: "cp_" + Date.now(),
      branchId,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      patientUhid: selectedPatient.uhid,
      nurseName: currentUser?.name || "Nursing Staff",
      date: new Date().toISOString().slice(0, 10),
      shift,
      nursingAssessment: nursingAssessment.trim() || "Patient comfortable, vitals stable.",
      interventions,
      medicationsAdministered: medsList,
      dietPlan,
      mobilityStatus,
      updatedAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      carePlans: [newCarePlan, ...(prev.carePlans || [])],
    }));

    flashToast(`Care plan updated for ${selectedPatient.name}`);
  };

  const toggleIntervention = (item: string) => {
    if (interventions.includes(item)) {
      setInterventions(interventions.filter((i) => i !== item));
    } else {
      setInterventions([...interventions, item]);
    }
  };

  const addMedRow = () => {
    setMedsList([
      ...medsList,
      { medicineName: "", dosage: "", route: "Oral", time: "12:00 PM", status: "pending" },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-teal-700/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/30 text-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/40 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              Nursing Station Terminal
            </span>
            <span className="text-xs text-emerald-300">Synchronized Clinical Vitals & Care Plans</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Real-Time Vitals Station & Nursing Care</h1>
          <p className="text-emerald-100/80 text-sm max-w-2xl">
            Monitor and record physiological vitals, trigger automated early warning alerts, and maintain active nursing care plans that synchronize immediately to Doctor workstations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/20 text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-300" />
            <div>
              <div className="text-[10px] text-emerald-200 uppercase font-bold">Shift: {shift}</div>
              <div className="font-semibold">{currentUser?.name || "Staff Nurse"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN: Waiting Patients Queue */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                Awaiting Vitals ({waitingPatients.length})
              </span>
            </CardHeader>
            <CardBody className="p-2 space-y-1.5 max-h-[500px] overflow-y-auto">
              {waitingPatients.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No patients waiting in queue right now.
                </div>
              ) : (
                waitingPatients.map((apt) => {
                  const isSelected = apt.patientId === selectedPatientId;
                  return (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedPatientId(apt.patientId)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-teal-50 dark:bg-teal-950/50 border-teal-300 dark:border-teal-800 shadow-sm"
                          : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                          T-{apt.tokenNumber}
                        </span>
                        <span className="text-[10px] text-slate-400">{apt.timeSlot}</span>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                        {apt.patientName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {apt.patientUhid || "NO-UHID"} · Dr. {apt.doctorName.split(" ").slice(-1)[0]}
                      </div>
                    </button>
                  );
                })
              )}

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

        {/* RIGHT 3 COLUMNS: Vitals Form & Care Plans */}
        <div className="lg:col-span-3 space-y-6">
          {selectedPatient ? (
            <>
              {/* Patient Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{selectedPatient.name}</span>
                      <span className="font-mono text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded font-semibold border border-teal-200 dark:border-teal-800">
                        {selectedPatient.uhid || "CURA-2026-PENDING"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {selectedPatient.age ? `${selectedPatient.age} yrs` : "Age —"} · {selectedPatient.gender || "—"} · Blood: <b>{selectedPatient.bloodGroup || "—"}</b> · Ph: {selectedPatient.phone}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onNavigateToDoctor && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => onNavigateToDoctor(selectedPatient.id)}
                    >
                      Forward to Doctor
                    </Button>
                  )}
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("vitals")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === "vitals"
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  Real-Time Vitals Entry
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("careplans")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === "careplans"
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Patient Care Plan & MAR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === "history"
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Vitals Timeline ({patientVitalsHistory.length})
                </button>
              </div>

              {/* TAB 1: Vitals Form */}
              {activeTab === "vitals" && (
                <form onSubmit={handleSaveVitals} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Blood Pressure */}
                    <Card className="border-teal-100 dark:border-teal-900">
                      <CardBody className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] uppercase text-slate-500 font-bold mb-0">Blood Pressure</Label>
                          <Activity className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            required
                            type="number"
                            placeholder="Sys"
                            value={systolic}
                            onChange={(e) => setSystolic(e.target.value)}
                            className="font-bold text-center"
                          />
                          <span className="text-slate-400">/</span>
                          <Input
                            required
                            type="number"
                            placeholder="Dia"
                            value={diastolic}
                            onChange={(e) => setDiastolic(e.target.value)}
                            className="font-bold text-center"
                          />
                        </div>
                        {bpAnalysis && (
                          <div className={`text-[10px] font-bold text-center px-2 py-0.5 rounded ${
                            bpAnalysis.tone === "red"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : bpAnalysis.tone === "amber"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}>
                            {bpAnalysis.label}
                          </div>
                        )}
                      </CardBody>
                    </Card>

                    {/* Heart Rate / Pulse */}
                    <Card className="border-teal-100 dark:border-teal-900">
                      <CardBody className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] uppercase text-slate-500 font-bold mb-0">Heart Rate</Label>
                          <HeartPulse className="w-4 h-4 text-rose-500" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            required
                            type="number"
                            placeholder="e.g. 74"
                            value={heartRate}
                            onChange={(e) => setHeartRate(e.target.value)}
                            className="font-bold text-center"
                          />
                          <span className="text-xs text-slate-400">bpm</span>
                        </div>
                        {hrWarning ? (
                          <div className="text-[10px] font-bold text-rose-600 text-center">{hrWarning}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400 text-center">Ref: 60 - 100 bpm</div>
                        )}
                      </CardBody>
                    </Card>

                    {/* Oxygen SpO2 */}
                    <Card className="border-teal-100 dark:border-teal-900">
                      <CardBody className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] uppercase text-slate-500 font-bold mb-0">SpO2 Saturation</Label>
                          <Wind className="w-4 h-4 text-sky-500" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            required
                            type="number"
                            placeholder="e.g. 98"
                            value={spO2}
                            onChange={(e) => setSpO2(e.target.value)}
                            className="font-bold text-center"
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                        {spO2Warning ? (
                          <div className="text-[10px] font-bold text-rose-600 text-center">{spO2Warning.text}</div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 text-center font-medium">Optimal (≥95%)</div>
                        )}
                      </CardBody>
                    </Card>

                    {/* Temperature */}
                    <Card className="border-teal-100 dark:border-teal-900">
                      <CardBody className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] uppercase text-slate-500 font-bold mb-0">Temperature</Label>
                          <Thermometer className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            required
                            type="number"
                            step="0.1"
                            placeholder="98.6"
                            value={temperature}
                            onChange={(e) => setTemperature(e.target.value)}
                            className="font-bold text-center"
                          />
                          <span className="text-xs text-slate-400">°F</span>
                        </div>
                        {tempWarning ? (
                          <div className="text-[10px] font-bold text-rose-600 text-center">{tempWarning}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400 text-center">Ref: 97 - 99°F</div>
                        )}
                      </CardBody>
                    </Card>
                  </div>

                  {/* Secondary Vitals Row: Blood Sugar, Resp Rate, Weight/Height/BMI, Pain Scale */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Respiratory Rate */}
                    <Card>
                      <CardBody className="p-3.5 space-y-2">
                        <Label className="text-[11px] uppercase text-slate-500 font-bold mb-0">Resp. Rate</Label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            placeholder="16"
                            value={respiratoryRate}
                            onChange={(e) => setRespiratoryRate(e.target.value)}
                            className="text-center font-bold"
                          />
                          <span className="text-xs text-slate-400">/min</span>
                        </div>
                        <div className="text-[10px] text-slate-400 text-center">Normal: 12-20</div>
                      </CardBody>
                    </Card>

                    {/* Blood Glucose */}
                    <Card>
                      <CardBody className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] uppercase text-slate-500 font-bold mb-0">Blood Sugar</Label>
                          <Droplet className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            placeholder="e.g. 110"
                            value={bloodSugar}
                            onChange={(e) => setBloodSugar(e.target.value)}
                            className="text-center font-bold"
                          />
                          <span className="text-xs text-slate-400">mg/dL</span>
                        </div>
                        <Select
                          value={bloodSugarType}
                          onChange={(e) => setBloodSugarType(e.target.value as any)}
                          className="text-[10px] py-1"
                        >
                          <option value="random">Random Blood Sugar</option>
                          <option value="fasting">Fasting Blood Sugar</option>
                          <option value="post_prandial">Post Prandial (2h)</option>
                        </Select>
                      </CardBody>
                    </Card>

                    {/* Weight & Height -> BMI */}
                    <Card>
                      <CardBody className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] uppercase text-slate-500 font-bold mb-0">Weight & Height</Label>
                          <Weight className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input
                            type="number"
                            placeholder="Kg"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                            className="text-center font-bold text-xs"
                          />
                          <Input
                            type="number"
                            placeholder="Cm"
                            value={heightCm}
                            onChange={(e) => setHeightCm(e.target.value)}
                            className="text-center font-bold text-xs"
                          />
                        </div>
                        {bmiCalculated ? (
                          <div className="text-[10px] font-bold text-center text-indigo-600 bg-indigo-50 dark:bg-indigo-950 py-0.5 rounded">
                            BMI: {bmiCalculated.val} ({bmiCalculated.cat})
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 text-center">BMI auto-calculates</div>
                        )}
                      </CardBody>
                    </Card>

                    {/* Pain Score */}
                    <Card>
                      <CardBody className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] uppercase text-slate-500 font-bold mb-0">Pain Scale (0-10)</Label>
                          <span className="font-bold text-sm text-teal-600">{painScore} / 10</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={painScore}
                          onChange={(e) => setPainScore(e.target.value)}
                          className="w-full accent-teal-600 cursor-pointer"
                        />
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>0 (No Pain)</span>
                          <span>5 (Moderate)</span>
                          <span>10 (Severe)</span>
                        </div>
                      </CardBody>
                    </Card>
                  </div>

                  {/* Nurse Clinical Notes */}
                  <div>
                    <Label>Nursing Clinical Observations & Alerts</Label>
                    <Input
                      value={vitalsNotes}
                      onChange={(e) => setVitalsNotes(e.target.value)}
                      placeholder="e.g. Patient feels mild shivering, administered oral hydration. Conscious, oriented x 3."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-md px-6">
                      <Send className="w-4 h-4 mr-2" />
                      Save & Sync Vitals to Doctor
                    </Button>
                  </div>
                </form>
              )}

              {/* TAB 2: Care Plans & MAR */}
              {activeTab === "careplans" && (
                <form onSubmit={handleSaveCarePlan} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Nursing Shift</Label>
                      <Select
                        value={shift}
                        onChange={(e) => setShift(e.target.value as any)}
                      >
                        <option value="Morning">Morning Shift (07:00 - 15:00)</option>
                        <option value="Afternoon">Afternoon Shift (15:00 - 23:00)</option>
                        <option value="Night">Night Shift (23:00 - 07:00)</option>
                      </Select>
                    </div>

                    <div>
                      <Label>Diet Orders</Label>
                      <Select
                        value={dietPlan}
                        onChange={(e) => setDietPlan(e.target.value)}
                      >
                        <option value="Regular Soft Diet">Regular Soft Diet</option>
                        <option value="Diabetic Diet (Low Glycemic)">Diabetic Diet (Low Glycemic)</option>
                        <option value="Cardiac Diet (Low Salt)">Cardiac Diet (Low Salt)</option>
                        <option value="Clear Liquid Diet">Clear Liquid Diet</option>
                        <option value="NPO (Nothing by mouth)">NPO (Nil by mouth)</option>
                      </Select>
                    </div>

                    <div>
                      <Label>Mobility / Activity</Label>
                      <Select
                        value={mobilityStatus}
                        onChange={(e) => setMobilityStatus(e.target.value as any)}
                      >
                        <option value="Independent">Independent Ambulation</option>
                        <option value="Assisted">Assisted Ambulation with Nurse</option>
                        <option value="Bedrest">Strict Bedrest</option>
                      </Select>
                    </div>
                  </div>

                  {/* Nursing Interventions Checklist */}
                  <Card>
                    <CardHeader className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Active Nursing Interventions Checklist
                      </span>
                    </CardHeader>
                    <CardBody className="p-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          "Routine Vitals Monitoring (Q4H)",
                          "Strict Intake / Output (I/O) Charting",
                          "Elevate head of bed 30°",
                          "Fall Risk Precautions Active",
                          "Capillary Blood Glucose (CBG) QAC",
                          "Pressure Injury Prevention & Reposition Q2H",
                          "Oxygen Therapy via Nasal Cannula (2L/min)",
                          "Deep Breathing & Coughing Exercises",
                        ].map((item) => {
                          const active = interventions.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleIntervention(item)}
                              className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                                active
                                  ? "bg-teal-50 dark:bg-teal-950/60 border-teal-300 text-teal-900 dark:text-teal-200 font-semibold"
                                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600"
                              }`}
                            >
                              <span>{item}</span>
                              {active && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </CardBody>
                  </Card>

                  {/* Medication Administration Record (MAR) */}
                  <Card>
                    <CardHeader className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Medication Administration Record (MAR)
                      </span>
                      <Button size="sm" onClick={addMedRow} className="text-xs h-7 px-2">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add Drug
                      </Button>
                    </CardHeader>
                    <CardBody className="p-3.5 space-y-2">
                      {medsList.map((m, idx) => (
                        <div key={idx} className="grid grid-cols-5 gap-2 items-center text-xs">
                          <Input
                            placeholder="Medication name"
                            value={m.medicineName}
                            onChange={(e) => {
                              const copy = [...medsList];
                              copy[idx].medicineName = e.target.value;
                              setMedsList(copy);
                            }}
                            className="col-span-2 text-xs py-1"
                          />
                          <Input
                            placeholder="Dose"
                            value={m.dosage}
                            onChange={(e) => {
                              const copy = [...medsList];
                              copy[idx].dosage = e.target.value;
                              setMedsList(copy);
                            }}
                            className="text-xs py-1"
                          />
                          <Select
                            value={m.route}
                            onChange={(e) => {
                              const copy = [...medsList];
                              copy[idx].route = e.target.value;
                              setMedsList(copy);
                            }}
                            className="text-xs py-1"
                          >
                            <option value="Oral">Oral</option>
                            <option value="IV">IV</option>
                            <option value="IM">IM</option>
                            <option value="SC">SC</option>
                            <option value="Nebulization">Nebulization</option>
                          </Select>
                          <Select
                            value={m.status}
                            onChange={(e) => {
                              const copy = [...medsList];
                              copy[idx].status = e.target.value as any;
                              setMedsList(copy);
                            }}
                            className="text-xs py-1 font-bold"
                          >
                            <option value="given">✓ Given</option>
                            <option value="pending">Pending</option>
                            <option value="refused">Refused</option>
                          </Select>
                        </div>
                      ))}
                    </CardBody>
                  </Card>

                  <div>
                    <Label>Shift Nursing Assessment / Patient Progress</Label>
                    <Input
                      value={nursingAssessment}
                      onChange={(e) => setNursingAssessment(e.target.value)}
                      placeholder="e.g. Patient resting quietly. IV cannula in left forearm patent without phlebitis. Tolerated meal well."
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button type="submit" className="bg-teal-600 text-white font-semibold">
                      Save Shift Care Plan
                    </Button>
                  </div>
                </form>
              )}

              {/* TAB 3: Vitals Timeline */}
              {activeTab === "history" && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Chronological Vitals Logs for {selectedPatient.name}
                    </span>
                  </CardHeader>
                  <CardBody className="p-0">
                    {patientVitalsHistory.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        No previous vitals recordings found for this patient.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                        {patientVitalsHistory.map((vit) => (
                          <div key={vit.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors space-y-2">
                            <div className="flex items-center justify-between text-slate-500">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {fmtDateTime(vit.recordedAt)}
                              </span>
                              <span>Nurse: <b>{vit.recordedBy}</b></span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">BP:</span>
                                <span className="font-bold text-slate-800">{vit.systolicBp}/{vit.diastolicBp} mmHg</span>
                              </div>
                              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">Heart Rate:</span>
                                <span className="font-bold text-slate-800">{vit.heartRate} bpm</span>
                              </div>
                              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">SpO2:</span>
                                <span className="font-bold text-sky-600">{vit.spO2}%</span>
                              </div>
                              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">Temp:</span>
                                <span className="font-bold text-slate-800">{vit.temperature}°F</span>
                              </div>
                              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">Sugar:</span>
                                <span className="font-bold text-slate-800">{vit.bloodSugar || "—"} mg/dL</span>
                              </div>
                              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200">
                                <span className="text-[10px] text-slate-400 block">Pain / BMI:</span>
                                <span className="font-bold text-slate-800">{vit.painScore}/10 · BMI {vit.bmi || "—"}</span>
                              </div>
                            </div>

                            {vit.notes && (
                              <div className="text-[11px] text-slate-600 italic">
                                Notes: "{vit.notes}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-slate-400">
              Select a patient from the queue on the left to record vitals or manage care plans.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NursingStation;
