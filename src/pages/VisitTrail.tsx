import React, { useState, useMemo } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge } from "../components/ui";
import { fmtDate, fmtDateTime, fmtCurrency, flashToast } from "../utils/helpers";
import type { Patient, Appointment, Consultation, PatientVitals, LabOrder, Invoice, CarePlan } from "../store/types";
import {
  FileText,
  User,
  Clock,
  CheckCircle2,
  Stethoscope,
  Activity,
  FlaskConical,
  Pill,
  Receipt,
  Printer,
  Search,
  ChevronRight,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Building2,
} from "lucide-react";

export const VisitTrail: React.FC<{
  initialUhid?: string;
  onNavigateToBilling?: (patientId: string) => void;
}> = ({ initialUhid, onNavigateToBilling }) => {
  const { data, currentBranch, currentUser } = useStore();

  const patients = data.patients || [];
  const appointments = data.appointments || [];
  const consultations = data.consultations || [];
  const vitalsList = data.vitals || [];
  const labOrders = data.labOrders || [];
  const invoices = data.invoices || [];
  const carePlans = data.carePlans || [];

  const [searchUhid, setSearchUhid] = useState(initialUhid || "");
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (initialUhid) {
      const p = patients.find((x) => x.uhid === initialUhid);
      if (p) return p.id;
    }
    return patients[0]?.id || "";
  });

  const activePatient = patients.find((p) => p.id === selectedPatientId);

  // Link all clinical & financial entities for this patient
  const patientAppointments = useMemo(() => {
    if (!activePatient) return [];
    return appointments.filter((a) => a.patientId === activePatient.id);
  }, [appointments, activePatient]);

  const patientVitals = useMemo(() => {
    if (!activePatient) return [];
    return vitalsList.filter((v) => v.patientId === activePatient.id);
  }, [vitalsList, activePatient]);

  const patientConsultations = useMemo(() => {
    if (!activePatient) return [];
    return consultations.filter((c) => c.patientId === activePatient.id);
  }, [consultations, activePatient]);

  const patientLabOrders = useMemo(() => {
    if (!activePatient) return [];
    return labOrders.filter((l) => l.patientId === activePatient.id);
  }, [labOrders, activePatient]);

  const patientInvoices = useMemo(() => {
    if (!activePatient) return [];
    return invoices.filter((inv) => inv.patientId === activePatient.id || inv.patientName.toLowerCase() === activePatient.name.toLowerCase());
  }, [invoices, activePatient]);

  const patientCarePlans = useMemo(() => {
    if (!activePatient) return [];
    return carePlans.filter((cp) => cp.patientId === activePatient.id);
  }, [carePlans, activePatient]);

  // Aggregate Total Financial Spent
  const totalFinancials = useMemo(() => {
    const totalBilled = patientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const labTotal = patientLabOrders.reduce((sum, ord) => sum + (ord.price || 0), 0);
    return { totalBilled, labTotal };
  }, [patientInvoices, patientLabOrders]);

  const latestVitals = patientVitals[0];
  const latestConsultation = patientConsultations[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-sky-950 text-white p-6 rounded-2xl shadow-lg border border-sky-800/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-sky-500/30 text-sky-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-400/40 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Patient 360° Visit Trail
            </span>
            <span className="text-xs text-sky-300">Complete Clinical & Financial Audit Trail</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Transparent Clinical & Financial Journey</h1>
          <p className="text-sky-200/80 text-sm max-w-2xl">
            A single unified chronological record tracking every patient touchpoint: Reception Registration, Nursing Vitals, Clinical Consultation, Diagnostic Lab Tests, Pharmacy Dispensation, and Billing Settlement.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => window.print()}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-md"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Visit Summary
          </Button>
        </div>
      </div>

      {/* Patient Lookup Card */}
      <Card>
        <CardBody className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <User className="w-5 h-5 text-sky-600 shrink-0" />
            <div className="w-full sm:w-80">
              <Label className="text-[11px] text-slate-500">Select Patient for Visit Audit:</Label>
              <Select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="text-xs font-semibold py-1.5"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.uhid || "UHID"}) — {p.phone}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {activePatient && (
            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Digital Identifier</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">{activePatient.uhid}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Total Visits Billed</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{fmtCurrency(totalFinancials.totalBilled)}</span>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {activePatient ? (
        <div className="space-y-6">
          {/* ── STEP 1: RECEPTION REGISTRATION & UHID ISSUANCE ── */}
          <div className="relative pl-8 sm:pl-10 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-0 before:w-0.5 before:bg-sky-200 dark:before:bg-sky-900">
            <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              1
            </div>

            <Card className="border-sky-100 dark:border-sky-900">
              <CardHeader className="py-2.5 px-4 bg-sky-50/60 dark:bg-sky-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-200">
                    Reception Module: Patient Registration & Digital UHID Issuance
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">{fmtDate(activePatient.createdAt)}</span>
              </CardHeader>
              <CardBody className="p-4 text-xs space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Patient Name</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{activePatient.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Issued UHID</span>
                    <span className="font-mono font-bold text-sky-600">{activePatient.uhid}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Age / Gender / Blood</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activePatient.age || "—"} yrs / {activePatient.gender || "—"} / <b className="text-rose-600">{activePatient.bloodGroup || "—"}</b>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase block">Contact & Emergency</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{activePatient.phone} {activePatient.emergencyContact ? `(Emg: ${activePatient.emergencyContact})` : ""}</span>
                  </div>
                </div>

                {patientAppointments.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span>
                      <b>OPD Token Issued:</b> T-{patientAppointments[0].tokenNumber} with <b>{patientAppointments[0].doctorName}</b> ({patientAppointments[0].department})
                    </span>
                    <Badge tone="blue">{patientAppointments[0].status.replace("_", " ")}</Badge>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ── STEP 2: NURSING STATION VITALS & CARE PLAN ── */}
          <div className="relative pl-8 sm:pl-10 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-0 before:w-0.5 before:bg-teal-200 dark:before:bg-teal-900">
            <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              2
            </div>

            <Card className="border-teal-100 dark:border-teal-900">
              <CardHeader className="py-2.5 px-4 bg-teal-50/60 dark:bg-teal-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                    Nursing Terminal: Synchronized Physiological Vitals & Care Plan
                  </span>
                </div>
                {latestVitals && (
                  <span className="text-[11px] text-slate-500">
                    Nurse {latestVitals.recordedBy} · {fmtDateTime(latestVitals.recordedAt)}
                  </span>
                )}
              </CardHeader>
              <CardBody className="p-4 text-xs space-y-3">
                {latestVitals ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">BP</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{latestVitals.systolicBp}/{latestVitals.diastolicBp} mmHg</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{latestVitals.heartRate} bpm</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">SpO2</span>
                        <span className="font-bold text-sky-600">{latestVitals.spO2}%</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Temp</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{latestVitals.temperature}°F</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">Glucose</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{latestVitals.bloodSugar || "—"} mg/dL</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200">
                        <span className="text-[10px] text-slate-400 block">BMI</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{latestVitals.bmi || "—"}</span>
                      </div>
                    </div>

                    {latestVitals.alerts && latestVitals.alerts.length > 0 && (
                      <div className="p-2 rounded bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span><b>Clinical Alerts:</b> {latestVitals.alerts.join(", ")}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-slate-400 italic">No vitals logged yet for this visit.</div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ── STEP 3: DOCTOR CONSULTATION & ELECTRONIC PRESCRIPTIONS ── */}
          <div className="relative pl-8 sm:pl-10 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-0 before:w-0.5 before:bg-indigo-200 dark:before:bg-indigo-900">
            <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              3
            </div>

            <Card className="border-indigo-100 dark:border-indigo-900">
              <CardHeader className="py-2.5 px-4 bg-indigo-50/60 dark:bg-indigo-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                    Doctor Workstation: Clinical Findings & e-Prescription (e-Rx)
                  </span>
                </div>
                {latestConsultation && (
                  <span className="text-[11px] text-slate-500">
                    Dr. {latestConsultation.doctorName} · {fmtDateTime(latestConsultation.date)}
                  </span>
                )}
              </CardHeader>
              <CardBody className="p-4 text-xs space-y-3">
                {latestConsultation ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Provisional Diagnosis:</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                          {latestConsultation.diagnosis}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Chief Symptoms:</span>
                        <div className="text-slate-700 dark:text-slate-300">
                          {latestConsultation.symptoms?.join(", ") || "General consult"}
                        </div>
                      </div>
                    </div>

                    {/* Prescribed Medicines */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                        Prescribed Medications ({latestConsultation.prescriptions.length}):
                      </span>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 rounded-lg overflow-hidden">
                        {latestConsultation.prescriptions.map((rx, i) => (
                          <div key={i} className="p-2 bg-white dark:bg-slate-800 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-100">{rx.name}</span>
                              <span className="text-[11px] text-slate-400 ml-2">({rx.dosage} · {rx.frequency} · {rx.duration})</span>
                            </div>
                            <span className="text-[11px] text-slate-500">{rx.foodTiming.replace("_", " ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 italic">No doctor consultation logged yet for this visit.</div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ── STEP 4: DIAGNOSTIC LAB INVESTIGATIONS ── */}
          <div className="relative pl-8 sm:pl-10 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-0 before:w-0.5 before:bg-violet-200 dark:before:bg-violet-900">
            <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              4
            </div>

            <Card className="border-violet-100 dark:border-violet-900">
              <CardHeader className="py-2.5 px-4 bg-violet-50/60 dark:bg-violet-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-violet-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-900 dark:text-violet-200">
                    Diagnostic Laboratory: Sample Phlebotomy & Verified Results
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">{patientLabOrders.length} Tests Ordered</span>
              </CardHeader>
              <CardBody className="p-4 text-xs space-y-3">
                {patientLabOrders.length > 0 ? (
                  <div className="space-y-2">
                    {patientLabOrders.map((ord) => (
                      <div key={ord.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{ord.testName}</span>
                            <span className="font-mono text-[10px] text-violet-600 font-bold">({ord.orderNumber})</span>
                            <Badge tone={ord.status === "completed" ? "green" : "amber"}>{ord.status.replace("_", " ")}</Badge>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Specimen: {ord.sampleType} · Billed: ₹{ord.price}
                          </div>
                        </div>

                        {ord.status === "completed" && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Certified Report Ready
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">No laboratory tests ordered for this patient visit.</div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ── STEP 5: PHARMACY DISPENSING ── */}
          <div className="relative pl-8 sm:pl-10 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-0 before:w-0.5 before:bg-emerald-200 dark:before:bg-emerald-900">
            <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              5
            </div>

            <Card className="border-emerald-100 dark:border-emerald-900">
              <CardHeader className="py-2.5 px-4 bg-emerald-50/60 dark:bg-emerald-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    Hospital Pharmacy: e-Prescription Processing & Stock Dispensing
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">Inventory Linked</span>
              </CardHeader>
              <CardBody className="p-4 text-xs space-y-2">
                {latestConsultation && latestConsultation.prescriptions.length > 0 ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {latestConsultation.prescriptions.length} Prescribed Medications Dispensed
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Dispensed against Doctor Consultation e-Rx #{latestConsultation.id.slice(0, 10)}
                      </div>
                    </div>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                      Stock Deducted & Verified
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-400 italic">No medication dispensing recorded.</div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ── STEP 6: INTEGRATED DIGITAL BILLING & SETTLEMENT ── */}
          <div className="relative pl-8 sm:pl-10">
            <div className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              6
            </div>

            <Card className="border-amber-100 dark:border-amber-900">
              <CardHeader className="py-2.5 px-4 bg-amber-50/60 dark:bg-amber-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Unified Hospital Billing: Consultation + Lab + Pharmacy Settlement
                  </span>
                </div>
                <span className="font-bold text-amber-800 font-mono text-sm">
                  {fmtCurrency(totalFinancials.totalBilled)}
                </span>
              </CardHeader>
              <CardBody className="p-4 text-xs space-y-3">
                {patientInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {patientInvoices.map((inv) => (
                      <div key={inv.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                            Invoice #{inv.number}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {fmtDateTime(inv.date)} · Mode: <b>{inv.paymentMethod?.toUpperCase() || "CASH"}</b>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {fmtCurrency(inv.total)}
                          </div>
                          <span className="text-[10px] text-emerald-600 font-semibold">PAID & SETTLED</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 space-y-2">
                    <p>No billing invoices settled yet for this patient.</p>
                    {onNavigateToBilling && (
                      <Button size="sm" onClick={() => onNavigateToBilling(activePatient.id)}>
                        Create Unified Hospital Bill
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-24 text-slate-400">
          Select a patient above to view their comprehensive clinical and financial visit trail.
        </div>
      )}
    </div>
  );
};

export default VisitTrail;
