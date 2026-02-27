import { createContext, useContext, useReducer } from "react";

const SAMPLE_REPORTS = [
  {
    id: "REP-1092",
    category: "Illegal Dumping",
    locationText: "Anna Nagar, Sector 4",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "Reported",
    aiUrgencyScore: 87,
    severity: "High",
    imagePreviewUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB8DCX33brOxbWNDkJwyncWvsjs7ICr_xaSfkg7hv58BHn5eYJlGqtwRoAF1u02ES0wib1nPudsCczHt62jI1UBXHEQ7YOGljizR9iobi0KHj9LM3gHTGAd-Hj6t7E63moOJbCAGazEnuEm7M4AMSnMegDNezO72LhuxIrhbQUVlasj3ZJtjQWjEE3j7nZlB8sYSJxDBoph-Fcp0SZWdluqp_QRwNblg5_UuldARBFWtmfzNsu2MoLaPiomszjHMyWpt9VSrfEgJ5bj",
    notes: "Large pile of waste dumped overnight near the park entrance.",
  },
  {
    id: "REP-1091",
    category: "Overflowing Bin",
    locationText: "Race Course Road",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: "In Progress",
    aiUrgencyScore: 62,
    severity: "Medium",
    imagePreviewUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBrGSBJveKNJ_-qikrLda53DDbozgNGzTRNe_6_TwFyLgdXKjNSStZ94GwQt_SK5oUpA9kPIh_83ULjd-Q3tzkG-INvOouXdw-PMBFFDk8LRsoNMgA9roqoGhqTe438CeyyKFgcNoMPcLlveac3Rko7lOfZBywpSoOteucyHvfZvjbpK02QKxcZBfQbo7Aj2svyIrPP-GU_iPjqK_mRMXlLpxXuow9jiNiISO27vOEz7gYuUFmyaaUzbqswlrDNrK7cqta2kpGBmuZB",
    notes: "",
  },
  {
    id: "REP-1088",
    category: "Plastic Waste",
    locationText: "Meenakshi Nagar",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "Resolved",
    aiUrgencyScore: 55,
    severity: "Medium",
    imagePreviewUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC3bMh-VqzFX6g4GKeSjcykWRrcDIsc5IfDmzzz787yVXdZQbBXrL267IHwPYtOVv3y6aPZQkoB2ghNm7jMT4_qi3jVe79d89Fs7qVdYOE1seJhaLxROXS5GAeFV0F6qoph59nq0Kp4If3xHVs2hxdJk6Ne7x_gxFwZYWdX0ulVzDwm_vbh9VzzVttpmDqAKolzfRVxbqXjN0u_-kBFY9KRMOxxvzu0LuWBIMkG4m3PahKZR9VuCOOnlC6g5amf0PW1tgOlxwZFXlF9",
    notes: "",
  },
  {
    id: "REP-1085",
    category: "Construction Debris",
    locationText: "K.K. Nagar Main Road",
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    status: "Reported",
    aiUrgencyScore: 78,
    severity: "High",
    imagePreviewUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDY5Al3QTirIE_xFeup35YngP3iTZMPYeDqjTMIHR61NVdUhe3TkdVB_cpJM1dMbXlik7MqSoi6Y9YvzB71HWcdb6fEo5XJlg4p5FKc-ITCJm7tRp8zanM-Ybe5-QGJMB01pmEF1vq9Z3dlWO2FXVDdgoKZ6h7g3xPChmAWLry5jQznr5x8rDwyrL92KUA-HS4i4FtdzMpmaUSsR6v_zYSETr-9F4EaakhYghJZFy-TDg727uFhQCWJg6B-fgdxKL2VDtkf_03EW5dL",
    notes: "",
  },
  {
    id: "REP-1082",
    category: "Burning Waste",
    locationText: "Sellur Riverbed",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    status: "In Progress",
    aiUrgencyScore: 95,
    severity: "High",
    imagePreviewUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB8DCX33brOxbWNDkJwyncWvsjs7ICr_xaSfkg7hv58BHn5eYJlGqtwRoAF1u02ES0wib1nPudsCczHt62jI1UBXHEQ7YOGljizR9iobi0KHj9LM3gHTGAd-Hj6t7E63moOJbCAGazEnuEm7M4AMSnMegDNezO72LhuxIrhbQUVlasj3ZJtjQWjEE3j7nZlB8sYSJxDBoph-Fcp0SZWdluqp_QRwNblg5_UuldARBFWtmfzNsu2MoLaPiomszjHMyWpt9VSrfEgJ5bj",
    notes: "Toxic fumes visible. Residents complaining.",
  },
];

const ReportsContext = createContext(null);

function reportsReducer(state, action) {
  switch (action.type) {
    case "ADD_REPORT":
      return { ...state, reports: [action.payload, ...state.reports] };
    case "UPDATE_STATUS":
      return {
        ...state,
        reports: state.reports.map((r) =>
          r.id === action.payload.id ? { ...r, status: action.payload.status } : r
        ),
      };
    default:
      return state;
  }
}

export function ReportsProvider({ children }) {
  const [state, dispatch] = useReducer(reportsReducer, { reports: SAMPLE_REPORTS });

  const addReport = (report) => dispatch({ type: "ADD_REPORT", payload: report });
  const updateStatus = (id, status) => dispatch({ type: "UPDATE_STATUS", payload: { id, status } });

  return (
    <ReportsContext.Provider value={{ reports: state.reports, addReport, updateStatus }}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  return useContext(ReportsContext);
}
