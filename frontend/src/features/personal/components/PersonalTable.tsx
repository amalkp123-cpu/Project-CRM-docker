// PersonalTable.tsx
import React from "react";
import styles from "./PersonalTable.module.css";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL || "";

type Row = string[];

/** Client data from API */
interface ClientData {
  id: string;
  first_name: string;
  last_name: string;
  tax_status: string;
  phone: string;
  email: string;
  latest_tax_year?: number;
  latest_tax_date?: string;
  spouse_name?: string;
}

/** props for PersonalTable */
interface PersonalTableProps {
  search?: string;
  status?: string;
  filters?: Record<number, string | number | undefined>;
  filterFn?: (row: Row) => boolean;
  limit?: number;
  data?: Row[];
}

const headers: string[] = [
  "Client Name",
  "Status",
  "Phone Number",
  "Email ID",
  "Tax Date",
  "Tax Year",
  "Spouse",
  "",
];

const getData = async (): Promise<Row[]> => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_URL}/api/pClient/?limit=0`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch data");
    }

    const result = await response.json();

    // Extract clients from the response
    const clients: ClientData[] = result.data || [];

    const rows = clients.map((client) => {
      return [
        client.id || "",
        `${client.first_name || ""} ${client.last_name || ""}`.trim(),
        client.tax_status || "N/A",
        client.phone || "N/A",
        client.email || "N/A",
        client.latest_tax_date
          ? new Date(client.latest_tax_date).toLocaleDateString()
          : "N/A",
        client.latest_tax_year?.toString() || "N/A",
        client.spouse_name || "N/A",
      ];
    });

    return rows;
  } catch (error: any) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

const PersonalTable: React.FC<PersonalTableProps> = ({
  search = "",
  filterFn,
  limit,
  data,
}) => {
  const navigate = useNavigate();
  const [tableData, setTableData] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getData();

        setTableData(result);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if data prop is not provided
    if (!data) {
      fetchData();
    } else {
      setTableData(data);
      setLoading(false);
    }
  }, [data]);

  const goToClient = (rawId?: string | number) => {
    const raw = rawId == null ? "" : String(rawId);
    const id = raw.startsWith("#") ? raw.substring(1) : raw;
    if (!id) return;
    navigate(`/personal/${id}`);
  };

  const normalizedSearch = String(search ?? "")
    .trim()
    .toLowerCase();

  const matchesFilters = (row: Row): boolean => {
    if (typeof filterFn === "function") return !!filterFn(row);

    if (normalizedSearch) {
      // Check each cell, excluding spouse column (index 7)
      for (let idx = 0; idx < row.length; idx++) {
        // Skip spouse column (index 7)
        if (idx === 7) continue;

        const cell = row[idx];
        const cellValue = String(cell ?? "");

        // Special handling for phone number (index 3)
        if (idx === 3) {
          // Remove all non-numeric characters from both the cell value and search term
          const numericCell = cellValue.replace(/\D/g, "");
          const numericSearch = normalizedSearch.replace(/\D/g, "");
          if (numericSearch && numericCell.includes(numericSearch)) {
            return true;
          }
        } else {
          // Standard search for other fields
          const lowerCellValue = cellValue.toLowerCase();
          if (lowerCellValue.includes(normalizedSearch)) {
            return true;
          }
        }
      }
      return false;
    }

    return true;
  };
  const filtered = tableData.filter(matchesFilters);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {headers.map((h, idx) => (
            <th key={idx} className={styles.tableHeader}>
              {h}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {filtered.length === 0 ? (
          <tr>
            <td
              colSpan={headers.length}
              style={{ textAlign: "center", padding: "20px" }}
            >
              No clients found
            </td>
          </tr>
        ) : (
          filtered
            .slice(0, limit ? limit : filtered.length)
            .map((row, rIdx) => (
              <tr
                key={rIdx}
                className={styles.rowClickable}
                onClick={() => goToClient(row[0])}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToClient(row[0]);
                  }
                }}
                role="link"
                aria-label={`Open client ${row[1] ?? row[0]}`}
              >
                {/* Client Name */}
                <td className={styles.tableCell}>{row[1]}</td>
                {/* Status */}
                <td
                  className={`${styles.tableCell} ${styles.statusCell} ${
                    styles[row[2].toLowerCase()]
                  }`}
                >
                  <span>{row[2]}</span>
                </td>
                {/* Phone */}
                <td className={styles.tableCell}>{row[3]}</td>
                {/* Email */}
                <td className={styles.tableCell}>{row[4]}</td>
                {/* Last Filed */}
                <td className={styles.tableCell}>{row[5]}</td>
                {/* Tax Year */}
                <td className={styles.tableCell}>{row[6]}</td>
                {/* Spouse */}
                <td className={styles.tableCell}>{row[7]}</td>
                {/* Action Button */}
                <td className={styles.tableCell}>
                  <button
                    type="button"
                    className={styles.viewBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToClient(row[0]);
                    }}
                    aria-label={`View details for ${row[1] ?? row[0]}`}
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))
        )}
      </tbody>
    </table>
  );
};

export default PersonalTable;
