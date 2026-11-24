import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/store";
import { useTheme } from "../store/theme";
import { cn } from "../utils/cn";
import { isOverseer, planAllowsMultiBranch } from "../store/types";
import type { ErpModuleId, UserRole, ClinicalAlert } from "../store/types";
import { canAccessPage, canAccessModule, getRoleBadgeInfo } from "../utils/permissions";
import RibbonBar, { ERP_TABS_CONFIG } from "./RibbonBar";
import realtimeSync from "../services/realtime";
import {
  Menu,
  X,
  Clock,
  Building,
  User,
  Shield,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  Network,
  CheckCircle,
  AlertCircle,
  Bell,
  Sparkles,
  Activity,
  Package,
  Navigation,
  Wrench,
  FileText,
  Award,
  Receipt,
  FlaskConical,
  Bed,
  Stethoscope,
  HeartPulse,
  Pill,
  DollarSign,
  Search,
  Radio,
  Sliders,
  ChevronRight,
  Eye,
  CheckSquare,
} from "lucide-react";
import logoUrl from "../assets/logo.png";

export type PageId =
  | "reception"
  | "doctorDashboard"
  | "nursingStation"
  | "diagnosticLab"
  | "visitTrail"
  | "dashboard"
  | "billing"
  | "invoices"
  | "patients"
  | "doctors"
  | "inventory"
  | "purchases"
  | "grn"
  | "approvedGrn"
  | "salesReturn"
  | "returns"
  | "suppliers"
  | "reports"
  | "audit"
  | "users"
  | "settings"
  | "branches"
  | "privacy"
  | "patient"
  | "doctor"
  | "nurse"
  | "lab"
  | "pharmacy"
  | "cashier"
  | "maintenance"
  | "accounts"
  | "certificate"
  | "equipments"
  | "admin"
  | "physiotherapy"
  | "store"
  | "ambulance"
  | "skin";

