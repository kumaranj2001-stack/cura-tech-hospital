import React, { useState, useEffect, useCallback } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Badge, Modal, Input, Select, Label, EmptyState, Th, Td, Textarea } from "../components/ui";
import { flashToast, downloadCSV, today } from "../utils/helpers";
import { erpGet, erpMutate, useErpRealtime } from "../utils/erpApi";
import { Award, Plus, Printer, RefreshCw, Download, QrCode } from "lucide-react";

interface MedicalCert {
  id: string;
  certificateType: string;
  certificateNumber: string;
  patientName: string;
  patientUhid?: string;
  patientAge?: number;
  patientGender?: string;
  doctorName: string;
  issueDate: string;
  validUntil?: string;
  purpose?: string;
  diagnosis?: string;
  details?: Record<string, any>;
  status: string;
}

const ACTION_TO_CERT: Record<string, string> = {
  birth_cert: "birth",
  vaccination_cert: "vaccination",
  medical_cert: "medical",
  fitness_cert: "fitness",
  death_cert: "death",
  self_declaration: "self_declaration",
  marine_cert: "marine",
  consent_form: "consent",
  surgical_consent: "surgical_consent",
  cert_report: "registry",
};

const CERT_LABELS: Record<string, string> = {
  birth: "Birth Certificate",
  vaccination: "Vaccination Certificate",
  medical: "Medical Leave Certificate",
  fitness: "Physical Fitness Certificate",
  death: "Death Certificate",
  self_declaration: "Patient Self Declaration",
  marine: "Marine / Seafarer Medical Certificate",
  consent: "General Treatment Consent Form",
  surgical_consent: "Surgical & Anesthesia Consent Form",
  registry: "Issued Certificates Registry",
};

