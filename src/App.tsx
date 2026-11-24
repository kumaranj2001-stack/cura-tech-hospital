import React, { useState, useEffect } from "react";
import { StoreProvider, useStore } from "./store/store";
import { ThemeProvider } from "./store/theme";
import { isOverseer, planAllowsMultiBranch } from "./store/types";
import type { ErpModuleId } from "./store/types";
import { canAccessPage, canAccessModule, getRoleHome, getRoleDefaultModule } from "./utils/permissions";
import Login from "./pages/Login";
import Layout, { type PageId } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Reception from "./pages/Reception";
import DoctorDashboard from "./pages/DoctorDashboard";
import NursingStation from "./pages/NursingStation";
import DiagnosticLab from "./pages/DiagnosticLab";
import VisitTrail from "./pages/VisitTrail";
import Billing from "./pages/Billing";
import Invoices from "./pages/Invoices";
import Patients from "./pages/Patients";
import Doctors from "./pages/Doctors";
import Inventory from "./pages/Inventory";
import Purchases from "./pages/Purchases";
import GRN from "./pages/GRN";
import { ApprovedGrn } from "./pages/ApprovedGrn";
import SalesReturn from "./pages/SalesReturn";
import Returns from "./pages/Returns";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Branches from "./pages/Branches";
import Privacy from "./pages/Privacy";

// Seventeen Role-ERP Specialty Modules
import LabERP from "./pages/LabERP";
import CashierERP from "./pages/CashierERP";
import AccountsERP from "./pages/AccountsERP";
import ReportsERP from "./pages/ReportsERP";
import CertificateERP from "./pages/CertificateERP";
import EquipmentsERP from "./pages/EquipmentsERP";
import AdminERP from "./pages/AdminERP";
import PhysiotherapyERP from "./pages/PhysiotherapyERP";
import StoreERP from "./pages/StoreERP";
import AmbulanceERP from "./pages/AmbulanceERP";
import SkinERP from "./pages/SkinERP";
import MaintenanceERP from "./pages/MaintenanceERP";

