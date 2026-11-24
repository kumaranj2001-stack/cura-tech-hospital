import React, { useState } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import type { HospitalCertificate, CertificateType } from "../store/types";
import {
  Award,
  Baby,
  Syringe,
  FileCheck,
  FileMinus,
  FileText,
  Navigation,
  CheckSquare,
  ShieldAlert,
  ListOrdered,
  Printer,
  Search,
  Plus,
  QrCode,
  CheckCircle2,
} from "lucide-react";

export const CertificateERP: React.FC<{
  initialAction?: string;
  subTypeOption?: string;
}> = ({ initialAction, subTypeOption }) => {
  const { data, currentUser, currentBranch, log } = useStore();
  const branchId = currentBranch?.id || currentUser?.branchId || "br_main";

  const [activeSubTab, setActiveSubTab] = useState<CertificateType | "report">(
    initialAction === "birth_cert"
      ? "birth"
      : initialAction === "vaccination_cert"
      ? "vaccination"
      : initialAction === "medical_cert"
      ? "medical"
      : initialAction === "fitness_cert"
      ? "fitness"
      : initialAction === "death_cert"
      ? "death"
      : initialAction === "self_declaration"
      ? "self_declaration"
      : initialAction === "marine_cert"
      ? "marine"
      : initialAction === "consent_form"
      ? "consent"
      : initialAction === "surgical_consent"
      ? "surgical_consent"
      : initialAction === "cert_report"
      ? "report"
      : "medical"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedCertForPrint, setSelectedCertForPrint] = useState<HospitalCertificate | null>(null);

  // In-memory list of certificates seeded with realistic records
  const [certificates, setCertificates] = useState<HospitalCertificate[]>([
    {
      id: "cert_1",
      branchId,
      certificateType: "birth",
      certificateNumber: "BC-2026-0041",
      patientId: "p_101",
      patientName: "Baby of Meenakshi",
      patientUhid: "CURA-2026-104",
      patientAge: 0,
      patientGender: "Female",
      doctorName: "Dr. Lakshmi Venkatesh",
      issueDate: "2026-11-20",
      purpose: "Official Birth Registration",
      details: {
        timeOfBirth: "04:22 AM",
        motherName: "Meenakshi Sundaram",
        fatherName: "Sundaram Ramanathan",
        birthWeightKg: 3.2,
        deliveryType: "Normal Vaginal Delivery",
        apgarScore: "9/10",
      },
      status: "issued",
      createdAt: new Date().toISOString(),
    },
    {
      id: "cert_2",
      branchId,
      certificateType: "medical",
      certificateNumber: "MC-2026-0182",
      patientId: "p_102",
      patientName: "Rajesh Kannan",
      patientUhid: "CURA-2026-089",
      patientAge: 34,
      patientGender: "Male",
      doctorName: "Dr. Arvind Sharma",
      issueDate: "2026-11-22",
      validUntil: "2026-11-29",
      purpose: "Medical Leave Recommendation",
      diagnosis: "Acute Bronchitis with High Grade Fever",
      details: {
        restDaysRecommended: 7,
        treatmentAdvised: "Antibiotics, Steam Inhalation, Strict Bed Rest",
        reviewDate: "2026-11-29",
      },
      status: "issued",
      createdAt: new Date().toISOString(),
    },
    {
      id: "cert_3",
      branchId,
      certificateType: "fitness",
      certificateNumber: "FC-2026-0094",
      patientId: "p_103",
      patientName: "Deepa Ramachandran",
      patientUhid: "CURA-2026-061",
      patientAge: 27,
      patientGender: "Female",
      doctorName: "Dr. Arvind Sharma",
      issueDate: "2026-11-23",
      purpose: "Pre-Employment Physical Fitness",
      details: {
        bloodPressure: "118/76 mmHg",
        visionLeft: "6/6",
        visionRight: "6/6",
        chestXray: "Normal Bronchovascular Markings",
        fitnessStatement: "Fit for active commercial corporate duties",
      },
      status: "issued",
      createdAt: new Date().toISOString(),
    },
    {
      id: "cert_4",
      branchId,
      certificateType: "marine",
      certificateNumber: "MAR-2026-0028",
      patientId: "p_104",
      patientName: "Capt. Vivek Nair",
      patientUhid: "CURA-2026-112",
      patientAge: 46,
      patientGender: "Male",
      doctorName: "Dr. Kumaran",
      issueDate: "2026-11-21",
      validUntil: "2028-11-20",
      purpose: subTypeOption || "ILO Maritime Seafarer Medical Fitness",
      details: {
        cdcNumber: "IND-CDC-98214",
        rank: "Master Mariner / Deck Officer",
        colorVision: "Ishihara 24 Plates - Normal",
        audiometry: "Bilateral Hearing within normal limits (20dB)",
        fitForLookout: "YES",
      },
      status: "issued",
      createdAt: new Date().toISOString(),
    },
  ]);

  // Form State for Issuing Certificate
  const [form, setForm] = useState({
    patientName: "",
    patientUhid: "",
    patientAge: "30",
    patientGender: "Male" as "Male" | "Female" | "Other",
    doctorName: data.doctors[0]?.name || "Dr. Arvind Sharma",
    purpose: "",
    diagnosis: "",
    restDays: "5",
    weight: "3.1",
    parentName: "",
    secondaryDetails: "",
  });

  const handleIssueCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim()) {
      flashToast("Please provide patient name", "warn");
      return;
    }

    const typePrefixMap: Record<CertificateType, string> = {
      birth: "BC",
      vaccination: "VC",
      medical: "MC",
      fitness: "FC",
      death: "DC",
      self_declaration: "SD",
      marine: "MAR",
      consent: "CF",
      surgical_consent: "SCF",
    };

    const prefix = typePrefixMap[activeSubTab as CertificateType] || "CERT";
    const certNumber = `${prefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCert: HospitalCertificate = {
      id: "cert_" + Date.now(),
      branchId,
      certificateType: activeSubTab as CertificateType,
      certificateNumber: certNumber,
      patientId: "p_" + Date.now(),
      patientName: form.patientName.trim(),
      patientUhid: form.patientUhid.trim() || `CURA-2026-${Math.floor(100 + Math.random() * 900)}`,
      patientAge: Number(form.patientAge) || 30,
      patientGender: form.patientGender,
      doctorName: form.doctorName,
      issueDate: new Date().toISOString().slice(0, 10),
      purpose: form.purpose.trim() || `${activeSubTab.toUpperCase()} Certificate`,
      diagnosis: form.diagnosis.trim(),
      details: {
        restDaysRecommended: form.restDays,
        birthWeightKg: form.weight,
        parentName: form.parentName,
        secondaryDetails: form.secondaryDetails,
      },
      status: "issued",
      createdAt: new Date().toISOString(),
    };

    setCertificates([newCert, ...certificates]);
    log("CERTIFICATE_ISSUED", `Issued ${certNumber} for ${newCert.patientName}`);
    flashToast(`Certificate ${certNumber} issued successfully!`);

    setSelectedCertForPrint(newCert);
    setPrintModalOpen(true);
  };

  const filteredCerts = certificates.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.patientName.toLowerCase().includes(q) ||
      c.certificateNumber.toLowerCase().includes(q) ||
      (c.patientUhid && c.patientUhid.toLowerCase().includes(q)) ||
      c.certificateType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-800 text-white p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/30 text-amber-100 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-400/40">
              Medical Certification Module
            </span>
            <span className="text-xs text-amber-200">Legal, Clinical & Statutory Declarations</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hospital Certificates & Consents</h1>
          <p className="text-amber-100/80 text-sm max-w-xl">
            Issue and verify authentic hospital certificates (Birth, Vaccination, Medical, Fitness, Death, Maritime, and Surgical Consents) with official digital QR authentication.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={() => setActiveSubTab("report")}
          >
            <ListOrdered className="w-4 h-4 mr-1.5" />
            Certificate Report ({certificates.length})
          </Button>
        </div>
      </div>

      {/* Certificate Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl text-xs">
        <button
          onClick={() => setActiveSubTab("birth")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeSubTab === "birth"
              ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Baby className="w-3.5 h-3.5" />
          Birth Certificate
        </button>
        <button
          onClick={() => setActiveSubTab("vaccination")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeSubTab === "vaccination"
              ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Syringe className="w-3.5 h-3.5" />
          Vaccination
        </button>
        <button
          onClick={() => setActiveSubTab("medical")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeSubTab === "medical"
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          Medical Certificate
        </button>
        <button
          onClick={() => setActiveSubTab("fitness")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeSubTab === "fitness"
              ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Fitness Certificate
        </button>
        <button
          onClick={() => setActiveSubTab("death")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeSubTab === "death"
              ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <FileMinus className="w-3.5 h-3.5" />
          Death Certificate
        </button>
        <button
          onClick={() => setActiveSubTab("marine")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeSubTab === "marine"
              ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          Marine
        </button>
        <button
          onClick={() => setActiveSubTab("consent")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeSubTab === "consent"
              ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Consent Form
        </button>
        <button
          onClick={() => setActiveSubTab("surgical_consent")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeSubTab === "surgical_consent"
              ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Surgical Consent
        </button>
        <button
          onClick={() => setActiveSubTab("report")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
            activeSubTab === "report"
              ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          Certificate Report
        </button>
      </div>

      {/* Main View: Issue Form or Report Table */}
      {activeSubTab !== "report" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Issue {activeSubTab.replace("_", " ").toUpperCase()} Document
            </h2>
            <p className="text-xs text-slate-500">
              Fill in the patient clinical and statutory parameters to generate a signed and verified hospital certification document.
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleIssueCertificate} className="space-y-4 max-w-3xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Patient Full Name *</Label>
                  <Input
                    required
                    value={form.patientName}
                    onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                    placeholder="e.g. Anand Sundaram"
                  />
                </div>
                <div>
                  <Label>Digital UHID (If Registered)</Label>
                  <Input
                    value={form.patientUhid}
                    onChange={(e) => setForm({ ...form, patientUhid: e.target.value })}
                    placeholder="e.g. CURA-2026-0042"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={form.patientAge}
                    onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={form.patientGender}
                    onChange={(e) => setForm({ ...form, patientGender: e.target.value as any })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div>
                  <Label>Certifying Physician</Label>
                  <Select
                    value={form.doctorName}
                    onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  >
                    {data.doctors.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.department || "Consultant"})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Conditional Fields Based on Active Certificate Type */}
              {activeSubTab === "medical" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs">
                  <div>
                    <Label>Clinical Diagnosis / Ailment *</Label>
                    <Input
                      required
                      value={form.diagnosis}
                      onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                      placeholder="e.g. Acute Viral Gastroenteritis with Dehydration"
                    />
                  </div>
                  <div>
                    <Label>Recommended Medical Rest (Days)</Label>
                    <Input
                      type="number"
                      value={form.restDays}
                      onChange={(e) => setForm({ ...form, restDays: e.target.value })}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>
              )}

              {activeSubTab === "birth" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs">
                  <div>
                    <Label>Mother & Father's Name</Label>
                    <Input
                      value={form.parentName}
                      onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                      placeholder="e.g. Sunita & Rajesh"
                    />
                  </div>
                  <div>
                    <Label>Birth Weight (kg)</Label>
                    <Input
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      placeholder="e.g. 3.2"
                    />
                  </div>
                </div>
              )}

              {activeSubTab === "fitness" && (
                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs space-y-3">
                  <div>
                    <Label>Physical Fitness Purpose</Label>
                    <Input
                      value={form.purpose}
                      onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                      placeholder="e.g. Fitness for Flight / Overseas Employment"
                    />
                  </div>
                  <div>
                    <Label>Clinical Fitness Remarks & Vital Readings</Label>
                    <Input
                      value={form.secondaryDetails}
                      onChange={(e) => setForm({ ...form, secondaryDetails: e.target.value })}
                      placeholder="e.g. BP: 120/80, Pulse: 72 bpm, Chest Clear, Visual Acuity 6/6"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  <Printer className="w-4 h-4 mr-1.5" />
                  Issue Certificate & Open Print Preview
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (
        /* Certificate Report Table */
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-amber-500" />
                Certificate Register & Audit Log
              </h2>
              <p className="text-xs text-slate-500">Historical register of all legally issued hospital certifications.</p>
            </div>
            <div className="w-72">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search certificate # or patient..."
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
                    <th className="py-3 px-4">Cert #</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Patient / UHID</th>
                    <th className="py-3 px-4">Certifying Doctor</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredCerts.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {cert.certificateNumber}
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-slate-700 dark:text-slate-200">
                        {cert.certificateType}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{cert.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{cert.patientUhid}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{cert.doctorName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{fmtDate(cert.issueDate)}</td>
                      <td className="py-3 px-4">
                        <Badge tone="green">Verified Issued</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs h-7 px-2"
                          onClick={() => {
                            setSelectedCertForPrint(cert);
                            setPrintModalOpen(true);
                          }}
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" />
                          Print
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

      {/* ── Official Printable Certificate Modal ── */}
      <Modal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        title="Official Hospital Certification Document"
        size="lg"
      >
        {selectedCertForPrint && (
          <div className="space-y-4">
            <div className="bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-sm font-serif print:border-none print:shadow-none">
              {/* Header Letterhead */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                <div className="text-2xl font-black uppercase tracking-wider text-slate-900">
                  Cura Multispecialty Hospital
                </div>
                <div className="text-xs text-slate-600 font-sans mt-0.5">
                  108 Healthcare Boulevard, Anna Nagar, Chennai - 600040 · Phone: +91 44 2800 9000
                </div>
                <div className="text-[10px] text-slate-500 font-mono tracking-widest mt-1 uppercase">
                  NABH & ISO 9001:2026 ACCREDITED MEDICAL INSTITUTION
                </div>
              </div>

              {/* Certificate Title Banner */}
              <div className="text-center my-6">
                <div className="inline-block border-2 border-slate-900 px-6 py-1.5 uppercase font-bold tracking-widest text-base bg-slate-50">
                  {selectedCertForPrint.certificateType.replace("_", " ")} Certificate
                </div>
                <div className="text-xs font-mono font-bold text-slate-700 mt-2">
                  Certificate Ref: {selectedCertForPrint.certificateNumber}
                </div>
              </div>

              {/* Certificate Body Text */}
              <div className="space-y-4 text-sm leading-relaxed text-slate-800 text-justify">
                <p>
                  This is to solemnly certify that{" "}
                  <b className="text-slate-950 font-bold underline decoration-slate-400 underline-offset-4">
                    {selectedCertForPrint.patientName}
                  </b>
                  , aged {selectedCertForPrint.patientAge || "30"} years, gender {selectedCertForPrint.patientGender || "Male"}, holding Digital Health UHID{" "}
                  <span className="font-mono font-semibold">{selectedCertForPrint.patientUhid}</span>, was examined under our care at Cura Multispecialty Hospital.
                </p>

                {selectedCertForPrint.diagnosis && (
                  <p>
                    <b>Clinical Diagnosis / Findings:</b> {selectedCertForPrint.diagnosis}
                  </p>
                )}

                {selectedCertForPrint.details?.restDaysRecommended && (
                  <p>
                    In our professional clinical judgment, the patient requires{" "}
                    <b>{selectedCertForPrint.details.restDaysRecommended} days</b> of absolute medical rest from work/school duties commencing from{" "}
                    {fmtDate(selectedCertForPrint.issueDate)}.
                  </p>
                )}

                {selectedCertForPrint.details?.birthWeightKg && (
                  <p>
                    Live birth recorded with birth weight of <b>{selectedCertForPrint.details.birthWeightKg} kg</b> to parent(s){" "}
                    <b>{selectedCertForPrint.details.parentName || "Parents on record"}</b>.
                  </p>
                )}

                {selectedCertForPrint.details?.fitnessStatement && (
                  <p>
                    <b>Fitness Assessment:</b> {selectedCertForPrint.details.fitnessStatement}
                  </p>
                )}

                <p className="text-xs text-slate-600 italic mt-6">
                  This document is issued upon request for official statutory verification purposes without liability.
                </p>
              </div>

              {/* Signatures & Hospital Stamp */}
              <div className="mt-12 pt-6 border-t border-slate-300 flex items-end justify-between text-xs">
                <div>
                  <div className="w-20 h-20 border border-dashed border-slate-400 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-mono">
                    HOSPITAL SEAL
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">Date: {fmtDate(selectedCertForPrint.issueDate)}</div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">{selectedCertForPrint.doctorName}</div>
                  <div className="text-[11px] text-slate-600">Authorized Medical Practitioner</div>
                  <div className="text-[10px] text-slate-500 font-mono">Reg. No: TNMC-2014-98124</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setPrintModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => window.print()} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                <Printer className="w-4 h-4 mr-1.5" />
                Print Certificate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CertificateERP;
