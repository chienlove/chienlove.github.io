// /pages/test-appstore-html.js
import { useState } from "react";

export default function TestAppStoreHTML() {
  const [input, setInput] = useState("6755608044");
  const [country, setCountry] = useState("us");
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
        body: JSON.stringify({ appid_or_url: input, country }),
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

  const screenshots = data?.sources?.screenshots === "itunes"
    ? data?.screenshots_from_itunes
    : data?.screenshots_from_html;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0 }}>Test App Store HTML fallback</h1>
      <p style={{ marginTop: 8, color: "#555" }}>
        Nhập App ID hoặc App Store URL → API sẽ thử iTunes lookup và parse HTML apps.apple.com để lấy screenshot.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="App ID hoặc App Store URL"
          style={{ flex: 1, minWidth: 260, padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
        >
          {["us","vn","hk","jp","sg","th"].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
        <button
          onClick={run}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #333", background: "#fff" }}
        >
          {loading ? "Đang test..." : "Test"}
        </button>
      </div>

      {err && <div style={{ marginTop: 12, color: "crimson" }}>Error: {err}</div>}

      {data && (
        <>
          <div style={{ marginTop: 12, padding: 12, background: "#f6f6f6", borderRadius: 8 }}>
            <div><b>AppId:</b> {data.appId}</div>
            <div><b>Country:</b> {data.country}</div>
            <div><b>trackViewUrl:</b> <a href={data.trackViewUrl} target="_blank" rel="noreferrer">{data.trackViewUrl}</a></div>
            <div><b>Screenshots source:</b> {data.sources?.screenshots}</div>
            <div><b>HTML notes:</b> {data.html_parse_notes?.join(" | ")}</div>
          </div>

          <h2 style={{ marginTop: 16 }}>Screenshots ({screenshots?.length || 0})</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {(screenshots || []).slice(0, 30).map((u) => (
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