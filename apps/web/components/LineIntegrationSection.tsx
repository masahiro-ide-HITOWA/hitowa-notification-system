"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DEMO_USER_PROFILE } from "@/lib/saml-user-attributes";

export function LineIntegrationSection() {
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
        const res = await fetch("/api/line/check-status?code=" + codeData.oneTimeCode, {
          headers: {
            "x-user-email": DEMO_USER_PROFILE.email,
            "x-user-id": DEMO_USER_PROFILE.portalUserId,
          },
        });
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
    <div style={{ padding: "24px", border: "1px solid #e0e0e0", borderRadius: "12px", background: "#fff", marginTop: "24px" }}>
      <h3 style={{ margin: "0 0 8px 0" }}>💬 LINE 通知連携</h3>
      <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>
        HITOWAポータルからの重要なお知らせを LINE アプリで受け取ることができます。
      </p>

      {isLinked ? (
        <div style={{ padding: "20px", backgroundColor: "#e8f5e9", borderRadius: "8px", textAlign: "center", border: "1px solid #c8e6c9" }}>
          <div style={{ fontSize: "32px", marginBottom: "4px" }}>✅</div>
          <h4 style={{ color: "#2e7d32", margin: "0 0 4px 0" }}>LINE アカウント連携済み</h4>
          <p style={{ color: "#4caf50", margin: 0, fontSize: "13px" }}>プッシュ通知の受信設定が有効になっています。</p>
        </div>
      ) : !codeData ? (
        <button
          onClick={handleIssueCode}
          disabled={loading}
          style={{ padding: "10px 20px", background: "#06C755", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
        >
          {loading ? "発行中..." : "LINE 連携用コードを発行する"}
        </button>
      ) : (
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <div style={{ padding: "6px 12px", backgroundColor: "#fff3cd", color: "#856404", borderRadius: "16px", display: "inline-block", fontSize: "13px", fontWeight: "bold", marginBottom: "12px" }}>
            🔄 LINE トーク画面からの送信を待っています...
          </div>

          <div style={{ fontSize: "32px", fontWeight: "bold", letterSpacing: "4px", color: "#06C755", margin: "8px 0" }}>
            {codeData.oneTimeCode}
          </div>
          <p style={{ color: "#888", fontSize: "12px", margin: "0 0 16px 0" }}>
            ※ 有効期限: {new Date(codeData.expiresAt).toLocaleTimeString()} まで
          </p>

          <div style={{ textAlign: "left", background: "#f9f9f9", padding: "12px 16px", borderRadius: "8px", fontSize: "13px" }}>
            <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>手順:</p>
            <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.5" }}>
              <li>公式 LINE を友達追加してください。</li>
              <li>トーク画面で <strong>{codeData.oneTimeCode}</strong> と送信してください。</li>
            </ol>
          </div>

          <div style={{ marginTop: "16px" }}>
            <QRCodeSVG value={codeData.lineAddFriendUrl} size={140} style={{ margin: "0 auto" }} />
          </div>
        </div>
      )}
    </div>
  );
}