import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .limit(20);

      if (error) {
        console.error("ERROR SUPABASE:", error);
      } else {
        setReports(data);
      }

      setLoading(false);
    }

    loadReports();
  }, []);

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Dashboard - Reports</h1>

      {loading ? (
        <p>Cargando datos...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-white p-4 rounded-xl shadow">
              <h2 className="text-xl font-semibold">{r.description}</h2>
              <p className="text-gray-600">{r.address}</p>
              <p className="text-sm text-gray-500">
                Lat: {r.latitude} / Lng: {r.longitude}
              </p>
              <p className="text-sm mt-2 text-gray-700">
                Usuario: {r.user_id}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
