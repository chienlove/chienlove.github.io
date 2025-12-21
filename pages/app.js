// /pages/test-appstore-html-v2.js
import { useState } from "react";

export default function TestAppStoreHTMLv2() {
  const [input, setInput] = useState("https://apps.apple.com/app/id6755608044");
  const [countries, setCountries] = useState("us,vn,hk,jp,sg,th");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  async function run() {
    setLoading(true);
    setErr(null);
    setData(null);
    try {
      const r = await fetch("/api/app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appid_or_url: input,
          countries: countries.split(",").map(s => s.trim()).filter(Boolean),
          prefer: "iphone",
          html_fallback: true,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const shots = data?.screenshots || [];

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>Test App Store screenshots (v2)</h1>
      <p style={{ marginTop: 8, color: "#555" }}>
        Ưu tiên iPhone (1A). Multi-country lookup + fallback parse HTML (JSON nhúng).
      </p>

      <div style={{ display: "grid", gap: 8, maxWidth: 900 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="App ID hoặc App Store URL"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <input
          value={countries}
          onChange={(e) => setCountries(e.target.value)}
          placeholder="countries: us,vn,hk,jp,sg,th"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <button
          onClick={run}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #333", background: "#fff", width: 160 }}
        >
          {loading ? "Đang test..." : "Test"}
        </button>
      </div>

      {err && <div style={{ marginTop: 12, color: "crimson" }}>Error: {err}</div>}

      {data && (
        <>
          <div style={{ marginTop: 12, padding: 12, background: "#f6f6f6", borderRadius: 8 }}>
            <div><b>AppId:</b> {data.appId}</div>
            <div><b>Prefer:</b> {data.prefer}</div>
            <div><b>iTunes best country:</b> {data.itunes_best_country} (score {data.itunes_best_score})</div>
            <div><b>trackViewUrl:</b> <a href={data.trackViewUrl} target="_blank" rel="noreferrer">{data.trackViewUrl}</a></div>
            <div><b>Screenshots source:</b> {data.screenshots_source}</div>
            <div><b>HTML notes:</b> {data.debug?.html_notes?.join(" | ")}</div>
          </div>

          <h2 style={{ marginTop: 16 }}>Screenshots ({shots.length})</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
            {shots.slice(0, 40).map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer"
                 style={{ display: "block", border: "1px solid #eee", borderRadius: 8, overflow: "hidden" }}>
                <img src={u} alt="" style={{ width: "100%", display: "block" }} />
              </a>
            ))}
          </div>

          <h2 style={{ marginTop: 16 }}>Raw JSON</h2>
          <pre style={{ whiteSpace: "pre-wrap", background: "#0b1020", color: "#e7e7e7", padding: 12, borderRadius: 8 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}