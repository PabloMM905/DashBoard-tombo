import { useEffect, useState, useMemo } from "react";
import { supabase } from "./supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  IconDashboard,
  IconAlertTriangle,
  IconMapPin,
  IconFileText,
  IconChartBar,
  IconAlertCircle,
  IconClock,
  IconMapPinFilled,
  IconMessageCircle,
  IconHourglass,
  IconProgress,
  IconCircleCheck,
  IconUser,
  IconLock
} from "@tabler/icons-react";

// Paleta de colores Tombo Security
const COLORS = {
  primary: "#1E3A8A",      // Azul Tombo - identidad principal
  dashboard: "#2563EB",    // Panel principal
  danger: "#DC2626",       // Alertas, crítico
  warning: "#F59E0B",      // Riesgo medio
  success: "#10B981",      // Completado, resuelto
  metrics: "#8B5CF6",      // Métricas, KPIs
  pending: "#FBBF24",      // Pendiente
  inProgress: "#3B82F6",   // En proceso
  background: "#F3F4F6",   // Fondo general
  card: "#FFFFFF",         // Tarjetas
  textPrimary: "#111827",  // Títulos
  textSecondary: "#6B7280", // Texto secundario
  border: "#E5E7EB"        // Líneas de separación
};

const REPORT_TYPE_COLORS = {
  robbery: "#DC2626",
  assault: "#DC2626",
  theft: "#F59E0B",
  vandalism: "#FBBF24",
  suspicious: "#8B5CF6",
  other: "#6B7280"
};