const Inner: React.FC = () => {
  const { currentUser, flags, staffPlan, customStaffPlanLimits } = useStore();

  const [activeErpModule, setActiveErpModule] = useState<ErpModuleId>(() =>
    getRoleDefaultModule(currentUser?.role)
  );
  const [activeAction, setActiveAction] = useState<string>("");
  const [activeDropdownOption, setActiveDropdownOption] = useState<string | undefined>(undefined);

  const [page, setPage] = useState<PageId>(() => getRoleHome(currentUser?.role));
  const [invoiceFocus, setInvoiceFocus] = useState<string | null>(null);
  const [inventoryFilter, setInventoryFilter] = useState<string | null>(null);
  const [focusedPatientId, setFocusedPatientId] = useState<string | null>(null);
  const [focusedUhid, setFocusedUhid] = useState<string | null>(null);

  // Automatically transition to the user's role-dedicated workstation upon login / role switch
  useEffect(() => {
    if (currentUser?.role) {
      const defaultMod = getRoleDefaultModule(currentUser.role);
      setActiveErpModule(defaultMod);
      const defaultPage = getRoleHome(currentUser.role);
      setPage(defaultPage);
    }
  }, [currentUser?.role]);

  const handleSelectModule = (modId: ErpModuleId) => {
    if (!canAccessModule(currentUser?.role, modId)) return;
    setActiveErpModule(modId);
    setActiveAction("");
    setActiveDropdownOption(undefined);
    setPage(modId as PageId);
  };

  const handleRibbonAction = (modId: ErpModuleId, actId: string, dropdownOpt?: string) => {
    if (!canAccessModule(currentUser?.role, modId)) return;
    setActiveErpModule(modId);
    setActiveAction(actId);
    setActiveDropdownOption(dropdownOpt);
    setPage(modId as PageId);
  };

  const openInvoice = (id: string) => {
    if (canAccessPage(currentUser?.role, "invoices")) {
      setInvoiceFocus(id);
      setPage("invoices");
    }
  };

  const openInventory = (filter?: string) => {
    if (canAccessPage(currentUser?.role, "inventory")) {
      setInventoryFilter(filter || null);
      setPage("inventory");
    }
  };

  if (!currentUser) return <Login />;

  // Strict Role-Based Access Control (RBAC) Route Guard
  const isAdministrative =
    isOverseer(currentUser.role) || currentUser.role === "admin" || currentUser.role === "admin_pharmacist";

  if ((page === "audit" || page === "branches") && !isAdministrative) {
    setPage(getRoleHome(currentUser.role));
    return null;
  }
  if (page === "branches" && !planAllowsMultiBranch(staffPlan, customStaffPlanLimits)) {
    setPage(getRoleHome(currentUser.role));
    return null;
  }
  if (page === "users" && !isAdministrative) {
    setPage(getRoleHome(currentUser.role));
    return null;
  }
  if (!flags.grnModule && (page === "purchases" || page === "grn" || page === "approvedGrn")) {
    setPage(getRoleHome(currentUser.role));
    return null;
  }
  if (!flags.auditEnabled && page === "audit") {
    setPage(getRoleHome(currentUser.role));
    return null;
  }

  let content: React.ReactNode;
  switch (page) {
    // 1. Patient Module
    case "patient":
    case "reception":
      content = (
        <Reception
          onNavigateToDoctor={(pId) => {
            if (canAccessModule(currentUser?.role, "doctor")) {
              setFocusedPatientId(pId);
              setActiveErpModule("doctor");
              setPage("doctorDashboard");
            }
          }}
          onNavigateToNurse={(pId) => {
            if (canAccessModule(currentUser?.role, "nurse")) {
              setFocusedPatientId(pId);
              setActiveErpModule("nurse");
              setPage("nursingStation");
            }
          }}
          onNavigateToVisitTrail={(uhid) => {
            if (canAccessPage(currentUser?.role, "visitTrail")) {
              setFocusedUhid(uhid);
              setPage("visitTrail");
            }
          }}
          onNavigateToBilling={(pId) => {
            if (canAccessModule(currentUser?.role, "cashier") || canAccessPage(currentUser?.role, "billing")) {
              setFocusedPatientId(pId);
              setPage("billing");
            }
          }}
        />
      );
      break;

    // 2. Doctor Module
    case "doctor":
    case "doctorDashboard":
      content = (
        <DoctorDashboard
          initialPatientId={focusedPatientId || undefined}
          onNavigateToPharmacy={() => {
            if (canAccessModule(currentUser?.role, "pharmacy")) {
              setActiveErpModule("pharmacy");
              setPage("billing");
            }
          }}
          onNavigateToLab={() => {
            if (canAccessModule(currentUser?.role, "lab")) {
              setActiveErpModule("lab");
              setPage("lab");
            }
          }}
          onNavigateToVisitTrail={(uhid) => {
            if (canAccessPage(currentUser?.role, "visitTrail")) {
              setFocusedUhid(uhid);
              setPage("visitTrail");
            }
          }}
        />
      );
      break;

    // 3. Nurse Module
    case "nurse":
    case "nursingStation":
      content = (
        <NursingStation
          initialPatientId={focusedPatientId || undefined}
          onNavigateToDoctor={(pId) => {
            if (canAccessModule(currentUser?.role, "doctor")) {
              setFocusedPatientId(pId);
              setActiveErpModule("doctor");
              setPage("doctorDashboard");
            }
          }}
          onNavigateToVisitTrail={(uhid) => {
            if (canAccessPage(currentUser?.role, "visitTrail")) {
              setFocusedUhid(uhid);
              setPage("visitTrail");
            }
          }}
        />
      );
      break;

    // 4. Lab Module
    case "lab":
    case "diagnosticLab":
      content = (
        <LabERP
          initialAction={activeAction || "lab_dashboard"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 5. Pharmacy Module
    case "pharmacy":
    case "billing":
      content = <Billing initialPatientId={focusedPatientId || undefined} />;
      break;

    // 6. Cashier Module
    case "cashier":
      content = (
        <CashierERP
          initialAction={activeAction || "cashier_dash"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 7. Maintenance Module
    case "maintenance":
      content = (
        <MaintenanceERP
          initialAction={activeAction || "work_orders"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 8. Accounts Module
    case "accounts":
      content = (
        <AccountsERP
          initialAction={activeAction || "final_cash_close"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 9. Reports Module
    case "reports":
      content = (
        <ReportsERP
          initialAction={activeAction || "rep_visit_details"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 10. Certificate Module
    case "certificate":
      content = (
        <CertificateERP
          initialAction={activeAction || "cert_birth"}
          subTypeOption={activeDropdownOption}
        />
      );
      break;

    // 11. Equipments Module
    case "equipments":
      content = (
        <EquipmentsERP
          initialAction={activeAction || "eq_dashboard"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 12. Admin Module
    case "admin":
      content = (
        <AdminERP
          initialAction={activeAction || "create_user"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 13. Physiotherapy Module
    case "physiotherapy":
      content = (
        <PhysiotherapyERP
          initialAction={activeAction || "physio_sales"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 14. Store Module
    case "store":
      content = (
        <StoreERP
          initialAction={activeAction || "store_sales"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 15. Ambulance Module
    case "ambulance":
      content = (
        <AmbulanceERP
          initialAction={activeAction || "amb_allotment"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 16. Skin Module
    case "skin":
      content = (
        <SkinERP
          initialAction={activeAction || "skin_consultation"}
          dropdownOption={activeDropdownOption}
        />
      );
      break;

    // 17. Dashboard Module
    case "dashboard":
      content = <Dashboard setPage={setPage} onOpenInvoice={openInvoice} onOpenInventory={openInventory} />;
      break;

    // Legacy & Sub-views
    case "visitTrail":
      content = (
        <VisitTrail
          initialUhid={focusedUhid || undefined}
          onNavigateToBilling={(pId) => {
            if (canAccessPage(currentUser?.role, "billing")) {
              setFocusedPatientId(pId);
              setPage("billing");
            }
          }}
        />
      );
      break;
    case "invoices":
      content = <Invoices focusId={invoiceFocus} onConsumeFocus={() => setInvoiceFocus(null)} />;
      break;
    case "patients":
      content = <Patients />;
      break;
    case "doctors":
      content = <Doctors />;
      break;
    case "inventory":
      content = <Inventory initialFilter={inventoryFilter as any} onConsumeFilter={() => setInventoryFilter(null)} />;
      break;
    case "purchases":
      content = <Purchases />;
      break;
    case "grn":
      content = <GRN />;
      break;
    case "approvedGrn":
      content = <ApprovedGrn />;
      break;
    case "salesReturn":
      content = <SalesReturn />;
      break;
    case "returns":
      content = <Returns />;
      break;
    case "suppliers":
      content = <Suppliers />;
      break;
    case "audit":
      content = <Audit />;
      break;
    case "users":
      content = <Users />;
      break;
    case "branches":
      content = <Branches />;
      break;
    case "settings":
      content = <Settings />;
      break;
    case "privacy":
      content = <Privacy />;
      break;
    default:
      content = <Reception />;
  }

  return (
    <Layout
      activeModule={activeErpModule}
      setActiveModule={handleSelectModule}
      activeAction={activeAction}
      onRibbonActionClick={handleRibbonAction}
      page={page}
      setPage={setPage}
    >
      {content}
    </Layout>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <StoreProvider>
      <Inner />
    </StoreProvider>
  </ThemeProvider>
);

export default App;
