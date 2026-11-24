import React, { useState } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, flashToast } from "../utils/helpers";
import type { SkinRecord } from "../store/types";
import {
  Sparkles,
  Zap,
  Package,
  Image,
  User,
  Plus,
  Calendar,
  CheckCircle,
  FileText,
  Printer,
  Search,
  Activity,
  AlertTriangle,
  Layers,
} from "lucide-react";

const INITIAL_SKIN_RECORDS: SkinRecord[] = [
  {
    id: "SKIN-REC-01",
    patientId: "P-101",
    patientName: "Meenakshi Sundaram",
    patientUhid: "UHID-2026-0012",
    procedureName: "CO2 Fractional Laser Resurfacing",
    doctorName: "Dr. Sunita Kapoor, MD (Derm)",
    date: "2026-11-24",
    sittingNumber: 2,
    totalSittings: 4,
    charge: 4500,
    skinType: "Fitzpatrick Type IV",
    beforeNotes: "Severe post-acne rolling and boxcar scars over bilateral cheeks",
    procedureNotes: "Treated at 25mJ energy, 150 spots/cm2 under topical EMLA cream anesthesia. Good clinical end point with mild erythema.",
    afterCareAdvice: "Strict physical sun avoidance for 72 hrs. Apply Cicalfate soothing cream twice daily. SPF 50+ mineral sunscreen every 3 hours.",
    prescribedTopicals: ["Avene Cicalfate+", "La Roche-Posay Anthelios SPF50", "Gentle Hydrating Cleanser"],
    status: "completed",
  },
  {
    id: "SKIN-REC-02",
    patientId: "P-103",
    patientName: "Deepak Chawla",
    patientUhid: "UHID-2026-0018",
    procedureName: "PRP Hair Follicle Biostimulation",
    doctorName: "Dr. Sunita Kapoor, MD (Derm)",
    date: "2026-11-24",
    sittingNumber: 3,
    totalSittings: 6,
    charge: 3500,
    skinType: "Norwood Grade 3",
    beforeNotes: "Androgenetic alopecia with vertex thinning",
    procedureNotes: "15ml blood drawn in ACD tubes, centrifuged at 3200 RPM. 4ml PRP injected via 30G mesotherapy needle across fronto-parietal scalp.",
    afterCareAdvice: "Do not wash scalp for 24 hours. Resume 5% Minoxidil foam after 48 hours.",
    prescribedTopicals: ["Minoxidil 5% Foam", "Biotin 10mg Tablets", "Ketoconazole 2% Shampoo"],
    status: "completed",
  },
  {
    id: "SKIN-REC-03",
    patientId: "P-107",
    patientName: "Ritu Singhania",
    patientUhid: "UHID-2026-0025",
    procedureName: "Salicylic-Mandelic Peel (Blackhead & Sebum Control)",
    doctorName: "Dr. Sunita Kapoor, MD (Derm)",
    date: "2026-11-24",
    sittingNumber: 1,
    totalSittings: 3,
    charge: 2200,
    skinType: "Fitzpatrick Type III (Oily Acne-Prone)",
    beforeNotes: "Grade 2 comedonal and inflammatory acne on T-Zone",
    procedureNotes: "Degreased with pre-peel cleanser. Peel applied for 4 minutes until mild frosting. Neutralized with bicarbonate solution.",
    afterCareAdvice: "Avoid active exfoliating acids for 5 days. Keep skin well hydrated with Ceramide moisturizer.",
    prescribedTopicals: ["Ceramide Barrier Cream", "Broad Spectrum Tinted Sunscreen"],
    status: "scheduled",
  },
];

const SKIN_PRODUCTS = [
  { id: "PROD-1", name: "DermShield Ultra Matte Sunscreen SPF 50+ PA++++ (50g)", price: 780, stock: 45 },
  { id: "PROD-2", name: "BioBarrier Ceramide Repair Moisturizer (100ml)", price: 620, stock: 38 },
  { id: "PROD-3", name: "Pure C15 L-Ascorbic Acid Radiance Serum (30ml)", price: 1450, stock: 22 },
  { id: "PROD-4", name: "Retinaldehyde 0.05% Age Defying Cream (30g)", price: 1850, stock: 18 },
  { id: "PROD-5", name: "Salicylic 2% Foaming Gentle Cleanser (150ml)", price: 490, stock: 50 },
];