const REPORT_TYPE_LABELS = {
  robbery: "Robo",
  assault: "Asalto",
  theft: "Hurto",
  vandalism: "Vandalismo",
  suspicious: "Actividad Sospechosa",
  other: "Otro"
};

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "admin") {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Usuario o contraseña incorrectos");
    }
  };

  // Métricas
  const [totalReports, setTotalReports] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

  // Datos para gráficos
  const [reportsByType, setReportsByType] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [allReports, setAllReports] = useState([]);

  // Métricas de estado de procesos
  const reportsInProgress = useMemo(() => {
    return allReports.filter(r => r.process_start && !r.process_end).length;
  }, [allReports]);

  const reportsResolved = useMemo(() => {
    return allReports.filter(r => r.process_end).length;
  }, [allReports]);

  const reportsPending = useMemo(() => {
    return allReports.filter(r => !r.process_start).length;
  }, [allReports]);

  // Tiempo promedio de resolución (en horas)
  const avgResolutionTime = useMemo(() => {
    const resolvedReports = allReports.filter(r => r.process_start && r.process_end);
    if (resolvedReports.length === 0) return 0;
    const totalHours = resolvedReports.reduce((acc, r) => {
      const start = new Date(r.process_start);
      const end = new Date(r.process_end);
      return acc + (end - start) / (1000 * 60 * 60);
    }, 0);
    return (totalHours / resolvedReports.length).toFixed(1);
  }, [allReports]);

  // Datos para gráfico de estado
  const statusData = useMemo(() => {
    return [
      { name: 'Pendiente', value: reportsPending, color: COLORS.pending },
      { name: 'En Proceso', value: reportsInProgress, color: COLORS.inProgress },
      { name: 'Resuelto', value: reportsResolved, color: COLORS.success }
    ].filter(d => d.value > 0);
  }, [reportsPending, reportsInProgress, reportsResolved]);

  // Tiempo de resolución por tipo
  const resolutionByType = useMemo(() => {
    const typeData = {};
    allReports.forEach(report => {
      if (report.process_start && report.process_end) {
        const type = report.report_type || 'other';
        const hours = (new Date(report.process_end) - new Date(report.process_start)) / (1000 * 60 * 60);
        if (!typeData[type]) {
          typeData[type] = { total: 0, count: 0 };
        }
        typeData[type].total += hours;
        typeData[type].count++;
      }
    });
    return Object.entries(typeData).map(([type, data]) => ({
      type: REPORT_TYPE_LABELS[type] || type,
      avgHours: (data.total / data.count).toFixed(1)
    }));
  }, [allReports]);

  // Filtros del mapa
  const [filterType, setFilterType] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Datos para línea de tiempo (métricas)
  const reportsByDate = useMemo(() => {
    const grouped = allReports.reduce((acc, report) => {
      const date = new Date(report.created_at).toLocaleDateString();
      acc[date] = acc[date] || { date, count: 0 };
      acc[date].count++;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [allReports]);

  // Reportes filtrados para el mapa
  const filteredReports = useMemo(() => {
    return allReports.filter((report) => {
      // Filtro por tipo
      if (filterType !== "all" && report.report_type !== filterType) {
        return false;
      }
      // Filtro por fecha desde
      if (filterDateFrom) {
        const reportDate = new Date(report.created_at);
        const fromDate = new Date(filterDateFrom);
        if (reportDate < fromDate) return false;
      }
      // Filtro por fecha hasta
      if (filterDateTo) {
        const reportDate = new Date(report.created_at);
        const toDate = new Date(filterDateTo + "T23:59:59");
        if (reportDate > toDate) return false;
      }
      return true;
    });
  }, [allReports, filterType, filterDateFrom, filterDateTo]);

  // Tipos únicos para el filtro
  const reportTypes = useMemo(() => {
    const types = [...new Set(allReports.map((r) => r.report_type))];
    return types.filter(Boolean);
  }, [allReports]);

  // Reportes por mes (para gráfico de línea)
  const reportsByMonth = useMemo(() => {
    const grouped = allReports.reduce((acc, report) => {
      const date = new Date(report.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('es', { year: 'numeric', month: 'short' });
      acc[monthKey] = acc[monthKey] || { month: monthLabel, monthKey, count: 0 };
      acc[monthKey].count++;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [allReports]);

  // Reportes por día de semana
  const reportsByWeekday = useMemo(() => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    allReports.forEach(report => {
      const day = new Date(report.created_at).getDay();
      counts[day]++;
    });
    return days.map((name, index) => ({ day: name, count: counts[index] }));
  }, [allReports]);

  // Heatmap de incidencias por día (últimos 90 días)
  const heatmapData = useMemo(() => {
    const grouped = allReports.reduce((acc, report) => {
      const date = new Date(report.created_at).toLocaleDateString('es');
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-90);
  }, [allReports]);

  // Reportes por hora del día y tipo
  const reportsByHour = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      total: 0
    }));

    // Agregar conteo por tipo
    const typeKeys = Object.keys(REPORT_TYPE_LABELS);
    hours.forEach(h => {
      typeKeys.forEach(type => {
        h[type] = 0;
      });
    });

    allReports.forEach(report => {
      const hour = new Date(report.created_at).getHours();
      hours[hour].total++;
      if (report.report_type && hours[hour][report.report_type] !== undefined) {
        hours[hour][report.report_type]++;
      }
    });

    return hours;
  }, [allReports]);

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

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.background,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
      }}>
        <div style={{
          background: COLORS.card,
          padding: 40,
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          width: 360,
          textAlign: "center"
        }}>
          <div style={{
            background: COLORS.primary,
            color: "#fff",
            padding: "20px",
            borderRadius: 8,
            marginBottom: 30
          }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "0.5px" }}>
              TOMBO APP
            </h1>
            <p style={{ margin: "8px 0 0 0", fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: "1px" }}>
              Centro de Monitoreo
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16, position: "relative" }}>
              <IconUser size={18} color={COLORS.textSecondary} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 40px",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.border}`,
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />
            </div>
            <div style={{ marginBottom: 20, position: "relative" }}>
              <IconLock size={18} color={COLORS.textSecondary} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px 12px 40px",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.border}`,
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none"
                }}
              />
            </div>

            {loginError && (
              <p style={{
                color: COLORS.danger,
                fontSize: 13,
                margin: "0 0 16px 0"
              }}>
                {loginError}
              </p>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 6,
                border: "none",
                background: COLORS.primary,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s ease"
              }}
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <p style={{ padding: 30 }}>Cargando dashboard...</p>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
      {/* Barra lateral */}
      <div
        style={{
          width: 240,
          background: COLORS.primary,
          padding: "24px 0",
          flexShrink: 0,
          boxShadow: "2px 0 8px rgba(0,0,0,0.15)"
        }}
      >
        <div style={{ padding: "0 20px", marginBottom: 40 }}>
          <h2 style={{ color: "#fff", margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "0.5px" }}>
            TOMBO APP
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", margin: "4px 0 0 0", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px" }}>
            Centro de Monitoreo
          </p>
        </div>
        <nav>
          {[
            { id: "dashboard", label: "Dashboard", icon: IconDashboard },
            { id: "alertas", label: "Alertas", icon: IconAlertTriangle },
            { id: "zonas", label: "Zonas de Riesgo", icon: IconMapPin },
            { id: "reportes", label: "Reportes", icon: IconFileText },
            { id: "metricas", label: "Métricas", icon: IconChartBar }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              style={{
                width: "100%",
                padding: "14px 24px",
                border: "none",
                background: activeSection === item.id ? "rgba(255,255,255,0.15)" : "transparent",
                borderLeft: activeSection === item.id ? "3px solid #fff" : "3px solid transparent",
                color: activeSection === item.id ? "#fff" : "rgba(255,255,255,0.8)",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: activeSection === item.id ? 600 : 400,
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido principal */}
      <div style={{ flex: 1, padding: 30, background: COLORS.background, overflowY: "auto" }}>
        {activeSection === "dashboard" && (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 24, color: COLORS.textPrimary, fontWeight: 600 }}>
              Centro de Monitoreo de Seguridad
            </h1>

            {/* Cards de métricas principales */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                borderLeft: `4px solid ${COLORS.danger}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IconAlertCircle size={18} color={COLORS.danger} />
                  <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Incidentes Activos</h3>
                </div>
                <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: COLORS.textPrimary }}>{totalReports}</p>
              </div>
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                borderLeft: `4px solid ${COLORS.warning}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IconAlertTriangle size={18} color={COLORS.warning} />
                  <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Alertas Hoy</h3>
                </div>
                <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: COLORS.textPrimary }}>
                  {allReports.filter(r => {
                    const today = new Date().toDateString();
                    return new Date(r.created_at).toDateString() === today;
                  }).length}
                </p>
              </div>
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                borderLeft: `4px solid ${COLORS.dashboard}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IconMapPinFilled size={18} color={COLORS.dashboard} />
                  <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Zonas Monitoreadas</h3>
                </div>
                <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: COLORS.textPrimary }}>{totalPoints}</p>
              </div>
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                borderLeft: `4px solid ${COLORS.success}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IconMessageCircle size={18} color={COLORS.success} />
                  <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Respuestas</h3>
                </div>
                <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: COLORS.textPrimary }}>{totalComments}</p>
              </div>
            </div>

            {/* Cards de estado de procesos */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                borderLeft: `4px solid ${COLORS.pending}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IconHourglass size={18} color={COLORS.pending} />
                  <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Pendientes</h3>
                </div>
                <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: COLORS.textPrimary }}>{reportsPending}</p>
              </div>
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                borderLeft: `4px solid ${COLORS.inProgress}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IconProgress size={18} color={COLORS.inProgress} />
                  <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>En Proceso</h3>
                </div>
                <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: COLORS.textPrimary }}>{reportsInProgress}</p>
              </div>
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                borderLeft: `4px solid ${COLORS.success}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IconCircleCheck size={18} color={COLORS.success} />
                  <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Resueltos</h3>
                </div>
                <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: COLORS.textPrimary }}>{reportsResolved}</p>
              </div>
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                borderLeft: `4px solid ${COLORS.metrics}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <IconClock size={18} color={COLORS.metrics} />
                  <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Tiempo Promedio</h3>
                </div>
                <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: COLORS.textPrimary }}>{avgResolutionTime}h</p>
              </div>
            </div>

            {/* Gráficos de Estado y Resolución */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              {/* Gráfico de pie - Estado de reportes */}
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Estado de Reportes</h2>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de barras - Tiempo de resolución por tipo */}
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Tiempo de Resolución por Tipo (horas)</h2>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resolutionByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="avgHours" fill={COLORS.metrics} name="Horas promedio" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

      {/* Mapa de reportes */}
      <div
        style={{
          background: COLORS.card,
          padding: 20,
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: 24
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Mapa de Reportes</h2>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label style={{ fontSize: 12, marginRight: 8, color: COLORS.textSecondary }}>Tipo:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 4, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
            >
              <option value="all">Todos</option>
              {reportTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, marginRight: 8, color: COLORS.textSecondary }}>Desde:</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 4, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, marginRight: 8, color: COLORS.textSecondary }}>Hasta:</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 4, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
            />
          </div>

          <button
            onClick={() => {
              setFilterType("all");
              setFilterDateFrom("");
              setFilterDateTo("");
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              background: COLORS.primary,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500
            }}
          >
            Limpiar filtros
          </button>

          <span style={{ fontSize: 12, color: COLORS.textSecondary }}>
            Mostrando {filteredReports.length} de {allReports.length} reportes
          </span>
        </div>

        {/* Mapa */}
        <div style={{ height: 400, borderRadius: 8, overflow: "hidden" }}>
          {allReports.length > 0 && (
            <MapContainer
              center={
                filteredReports.length > 0
                  ? [filteredReports[0].latitude, filteredReports[0].longitude]
                  : [-12.0464, -77.0428]
              }
              zoom={12}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredReports.map((report) => (
                <CircleMarker
                  key={report.id}
                  center={[report.latitude, report.longitude]}
                  radius={8}
                  fillColor={COLORS.danger}
                  color={COLORS.primary}
                  weight={2}
                  opacity={1}
                  fillOpacity={0.7}
                >
                  <Popup>
                    <div style={{ fontSize: 12 }}>
                      <strong>Tipo:</strong> {report.report_type}<br />
                      <strong>Descripción:</strong> {report.description}<br />
                      <strong>Dirección:</strong> {report.address}<br />
                      <strong>Fecha:</strong> {new Date(report.created_at).toLocaleString()}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
          {allReports.length === 0 && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
              No hay reportes para mostrar en el mapa
            </div>
          )}
        </div>
      </div>

      {/* Gráfico */}
      <div
        style={{
          height: 300,
          background: COLORS.card,
          padding: 20,
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: 24
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Reportes por tipo</h2>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={reportsByType}>
            <XAxis dataKey="type" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill={COLORS.dashboard} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Últimos reportes */}
      <div
        style={{
          background: COLORS.card,
          padding: 20,
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Últimos reportes</h2>

        <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
              <th style={{ padding: "12px 8px", fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase" }}>ID</th>
              <th style={{ padding: "12px 8px", fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase" }}>Tipo</th>
              <th style={{ padding: "12px 8px", fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase" }}>Descripción</th>
              <th style={{ padding: "12px 8px", fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase" }}>Estado</th>
              <th style={{ padding: "12px 8px", fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase" }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {recentReports.map((r) => {
              const status = r.process_end ? 'Resuelto' : r.process_start ? 'En Proceso' : 'Pendiente';
              const statusColor = r.process_end ? COLORS.success : r.process_start ? COLORS.inProgress : COLORS.pending;
              return (
                <tr key={r.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "12px 8px", fontSize: 13, color: COLORS.textPrimary }}>{r.id}</td>
                  <td style={{ padding: "12px 8px", fontSize: 13, color: COLORS.textPrimary }}>{r.report_type}</td>
                  <td style={{ padding: "12px 8px", fontSize: 13, color: COLORS.textSecondary }}>{r.description.substring(0, 40)}...</td>
                  <td style={{ padding: "12px 8px" }}>
                    <span style={{
                      background: statusColor,
                      color: "#fff",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500
                    }}>
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 8px", fontSize: 13, color: COLORS.textSecondary }}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

          </>
        )}

        {/* SECCIÓN ALERTAS */}
        {activeSection === "alertas" && (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 24, color: COLORS.textPrimary, fontWeight: 600 }}>
              Centro de Alertas
            </h1>

            {/* Alertas recientes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {allReports
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((report) => {
                  const hoursAgo = Math.floor((new Date() - new Date(report.created_at)) / (1000 * 60 * 60));
                  const isRecent = hoursAgo < 24;
                  return (
                    <div
                      key={report.id}
                      style={{
                        background: COLORS.card,
                        padding: 20,
                        borderRadius: 8,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        borderLeft: `4px solid ${isRecent ? COLORS.danger : COLORS.warning}`
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span style={{
                            background: isRecent ? "#FEE2E2" : "#FEF3C7",
                            color: isRecent ? COLORS.danger : COLORS.warning,
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            {isRecent ? "CRÍTICO" : "PENDIENTE"}
                          </span>
                          <h3 style={{ margin: "10px 0 5px 0", fontSize: 15, fontWeight: 600, color: COLORS.textPrimary }}>
                            {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                          </h3>
                          <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: 13 }}>{report.description}</p>
                          <p style={{ margin: "10px 0 0 0", fontSize: 12, color: COLORS.textSecondary }}>
                            {report.address}
                          </p>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 11, color: COLORS.textSecondary }}>
                          <p style={{ margin: 0 }}>{new Date(report.created_at).toLocaleDateString()}</p>
                          <p style={{ margin: "4px 0 0 0" }}>{new Date(report.created_at).toLocaleTimeString()}</p>
                          <p style={{ margin: "4px 0 0 0", fontWeight: 600, color: COLORS.textPrimary }}>
                            hace {hoursAgo < 1 ? "< 1" : hoursAgo}h
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {/* SECCIÓN ZONAS DE RIESGO */}
        {activeSection === "zonas" && (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 24, color: COLORS.textPrimary, fontWeight: 600 }}>
              Zonas de Riesgo
            </h1>

            {/* Mapa grande */}
            <div style={{
              background: COLORS.card,
              padding: 20,
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: 24
            }}>
              <div style={{ height: 500, borderRadius: 8, overflow: "hidden" }}>
                {allReports.length > 0 && (
                  <MapContainer
                    center={[allReports[0].latitude, allReports[0].longitude]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {allReports.map((report) => (
                      <CircleMarker
                        key={report.id}
                        center={[report.latitude, report.longitude]}
                        radius={12}
                        fillColor={REPORT_TYPE_COLORS[report.report_type] || "#6b7280"}
                        color="#fff"
                        weight={2}
                        opacity={1}
                        fillOpacity={0.8}
                      >
                        <Popup>
                          <div style={{ fontSize: 12 }}>
                            <strong style={{ color: REPORT_TYPE_COLORS[report.report_type] }}>
                              {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                            </strong><br />
                            <strong>Descripción:</strong> {report.description}<br />
                            <strong>Dirección:</strong> {report.address}<br />
                            <strong>Fecha:</strong> {new Date(report.created_at).toLocaleString()}
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                )}
              </div>
            </div>

            {/* Leyenda y estadísticas por zona */}
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{
                flex: 1,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <h3 style={{ marginTop: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>Leyenda de Tipos</h3>
                {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: REPORT_TYPE_COLORS[key]
                    }}></div>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{
                flex: 2,
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}>
                <h3 style={{ marginTop: 0, fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>Distribución por Tipo</h3>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportsByType}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ type, count }) => `${type}: ${count}`}
                      >
                        {reportsByType.map((entry, index) => (
                          <Cell key={index} fill={REPORT_TYPE_COLORS[entry.type] || "#6b7280"} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}

        {/* SECCIÓN REPORTES */}
        {activeSection === "reportes" && (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 24, color: COLORS.textPrimary, fontWeight: 600 }}>
              Historial de Reportes
            </h1>

            {/* Filtros */}
            <div style={{
              background: COLORS.card,
              padding: 16,
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              marginBottom: 16,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap"
            }}>
              <div>
                <label style={{ fontSize: 12, marginRight: 8, color: COLORS.textSecondary }}>Tipo:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 4, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
                >
                  <option value="all">Todos</option>
                  {reportTypes.map((type) => (
                    <option key={type} value={type}>
                      {REPORT_TYPE_LABELS[type] || type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, marginRight: 8, color: COLORS.textSecondary }}>Desde:</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 4, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, marginRight: 8, color: COLORS.textSecondary }}>Hasta:</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 4, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
                />
              </div>
              <button
                onClick={() => {
                  setFilterType("all");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  background: COLORS.primary,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                Limpiar
              </button>
              <span style={{ fontSize: 12, color: COLORS.textSecondary, marginLeft: "auto" }}>
                {filteredReports.length} de {allReports.length} reportes
              </span>
            </div>

            {/* Tabla de reportes */}
            <div style={{
              background: COLORS.card,
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              overflow: "hidden"
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COLORS.primary, color: "#fff" }}>
                    <th style={{ padding: 14, textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Tipo</th>
                    <th style={{ padding: 14, textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Descripción</th>
                    <th style={{ padding: 14, textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Ubicación</th>
                    <th style={{ padding: 14, textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Estado</th>
                    <th style={{ padding: 14, textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report, index) => {
                    const status = report.process_end ? 'Resuelto' : report.process_start ? 'En Proceso' : 'Pendiente';
                    const statusColor = report.process_end ? COLORS.success : report.process_start ? COLORS.inProgress : COLORS.pending;
                    return (
                      <tr key={report.id} style={{
                        background: index % 2 === 0 ? COLORS.card : COLORS.background,
                        borderBottom: `1px solid ${COLORS.border}`
                      }}>
                        <td style={{ padding: 14 }}>
                          <span style={{
                            background: REPORT_TYPE_COLORS[report.report_type] || "#6b7280",
                            color: "#fff",
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500
                          }}>
                            {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                          </span>
                        </td>
                        <td style={{ padding: 14, maxWidth: 300, fontSize: 13, color: COLORS.textPrimary }}>
                          {report.description.length > 50
                            ? report.description.substring(0, 50) + "..."
                            : report.description}
                        </td>
                        <td style={{ padding: 14, fontSize: 12, color: COLORS.textSecondary }}>
                          {report.address.length > 40
                            ? report.address.substring(0, 40) + "..."
                            : report.address}
                        </td>
                        <td style={{ padding: 14 }}>
                          <span style={{
                            background: statusColor,
                            color: "#fff",
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500
                          }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ padding: 14, fontSize: 12, color: COLORS.textSecondary }}>
                          {new Date(report.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeSection === "metricas" && (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 24, color: COLORS.textPrimary, fontWeight: 600 }}>Métricas y Tendencias</h1>

            {/* Resumen de métricas */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <div
                style={{
                  flex: 1,
                  background: COLORS.card,
                  padding: 20,
                  borderRadius: 8,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderLeft: `4px solid ${COLORS.metrics}`
                }}
              >
                <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Total días con reportes</h3>
                <p style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 0 0", color: COLORS.textPrimary }}>{reportsByDate.length}</p>
              </div>
              <div
                style={{
                  flex: 1,
                  background: COLORS.card,
                  padding: 20,
                  borderRadius: 8,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderLeft: `4px solid ${COLORS.inProgress}`
                }}
              >
                <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Promedio por día</h3>
                <p style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 0 0", color: COLORS.textPrimary }}>
                  {reportsByDate.length > 0
                    ? (totalReports / reportsByDate.length).toFixed(1)
                    : 0}
                </p>
              </div>
              <div
                style={{
                  flex: 1,
                  background: COLORS.card,
                  padding: 20,
                  borderRadius: 8,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderLeft: `4px solid ${COLORS.danger}`
                }}
              >
                <h3 style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>Máximo en un día</h3>
                <p style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 0 0", color: COLORS.textPrimary }}>
                  {reportsByDate.length > 0
                    ? Math.max(...reportsByDate.map((d) => d.count))
                    : 0}
                </p>
              </div>
            </div>

            {/* 1. Gráfico de línea por mes */}
            <div
              style={{
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: 24
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Incidencias por Mes</h2>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={COLORS.metrics}
                      strokeWidth={3}
                      name="Incidencias"
                      dot={{ fill: COLORS.metrics, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Gráfico de barras por día de semana */}
            <div
              style={{
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: 24
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Incidencias por Día de Semana</h2>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportsByWeekday}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Incidencias" fill={COLORS.dashboard}>
                      {reportsByWeekday.map((entry, index) => {
                        const maxCount = Math.max(...reportsByWeekday.map(d => d.count));
                        const isMax = entry.count === maxCount && maxCount > 0;
                        return <Cell key={index} fill={isMax ? COLORS.danger : COLORS.dashboard} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Heatmap de incidencias por día */}
            <div
              style={{
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: 24
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Heatmap de Incidencias por Día</h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
                gap: 4,
                marginTop: 16,
                maxHeight: 300,
                overflowY: "auto"
              }}>
                {heatmapData.map((item) => {
                  const maxCount = Math.max(...heatmapData.map(d => d.count));
                  const intensity = maxCount > 0 ? item.count / maxCount : 0;
                  const bgColor = intensity === 0
                    ? COLORS.background
                    : `rgba(37, 99, 235, ${0.2 + intensity * 0.8})`;
                  return (
                    <div
                      key={item.date}
                      style={{
                        aspectRatio: "1",
                        background: bgColor,
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: intensity > 0.5 ? "#fff" : COLORS.textPrimary,
                        fontWeight: 600,
                        cursor: "pointer",
                        position: "relative"
                      }}
                      title={`${item.date}: ${item.count} incidencias`}
                    >
                      {item.count}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 11, color: COLORS.textSecondary }}>
                <span>Menor</span>
                <div style={{ display: "flex", gap: 2 }}>
                  {[0.2, 0.4, 0.6, 0.8, 1].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 16,
                        height: 16,
                        background: `rgba(37, 99, 235, ${i})`,
                        borderRadius: 2
                      }}
                    />
                  ))}
                </div>
                <span>Mayor</span>
              </div>
            </div>

            {/* 4. Histograma por hora del día y tipo */}
            <div
              style={{
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: 24
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Incidencias por Hora del Día y Tipo</h2>
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportsByHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    {Object.entries(REPORT_TYPE_LABELS).map(([key, label]) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="a"
                        fill={REPORT_TYPE_COLORS[key]}
                        name={label}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla de datos por fecha */}
            <div
              style={{
                background: COLORS.card,
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>Detalle por Fecha</h2>
              <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>
                    <th style={{ padding: "12px 8px", fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase" }}>Fecha</th>
                    <th style={{ padding: "12px 8px", fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase" }}>Cantidad de Reportes</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsByDate.map((item) => (
                    <tr key={item.date} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "12px 8px", fontSize: 13, color: COLORS.textPrimary }}>{item.date}</td>
                      <td style={{ padding: "12px 8px", fontSize: 13, color: COLORS.textPrimary }}>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
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
