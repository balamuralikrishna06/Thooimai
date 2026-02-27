import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useReports } from "../../state/ReportsContext";
import { Toast } from "../../components/ui/Toast";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

const CATEGORIES = [
  "Illegal Dumping",
  "Overflowing Bin",
  "Plastic Waste",
  "Construction Debris",
  "Junkyard/Scrap Pile",
  "Burning Waste",
];

const MOCK_LOCATIONS = [
  { name: "Meenakshi Amman Temple", lat: 9.9195, lng: 78.1193 },
  { name: "Thirumalai Nayakkar Mahal", lat: 9.9150, lng: 78.1251 },
  { name: "Vandiyur Mariamman Teppakulam", lat: 9.9142, lng: 78.1491 },
  { name: "Gandhi Memorial Museum", lat: 9.9322, lng: 78.1384 },
  { name: "Alagar Kovil", lat: 10.0768, lng: 78.2132 },
  { name: "Arapalayam", lat: 9.9317, lng: 78.1064 },
];

function computeSeverity(category) {
  if (["Burning Waste", "Illegal Dumping", "Construction Debris"].includes(category)) return "High";
  if (["Overflowing Bin", "Plastic Waste"].includes(category)) return "Medium";
  return "Low";
}

function computeAiScore(category) {
  const base = {
    "Burning Waste": 90,
    "Illegal Dumping": 80,
    "Construction Debris": 70,
    "Overflowing Bin": 60,
    "Junkyard/Scrap Pile": 55,
    "Plastic Waste": 50,
  };
  return (base[category] || 50) + Math.floor(Math.random() * 10);
}

function generateId() {
  return `REP-${Math.floor(1000 + Math.random() * 9000)}`;
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 15);
    }
  }, [center, map]);
  return null;
}

