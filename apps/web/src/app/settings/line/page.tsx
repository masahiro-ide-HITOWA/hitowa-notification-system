"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function LineIntegrationPage() {
  const [loading, setLoading] = useState(false);
  const [codeData, setCodeData] = useState<{
    oneTimeCode: string;
    expiresAt: string;
    lineAddFriendUrl: string;
  } | null>(null);

  const [isLinked, setIsLinked] = useState(false);

  const handleIssueCode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/line/issue-code", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCodeData(data);
        setIsLinked(false);
      } else {
        alert("エラー: " + data.error);
      }
    } catch {
      alert("予期せぬエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!codeData || isLinked) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(\/api/line/check-status?code=\\);
        const data = await res.json();

        if (data.success && data.status === "COMPLETED") {
          setIsLinked(true);
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [codeData, isLinked]);

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "24px", border: "1px solid #e0e0e0", borderRadius: "12px", fontFamily: "sans-serif", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
      <h2>LINE アカウント連携設定</h2>
      <p style={{ color: "#666" }}>HITOWAポータルの通知を LINE で受け取るための設定です。</p>

      {isLinked ? (
        <div style={{ padding: "30px", backgroundColor: "#e8f5e9", borderRadius: "8px", textAlign: "center", border: "1px solid #c8e6c9" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>✅</div>
          <h3 style={{ color: "#2e7d32", margin: "0 0 8px 0" }}>LINE アカウント連携が完了しました！</h3>
          <p style={{ color: "#4caf50", margin: 0 }}>今後、ポータルからの重要なお知らせが LINE に届きます。</p>
        </div>
      ) : !codeData ? (
        <button
          onClick={handleIssueCode}
          disabled={loading}
          style={{ padding: "12px 24px", background: "#06C755", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}
        >
          {loading ? "発行中..." : "連携用ワンタイムコードを発行する"}
        </button>
      ) : (
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <div style={{ padding: "8px 16px", backgroundColor: "#fff3cd", color: "#856404", borderRadius: "20px", display: "inline-block", fontSize: "14px", fontWeight: "bold", marginBottom: "16px" }}>
            🔄 スマホの LINE からの送信を待っています...
          </div>

          <h3>発行された連携コード</h3>
          <div style={{ fontSize: "40px", fontWeight: "bold", letterSpacing: "6px", color: "#06C755", margin: "10px 0" }}>
            {codeData.oneTimeCode}
          </div>
          <p style={{ color: "#888", fontSize: "13px" }}>
            ※ 有効期限: {new Date(codeData.expiresAt).toLocaleTimeString()} まで
          </p>

          <div style={{ marginTop: "20px", textAlign: "left", background: "#f9f9f9", padding: "16px", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 8px 0" }}>【連携手順】</h4>
            <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.6" }}>
              <li>公式 LINE を友達追加します。</li>
              <li>LINE トーク画面で上記の <strong>6桁コード（{codeData.oneTimeCode}）</strong> を送信してください。</li>
            </ol>
          </div>

          <div style={{ margin: "20px 0" }}>
            <QRCodeSVG value={codeData.lineAddFriendUrl} size={160} style={{ margin: "0 auto" }} />
          </div>
        </div>
      )}
    </div>
  );
}
