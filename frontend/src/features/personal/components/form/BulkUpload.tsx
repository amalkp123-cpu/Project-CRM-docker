import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type BulkResult = { created: number; failed: number; errors?: any[] };

export type BulkUploadModalProps = {
  visible: boolean;
  onClose: (result?: BulkResult) => void;
  apiUrl: string;
  defaultCreatedBy?: string;
};

export default function BulkUploadModal({
  visible,
  onClose,
  apiUrl,
  defaultCreatedBy,
}: BulkUploadModalProps) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setRows(null);
      setError(null);
      setUploading(false);
      setPreviewCount(null);
    }
  }, [visible]);

  function rowToClient(row: any) {
    const client: any = {
      firstName: row.firstName?.trim(),
      lastName: row.lastName?.trim(),
      dob: row["dob (YYYY-MM-DD)"] || null,
      sin: row.sin || null,
      phone: row.phone || null,
      email: row.email || null,
      maritalStatus: row.maritalStatus || null,
      dateOfMarriage: row["dateOfMarriage (YYYY-MM-DD)"] || null,
      createdBy: row.createdBy || defaultCreatedBy || null,
      addresses: [
        {
          line1: row.line1 || "",
          line2: row.line2 || "",
          city: row.city || "",
          province: row.province || "",
          postalCode: row.postalCode || "",
          country: row.country || "Canada",
        },
      ],
    };

    if (row.spouseFirstName && row.spouseLastName) {
      client.spouseFirstName = row.spouseFirstName?.trim();
      client.spouseLastName = row.spouseLastName?.trim();
      client.spouseDob = row["spouseDob (YYYY-MM-DD)"] || null;
      client.spouseSin = row.spouseSin || null;
      client.spousePhone = row.spousePhone || null;
      client.spouseEmail = row.spouseEmail || null;
    }

    return client;
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const raw = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      if (!raw.length) {
        setError("Excel sheet is empty");
        return;
      }

      const compiled = raw.map(rowToClient);
      setRows(compiled);
      setPreviewCount(compiled.length);
    } catch {
      setError("Failed to read XLSX file");
    }
  }

  async function handleUpload() {
    if (!rows || rows.length === 0) {
      setError("No data loaded");
      return;
    }

    const validationErrors: { row: number; reason: string }[] = [];

    rows.forEach((c, i) => {
      if (!c.firstName || !c.lastName) {
        validationErrors.push({
          row: i + 2,
          reason: "Missing firstName or lastName",
        });
      }
    });

    if (validationErrors.length > 0) {
      const v = validationErrors[0];
      setError(`Validation failed at row ${v.row}: ${v.reason}`);
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
        body: JSON.stringify(rows),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || `Upload failed (${res.status})`);
      }

      const result = await res.json().catch(() => ({}));
      onClose({
        created: result.created ?? rows.length,
        failed: result.failed ?? 0,
        errors: result.errors,
      });
    } catch (e: any) {
      setError(e.message || "Bulk upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!visible) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <strong>Bulk upload (XLSX)</strong>
          <button onClick={() => onClose()} style={iconButtonStyle}>
            ✕
          </button>
        </div>

        <input
          type="file"
          accept=".xlsx"
          onChange={handleFile}
          style={{ marginBottom: 12 }}
        />

        {previewCount != null && (
          <div style={{ fontSize: 12 }}>{previewCount} rows loaded</div>
        )}

        <div style={metaRowStyle}>
          <button onClick={() => onClose()} style={secondaryButtonStyle}>
            Close
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={primaryButtonStyle}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
      </div>
    </div>
  );
}

/* styles */

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
  width: "min(900px, 94vw)",
  background: "#fff",
  borderRadius: 8,
  padding: 16,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 12,
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 12,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#0b66ff",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: 6,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  color: "#333",
  padding: "6px 12px",
  borderRadius: 6,
  background: "#fff",
};

const iconButtonStyle: React.CSSProperties = {
  color: "#333",
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