export default function SubmitReport() {
  const navigate = useNavigate();
  const { addReport } = useReports();
  const fileRef = useRef(null);

  const [category, setCategory] = useState("");
  const [locationText, setLocationText] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [mapCenter, setMapCenter] = useState([9.95, 78.15]);
  const [gpsPin, setGpsPin] = useState(null);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleGps() {
    if (!navigator.geolocation) {
      setToast({ message: "Geolocation is not supported by your browser.", type: "error" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latLongStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setLocationText(`Current Location (${latLongStr})`);
        setGpsPin({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setErrors((p) => ({ ...p, locationText: undefined }));
      },
      (error) => {
        setToast({ message: "Failed to get location. Please allow location access.", type: "error" });
      }
    );
  }

  function validate() {
    const errs = {};
    if (!category) errs.category = "Please select a category.";
    if (!locationText.trim()) errs.locationText = "Please enter a location.";
    if (!imageFile) errs.image = "Please upload a photo.";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate async

    const report = {
      id: generateId(),
      category,
      locationText,
      notes,
      createdAt: new Date().toISOString(),
      status: "Reported",
      aiUrgencyScore: computeAiScore(category),
      severity: computeSeverity(category),
      imagePreviewUrl,
    };

    addReport(report);
    setToast({ message: "Report submitted successfully!", type: "success" });
    setSubmitting(false);

    setTimeout(() => {
      navigate("/citizen");
    }, 1500);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f6f8f8] font-[Public_Sans,sans-serif] text-[#0d1b19]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f6f8f8]/80 backdrop-blur-md border-b border-[#13ecc8]/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#13ecc8] p-1.5 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#0d1b19] text-2xl">location_city</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Citizen Portal</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-sm font-semibold hover:text-[#13ecc8] transition-colors" to="/citizen">Home</Link>
            <span className="text-sm font-semibold text-[#13ecc8]">Report Issue</span>
            <Link className="text-sm font-semibold hover:text-[#13ecc8] transition-colors" to="/authority">Authority View</Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow max-w-3xl mx-auto w-full px-6 py-8">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#13ecc8]">Step 2 of 3</span>
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">Issue Details</span>
          </div>
          <div className="h-2 w-full bg-[#13ecc8]/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#13ecc8] w-[66%] rounded-full" />
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold mb-2">Submit Issue Report</h1>
          <p className="text-slate-600">Provide details about the waste issue to help us resolve it quickly.</p>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit} noValidate>
          {/* Category */}
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#0d1b19]/70">
              Issue Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setErrors((p) => ({ ...p, category: undefined })); }}
                className="w-full h-14 bg-white border-2 border-slate-200 rounded-xl px-4 appearance-none focus:ring-2 focus:ring-[#13ecc8] focus:border-[#13ecc8] transition-all text-[#0d1b19]"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                keyboard_arrow_down
              </span>
            </div>
            {errors.category && <p className="text-red-500 text-xs font-medium">{errors.category}</p>}
          </div>

          {/* Location */}
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#0d1b19]/70">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={locationText}
                onChange={(e) => { setLocationText(e.target.value); setErrors((p) => ({ ...p, locationText: undefined })); }}
                placeholder="e.g. Anna Nagar, Sector 4"
                className="flex-1 h-14 bg-white border-2 border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-[#13ecc8] focus:border-[#13ecc8] transition-all text-[#0d1b19] placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleGps}
                className="h-14 px-4 bg-white border-2 border-slate-200 rounded-xl flex items-center gap-2 hover:border-[#13ecc8] transition-colors text-sm font-bold text-[#4c9a8d]"
              >
                <span className="material-symbols-outlined text-[18px]">my_location</span>
                <span className="hidden sm:inline">Use GPS</span>
              </button>
            </div>
            {errors.locationText && <p className="text-red-500 text-xs font-medium">{errors.locationText}</p>}
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#0d1b19]/70">
              Upload Photo <span className="text-red-500">*</span>
            </label>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleImageChange} className="hidden" />
            {imagePreviewUrl ? (
              <div className="relative h-48 w-full rounded-xl overflow-hidden border-2 border-[#13ecc8]">
                <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreviewUrl(null); }}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 bg-white flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-[#13ecc8] transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-[#13ecc8]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#13ecc8] text-3xl">photo_camera</span>
                </div>
                <div className="text-center">
                  <p className="font-bold">Tap to upload or take a photo</p>
                  <p className="text-sm text-slate-500">Max file size: 5MB</p>
                </div>
              </button>
            )}
            {errors.image && <p className="text-red-500 text-xs font-medium">{errors.image}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#0d1b19]/70">
              Additional Notes <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-[#13ecc8] focus:border-[#13ecc8] transition-all text-[#0d1b19] placeholder:text-slate-400"
              placeholder="Tell us more about what's happening..."
              rows={4}
            />
          </div>

          {/* Location Map Widget */}
          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wider text-[#0d1b19]/70">Select Location on Map</label>
            <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-slate-200 z-0">
              <MapContainer center={mapCenter} zoom={11} scrollWheelZoom={false} className="w-full h-full z-0">
                <MapUpdater center={mapCenter} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {MOCK_LOCATIONS.map((loc, idx) => (
                  <Marker
                    key={idx}
                    position={[loc.lat, loc.lng]}
                    eventHandlers={{ click: () => { setLocationText(loc.name); setErrors((p) => ({ ...p, locationText: undefined })); } }}
                  >
                    <Popup className="font-[Public_Sans,sans-serif] font-bold text-[#0d1b19]">
                      {loc.name}<br />
                      <span className="text-xs font-normal text-[#4c9a8d]">Click to select</span>
                    </Popup>
                  </Marker>
                ))}
                {gpsPin && (
                  <Marker position={[gpsPin.lat, gpsPin.lng]}>
                    <Popup className="font-[Public_Sans,sans-serif] font-bold text-[#0d1b19]">
                      Your Current Location<br />
                      <span className="text-xs font-normal text-[#4c9a8d]">Selected</span>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center justify-center z-[1000] pointer-events-none">
                <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-[#13ecc8]">
                  <span className="material-symbols-outlined text-[#13ecc8]">location_on</span>
                  <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-[300px]">
                    {locationText || "Select a pin on the map"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 pb-12">
            <Link
              to="/citizen"
              className="flex-1 h-14 rounded-xl border-2 border-slate-200 font-bold hover:bg-slate-50 transition-colors flex items-center justify-center text-[#0d1b19]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] h-14 bg-[#13ecc8] text-[#0d1b19] rounded-xl font-extrabold text-lg shadow-lg shadow-[#13ecc8]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </button>
          </div>
        </form>
      </main>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
