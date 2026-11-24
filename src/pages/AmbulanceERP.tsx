import React, { useState } from "react";
import { useStore } from "../store/store";
import { Card, CardHeader, CardBody, Button, Input, Label, Select, Badge, Modal } from "../components/ui";
import { fmtDate, fmtDateTime, flashToast } from "../utils/helpers";
import type { AmbulanceVehicle, AmbulanceTrip } from "../store/types";
import {
  Navigation,
  Wrench,
  Activity,
  Phone,
  Gauge,
  Droplet,
  Fuel,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Printer,
  Plus,
  ShieldCheck,
  Search,
  DollarSign,
  User,
} from "lucide-react";

const INITIAL_VEHICLES: AmbulanceVehicle[] = [
  {
    id: "VEH-1",
    vehicleNumber: "TN 01 AB 1008",
    type: "Advanced Life Support (ALS)",
    status: "available",
    driverName: "S. Murugan",
    driverPhone: "+91 98840 12345",
    paramedicName: "Sister Geetha, EMT",
    oxygenLevelPercent: 96,
    currentOdometer: 42150,
    fuelLevel: "Full",
    lastServiceDate: "2026-10-10",
    fitnessValidUntil: "2027-04-30",
  },
  {
    id: "VEH-2",
    vehicleNumber: "TN 01 CD 2040",
    type: "Advanced Life Support (ALS)",
    status: "on_trip",
    driverName: "K. Ramesh",
    driverPhone: "+91 98841 23456",
    paramedicName: "Brother Anand, EMT",
    oxygenLevelPercent: 88,
    currentOdometer: 58200,
    fuelLevel: "3/4",
    lastServiceDate: "2026-09-28",
    fitnessValidUntil: "2027-02-15",
  },
  {
    id: "VEH-3",
    vehicleNumber: "TN 01 EF 3055",
    type: "Basic Life Support (BLS)",
    status: "available",
    driverName: "M. Selvam",
    driverPhone: "+91 98842 34567",
    paramedicName: "Sister Mary, EMT",
    oxygenLevelPercent: 92,
    currentOdometer: 31400,
    fuelLevel: "Full",
    lastServiceDate: "2026-10-05",
    fitnessValidUntil: "2027-06-30",
  },
  {
    id: "VEH-4",
    vehicleNumber: "TN 01 GH 4088",
    type: "Neonatal Transport",
    status: "maintenance",
    driverName: "P. Vignesh",
    driverPhone: "+91 98843 45678",
    paramedicName: "Sister Priya, NICU",
    oxygenLevelPercent: 70,
    currentOdometer: 24600,
    fuelLevel: "1/2",
    lastServiceDate: "2026-10-24",
    fitnessValidUntil: "2027-08-15",
  },
];

const INITIAL_TRIPS: AmbulanceTrip[] = [
  {
    id: "TRIP-101",
    tripNumber: "AMB-TRIP-2026-081",
    vehicleId: "VEH-2",
    vehicleNumber: "TN 01 CD 2040",
    patientName: "V. Somasekar (Cardiac Emergency)",
    pickupLocation: "Anna Nagar West, 4th Avenue",
    dropLocation: "Cura Tech Emergency & Trauma Bay",
    startTime: "2026-11-24 13:40",
    distanceKm: 14.5,
    tripCharge: 2500,
    status: "dispatched",
    paymentStatus: "pending",
    driverName: "K. Ramesh",
    urgency: "Emergency",
    notes: "Patient on 10L Oxygen with ventilator backup",
    createdAt: "2026-11-24T13:40:00Z",
  },
  {
    id: "TRIP-102",
    tripNumber: "AMB-TRIP-2026-080",
    vehicleId: "VEH-1",
    vehicleNumber: "TN 01 AB 1008",
    patientName: "Lakshmi Narayanan",
    pickupLocation: "Cura Tech Hospital Discharge Desk",
    dropLocation: "T. Nagar Residence",
    startTime: "2026-11-24 10:15",
    endTime: "2026-11-24 11:30",
    distanceKm: 9.2,
    tripCharge: 1500,
    status: "completed",
    paymentStatus: "paid",
    paymentMode: "UPI",
    driverName: "S. Murugan",
    urgency: "Non-Emergency",
    notes: "Discharged Post-Operative Patient transport",
    createdAt: "2026-11-24T10:15:00Z",
  },
];

