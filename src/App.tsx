import React, { useState, useEffect } from "react";
import { StoreProvider, useStore } from "./store/store";
import { ThemeProvider } from "./store/theme";
import { isOverseer, planAllowsMultiBranch } from "./store/types";
import { canAccessPage, getRoleHome } from "./utils/permissions";
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

const Inner: React.FC = () => {
  const { currentUser, flags, staffPlan, customStaffPlanLimits } = useStore();
  const [page, setPage] = useState<PageId>(() => getRoleHome(currentUser?.role));
  const [invoiceFocus, setInvoiceFocus] = useState<string | null>(null);
  const [inventoryFilter, setInventoryFilter] = useState<string | null>(null);
  const [focusedPatientId, setFocusedPatientId] = useState<string | null>(null);
  const [focusedUhid, setFocusedUhid] = useState<string | null>(null);

  // Automatically transition to the user's role-dedicated workstation upon login / role switch
  useEffect(() => {
    if (currentUser?.role && !canAccessPage(currentUser.role, page)) {
      setPage(getRoleHome(currentUser.role));
    }
  }, [currentUser?.role, page]);

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
  // Clinicians & nurses are completely prevented from loading financial/inventory views
  if (!canAccessPage(currentUser.role, page)) {
    const roleHome = getRoleHome(currentUser.role);
    setPage(roleHome);
    return null;
  }
  // Audit and branches are overseer-only (super admin / developer)
  if ((page === "audit" || page === "branches") && !isOverseer(currentUser.role)) {
    setPage(getRoleHome(currentUser.role));
    return null;
  }
  // Branches tab / multi-branch tools are Full roster (option 4) or Option 5 with super admin
  if (page === "branches" && !planAllowsMultiBranch(staffPlan, customStaffPlanLimits)) {
    setPage(getRoleHome(currentUser.role));
    return null;
  }
  // Users is admin/overseer only; Settings is open to staff too (branch payment settings)
  if (page === "users" && currentUser.role !== "admin" && !isOverseer(currentUser.role)) {
    setPage(getRoleHome(currentUser.role));
    return null;
  }
  // GRN module disabled by developer toggle
  if (!flags.grnModule && (page === "purchases" || page === "grn" || page === "approvedGrn")) {
    setPage(getRoleHome(currentUser.role));
    return null;
  }
  // Audit hidden when logging is disabled
  if (!flags.auditEnabled && page === "audit") {
    setPage(getRoleHome(currentUser.role));
    return null;
  }

  let content: React.ReactNode;
  switch (page) {
    case "reception":
      content = (
        <Reception
          onNavigateToDoctor={(pId) => {
            if (canAccessPage(currentUser?.role, "doctorDashboard")) {
              setFocusedPatientId(pId);
              setPage("doctorDashboard");
            }
          }}
          onNavigateToNurse={(pId) => {
            if (canAccessPage(currentUser?.role, "nursingStation")) {
              setFocusedPatientId(pId);
              setPage("nursingStation");
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
    case "doctorDashboard":
      content = (
        <DoctorDashboard
          initialPatientId={focusedPatientId || undefined}
          onNavigateToPharmacy={() => {
            if (canAccessPage(currentUser?.role, "billing")) {
              setPage("billing");
            }
          }}
          onNavigateToLab={() => {
            if (canAccessPage(currentUser?.role, "diagnosticLab")) {
              setPage("diagnosticLab");
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
    case "nursingStation":
      content = (
        <NursingStation
          initialPatientId={focusedPatientId || undefined}
          onNavigateToDoctor={(pId) => {
            if (canAccessPage(currentUser?.role, "doctorDashboard")) {
              setFocusedPatientId(pId);
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
    case "diagnosticLab":
      content = (
        <DiagnosticLab
          onNavigateToBilling={() => {
            if (canAccessPage(currentUser?.role, "billing")) {
              setPage("billing");
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
    case "visitTrail":
      content = (
        <VisitTrail
          initialUhid={focusedUhid || undefined}
          onNavigateToBilling={(pId) => {
            if (canAccessPage(currentUser?.role, "billing")) {
              setPage("billing");
            }
          }}
        />
      );
      break;
    case "dashboard":
      content = <Dashboard setPage={setPage} onOpenInvoice={openInvoice} onOpenInventory={openInventory} />;
      break;
    case "billing":
      content = <Billing />;
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
    case "reports":
      content = <Reports />;
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

  return <Layout page={page} setPage={setPage}>{content}</Layout>;
};

const App: React.FC = () => (
  <ThemeProvider>
    <StoreProvider>
      <Inner />
    </StoreProvider>
  </ThemeProvider>
);

export default App;
