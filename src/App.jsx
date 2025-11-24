import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  // Métricas
  const [totalReports, setTotalReports] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  // Datos para gráficos
  const [reportsByType, setReportsByType] = useState([]);
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // 1️⃣ Total de reportes
      const { count: reportCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true });

      // 2️⃣ Total comentarios
      const { count: commentsCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true });

      // 3️⃣ Total puntos
      const { count: pointsCount } = await supabase
        .from("points")
        .select("*", { count: "exact", head: true });

      setTotalReports(reportCount ?? 0);
      setTotalComments(commentsCount ?? 0);
      setTotalPoints(pointsCount ?? 0);

      // 4️⃣ Gráfico: reportes por tipo
      const { data: reports } = await supabase.from("reports").select("*");

      const grouped = Object.values(
        reports.reduce((acc, r) => {
          const type = r.report_type || "Sin tipo";
          acc[type] = acc[type] || { type, count: 0 };
          acc[type].count++;
          return acc;
        }, {})
      );

      setReportsByType(grouped);

      // 5️⃣ Últimos 5 reportes
      const { data: lastReports } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentReports(lastReports);

    } catch (e) {
      console.error("Error cargando dashboard:", e);
    }

    setLoading(false);
  }

  if (loading) return <p style={{ padding: 30 }}>Cargando dashboard...</p>;

  return (
    <div style={{ padding: 30, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>Dashboard - Tombo</h1>

      {/* Cards de métricas */}
      <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
        <MetricCard title="Total Reportes" value={totalReports} />
        <MetricCard title="Total Comentarios" value={totalComments} />
        <MetricCard title="Puntos Registrados" value={totalPoints} />
      </div>

      {/* Gráfico */}
      <div
        style={{
          height: 300,
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          marginBottom: 30
        }}
      >
        <h2>Reportes por tipo</h2>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={reportsByType}>
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Últimos reportes */}
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
        }}
      >
        <h2>Últimos reportes</h2>

        <table style={{ width: "100%", marginTop: 10 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>ID</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {recentReports.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.report_type}</td>
                <td>{r.description.substring(0, 40)}...</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div
      style={{
        flex: 1,
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
      }}
    >
      <h3>{title}</h3>
      <p style={{ fontSize: 28, fontWeight: "bold" }}>{value}</p>
    </div>
  );
}