export const AmbulanceERP: React.FC<{
  initialAction?: string;
  dropdownOption?: string;
}> = ({ initialAction = "amb_allotment", dropdownOption }) => {
  const [activeTab, setActiveTab] = useState<string>(initialAction || "amb_allotment");
  const [vehicles, setVehicles] = useState<AmbulanceVehicle[]>(INITIAL_VEHICLES);
  const [trips, setTrips] = useState<AmbulanceTrip[]>(INITIAL_TRIPS);

  // Dispatch / Allotment Form
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0].id);
  const [patientName, setPatientName] = useState("");
  const [pickupLoc, setPickupLoc] = useState("");
  const [dropLoc, setDropLoc] = useState("Cura Tech Emergency Bay");
  const [urgency, setUrgency] = useState<AmbulanceTrip["urgency"]>("Emergency");
  const [distanceKm, setDistanceKm] = useState(10);
  const [notes, setNotes] = useState("");

  // Modals
  const [selectedTripForBill, setSelectedTripForBill] = useState<AmbulanceTrip | null>(null);

  React.useEffect(() => {
    if (initialAction) setActiveTab(initialAction);
  }, [initialAction]);

  const handleDispatchTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!vehicle) return;

    if (vehicle.status !== "available") {
      flashToast("Vehicle is currently not available for dispatch", "warning");
      return;
    }

    const calculatedCharge = urgency === "Emergency" ? 2000 + distanceKm * 35 : 1200 + distanceKm * 25;

    const newTrip: AmbulanceTrip = {
      id: `TRIP-${Date.now().toString().slice(-4)}`,
      tripNumber: `AMB-TRIP-2026-${(trips.length + 82).toString().padStart(3, "0")}`,
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      patientName: patientName || "Emergency Pick-up",
      pickupLocation: pickupLoc || "Local Residence / Clinic",
      dropLocation: dropLoc,
      startTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      distanceKm: Number(distanceKm) || 10,
      tripCharge: calculatedCharge,
      status: "dispatched",
      paymentStatus: "pending",
      driverName: vehicle.driverName,
      urgency,
      notes,
      createdAt: new Date().toISOString(),
    };

    // Set vehicle status to on_trip
    setVehicles(vehicles.map((v) => (v.id === vehicle.id ? { ...v, status: "on_trip" } : v)));
    setTrips([newTrip, ...trips]);
    flashToast(`Ambulance ${vehicle.vehicleNumber} dispatched for ${newTrip.patientName}!`, "success");

    // Reset
    setPatientName("");
    setPickupLoc("");
    setNotes("");
  };

  const handleCompleteTrip = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    if (!trip) return;

    setTrips(
      trips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: "completed",
              endTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              paymentStatus: "paid",
            }
          : t
      )
    );

    // Free up vehicle
    setVehicles(
      vehicles.map((v) =>
        v.id === trip.vehicleId
          ? {
              ...v,
              status: "available",
              currentOdometer: v.currentOdometer + trip.distanceKm,
            }
          : v
      )
    );

    flashToast(`Trip ${trip.tripNumber} marked as completed & payment settled`, "success");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* ── Sub-Navigation / Header ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300 rounded-lg">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Emergency Ambulance Fleet & Trauma Services
              {dropdownOption && <Badge variant="info">{dropdownOption}</Badge>}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live Fleet Tracking, Emergency Allotment, O2 Manifolds, Trip Billing & Fitness Roster
            </p>
          </div>
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab("amb_allotment")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "amb_allotment"
                ? "bg-rose-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Allotment & Dispatch
          </button>
          <button
            onClick={() => setActiveTab("amb_services")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "amb_services"
                ? "bg-rose-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Trip Services & Billing
          </button>
          <button
            onClick={() => setActiveTab("amb_maintenance")}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              activeTab === "amb_maintenance"
                ? "bg-rose-600 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            Vehicle Maintenance
          </button>
        </div>
      </div>

      {/* ── FLEET STATUS CARDS (ALWAYS VISIBLE OVERVIEW) ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {vehicles.map((v) => (
          <Card key={v.id} className="p-3 relative overflow-hidden border-t-4 border-t-rose-500">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{v.vehicleNumber}</div>
                <div className="text-[11px] text-slate-500">{v.type}</div>
              </div>
              <Badge
                variant={v.status === "available" ? "success" : v.status === "on_trip" ? "danger" : "warning"}
                className="text-[10px] uppercase"
              >
                {v.status.replace("_", " ")}
              </Badge>
            </div>

            <div className="mt-3 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-400">
                  <User className="w-3 h-3" /> Driver:
                </span>
                <span className="font-semibold">{v.driverName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-400">
                  <Activity className="w-3 h-3 text-sky-500" /> Paramedic:
                </span>
                <span>{v.paramedicName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-400">
                  <Droplet className="w-3 h-3 text-blue-500" /> O2 Manifold:
                </span>
                <span className="font-mono font-bold text-sky-600">{v.oxygenLevelPercent}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-slate-400">
                  <Gauge className="w-3 h-3 text-amber-500" /> Odometer:
                </span>
                <span className="font-mono">{v.currentOdometer.toLocaleString()} km</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── 1. AMBULANCE ALLOTMENT & DISPATCH ── */}
      {activeTab === "amb_allotment" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="py-3 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-rose-600" />
                  Live Emergency Dispatch & Route Allotment
                </h3>
                <p className="text-[11px] text-slate-500">Deploy immediate ALS/BLS vehicles with paramedical crew</p>
              </div>
            </CardHeader>
            <CardBody className="p-4">
              <form onSubmit={handleDispatchTrip} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Assign Ambulance Vehicle</Label>
                    <Select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id} disabled={v.status !== "available"}>
                          {v.vehicleNumber} ({v.type}) - {v.status === "available" ? "Ready" : v.status}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Urgency Classification</Label>
                    <Select value={urgency} onChange={(e) => setUrgency(e.target.value as any)}>
                      <option value="Emergency">🚨 Critical Emergency (Code Red)</option>
                      <option value="Non-Emergency">Routine Patient Transfer</option>
                      <option value="Transfer">Inter-Hospital ICU Shift</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Patient Name & Medical Condition</Label>
                    <Input
                      placeholder="e.g. S. Kumar (Acute Respiratory Distress)"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Estimated Route Distance (km)</Label>
                    <Input
                      type="number"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Pickup Location Address</Label>
                    <Input
                      placeholder="Street, Landmark, City"
                      value={pickupLoc}
                      onChange={(e) => setPickupLoc(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>Drop Location</Label>
                    <Input
                      placeholder="Hospital Trauma Bay or Diagnostic Center"
                      value={dropLoc}
                      onChange={(e) => setDropLoc(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Paramedic Clinical Notes / Equipment Required</Label>
                  <Input
                    placeholder="e.g. Defibrillator on standby, 10L oxygen continuous, spine board"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 flex items-center justify-center gap-2">
                    <Navigation className="w-4 h-4" /> Confirm Allotment & Dispatch Siren Unit
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Quick Info & Hotline */}
          <Card className="p-4 space-y-3 text-xs bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900">
            <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200 text-sm">
              <Phone className="w-4 h-4 text-rose-600 animate-pulse" />
              Trauma Dispatch Hotline: 108 / 044-24508800
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              ALS ambulances are equipped with Mindray Defibrillators, Hamilton T1 Transport Ventilators, infusion pumps, and dual 2000 PSI oxygen cylinders.
            </p>
            <div className="border-t border-rose-200 dark:border-rose-800 pt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Base ALS Charge (First 5 km):</span>
                <span className="font-mono font-bold">₹2,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Per Subsequent Km Rate:</span>
                <span className="font-mono font-bold">₹35 / km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paramedic Care Included:</span>
                <span className="text-emerald-600 font-semibold">Yes</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── 2. AMBULANCE SERVICES & TRIP BILLING ── */}
      {activeTab === "amb_services" && (
        <Card>
          <CardHeader className="py-3 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rose-600" />
                Active & Historical Ambulance Trip Register
              </h3>
            </div>
            <Button size="sm" onClick={() => flashToast("Ambulance logs exported to Excel", "info")} className="text-xs flex items-center gap-1">
              <Printer className="w-3 h-3" /> Print Trip Register
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                    <th className="p-3">Trip ID</th>
                    <th className="p-3">Ambulance No.</th>
                    <th className="p-3">Patient & Condition</th>
                    <th className="p-3">Pickup / Drop Route</th>
                    <th className="p-3">Distance & Time</th>
                    <th className="p-3">Trip Charge</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {trips.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">{t.tripNumber}</td>
                      <td className="p-3 font-semibold text-rose-600 dark:text-rose-400">{t.vehicleNumber}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{t.patientName}</div>
                        <div className="text-[10px] text-slate-400">{t.notes}</div>
                      </td>
                      <td className="p-3 text-[11px] text-slate-600 dark:text-slate-300">
                        <div>From: {t.pickupLocation}</div>
                        <div>To: {t.dropLocation}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        <div>{t.distanceKm} km</div>
                        <div className="text-[10px] text-slate-400">Start: {t.startTime}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-100">₹{t.tripCharge}</td>
                      <td className="p-3">
                        <Badge variant={t.status === "completed" ? "success" : "danger"} className="text-[10px]">
                          {t.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status === "dispatched" && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteTrip(t.id)}
                              className="text-[11px] py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Complete Trip
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTripForBill(t)}
                            className="text-[11px] py-1 px-2"
                          >
                            Bill Slip
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── 3. AMBULANCE MAINTENANCE ── */}
      {activeTab === "amb_maintenance" && (
        <Card>
          <CardHeader className="py-3">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              Fleet Periodic Maintenance, Fitness & Calibration Log
            </h3>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700 text-slate-500 uppercase font-semibold">
                    <th className="p-3">Vehicle Number</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Last Service Date</th>
                    <th className="p-3">Fitness Certificate Expiry</th>
                    <th className="p-3">Oxygen Manifold Status</th>
                    <th className="p-3">Mechanical Fitness</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{v.vehicleNumber}</td>
                      <td className="p-3 text-slate-500">{v.type}</td>
                      <td className="p-3 font-mono">{v.lastServiceDate}</td>
                      <td className="p-3 font-mono font-semibold text-emerald-600">{v.fitnessValidUntil}</td>
                      <td className="p-3 font-mono font-bold text-sky-600">{v.oxygenLevelPercent}% (Pass)</td>
                      <td className="p-3">
                        <Badge variant={v.status === "maintenance" ? "danger" : "success"} className="text-[10px]">
                          {v.status === "maintenance" ? "In Service Bay" : "Certified Roadworthy"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVehicles(
                              vehicles.map((item) =>
                                item.id === v.id
                                  ? {
                                      ...item,
                                      status: item.status === "maintenance" ? "available" : "maintenance",
                                      oxygenLevelPercent: 98,
                                    }
                                  : item
                              )
                            );
                            flashToast(`Maintenance logged for ${v.vehicleNumber}`, "success");
                          }}
                          className="text-[11px] py-1 px-2"
                        >
                          Log Check
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

      {/* ── MODAL: TRIP BILL SLIP ── */}
      {selectedTripForBill && (
        <Modal open={Boolean(selectedTripForBill)} onClose={() => setSelectedTripForBill(null)} title="Emergency Ambulance Transport Invoice">
          <div className="space-y-3 text-xs p-2">
            <div className="text-center border-b pb-2">
              <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100">CURA TECH HOSPITAL EMERGENCY SERVICES</div>
              <div className="text-[11px] text-slate-500">Trauma & Advanced Cardiac Life Support Transport</div>
              <div className="font-mono text-[10px] text-slate-400 mt-1">Trip: {selectedTripForBill.tripNumber} | Vehicle: {selectedTripForBill.vehicleNumber}</div>
            </div>

            <div className="space-y-1.5 border p-2.5 rounded bg-slate-50 dark:bg-slate-900">
              <div className="flex justify-between">
                <span className="text-slate-400">Patient:</span> <strong className="text-slate-800 dark:text-slate-100">{selectedTripForBill.patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pickup:</span> <span>{selectedTripForBill.pickupLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Destination:</span> <span>{selectedTripForBill.dropLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Driver & Paramedic:</span> <span>{selectedTripForBill.driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Distance Travelled:</span> <span className="font-mono">{selectedTripForBill.distanceKm} km</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-bold text-sm">
                <span className="text-slate-800 dark:text-slate-100">Total Transport Charge:</span>
                <span className="text-rose-600 font-mono">₹{selectedTripForBill.tripCharge}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setSelectedTripForBill(null)}>Close</Button>
              <Button onClick={() => flashToast("Ambulance Invoice Dispatched to Thermal Printer", "success")} className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" /> Print Tax Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AmbulanceERP;
