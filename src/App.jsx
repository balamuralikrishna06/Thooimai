import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReportsProvider } from "./state/ReportsContext";
import { AuthProvider } from "./state/AuthContext";
import CitizenHome from "./pages/citizen/CitizenHome";
import SubmitReport from "./pages/citizen/SubmitReport";
import AuthorityDashboard from "./pages/authority/AuthorityDashboard";

export default function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
