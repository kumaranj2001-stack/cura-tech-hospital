import React, { useState, useEffect } from "react";
import { useStore } from "../store/store";
import { useTheme } from "../store/theme";
import { cn } from "../utils/cn";
import { isOverseer, planAllowsMultiBranch } from "../store/types";
import type { ErpModuleId, UserRole } from "../store/types";
import { canAccessPage, canAccessModule, getRoleBadgeInfo } from "../utils/permissions";
import RibbonBar, { ERP_TABS_CONFIG } from "./RibbonBar";
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
  Box,
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
    cloudSyncing,
    cloudError,
    cloudReady,
    viewBranchId,
    setViewBranchId,
    staffPlan,
    customStaffPlanLimits,
  } = useStore();

  const multiBranch = planAllowsMultiBranch(staffPlan, customStaffPlanLimits);
  const { theme, toggle } = useTheme();

  // Collapsible Hamburger Drawer State
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Live Digital Clock with seconds
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const roleBadge = getRoleBadgeInfo(currentUser?.role);

  // Active Branch Display
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

  return (
    <div className="h-screen [height:100dvh] flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors select-none">
      {/* ── 1. TOP APP HEADER WITH HAMBURGER BUTTON & USER/BRANCH INDICATORS ── */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 lg:px-4 py-2 z-30 transition-colors shrink-0 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Top-Left Collapsible Hamburger Menu Button + Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-sky-500"
              title={isMenuOpen ? "Close Navigation Menu" : "Open ERP Menu"}
              aria-label="Toggle Hamburger Menu"
            >
              {isMenuOpen ? <X className="w-5 h-5 text-rose-500" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-sky-600 text-white flex items-center justify-center font-extrabold shadow-sm overflow-hidden">
                <img src={logoUrl} alt="Cura Tech Logo" className="w-6 h-6 object-contain" />
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="font-extrabold tracking-tight text-slate-800 dark:text-slate-100 text-sm">
                  CURA<span className="text-sky-600 dark:text-sky-400">TECH</span>
                  <span className="text-[10px] ml-1.5 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                    HOSPITAL ERP
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Enterprise Multispecialty Suite</div>
              </div>
            </div>

            {/* Active Module Title Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 ml-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="capitalize">{activeModule} Module</span>
            </div>
          </div>

          {/* Center / Right: Branch Indicator, Live Date-Stamp, Theme & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Active Branch Indicator with Quick Switcher */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-xs">
              <Building className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="font-medium text-slate-500 dark:text-slate-400">Branch:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                {currentBranch.name}
              </span>
              {multiBranch && (
                <select
                  value={viewBranchId || "all"}
                  onChange={(e) => setViewBranchId(e.target.value === "all" ? null : e.target.value)}
                  className="bg-transparent text-[11px] font-semibold text-sky-600 dark:text-sky-400 focus:outline-none cursor-pointer border-l pl-1.5 border-slate-200 dark:border-slate-700"
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

            {/* Live Clock & Date Indicator Header Pill */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{formattedTime}</span>
            </div>

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggle}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition text-slate-700 dark:text-slate-200"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Logged-in User Pill */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
              <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center">
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

            {/* Direct Logout */}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. TOP-LEFT COLLAPSIBLE SLIDE-OUT HAMBURGER MENU DRAWER ── */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Slide-out Drawer Container */}
          <div className="relative z-50 w-80 max-w-[85vw] h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
                    C
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 leading-tight">
                      Cura Tech Navigation
                    </h3>
                    <p className="text-[10px] text-slate-500">Hospital ERP Master Console</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── DATE-STAMP WITH LIVE DIGITAL CLOCK INSIDE HAMBURGER MENU ── */}
              <div className="p-3.5 bg-gradient-to-br from-sky-50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  Live Hospital System Time
                </div>
                <div className="text-lg font-mono font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                  {formattedTime}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                  {formattedDate}
                </div>
              </div>

              {/* ── LOGGED-IN USER & BRANCH INDICATOR INSIDE HAMBURGER MENU ── */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                {/* User Card */}
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
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

                {/* Active Branch Indicator Card */}
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-sky-500" /> Logged-In Branch:
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      {currentBranch.code}
                    </Badge>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {currentBranch.name} ({currentBranch.city})
                  </div>

                  {multiBranch && (
                    <div className="pt-1.5 border-t border-slate-200/50 dark:border-slate-800">
                      <Label className="text-[10px] text-slate-400">Switch Active Branch View:</Label>
                      <select
                        value={viewBranchId || "all"}
                        onChange={(e) => setViewBranchId(e.target.value === "all" ? null : e.target.value)}
                        className="w-full text-xs p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 mt-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
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

              {/* ── SEVENTEEN TOP-LEVEL ERP MODULE LAUNCHER ── */}
              <div className="p-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Hospital ERP Role Modules (17)
                </div>
                <div className="space-y-0.5 max-h-[38vh] overflow-y-auto px-1">
                  {ERP_TABS_CONFIG.map((mod) => {
                    const ModIcon = mod.icon;
                    const isSelected = activeModule === mod.id;
                    const hasAccess = canAccessModule(currentUser?.role, mod.id);

                    return (
                      <button
                        key={mod.id}
                        onClick={() => handleSelectModule(mod.id)}
                        disabled={!hasAccess}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition",
                          isSelected
                            ? "bg-sky-600 text-white font-bold shadow-xs"
                            : hasAccess
                            ? "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                            : "text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ModIcon className={cn("w-4 h-4 shrink-0", isSelected ? "text-white" : "text-sky-500")} />
                          <span className="truncate">{mod.label}</span>
                        </div>
                        {hasAccess ? (
                          isSelected ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          ) : (
                            <span className="text-[10px] text-slate-400">→</span>
                          )
                        ) : (
                          <span className="text-[9px] text-rose-500 font-mono">Restricted</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer with Quick Role Switcher (Admin/Demo) & Logout */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-2">
              {/* Quick Role Tester for Developer & Superadmin */}
              {isOverseer(currentUser?.role) && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Quick Role Switcher (Overseer)
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
                        className="py-1 px-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-sky-50 dark:hover:bg-sky-950 transition text-center truncate"
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
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. SEVENTEEN TOP-LEVEL MODULE TABS & DESKTOP RIBBON ACTION BAR ── */}
      <RibbonBar
        activeModule={activeModule}
        onSelectModule={handleSelectModule}
        onActionClick={handleRibbonAction}
        activeAction={activeAction}
      />

      {/* ── 4. MAIN VIEWPORT (MODULE WORKSTATION CONTAINER) ── */}
      <main className="flex-1 min-h-0 p-3 lg:p-4 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