export interface LayoutProps {
  activeModule?: ErpModuleId;
  setActiveModule?: (m: ErpModuleId) => void;
  activeAction?: string;
  onRibbonActionClick?: (moduleId: ErpModuleId, actionId: string, dropdownOption?: string) => void;
  page?: PageId;
  setPage?: (p: PageId) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeModule = "patient",
  setActiveModule,
  activeAction = "",
  onRibbonActionClick,
  page,
  setPage,
  children,
}) => {
  const {
    currentUser,
    setCurrentUser,
    users,
    data,
    logout,
    viewBranchId,
    setViewBranchId,
    staffPlan,
    customStaffPlanLimits,
  } = useStore();

  const multiBranch = planAllowsMultiBranch(staffPlan, customStaffPlanLimits);
  const { theme, toggle } = useTheme();

  // Collapsible Hamburger Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchModuleQuery, setSearchModuleQuery] = useState("");

  // Real-Time Synchronization State
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const alertsDropdownRef = useRef<HTMLDivElement>(null);

  // Optional ribbon action bar toggle (collapsed by default for space-constrained terminals)
  const [showToolRibbon, setShowToolRibbon] = useState(false);

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update WebSocket user context & subscribe to real-time events
  useEffect(() => {
    realtimeSync.updateUserContext(currentUser?.role, currentUser?.id, currentUser?.name);

    const unsubAlerts = realtimeSync.subscribeAlerts((incomingAlerts) => {
      setAlerts(incomingAlerts);
    });

    const unsubStatus = realtimeSync.subscribeStatus((connected) => {
      setIsWsConnected(connected);
    });

    return () => {
      unsubAlerts();
      unsubStatus();
    };
  }, [currentUser]);

  // Click away to close alerts dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alertsDropdownRef.current && !alertsDropdownRef.current.contains(e.target as Node)) {
        setShowAlertsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const roleBadge = getRoleBadgeInfo(currentUser?.role);

  // Active Branch
  const currentBranch =
    data.branches.find((b) => b.id === (viewBranchId || currentUser?.branchId)) ||
    data.branches[0] || {
      id: "BR-01",
      name: "Cura Tech Central Hospital",
      city: "Chennai",
      code: "CURA-MAIN",
    };

  const handleSelectModule = (modId: ErpModuleId) => {
    if (setActiveModule) {
      setActiveModule(modId);
    } else if (setPage) {
      setPage(modId as PageId);
    }
    setIsMenuOpen(false);
  };

  const handleRibbonAction = (modId: ErpModuleId, actId: string, dropdownOpt?: string) => {
    if (onRibbonActionClick) {
      onRibbonActionClick(modId, actId, dropdownOpt);
    } else if (setActiveModule) {
      setActiveModule(modId);
    }
  };

  // Filter modules based on authenticated user's role
  const authorizedModules = ERP_TABS_CONFIG.filter((m) => canAccessModule(currentUser?.role, m.id));
  const filteredNavModules = authorizedModules.filter((m) =>
    m.label.toLowerCase().includes(searchModuleQuery.toLowerCase())
  );

  // Unread critical alerts count
  const criticalAlertsCount = alerts.filter((a) => a.severity === "CRITICAL").length;

  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Role Workstation Title
  const getWorkstationTitle = () => {
    switch (currentUser?.role) {
      case "doctor":
        return "Attending Physician Workstation";
      case "nurse":
        return "Nursing Care Terminal";
      case "receptionist":
        return "Front-Desk Patient Intake & Billing";
      case "lab_tech":
        return "Diagnostic Laboratory Terminal";
      case "staff_pharmacist":
      case "admin_pharmacist":
        return "Central Pharmacy Dispensing";
      case "cashier":
        return "Hospital Cashier & POS Terminal";
      case "accountant":
        return "Hospital Accounts & Ledger Suite";
      case "maintenance":
        return "Biomedical & Facility Engineering";
      case "physiotherapy":
        return "Rehabilitation & Physio Clinic";
      case "store_manager":
        return "Central Store & Supply Indents";
      case "ambulance":
        return "Emergency Trauma Fleet Terminal";
      case "skin_specialist":
        return "Dermatology & Laser Clinic";
      default:
        return "Unified Hospital Management Dashboard";
    }
  };

  return (
    <div className="h-screen [height:100dvh] flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors select-none">
      {/* ── 1. RESPONSIVE APP HEADER WITH HAMBURGER BUTTON & REAL-TIME SYNC ── */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 lg:px-4 py-2 z-30 transition-colors shrink-0 shadow-xs">
        <div className="flex items-center justify-between gap-2.5">
          {/* Left: Top-Left Collapsible Hamburger Menu Button + Brand & Workstation Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Hamburger Button with unread alert badge indicator */}
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-sky-500 shrink-0"
              title={isMenuOpen ? "Close Navigation Menu" : "Open Module Navigation Menu"}
              aria-label="Toggle Hamburger Menu"
            >
              {isMenuOpen ? <X className="w-5 h-5 text-rose-500" /> : <Menu className="w-5 h-5" />}
              {criticalAlertsCount > 0 && !isMenuOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800 animate-ping" />
              )}
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 shrink-0 rounded-xl bg-sky-600 text-white flex items-center justify-center font-extrabold shadow-sm overflow-hidden">
                <img src={logoUrl} alt="Cura Tech Logo" className="w-6 h-6 object-contain" />
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="font-extrabold tracking-tight text-slate-800 dark:text-slate-100 text-sm">
                  CURA<span className="text-sky-600 dark:text-sky-400">TECH</span>
                  <span className="text-[10px] ml-1.5 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                    HOSPITAL
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">{getWorkstationTitle()}</div>
              </div>
            </div>

            {/* Active Workstation Role Indicator Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 ml-1 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="capitalize truncate max-w-[140px] sm:max-w-none">{activeModule} Workstation</span>
            </div>

            {/* Optional Tool Ribbon Toggle Button (For space-constrained terminals) */}
            <button
              onClick={() => setShowToolRibbon((prev) => !prev)}
              className={cn(
                "hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                showToolRibbon
                  ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
              )}
              title="Toggle Detailed Action Tools Ribbon"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-500" />
              <span>{showToolRibbon ? "Hide Tools Ribbon" : "Action Tools"}</span>
            </button>
          </div>

          {/* Right: Real-Time Sync Indicator, Clinical Alert Bell, Branch, Theme, User */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Real-time WebSocket Connectivity Badge */}
            <div
              className={cn(
                "hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold border transition-all",
                isWsConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
              )}
              title={isWsConnected ? "Live WebSocket event bus connected" : "Connecting to real-time event bus..."}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  isWsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                )}
              />
              <span className="hidden lg:inline">{isWsConnected ? "Real-Time Sync" : "Reconnecting..."}</span>
            </div>

            {/* Real-Time Clinical Alert Bell with Dropdown */}
            <div className="relative" ref={alertsDropdownRef}>
              <button
                onClick={() => setShowAlertsDropdown((prev) => !prev)}
                className={cn(
                  "relative p-1.5 rounded-lg border transition",
                  criticalAlertsCount > 0
                    ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 animate-pulse"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                )}
                title="Clinical Alerts & Notifications"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full text-[9px] font-extrabold flex items-center justify-center text-white",
                      criticalAlertsCount > 0 ? "bg-rose-600 animate-bounce" : "bg-sky-600"
                    )}
                  >
                    {alerts.length}
                  </span>
                )}
              </button>

              {/* Alert Dropdown Panel */}
              {showAlertsDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-rose-500" />
                      Live Clinical Notifications ({alerts.length})
                    </div>
                    {alerts.length > 0 && (
                      <button
                        onClick={() => realtimeSync.clearAllAlerts()}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                    {alerts.length === 0 ? (
                      <div className="text-center py-6 text-slate-400">
                        <CheckCircle className="w-6 h-6 mx-auto mb-1 text-emerald-500/60" />
                        No active clinical alerts
                      </div>
                    ) : (
                      alerts.map((alt) => (
                        <div
                          key={alt.id}
                          className={cn(
                            "p-3 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition",
                            alt.severity === "CRITICAL" ? "bg-rose-50/40 dark:bg-rose-950/20" : ""
                          )}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-bold text-slate-800 dark:text-slate-100 leading-snug">
                              {alt.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {new Date(alt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {alt.message}
                          </p>
                          <div className="mt-2 flex justify-between items-center text-[10px] text-slate-400">
                            <span>Bed: {alt.bedNumber || "Ward"} • {alt.recordedBy}</span>
                            <button
                              onClick={() => realtimeSync.dismissAlert(alt.id)}
                              className="text-sky-600 hover:text-sky-700 font-semibold"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active Hospital Branch Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-xs">
              <Building className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                {currentBranch.name}
              </span>
              {multiBranch && (
                <select
                  value={viewBranchId || "all"}
                  onChange={(e) => setViewBranchId(e.target.value === "all" ? null : e.target.value)}
                  className="bg-transparent text-[11px] font-semibold text-sky-600 dark:text-sky-400 focus:outline-none cursor-pointer border-l pl-1 border-slate-200 dark:border-slate-700"
                  title="Switch Active Hospital Branch"
                >
                  <option value="all">All Branches</option>
                  {data.branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition text-slate-700 dark:text-slate-200 shrink-0"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Logged-In User Avatar with Role Badge */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
              <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block text-left text-xs leading-none">
                <div className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[110px]">
                  {currentUser?.name || currentUser?.username}
                </div>
                <div className="mt-0.5">
                  <span className={cn("text-[9px] font-bold px-1 py-0.2 rounded border whitespace-nowrap", roleBadge.badgeClass)}>
                    {roleBadge.badge}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Session Button */}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. COLLAPSIBLE HAMBURGER MENU DRAWER (ADAPTS TO ALL DEVICE FORM FACTORS) ── */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Slide-out Drawer Container */}
          <div className="relative z-50 w-84 max-w-[85vw] h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Top Branding Bar */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    C
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 leading-tight">
                      Cura Tech Navigation
                    </h3>
                    <p className="text-[10px] text-slate-500">Hospital Role-Based Ecosystem</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  title="Close Menu"
                >
                  <X className="w-5 h-5 text-rose-500" />
                </button>
              </div>

              {/* ── DATE-STAMP WITH LIVE DIGITAL CLOCK INSIDE HAMBURGER MENU ── */}
              <div className="p-3.5 bg-gradient-to-br from-sky-50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  Live Hospital System Time
                </div>
                <div className="text-xl font-mono font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                  {formattedTime}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  {formattedDate}
                </div>
              </div>

              {/* ── LOGGED-IN USER & ACTIVE BRANCH CARD INSIDE HAMBURGER MENU ── */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                {/* User Card */}
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-full bg-sky-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {currentUser?.name || currentUser?.username}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">@{currentUser?.username}</div>
                    <div className="mt-1">
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block", roleBadge.badgeClass)}>
                        {roleBadge.badge}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Branch Card */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-sky-500" /> Active Facility:
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-bold">
                      {currentBranch.code}
                    </span>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {currentBranch.name} ({currentBranch.city})
                  </div>

                  {multiBranch && (
                    <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-800">
                      <select
                        value={viewBranchId || "all"}
                        onChange={(e) => setViewBranchId(e.target.value === "all" ? null : e.target.value)}
                        className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 mt-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="all">All Hospital Branches</option>
                        {data.branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* ── SEARCH INPUT FOR SPACE-CONSTRAINED TERMINALS ── */}
              <div className="p-3 pb-1">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search accessible modules..."
                    value={searchModuleQuery}
                    onChange={(e) => setSearchModuleQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* ── DYNAMIC ROLE-BASED MODULE LIST (RBAC ENFORCED) ── */}
              <div className="p-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex justify-between items-center">
                  <span>Authorized Workstations</span>
                  <span className="font-mono text-sky-600">{filteredNavModules.length} Active</span>
                </div>
                <div className="space-y-1 max-h-[35vh] overflow-y-auto px-1 pr-1.5">
                  {filteredNavModules.map((mod) => {
                    const ModIcon = mod.icon;
                    const isSelected = activeModule === mod.id;

                    return (
                      <button
                        key={mod.id}
                        onClick={() => handleSelectModule(mod.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition text-left",
                          isSelected
                            ? "bg-sky-600 text-white font-bold shadow-sm"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ModIcon className={cn("w-4 h-4 shrink-0", isSelected ? "text-white" : "text-sky-500")} />
                          <span className="truncate">{mod.label} Module</span>
                        </div>
                        {isSelected ? (
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0"></span>
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer with Quick Role Preview & Sign Out */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-2">
              {/* Quick Role Tester for Developer & Superadmin */}
              {isOverseer(currentUser?.role) && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Quick Role Switcher (Admin Oversight)
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {[
                      { r: "doctor", label: "Doctor" },
                      { r: "nurse", label: "Nurse" },
                      { r: "receptionist", label: "Reception" },
                      { r: "lab_tech", label: "Lab Tech" },
                      { r: "staff_pharmacist", label: "Pharmacy" },
                      { r: "cashier", label: "Cashier" },
                      { r: "maintenance", label: "Maintenance" },
                      { r: "admin", label: "Admin" },
                    ].map((item) => (
                      <button
                        key={item.r}
                        onClick={() => {
                          const targetUser = users.find((u) => u.role === item.r);
                          if (targetUser) {
                            setCurrentUser(targetUser);
                          } else if (currentUser) {
                            setCurrentUser({ ...currentUser, role: item.r as UserRole });
                          }
                          setIsMenuOpen(false);
                        }}
                        className="py-1 px-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-sky-50 dark:hover:bg-sky-950 transition text-center truncate"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sign out button */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. DETAILED ACTION TOOLS RIBBON (TOGGLEABLE OR COMPACT TO PREVENT STATIC TOP-BAR OVERFLOW) ── */}
      {showToolRibbon && (
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
          <RibbonBar
            activeModule={activeModule}
            onSelectModule={handleSelectModule}
            onActionClick={handleRibbonAction}
            activeAction={activeAction}
          />
        </div>
      )}

      {/* ── 4. MAIN VIEWPORT (DEDICATED ROLE WORKSTATION CONTAINER) ── */}
      <main className="flex-1 min-h-0 p-3 lg:p-4 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
