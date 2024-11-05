import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [captchaKey, setCaptchaKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/get-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error("Failed to fetch site key");

      const data = await response.json();
      setCaptchaKey(data.siteKey);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>What is Site Key?</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Website URL:
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            style={{ margin: "10px 0", padding: "5px" }}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Check Site Key"}
        </button>
      </form>

      {captchaKey && (
        <p>
          Site Key: <strong>{captchaKey}</strong>
        </p>
      )}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}
