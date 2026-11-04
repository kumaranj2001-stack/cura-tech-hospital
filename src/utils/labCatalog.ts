export interface CatalogLabTest {
  id: string;
  name: string;
  category: "Hematology" | "Biochemistry" | "Microbiology" | "Radiology" | "Pathology" | "General";
  sampleType: string;
  price: number;
  tatHours: number; // Turnaround time in hours
  parameters: Array<{
    name: string;
    unit: string;
    referenceRange: string;
    lowThreshold?: number;
    highThreshold?: number;
    defaultValue?: string;
  }>;
}

export const LAB_CATALOG: CatalogLabTest[] = [
  {
    id: "test_cbc",
    name: "Complete Blood Count (CBC)",
    category: "Hematology",
    sampleType: "EDTA Whole Blood (Purple Top)",
    price: 350,
    tatHours: 2,
    parameters: [
      { name: "Hemoglobin (Hb)", unit: "g/dL", referenceRange: "13.0 - 17.0", lowThreshold: 13.0, highThreshold: 17.0, defaultValue: "14.2" },
      { name: "Total Leukocyte Count (WBC)", unit: "/cu.mm", referenceRange: "4,000 - 11,000", lowThreshold: 4000, highThreshold: 11000, defaultValue: "7200" },
      { name: "Platelet Count", unit: "/cu.mm", referenceRange: "150,000 - 450,000", lowThreshold: 150000, highThreshold: 450000, defaultValue: "260000" },
      { name: "RBC Count", unit: "mill/cu.mm", referenceRange: "4.5 - 5.5", lowThreshold: 4.5, highThreshold: 5.5, defaultValue: "4.8" },
      { name: "Packed Cell Volume (PCV)", unit: "%", referenceRange: "40.0 - 50.0", lowThreshold: 40.0, highThreshold: 50.0, defaultValue: "42.5" },
      { name: "Neutrophils", unit: "%", referenceRange: "40 - 75", lowThreshold: 40, highThreshold: 75, defaultValue: "62" },
      { name: "Lymphocytes", unit: "%", referenceRange: "20 - 45", lowThreshold: 20, highThreshold: 45, defaultValue: "30" },
    ],
  },
  {
    id: "test_fbs",
    name: "Fasting Blood Sugar (FBS)",
    category: "Biochemistry",
    sampleType: "Fluoride Plasma (Grey Top)",
    price: 150,
    tatHours: 1,
    parameters: [
      { name: "Fasting Blood Glucose", unit: "mg/dL", referenceRange: "70.0 - 99.0", lowThreshold: 70.0, highThreshold: 99.0, defaultValue: "92" },
    ],
  },
  {
    id: "test_ppbs",
    name: "Post-Prandial Blood Sugar (PPBS)",
    category: "Biochemistry",
    sampleType: "Fluoride Plasma (Grey Top)",
    price: 150,
    tatHours: 1,
    parameters: [
      { name: "Post-Prandial Glucose (2h)", unit: "mg/dL", referenceRange: "80.0 - 139.0", lowThreshold: 80.0, highThreshold: 139.0, defaultValue: "124" },
    ],
  },
  {
    id: "test_hba1c",
    name: "HbA1c (Glycated Hemoglobin)",
    category: "Biochemistry",
    sampleType: "EDTA Whole Blood (Purple Top)",
    price: 450,
    tatHours: 3,
    parameters: [
      { name: "HbA1c", unit: "%", referenceRange: "4.0 - 5.6", lowThreshold: 4.0, highThreshold: 5.6, defaultValue: "5.4" },
      { name: "Estimated Average Glucose", unit: "mg/dL", referenceRange: "70.0 - 115.0", lowThreshold: 70.0, highThreshold: 115.0, defaultValue: "108" },
    ],
  },
  {
    id: "test_lipid",
    name: "Lipid Profile Panel",
    category: "Biochemistry",
    sampleType: "Serum (Red/Gold Top)",
    price: 550,
    tatHours: 3,
    parameters: [
      { name: "Total Cholesterol", unit: "mg/dL", referenceRange: "125.0 - 200.0", lowThreshold: 125.0, highThreshold: 200.0, defaultValue: "178" },
      { name: "Triglycerides", unit: "mg/dL", referenceRange: "25.0 - 150.0", lowThreshold: 25.0, highThreshold: 150.0, defaultValue: "135" },
      { name: "HDL Cholesterol (Good)", unit: "mg/dL", referenceRange: "40.0 - 60.0", lowThreshold: 40.0, highThreshold: 80.0, defaultValue: "48" },
      { name: "LDL Cholesterol (Bad)", unit: "mg/dL", referenceRange: "50.0 - 100.0", lowThreshold: 50.0, highThreshold: 100.0, defaultValue: "94" },
      { name: "VLDL Cholesterol", unit: "mg/dL", referenceRange: "5.0 - 30.0", lowThreshold: 5.0, highThreshold: 30.0, defaultValue: "22" },
    ],
  },
  {
    id: "test_rft",
    name: "Renal Function Test (RFT / KFT)",
    category: "Biochemistry",
    sampleType: "Serum (Red/Gold Top)",
    price: 450,
    tatHours: 2,
    parameters: [
      { name: "Blood Urea", unit: "mg/dL", referenceRange: "15.0 - 40.0", lowThreshold: 15.0, highThreshold: 40.0, defaultValue: "26" },
      { name: "Serum Creatinine", unit: "mg/dL", referenceRange: "0.7 - 1.3", lowThreshold: 0.7, highThreshold: 1.3, defaultValue: "0.95" },
      { name: "Serum Uric Acid", unit: "mg/dL", referenceRange: "3.5 - 7.2", lowThreshold: 3.5, highThreshold: 7.2, defaultValue: "5.1" },
      { name: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", referenceRange: "7.0 - 20.0", lowThreshold: 7.0, highThreshold: 20.0, defaultValue: "12.1" },
    ],
  },
  {
    id: "test_lft",
    name: "Liver Function Test (LFT)",
    category: "Biochemistry",
    sampleType: "Serum (Red/Gold Top)",
    price: 550,
    tatHours: 3,
    parameters: [
      { name: "Total Bilirubin", unit: "mg/dL", referenceRange: "0.2 - 1.2", lowThreshold: 0.2, highThreshold: 1.2, defaultValue: "0.7" },
      { name: "Direct Bilirubin", unit: "mg/dL", referenceRange: "0.0 - 0.3", lowThreshold: 0.0, highThreshold: 0.3, defaultValue: "0.15" },
      { name: "SGOT / AST", unit: "U/L", referenceRange: "5.0 - 40.0", lowThreshold: 5.0, highThreshold: 40.0, defaultValue: "28" },
      { name: "SGPT / ALT", unit: "U/L", referenceRange: "7.0 - 56.0", lowThreshold: 7.0, highThreshold: 56.0, defaultValue: "32" },
      { name: "Alkaline Phosphatase (ALP)", unit: "U/L", referenceRange: "44.0 - 147.0", lowThreshold: 44.0, highThreshold: 147.0, defaultValue: "86" },
      { name: "Total Protein", unit: "g/dL", referenceRange: "6.0 - 8.3", lowThreshold: 6.0, highThreshold: 8.3, defaultValue: "7.1" },
      { name: "Serum Albumin", unit: "g/dL", referenceRange: "3.5 - 5.2", lowThreshold: 3.5, highThreshold: 5.2, defaultValue: "4.3" },
    ],
  },
  {
    id: "test_thyroid",
    name: "Thyroid Profile (Total T3, T4, TSH)",
    category: "Biochemistry",
    sampleType: "Serum (Red/Gold Top)",
    price: 450,
    tatHours: 4,
    parameters: [
      { name: "TSH (Thyroid Stimulating Hormone)", unit: "uIU/mL", referenceRange: "0.35 - 4.94", lowThreshold: 0.35, highThreshold: 4.94, defaultValue: "2.1" },
      { name: "Total Triiodothyronine (T3)", unit: "ng/mL", referenceRange: "0.8 - 2.0", lowThreshold: 0.8, highThreshold: 2.0, defaultValue: "1.2" },
      { name: "Total Thyroxine (T4)", unit: "ug/dL", referenceRange: "5.1 - 14.1", lowThreshold: 5.1, highThreshold: 14.1, defaultValue: "8.4" },
    ],
  },
  {
    id: "test_urine",
    name: "Urine Routine Examination",
    category: "Pathology",
    sampleType: "Midstream Urine (Sterile Cup)",
    price: 200,
    tatHours: 1,
    parameters: [
      { name: "Color & Appearance", unit: "", referenceRange: "Pale Yellow, Clear", defaultValue: "Pale Yellow, Clear" },
      { name: "Reaction (pH)", unit: "", referenceRange: "4.5 - 8.0", defaultValue: "6.0" },
      { name: "Specific Gravity", unit: "", referenceRange: "1.005 - 1.030", defaultValue: "1.018" },
      { name: "Urinary Protein (Albumin)", unit: "", referenceRange: "Nil", defaultValue: "Nil" },
      { name: "Urinary Glucose (Sugar)", unit: "", referenceRange: "Nil", defaultValue: "Nil" },
      { name: "Pus Cells", unit: "/HPF", referenceRange: "0 - 5", lowThreshold: 0, highThreshold: 5, defaultValue: "1 - 2" },
      { name: "Red Blood Cells", unit: "/HPF", referenceRange: "Nil", defaultValue: "Nil" },
      { name: "Epithelial Cells", unit: "/HPF", referenceRange: "Few", defaultValue: "1 - 3" },
    ],
  },
  {
    id: "test_xray_chest",
    name: "Chest X-Ray (PA View)",
    category: "Radiology",
    sampleType: "Digital Radiography",
    price: 350,
    tatHours: 1,
    parameters: [
      { name: "Lung Fields", unit: "", referenceRange: "Normal radiolucency, no focal infiltrate", defaultValue: "Clear bilaterally without consolidation or pneumothorax" },
      { name: "Cardiac Silhouette", unit: "", referenceRange: "Cardiothoracic ratio < 50%", defaultValue: "Normal size and contour" },
      { name: "Costophrenic Angles", unit: "", referenceRange: "Sharp and clear", defaultValue: "Sharp bilaterally" },
      { name: "Bony Cage & Soft Tissues", unit: "", referenceRange: "Intact", defaultValue: "Normal thoracic spine and rib cage" },
    ],
  },
  {
    id: "test_ecg",
    name: "12-Lead Electrocardiogram (ECG)",
    category: "General",
    sampleType: "Electrophysiology Tracing",
    price: 250,
    tatHours: 0.5,
    parameters: [
      { name: "Rhythm & Rate", unit: "BPM", referenceRange: "Normal Sinus Rhythm (60 - 100)", defaultValue: "Normal Sinus Rhythm at 74 bpm" },
      { name: "PR Interval", unit: "sec", referenceRange: "0.12 - 0.20", defaultValue: "0.16 sec" },
      { name: "QRS Duration", unit: "sec", referenceRange: "0.06 - 0.10", defaultValue: "0.08 sec" },
      { name: "ST-T Segment", unit: "", referenceRange: "Isoelectric", defaultValue: "No acute ST elevation or depression" },
    ],
  },
];

export function checkParameterAbnormal(val: string, low?: number, high?: number): boolean {
  if (low === undefined && high === undefined) return false;
  const num = parseFloat(val);
  if (isNaN(num)) return false;
  if (low !== undefined && num < low) return true;
  if (high !== undefined && num > high) return true;
  return false;
}
