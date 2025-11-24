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
  const [allReports, setAllReports] = useState([]);

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

      setAllReports(reports || []);

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

      {/* Información de API consumida */}
      <div
        style={{
          background: "#f0f4f8",
          padding: 15,
          borderRadius: 8,
          marginBottom: 20,
          border: "1px solid #d0d7de"
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", fontSize: 16 }}>API Information - Supabase</h3>
        <div style={{ fontSize: 14, color: "#444" }}>
          <p style={{ margin: "5px 0" }}>
            <strong>Tablas consumidas:</strong> reports, comments, points
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>Consultas realizadas:</strong>
          </p>
          <ul style={{ margin: "5px 0 5px 20px", padding: 0 }}>
            <li>COUNT en reports, comments, points (totales)</li>
            <li>SELECT * en reports (datos para gráfico)</li>
            <li>SELECT con ORDER BY y LIMIT en reports (últimos 5)</li>
          </ul>
          <p style={{ margin: "5px 0" }}>
            <strong>Endpoint:</strong> {import.meta.env.VITE_SUPABASE_URL || "No configurado"}
          </p>
        </div>
      </div>

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

      {/* Raw API Data */}
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          marginTop: 30
        }}
      >
        <h2>All API Content (Raw Data)</h2>
        <pre
          style={{
            background: "#f5f5f5",
            padding: 15,
            borderRadius: 8,
            overflow: "auto",
            maxHeight: 400,
            fontSize: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }}
        >
          {JSON.stringify(allReports, null, 2)}
        </pre>
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