export const CertificateERP: React.FC<{ initialAction?: string; subTypeOption?: string }> = ({
  initialAction = "birth_cert",
  subTypeOption,
}) => {
  const { currentBranch, viewBranchId, log } = useStore();
  const currentBranchId = viewBranchId || currentBranch?.id || "br_main";
  const [certMode, setCertMode] = useState<string>(ACTION_TO_CERT[initialAction] || "birth");
  const [certs, setCerts] = useState<MedicalCert[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewCert, setPreviewCert] = useState<MedicalCert | null>(null);

  const [form, setForm] = useState({
    patientName: "",
    patientUhid: "",
    patientAge: "30",
    patientGender: "Male",
    doctorName: "Dr. Arvind Sharma",
    issueDate: today(),
    validUntil: "",
    purpose: "",
    diagnosis: "",
    // Type-specific fields
    motherName: "",
    fatherName: "",
    birthWeightKg: "3.1",
    vaccineName: "COVID-19 / Influenza Quadrivalent",
    doseLot: "VAC-9921",
    causeOfDeath: "",
    procedureName: "",
    declarationText: "I hereby declare all disclosed medical history and allergies are accurate.",
  });

  useEffect(() => {
    setCertMode(ACTION_TO_CERT[initialAction] || "birth");
  }, [initialAction, subTypeOption]);

  const loadCerts = useCallback(async () => {
    setLoading(true);
    try {
      const q = currentBranchId && currentBranchId !== "all" ? `?branchId=${encodeURIComponent(currentBranchId)}` : "";
      const res = await erpGet(`/api/certificates${q}`);
      setCerts(res.certificates || []);
    } catch (err: any) {
      flashToast(err?.message || "Failed loading certificates", "warn");
    } finally {
      setLoading(false);
    }
  }, [currentBranchId]);

  useEffect(() => {
    loadCerts();
  }, [loadCerts]);

  useErpRealtime("certificate", loadCerts);

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim()) return flashToast("Patient name is required", "warn");

    const prefix = certMode.slice(0, 2).toUpperCase();
    const certificateNumber = `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const details: Record<string, any> = {};

    if (certMode === "birth") {
      Object.assign(details, { motherName: form.motherName, fatherName: form.fatherName, birthWeightKg: Number(form.birthWeightKg) || 3.0 });
    } else if (certMode === "vaccination") {
      Object.assign(details, { vaccineName: form.vaccineName, batchLot: form.doseLot });
    } else if (certMode === "death") {
      Object.assign(details, { causeOfDeath: form.causeOfDeath });
    } else if (certMode === "surgical_consent" || certMode === "consent") {
      Object.assign(details, { procedureName: form.procedureName });
    } else if (certMode === "marine") {
      Object.assign(details, { maritimeStandard: subTypeOption || "ILO / STCW Seafarer Standard" });
    } else if (certMode === "self_declaration") {
      Object.assign(details, { declarationText: form.declarationText });
    }

    try {
      const res = await erpMutate("/api/certificates", {
        branchId: currentBranchId === "all" ? "br_main" : currentBranchId,
        certificateType: certMode,
        certificateNumber,
        patientName: form.patientName.trim(),
        patientUhid: form.patientUhid.trim() || undefined,
        patientAge: Number(form.patientAge) || 0,
        patientGender: form.patientGender,
        doctorName: form.doctorName,
        issueDate: form.issueDate,
        validUntil: form.validUntil || undefined,
        purpose: form.purpose || CERT_LABELS[certMode],
        diagnosis: form.diagnosis || undefined,
        details,
        status: "issued",
      });
      log("CERTIFICATE_ISSUED", `Issued ${certificateNumber} (${certMode}) for ${form.patientName}`);
      await loadCerts();
      if (res.certificate) setPreviewCert(res.certificate);
      flashToast(`Issued official certificate ${certificateNumber}`, "ok");
    } catch (err: any) {
      flashToast(err?.message || "Failed issuing certificate", "warn");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{CERT_LABELS[certMode] || "Medical Certificates"}</h1>
            {subTypeOption && <Badge tone="blue">{subTypeOption}</Badge>}
            {loading && <Badge tone="amber">Syncing...</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Digitally signed medical, vital, marine & consent documentation</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={loadCerts}><RefreshCw className="w-4 h-4" /> Refresh</Button>
          <Button variant="secondary" size="sm" onClick={() => setCertMode("registry")}>Registry ({certs.length})</Button>
        </div>
      </div>

      {/* Quick Type Switcher */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(CERT_LABELS).map(([key, label]) => (
          <Button key={key} size="sm" variant={certMode === key ? "primary" : "secondary"} onClick={() => setCertMode(key)}>
            {label}
          </Button>
        ))}
      </div>

      {certMode !== "registry" ? (
        <Card>
          <CardHeader title={`Generate ${CERT_LABELS[certMode]}`} subtitle="Stored securely with QR verification stamp" />
          <CardBody>
            <form onSubmit={handleIssueCertificate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>Patient Full Name *</Label><Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} required /></div>
              <div><Label>UHID</Label><Input value={form.patientUhid} onChange={(e) => setForm({ ...form, patientUhid: e.target.value })} placeholder="CURA-2026-..." /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Age</Label><Input type="number" value={form.patientAge} onChange={(e) => setForm({ ...form, patientAge: e.target.value })} /></div>
                <div>
                  <Label>Gender</Label>
                  <Select value={form.patientGender} onChange={(e) => setForm({ ...form, patientGender: e.target.value })}>
                    <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                  </Select>
                </div>
              </div>
              <div><Label>Certifying Physician</Label><Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} /></div>
              <div><Label>Issue Date</Label><Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></div>
              <div><Label>Valid Until (if applicable)</Label><Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></div>

              {certMode === "birth" && (
                <>
                  <div><Label>Mother's Name</Label><Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} /></div>
                  <div><Label>Father's Name</Label><Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></div>
                  <div><Label>Birth Weight (Kg)</Label><Input type="number" step="0.1" value={form.birthWeightKg} onChange={(e) => setForm({ ...form, birthWeightKg: e.target.value })} /></div>
                </>
              )}
              {certMode === "vaccination" && (
                <>
                  <div><Label>Vaccine Administered</Label><Input value={form.vaccineName} onChange={(e) => setForm({ ...form, vaccineName: e.target.value })} /></div>
                  <div><Label>Batch / Lot #</Label><Input value={form.doseLot} onChange={(e) => setForm({ ...form, doseLot: e.target.value })} /></div>
                </>
              )}
              {certMode === "death" && (
                <div className="md:col-span-2"><Label>Cause of Death (ICD-10)</Label><Input value={form.causeOfDeath} onChange={(e) => setForm({ ...form, causeOfDeath: e.target.value })} /></div>
              )}
              {(certMode === "consent" || certMode === "surgical_consent") && (
                <div className="md:col-span-2"><Label>Authorized Procedure / Surgery</Label><Input value={form.procedureName} onChange={(e) => setForm({ ...form, procedureName: e.target.value })} /></div>
              )}
              {(certMode === "medical" || certMode === "fitness" || certMode === "marine") && (
                <>
                  <div className="md:col-span-2"><Label>Clinical Finding / Diagnosis</Label><Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
                  <div><Label>Purpose</Label><Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
                </>
              )}
              {certMode === "self_declaration" && (
                <div className="md:col-span-3"><Label>Signed Declaration Statement</Label><Textarea value={form.declarationText} onChange={(e) => setForm({ ...form, declarationText: e.target.value })} /></div>
              )}

              <div className="md:col-span-3 flex justify-end pt-2">
                <Button type="submit" variant="primary"><Plus className="w-4 h-4" /> Generate & Issue Certificate</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {/* Certificates Registry */}
      <Card>
        <CardHeader
          title={`Certificates Registry (${certs.length})`}
          right={<Button size="sm" variant="secondary" onClick={() => downloadCSV("certificates_registry.csv", certs as any[])}><Download className="w-3.5 h-3.5" /> CSV</Button>}
        />
        <CardBody className="p-0 overflow-x-auto">
          {certs.length === 0 ? (
            <EmptyState icon="📜" title="No certificates issued yet" sub="Use the form above to generate an official hospital document." />
          ) : (
            <table className="w-full text-sm">
              <thead><tr><Th>Cert #</Th><Th>Type</Th><Th>Patient</Th><Th>Doctor</Th><Th>Issue Date</Th><Th>Status</Th><Th className="text-right">Print</Th></tr></thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                    <Td className="font-mono text-xs">{c.certificateNumber}</Td>
                    <Td><Badge tone="blue">{c.certificateType}</Badge></Td>
                    <Td className="font-semibold">{c.patientName}</Td>
                    <Td>{c.doctorName}</Td>
                    <Td>{c.issueDate}</Td>
                    <Td><Badge tone="green">{c.status}</Badge></Td>
                    <Td className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => setPreviewCert(c)}><Printer className="w-3.5 h-3.5" /> View</Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Official Certificate Preview Modal */}
      <Modal open={!!previewCert} onClose={() => setPreviewCert(null)} title={previewCert ? `${CERT_LABELS[previewCert.certificateType] || "Certificate"} — ${previewCert.certificateNumber}` : "Preview"}>
        {previewCert && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">CURA TECH MULTI-SPECIALTY HOSPITAL</div>
                  <div className="text-xs text-slate-500">Official Medical Records Department</div>
                </div>
                <QrCode className="w-8 h-8 text-slate-600" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400">Certificate No:</span> <strong>{previewCert.certificateNumber}</strong></div>
                <div><span className="text-slate-400">Issue Date:</span> <strong>{previewCert.issueDate}</strong></div>
                <div><span className="text-slate-400">Patient Name:</span> <strong>{previewCert.patientName}</strong></div>
                <div><span className="text-slate-400">UHID:</span> <strong>{previewCert.patientUhid || "N/A"}</strong></div>
                <div><span className="text-slate-400">Physician:</span> <strong>{previewCert.doctorName}</strong></div>
                <div><span className="text-slate-400">Purpose:</span> <strong>{previewCert.purpose || "Official"}</strong></div>
              </div>
              {previewCert.diagnosis && <div className="text-sm pt-2 border-t">Diagnosis / Note: <strong>{previewCert.diagnosis}</strong></div>}
              {previewCert.details && Object.keys(previewCert.details).length > 0 && (
                <div className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-lg space-y-1">
                  {Object.entries(previewCert.details).map(([k, v]) => (
                    <div key={k}><span className="capitalize font-semibold">{k}:</span> {String(v)}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPreviewCert(null)}>Close</Button>
              <Button variant="primary" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print Certificate</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
