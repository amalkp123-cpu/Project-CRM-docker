import React, { useEffect, useState } from "react";

type BulkResult = { created: number; failed: number; errors?: any[] };

export type BulkUploadModalProps = {
  visible: boolean;
  onClose: (result?: BulkResult) => void;
  apiUrl: string; // base api url, e.g. process.env.VITE_API_URL
  defaultCreatedBy?: string;
  // optional: a function to transform each client before upload
  normalizeClient?: (c: any) => any;
};

export default function BulkUploadModal({
  visible,
  onClose,
  apiUrl,
  defaultCreatedBy,
  normalizeClient,
}: BulkUploadModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setJsonText("");
      setError(null);
      setUploading(false);
      setPreviewCount(null);
    }
  }, [visible]);

  function basicNormalize(c: any) {
    const copy = { ...c };
    if (!copy.createdBy && defaultCreatedBy) copy.createdBy = defaultCreatedBy;
    if (!Array.isArray(copy.addresses))
      copy.addresses = [
        {
          line1: "",
          line2: "",
          country: "Canada",
          province: "",
          city: "",
          postalCode: "",
        },
      ];
    if (!Array.isArray(copy.dependents)) copy.dependents = [];
    if (!Array.isArray(copy.taxDetails)) copy.taxDetails = [];
    if (!Array.isArray(copy.spouseTaxDetails)) copy.spouseTaxDetails = [];
    return copy;
  }

  function tryParseAndPreview() {
    setError(null);
    if (!jsonText.trim()) {
      setPreviewCount(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.clients)
        ? parsed.clients
        : null;
      if (!arr) {
        setError("Expected an array of client objects or { clients: [...] }");
        setPreviewCount(null);
        return;
      }
      setPreviewCount(arr.length);
    } catch (err: any) {
      setError("Invalid JSON");
      setPreviewCount(null);
    }
  }

  async function handleUpload() {
    setError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err: any) {
      setError("Invalid JSON. Fix syntax and try again.");
      return;
    }

    const clients = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.clients)
      ? parsed.clients
      : null;

    if (!clients) {
      setError("Expected an array of client objects or { clients: [...] }");
      return;
    }

    // light client side validation
    const validationErrors: { index: number; reason: string }[] = [];

    const normalized = clients.map((c: any, i: number) => {
      const norm = (normalizeClient || basicNormalize)(c);
      if (!norm.firstName || !norm.lastName) {
        validationErrors.push({
          index: i,
          reason: "Missing firstName or lastName",
        });
      }
      return norm;
    });

    if (validationErrors.length > 0) {
      setError(
        `Validation failed for ${validationErrors.length} item(s). Example: item ${validationErrors[0].index} ${validationErrors[0].reason}`
      );
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const endpoint = `${apiUrl.replace(/\/$/, "")}/api/pClient/bulk/`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(normalized),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg =
          (payload && (payload.message || JSON.stringify(payload))) ||
          `Upload failed with status ${res.status}`;
        setError(msg);
        setUploading(false);
        return;
      }

      const result = await res.json().catch(() => null);
      const created =
        typeof result?.created === "number"
          ? result.created
          : normalized.length;
      const failed = typeof result?.failed === "number" ? result.failed : 0;
      onClose({ created, failed, errors: result?.errors });
    } catch (err: any) {
      setError(err?.message || "Network error during bulk upload");
      setUploading(false);
    }
  }

  if (!visible) return null;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <strong>Bulk upload JSON</strong>
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              Paste an array of client objects. Example shape: firstName,
              lastName, dob, sin, phone, email, addresses, dependents,
              taxDetails
            </div>
          </div>
          <div>
            <button
              onClick={() => onClose()}
              style={iconButtonStyle}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <textarea
          aria-label="Bulk JSON input"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          onBlur={tryParseAndPreview}
          placeholder='Paste JSON array here. e.g. [{"firstName":"Jane","lastName":"Doe","email":"jane@example.com"}]'
          style={textareaStyle}
        />

        <div style={metaRowStyle}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => onClose()}
              aria-label="Close"
              style={secondaryButtonStyle}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              style={primaryButtonStyle}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>

          <div style={{ textAlign: "right" }}>
            {previewCount != null ? (
              <div style={{ fontSize: 12 }}>{previewCount} items</div>
            ) : null}
          </div>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={{ marginTop: 12, fontSize: 12, color: "#444" }}>
          Note: this component does basic client side checks only. Server side
          validation will remain authoritative.
        </div>
      </div>
    </div>
  );
}

// Simple inline styles to keep the component self contained. Extract to CSS module if you prefer.
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  width: "min(980px, 94vw)",
  maxHeight: "86vh",
  overflow: "auto",
  background: "#fff",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 220,
  fontFamily: "monospace",
  fontSize: 13,
  padding: 12,
  borderRadius: 6,
  border: "1px solid #ddd",
  boxSizing: "border-box",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 12,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  background: "#0b66ff",
  color: "#fff",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#fff",
  color: "#000",
  cursor: "pointer",
};

const iconButtonStyle: React.CSSProperties = {
  color: "#000",
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: 12,
  color: "#b00020",
  background: "#fdecea",
  padding: 8,
  borderRadius: 6,
};

/*
Usage example:



*/
