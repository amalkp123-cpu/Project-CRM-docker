import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "./BusinessDetails.module.css";
import { MdDelete, MdEdit } from "react-icons/md";
import { IoMdAdd } from "react-icons/io";
import BusinessPatchModal from "./patch/BusinessPatchModal";
import InsertModal from "./patch/InsertModal";
import EditTaxModal from "./patch/EditTaxModal";
import FileViewModal from "./files/FileViewModal";

const API_URL = import.meta.env.VITE_API_URL;

function truthy(v: any) {
  ``;
  return v === true || v === "t" || v === 1 || v === "true";
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function BusinessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness]: any = useState(null);
  const [addresses, setAddresses]: any[] = useState([]);
  const [shareholders, setShareholders]: any[] = useState([]);
  const [taxProfiles, setTaxProfiles]: any[] = useState([]);

  const [activeTaxType, setActiveTaxType] = useState<string | null>(null);

  const [patchModalVisible, setPatchModalVisible] = useState(false);
  const [insertModalVisible, setInsertModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [editTaxModalVisible, setEditTaxModalVisible] = useState(false);
  const [fileModalVisible, setFileModalVisible] = useState(false);

  const [selectedTaxRecord, setSelectedTaxRecord] = useState<any>(null);
  const [activeTaxRecordId, setActiveTaxRecordId] = useState<string | null>(
    null
  );

  const activeTaxRecord =
    taxProfiles
      .flatMap((tp: any) => tp.records || [])
      .find((r: any) => r.id === activeTaxRecordId) || null;

  const [user, setUser]: any = useState("");

  // ★ NEW: year filter per tax type
  const [taxYearFilter, setTaxYearFilter] = useState<
    Record<string, string | "ALL">
  >({});

  useEffect(() => {
    const userLocal = localStorage.getItem("user");
    const userSession = sessionStorage.getItem("user");
    const stored =
      (userLocal ? JSON.parse(userLocal) : null) ||
      (userSession ? JSON.parse(userSession) : null);

    setUser(stored);
  }, []);

  /* ================= FETCH ================= */

  async function fetchBusiness() {
    if (!id) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/bClient/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const data = await res.json();

      setBusiness(data.business);
      setAddresses(
        (data.addresses || []).map((a: any) => ({
          ...a,
          is_primary: truthy(a.is_primary),
          is_mailing: truthy(a.is_mailing),
        }))
      );
      setShareholders(data.shareholders || []);
      setTaxProfiles(data.tax_profiles || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBusiness();
  }, [id]);

  useEffect(() => {
    if (taxProfiles.length && !activeTaxType) {
      setActiveTaxType(taxProfiles[0].tax_type);
    }
  }, [taxProfiles]);

  /* ================= DELETE ================= */

  async function handleDelete() {
    if (!confirm(`Delete ${business.business_name}?`)) return;

    try {
      setDeleting(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/bClient/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed");

      navigate("/");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteTaxRecord(taxRecordId: string) {
    if (!confirm("Delete this tax record?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/bClient/${id}/tax-records/${taxRecordId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to delete tax record");

      fetchBusiness();
    } catch (e: any) {
      alert(e.message || "Delete failed");
    }
  }

  async function handleDeleteShareholder(shareholderId: string) {
    if (!confirm("Remove this shareholder?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/bClient/${id}/shareholders/${shareholderId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Delete failed");

      fetchBusiness(); // refresh list
    } catch (e: any) {
      alert(e.message || "Delete failed");
    }
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (err) return <div className={styles.error}>{err}</div>;
  if (!business) return <div className={styles.notFound}>Not found</div>;

  const primaryAddress = addresses.find((a: any) => a.is_primary);
  const mailingAddress = addresses.find((a: any) => a.is_mailing);

  const TAX_ORDER = ["HST", "CORPORATION", "PAYROLL", "WSIB", "ANNUAL_RENEWAL"];
  const taxTypes = TAX_ORDER.filter((t) =>
    taxProfiles.some((tp: any) => tp.tax_type === t)
  );

  return (
    <div className={styles.mainSection}>
      <div className={styles.cardSection}>
        <div className={styles.card}>
          {/* ================= HEADER ================= */}
          <div className={styles.header}>
            <h2 className={styles.title}>{business.business_name}</h2>

            <div className={styles.headerButtons}>
              <button
                className={styles.editBtn}
                onClick={() => setInsertModalVisible(true)}
              >
                <IoMdAdd size="1.5rem" />
              </button>
              <button
                className={styles.editBtn}
                onClick={() => setPatchModalVisible(true)}
              >
                <MdEdit size="1.3rem" />
              </button>
              <button
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                <MdDelete size="1.5rem" />
              </button>
            </div>
          </div>

          {/* ================= BUSINESS ================= */}
          <Section title="Business">
            <Grid>
              <Field label="Business Number" value={business.business_number} />
              <Field label="Type" value={business.business_type} />
              <Field label="Phone" value={business.phone_cell} />
              <Field label="Email" value={business.email} />
              <Field label="Fax" value={business.fax} />
            </Grid>
          </Section>

          {/* ================= ADDRESSES ================= */}
          {primaryAddress && (
            <Section title="Primary Address">
              <Grid>
                <Field label="Line 1" value={primaryAddress.address_line1} />
                <Field label="Line 2" value={primaryAddress.address_line2} />
                <Field label="City" value={primaryAddress.city} />
                <Field label="Province" value={primaryAddress.province} />
                <Field label="Postal" value={primaryAddress.postal_code} />
                <Field label="Country" value={primaryAddress.country} />
              </Grid>
            </Section>
          )}

          {mailingAddress && (
            <Section title="Mailing Address">
              <Grid>
                <Field label="Line 1" value={mailingAddress.address_line1} />
                <Field label="Line 2" value={mailingAddress.address_line2} />
                <Field label="City" value={mailingAddress.city} />
                <Field label="Province" value={mailingAddress.province} />
                <Field label="Postal" value={mailingAddress.postal_code} />
                <Field label="Country" value={mailingAddress.country} />
              </Grid>
            </Section>
          )}

          {/* ================= SHAREHOLDERS ================= */}
          {shareholders.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Shareholders</h3>
              </div>

              <div className={styles.blockContainer}>
                {shareholders.map((sh: any) => {
                  const isStandalone = !sh.client_id;

                  const displayName = sh.client_id
                    ? [sh.client_first_name, sh.client_last_name]
                        .filter(Boolean)
                        .join(" ")
                    : sh.full_name;

                  const displayDob = isStandalone ? sh.dob : sh.client_dob;

                  return (
                    <div key={sh.id} className={styles.blockWithDelete}>
                      <div className={styles.block}>
                        {/* TYPE TAG */}
                        <span className={styles.tag}>
                          {isStandalone ? "Standalone" : "Personal Client"}
                        </span>

                        {/* NAME */}
                        <div className={styles.blockTitle}>
                          {displayName || "—"}
                        </div>

                        {/* DETAILS */}
                        <Field
                          label="DOB"
                          value={displayDob ? formatDate(displayDob) : "—"}
                        />

                        <Field
                          label="Share %"
                          value={`${sh.share_percentage}%`}
                        />

                        <Field
                          label="Client Link"
                          value={isStandalone ? "No" : "Yes"}
                        />
                      </div>

                      {/* ACTIONS */}
                      <div className={styles.buttonContainer}>
                        {!isStandalone && (
                          <button
                            className={styles.editBtn}
                            onClick={() => {
                              navigate(`/personal/${sh.client_id}`);
                            }}
                            title="Open personal client"
                          >
                            Open
                          </button>
                        )}

                        <button
                          className={styles.deleteItemBtn}
                          onClick={() => handleDeleteShareholder(sh.id)}
                          title="Remove shareholder"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAXES ================= */}
          {taxProfiles.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Taxes</h3>
              </div>

              {/* TABS */}
              <div className={styles.tabNav}>
                {taxTypes.map((type) => (
                  <button
                    key={type}
                    className={`${styles.tabBtn} ${
                      activeTaxType === type ? styles.activeTab : ""
                    }`}
                    onClick={() => setActiveTaxType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* CONTENT */}
              {taxProfiles
                .filter((tp: any) => tp.tax_type === activeTaxType)
                .map((tp: any) => {
                  const records = tp.records || [];
                  const showYearFilter = records.length > 5;

                  const years = Array.from(
                    new Set(records.map((r: any) => r.tax_year))
                  ).sort((a: any, b: any) => b - a);

                  const selectedYear = taxYearFilter[tp.tax_type] || "ALL";

                  const filteredRecords =
                    selectedYear === "ALL"
                      ? records
                      : records.filter(
                          (r: any) => String(r.tax_year) === selectedYear
                        );

                  return (
                    <div key={tp.id}>
                      <div className={styles.subSection}>
                        <Grid>
                          {tp.frequency && (
                            <Field label="Frequency" value={tp.frequency} />
                          )}
                          {tp.start_date && (
                            <Field
                              label="Start Date"
                              value={formatDate(tp.start_date)}
                            />
                          )}
                          {tp.start_year && (
                            <Field label="Start Year" value={tp.start_year} />
                          )}
                          {tp.start_quarter && (
                            <Field
                              label="Start Quarter"
                              value={`Q${tp.start_quarter}`}
                            />
                          )}
                        </Grid>
                      </div>

                      {showYearFilter && (
                        <div className={styles.tableToolbar}>
                          <label>
                            Year&nbsp;
                            <select
                              value={selectedYear}
                              onChange={(e) =>
                                setTaxYearFilter((prev) => ({
                                  ...prev,
                                  [tp.tax_type]: e.target.value,
                                }))
                              }
                            >
                              <option value="ALL">All</option>
                              {years.map((y: any) => (
                                <option key={y} value={String(y)}>
                                  {y}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}

                      {/* RECORDS TABLE */}
                      {filteredRecords.length > 0 ? (
                        <div className={styles.tableContainer}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th>Year</th>
                                <th>Period</th>
                                <th>Status</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Confirmation No.</th>
                                <th>Prepared By</th>
                                <th>Files</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRecords.map((r: any) => (
                                <tr key={r.id}>
                                  <td>{r.tax_year}</td>
                                  <td>{r.tax_period || "—"}</td>
                                  <td>{r.status}</td>
                                  <td>{r.amount ?? "—"}</td>
                                  <td>{formatDate(r.tax_date)}</td>
                                  <td>{r.confirmation_number}</td>
                                  <td>{r.created_by_name}</td>
                                  <td>
                                    <button
                                      onClick={() => {
                                        setActiveTaxRecordId(r.id);
                                        setFileModalVisible(true);
                                      }}
                                    >
                                      Open
                                    </button>
                                  </td>
                                  <td>
                                    <div className={styles.buttonContainer}>
                                      <button
                                        className={styles.editBtn}
                                        onClick={() => {
                                          setSelectedTaxRecord(r);
                                          setEditTaxModalVisible(true);
                                        }}
                                      >
                                        <MdEdit size="1rem" />
                                      </button>

                                      <button
                                        className={styles.deleteBtn}
                                        onClick={() =>
                                          handleDeleteTaxRecord(r.id)
                                        }
                                      >
                                        <MdDelete size="1rem" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className={styles.emptyState}>
                          No records available.
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <BusinessPatchModal
        visible={patchModalVisible}
        business={{ ...business, addresses, tax_profiles: taxProfiles }}
        onClose={() => setPatchModalVisible(false)}
        onSaved={fetchBusiness}
      />

      <InsertModal
        visible={insertModalVisible}
        businessId={business.id}
        taxProfiles={taxProfiles}
        onClose={() => setInsertModalVisible(false)}
        onSuccess={fetchBusiness}
        user={user}
      />

      {fileModalVisible && activeTaxRecord && (
        <FileViewModal
          taxRecord={activeTaxRecord}
          businessId={business.id}
          user={user}
          onClose={() => setFileModalVisible(false)}
          onRefresh={fetchBusiness}
        />
      )}

      <EditTaxModal
        visible={editTaxModalVisible}
        taxRecord={selectedTaxRecord}
        businessId={business.id}
        taxProfiles={taxProfiles}
        onClose={() => {
          setEditTaxModalVisible(false);
          setSelectedTaxRecord(null);
        }}
        onSaved={() => {
          fetchBusiness();
          setEditTaxModalVisible(false);
          setSelectedTaxRecord(null);
        }}
      />
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

function Section({ title, children }: any) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function Grid({ children }: any) {
  return <div className={styles.gridFlex}>{children}</div>;
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className={styles.field}>
      <div className={styles.label}>{label}:</div>
      <div className={styles.value}>{value || "—"}</div>
    </div>
  );
}
