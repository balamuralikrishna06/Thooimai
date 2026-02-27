import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const ReportsContext = createContext(null);

export function ReportsProvider({ children }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();

  // Fetch reports based on Role
  const fetchReports = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase.from('issue_reports').select(`
      *,
      users:user_id (name, email),
      worker:assigned_worker_id (name, email)
    `).order('created_at', { ascending: false });

    // Apply role-based filtering if RLS isn't strictly relied upon for all UI states
    if (role === 'citizen') {
      query = query.eq('user_id', user.uid);
    } else if (role === 'worker') {
      query = query.eq('assigned_worker_id', user.uid);
    }
    // Admin sees all, no additional filter needed

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reports:", error);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Only fetch once user and role are established
    if (user && role) {
      fetchReports();
    } else {
      setReports([]); // Clear reports if logged out
    }
  }, [user, role]);

  const addReport = async (reportData) => {
    try {
      const { data, error } = await supabase
        .from('issue_reports')
        .insert([{ ...reportData, user_id: user.uid }])
        .select()
        .single();

      if (error) throw error;

      // Update local state instantly
      setReports(prev => [data, ...prev]);
      return { success: true, data };
    } catch (error) {
      console.error("Error adding report:", error);
      return { success: false, error };
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('issue_reports')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Update local state instantly
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      return { success: true };
    } catch (error) {
      console.error("Error updating status:", error);
      return { success: false, error };
    }
  };

  const assignWorker = async (reportId, workerId) => {
    try {
      // Must be Admin to do this (enforced by RLS)
      const { error } = await supabase
        .from('issue_reports')
        .update({ assigned_worker_id: workerId, status: 'Assigned' })
        .eq('id', reportId);

      if (error) throw error;
      fetchReports(); // Refresh to get the nested worker profile data
      return { success: true };
    } catch (error) {
      console.error("Error assigning worker", error);
      return { success: false, error };
    }
  };

  return (
    <ReportsContext.Provider value={{ reports, loading, fetchReports, addReport, updateStatus, assignWorker }}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  return useContext(ReportsContext);
}
