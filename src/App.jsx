import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

function App() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("reports").select("*");
      setReports(data || []);
    };
    load();
  }, []);

  return (
    <div>
      <h1>Dashboard Tombo</h1>
      <ul>
        {reports.map((r) => (
          <li key={r.id}>{r.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