export const SkinERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "skin_consultation", dropdownOption }) => {
  const [activeTab, setActiveTab] = useState<string>(initialAction || "skin_consultation");
  const [records, setRecords] = useState<SkinRecord[]>(INITIAL_SKIN_RECORDS);
  const [products] = useState(SKIN_PRODUCTS);

  // New Procedure Form
  const [showNewProcModal, setShowNewProcModal] = useState(false);
  const [newProc, setNewProc] = useState({
    patientName: "",
    patientUhid: "",
    procedureName: "Chemical Peel (Glycolic 35%)",
    skinType: "Fitzpatrick Type III",
    charge: 2500,
    totalSittings: 4,
    notes: "",
  });

  // Selected Record For Detail / Prescription View
  const [selectedRecord, setSelectedRecord] = useState<SkinRecord | null>(null);

  React.useEffect(() => {
    if (initialAction) setActiveTab(initialAction);
  }, [initialAction]);

  const handleCreateProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProc.patientName) return;

    const created: SkinRecord = {
      id: `SKIN-REC-${(records.length + 1).toString().padStart(2, "0")}`,
      patientId: `P-${Date.now().toString().slice(-3)}`,
      patientName: newProc.patientName,
      patientUhid: newProc.patientUhid || "UHID-WALKIN",
      procedureName: newProc.procedureName,
      doctorName: "Dr. Sunita Kapoor, MD (Derm)",
      date: new Date().toISOString().split("T")[0],
      sittingNumber: 1,
      totalSittings: Number(newProc.totalSittings) || 1,
      charge: Number(newProc.charge) || 1500,
      skinType: newProc.skinType,
      beforeNotes: newProc.notes || "Clinical evaluation initiated",
      procedureNotes: "Session #1 performed following standardized derm protocols.",
      afterCareAdvice: "Apply post-procedure soothing balm and SPF 50 mineral sunscreen.",
      prescribedTopicals: ["Barrier Restoration Gel", "Mineral Sunscreen SPF 50"],
      status: "completed",
    };

    setRecords([created, ...records]);
    flashToast(`Procedure session scheduled for ${created.patientName}`, "success");
    setShowNewProcModal(false);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* ── Sub-Navigation / Header ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-300 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Dermatology, Aesthetics & Cosmetology Clinic
              {dropdownOption && <Badge variant="info">{dropdownOption}</Badge>}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Laser Resurfacing, Chemical Exfoliation, Trichology PRP & Topical Medical Regimens
            </p>
          </div>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab("skin_consultation")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "skin_consultation" || activeTab === "skin_records"
                ? "bg-pink-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Clinical Consultations
          </button>
          <button
            onClick={() => setActiveTab("skin_procedures")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "skin_procedures"
                ? "bg-pink-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Procedures & Lasers
          </button>
          <button
            onClick={() => setActiveTab("skin_regimens")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "skin_regimens"
                ? "bg-pink-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Treatment Regimens
          </button>
          <button
            onClick={() => setActiveTab("skin_products")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "skin_products"
                ? "bg-pink-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Medical Topicals
          </button>
        </div>
      </div>

      {/* ── 1. CLINICAL CONSULTATIONS & RECORDS ── */}
      {(activeTab === "skin_consultation" || activeTab === "skin_records") && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-pink-600" />
                  Dermatology Consultation Log & Patient Skin History
                </h3>
                <p className="text-[11px] text-slate-500">Fitzpatrick skin typing, acne severity scoring & clinical sitting logs</p>
              </div>
              <Button size="sm" onClick={() => setShowNewProcModal(true)} className="text-xs bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Book Derm Procedure
              </Button>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                      <th className="p-3">Record ID</th>
                      <th className="p-3">Patient & UHID</th>
                      <th className="p-3">Procedure Name</th>
                      <th className="p-3">Sitting Progress</th>
                      <th className="p-3">Skin Profile</th>
                      <th className="p-3">Session Fee</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{r.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{r.patientName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.patientUhid}</div>
                        </td>
                        <td className="p-3 font-medium text-pink-700 dark:text-pink-400">{r.procedureName}</td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          Sitting {r.sittingNumber} of {r.totalSittings}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{r.skinType}</td>
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">₹{r.charge}</td>
                        <td className="p-3">
                          <Badge variant={r.status === "completed" ? "success" : "warning"} className="text-[10px]">
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelectedRecord(r)} className="text-[11px] py-1 px-2">
                            View Plan
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

      {/* ── 2. PROCEDURES & LASER MODALITY ── */}
      {activeTab === "skin_procedures" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {[
            {
              title: "CO2 Fractional Resurfacing",
              tech: "Ablative 10,600 nm Microthermal Zones",
              indications: "Acne Scars, Deep Rhytids, Skin Tightening",
              downtime: "3 - 5 Days Micro-Crusting",
              cost: "₹4,500 / session",
            },
            {
              title: "Q-Switched Nd:YAG Laser",
              tech: "1064 nm / 532 nm Photo-Acoustic",
              indications: "Melasma, Freckles, Carbon Laser Peel",
              downtime: "Zero Downtime Glow",
              cost: "₹3,000 / session",
            },
            {
              title: "Autologous PRP Biostimulation",
              tech: "Concentrated Platelet Growth Factors",
              indications: "Alopecia, Facial Vampire Facelift",
              downtime: "Mild 24-hr Erythema",
              cost: "₹3,500 / session",
            },
          ].map((item, idx) => (
            <Card key={idx} className="p-4 space-y-2 border-t-4 border-t-pink-500">
              <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{item.title}</div>
              <div className="text-[11px] text-pink-600 font-semibold">{item.tech}</div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1 text-slate-600 dark:text-slate-300">
                <div><span className="text-slate-400">Indications:</span> {item.indications}</div>
                <div><span className="text-slate-400">Downtime:</span> {item.downtime}</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 pt-1">{item.cost}</div>
              </div>
              <Button size="sm" onClick={() => setShowNewProcModal(true)} className="w-full mt-2 bg-pink-600 hover:bg-pink-700 text-white text-xs">
                Schedule Session
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* ── 3. TREATMENT REGIMENS & MEDICAL TOPICALS ── */}
      {(activeTab === "skin_regimens" || activeTab === "skin_products") && (
        <Card>
          <CardHeader className="py-3 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-pink-600" />
                Medical Dermatology Formulary & Dispensary Products
              </h3>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Available Stock</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-100">{p.name}</td>
                      <td className="p-3 font-mono font-bold text-pink-700 dark:text-pink-400">₹{p.price}</td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{p.stock} Units</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => flashToast(`Dispensed ${p.name}`, "success")} className="text-[11px] py-1 px-2">
                          Dispense
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

      {/* ── MODAL: BOOK NEW PROCEDURE ── */}
      {showNewProcModal && (
        <Modal open={showNewProcModal} onClose={() => setShowNewProcModal(false)} title="Book Dermatology / Laser Procedure">
          <form onSubmit={handleCreateProcedure} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Patient Name</Label>
                <Input
                  placeholder="Patient Full Name"
                  value={newProc.patientName}
                  onChange={(e) => setNewProc({ ...newProc, patientName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Patient UHID</Label>
                <Input
                  placeholder="e.g. UHID-2026-0045"
                  value={newProc.patientUhid}
                  onChange={(e) => setNewProc({ ...newProc, patientUhid: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Procedure Type</Label>
              <Select
                value={newProc.procedureName}
                onChange={(e) => setNewProc({ ...newProc, procedureName: e.target.value })}
              >
                <option value="CO2 Fractional Laser Resurfacing">CO2 Fractional Laser Resurfacing</option>
                <option value="Q-Switched Nd:YAG Laser (Toning / Carbon)">Q-Switched Nd:YAG Laser (Toning / Carbon)</option>
                <option value="PRP Hair Follicle Biostimulation">PRP Hair Follicle Biostimulation</option>
                <option value="Chemical Peel (Glycolic 35%)">Chemical Peel (Glycolic 35%)</option>
                <option value="Salicylic-Mandelic Peel">Salicylic-Mandelic Peel</option>
                <option value="HydraFacial MD Medical Infusion">HydraFacial MD Medical Infusion</option>
                <option value="Microneedling with Mesotherapy">Microneedling with Mesotherapy</option>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Skin Type</Label>
                <Select
                  value={newProc.skinType}
                  onChange={(e) => setNewProc({ ...newProc, skinType: e.target.value })}
                >
                  <option value="Fitzpatrick Type II">Fitzpatrick Type II</option>
                  <option value="Fitzpatrick Type III">Fitzpatrick Type III</option>
                  <option value="Fitzpatrick Type IV">Fitzpatrick Type IV</option>
                  <option value="Fitzpatrick Type V">Fitzpatrick Type V</option>
                </Select>
              </div>
              <div>
                <Label>Total Sittings Planned</Label>
                <Input
                  type="number"
                  min="1"
                  value={newProc.totalSittings}
                  onChange={(e) => setNewProc({ ...newProc, totalSittings: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Procedure Fee (₹)</Label>
                <Input
                  type="number"
                  value={newProc.charge}
                  onChange={(e) => setNewProc({ ...newProc, charge: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Clinical Indications & Before Notes</Label>
              <Input
                placeholder="Severity, target areas, scar assessment"
                value={newProc.notes}
                onChange={(e) => setNewProc({ ...newProc, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowNewProcModal(false)}>Cancel</Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white">Confirm Booking</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL: VIEW PLAN & CARE ADVICE ── */}
      {selectedRecord && (
        <Modal open={Boolean(selectedRecord)} onClose={() => setSelectedRecord(null)} title="Dermatological Treatment Plan & Aftercare">
          <div className="space-y-3 text-xs p-2">
            <div className="p-3 bg-pink-50 dark:bg-pink-950/40 rounded-lg border border-pink-200 dark:border-pink-900 flex justify-between items-center">
              <div>
                <div className="font-extrabold text-sm text-pink-950 dark:text-pink-100">{selectedRecord.patientName}</div>
                <div className="text-[11px] text-pink-700 dark:text-pink-300 font-medium">
                  {selectedRecord.procedureName} • Sitting {selectedRecord.sittingNumber} / {selectedRecord.totalSittings}
                </div>
              </div>
              <Badge variant="success">Completed</Badge>
            </div>

            <div className="space-y-2 border p-3 rounded-lg border-slate-200 dark:border-slate-800">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300">Procedure Notes:</span>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">{selectedRecord.procedureNotes}</p>
              </div>
              <div className="border-t pt-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Prescribed Post-Care Topicals:</span>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {selectedRecord.prescribedTopicals?.map((top, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      ✓ {top}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t pt-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Patient Aftercare Advisory:</span>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">{selectedRecord.afterCareAdvice}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
              <Button onClick={() => flashToast("Prescription Printed", "success")} className="bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" /> Print Patient Leaflet
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SkinERP;
