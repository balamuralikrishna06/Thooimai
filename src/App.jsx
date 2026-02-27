import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReportsProvider } from "./state/ReportsContext";
import CitizenHome from "./pages/citizen/CitizenHome";
import SubmitReport from "./pages/citizen/SubmitReport";
import AuthorityDashboard from "./pages/authority/AuthorityDashboard";

export default function App() {
  return (
    <ReportsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/citizen" replace />} />
          <Route path="/citizen" element={<CitizenHome />} />
          <Route path="/citizen/report" element={<SubmitReport />} />
          <Route path="/authority" element={<AuthorityDashboard />} />
        </Routes>
      </BrowserRouter>
    </ReportsProvider>
  );
}
