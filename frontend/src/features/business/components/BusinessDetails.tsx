import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "./BusinessDetails.module.css";
import { MdDelete, MdEdit } from "react-icons/md";
import { IoMdAdd } from "react-icons/io";
import BusinessPatchModal from "./patch/BusinessPatchModal";
import InsertModal from "./patch/InsertModal";
import EditTaxModal from "./patch/EditTaxModal";
import FileViewModal from "./files/FileViewModal";
import TaxNoteModal from "./patch/TaxNoteModal";

const API_URL = import.meta.env.VITE_API_URL || "";

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

function formatMonthYear(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(ts?: string) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BusinessDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness]: any = useState(null);
  const [addresses, setAddresses]: any[] = useState([]);
  const [shareholders, setShareholders]: any[] = useState([]);
  const [taxProfiles, setTaxProfiles]: any[] = useState([]);
  const [relatedBusinesses, setRelatedBusinesses]: any[] = useState([]);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [notes, setNotes]: any[] = useState([]);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const [activeTaxType, setActiveTaxType] = useState<string | null>(null);

  const [patchModalVisible, setPatchModalVisible] = useState(false);
  const [insertModalVisible, setInsertModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [editTaxModalVisible, setEditTaxModalVisible] = useState(false);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [taxNoteModalVisible, setTaxNoteModalVisible] = useState(false);

  const [selectedTaxRecord, setSelectedTaxRecord] = useState<any>(null);
  const [activeTaxRecordId, setActiveTaxRecordId] = useState<string | null>(
    null
  );

  const activeTaxRecord =
    taxProfiles
      .flatMap((tp: any) => tp.records || [])
      .find((r: any) => r.id === activeTaxRecordId) || null;

  const [user, setUser]: any = useState("");

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
      setRelatedBusinesses(data.relatedBusinesses || []);
      setNotes(data.notes || []);
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

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/bClient/${id}/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Delete failed");

      fetchBusiness();
    } catch (e: any) {
      alert(e.message || "Delete failed");
    }
  }

  /* ================= EDIT ================= */

  async function handleEditNoteSave() {
    if (!editingNote) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/bClient/${id}/notes/${editingNote.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ note: noteDraft }),
        }
      );

      if (!res.ok) throw new Error("Update failed");

      setEditingNote(null);
      setNoteDraft("");
      fetchBusiness();
    } catch (e: any) {
      alert(e.message || "Update failed");
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

  function toCamelCaseText(str = "") {
  return str
    .toString()
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)           // split by space, _ or -
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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
          <Section title="Business Details">
            <Grid>
              <Field label="Business Number" value={business.business_number} />
              <Field label="Type" value={business.business_type} />
              <Field
                label="Incorporation Date"
                value={formatDate(business.incorporation_date)}
              />
              <Field
                label="Jurisdiction"
                value={business.incorporation_jurisdiction}
              />
              <Field
                label="Fiscal Year End"
                value={formatMonthYear(business.fiscal_year_end)}
              />
              <Field
                label="Ontario Corp #"
                value={business.ontario_corp_number}
              />
              <Field label="Phone (Cell)" value={business.phone_cell} />
              <Field label="Phone (Home)" value={business.phone_home} />
              <Field label="Phone (Work)" value={business.phone_work} />
              <Field label="Fax" value={business.fax} />
              <Field label="Email" value={business.email} />
              <Field
                label="Loyalty Since"
                value={formatDate(business.loyalty_since)}
              />
              <Field label="Referred By" value={business.referred_by} />
            </Grid>
          </Section>

          {/* ================= BASIC ================= */}
          <Section title="Basic Information">
            <Grid>
              <Field
                label="Contact Name"
                value={business.contact_name || "—"}
              />

              <Field
                label="HST Registration"
                value={
                  taxProfiles.find((p: any) => p.tax_type === "HST")
                    ?.registeredstatus
                    ? "Registered"
                    : "Not Registered"
                }
              />

              <Field
                label="Corporation Registration"
                value={
                  taxProfiles.find((p: any) => p.tax_type === "CORPORATION")
                    ?.registeredstatus
                    ? "Registered"
                    : "Not Registered"
                }
              />

              <Field
                label="Payroll Registration"
                value={
                  taxProfiles.find((p: any) => p.tax_type === "PAYROLL")
                    ?.registeredstatus
                    ? "Registered"
                    : "Not Registered"
                }
              />

              <Field
                label="WSIB Registration"
                value={
                  taxProfiles.find((p: any) => p.tax_type === "WSIB")
                    ?.registeredstatus
                    ? "Registered"
                    : "Not Registered"
                }
              />

              <Field
                label="Annual Renewal Date"
                value={(() => {
                  const ar = taxProfiles.find(
                    (p: any) => p.tax_type === "ANNUAL_RENEWAL"
                  );
                  if (!ar || !ar.registeredstatus) return "Not Registered";
                  if (!ar.start_date) return "Registered";
                  return new Date(ar.start_date).toLocaleDateString();
                })()}
              />
            </Grid>
          </Section>

          {/* ================= ADDRESSES ================= */}
          {(primaryAddress || mailingAddress) && (
            <div className={styles.addressContainer}>
              {primaryAddress && (
                <Section
                  title="Primary Address"
                  className={styles.addressSection}
                >
                  <div className={styles.addressLine}>
                    <span className={styles.addressTop}>
                      {[
                        primaryAddress.address_line1,
                        primaryAddress.address_line2,
                      ]
                        .filter(Boolean)
                        .map(toCamelCaseText)
                        .join(", ")}
                    </span>
                    <br />
                    <span className={styles.addressBottom}>
                      {[
                        primaryAddress.city,
                        primaryAddress.province,
                        primaryAddress.postal_code,
                        primaryAddress.country,
                      ]
                        .filter(Boolean)
                        .map(toCamelCaseText)
                        .join(", ")}
                    </span>
                  </div>
                </Section>
              )}

              {mailingAddress && (
                <Section
                  title="Mailing Address"
                  className={styles.addressSection}
                >
                  <div className={styles.addressLine}>
                    <span className={styles.addressTop}>
                      {[
                        mailingAddress.address_line1,
                        mailingAddress.address_line2,
                      ]
                        .filter(Boolean)
                        .map(toCamelCaseText)
                        .join(", ")}
                    </span>
                    <br />
                    <span className={styles.addressBottom}>
                      {[
                        mailingAddress.city,
                        mailingAddress.province,
                        mailingAddress.postal_code,
                        mailingAddress.country,
                      ]
                        .filter(Boolean)
                        .map(toCamelCaseText)
                        .join(", ")}
                    </span> 
                  </div>
                </Section>
              )}
            </div>
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

                  return (
                    <div key={sh.id} className={styles.blockWithDelete}>
                      <div className={styles.block}>
                        {/* TYPE */}
                        <span className={styles.tag}>
                          {isStandalone ? "Standalone" : "Personal Client"}
                        </span>

                        {/* NAME */}
                        <div className={styles.blockTitle}>
                          {sh.full_name || "—"}
                        </div>

                        {/* DETAILS */}
                        <Field
                          label="DOB"
                          value={sh.dob ? formatDate(sh.dob) : "—"}
                        />

                        <Field label="SIN" value={sh.sin_original} />

                        <Field
                          label="Share %"
                          value={`${sh.share_percentage}%`}
                        />

                        <Field
                          label="Linked Client"
                          value={isStandalone ? "No" : "Yes"}
                        />
                      </div>

                      {/* ACTIONS */}
                      <div className={styles.buttonContainer}>
                        {!isStandalone && (
                          <button
                            className={styles.editBtn}
                            onClick={() =>
                              navigate(`/personal/${sh.client_id}`)
                            }
                          >
                            Open
                          </button>
                        )}

                        <button
                          className={styles.deleteItemBtn}
                          onClick={() => handleDeleteShareholder(sh.id)}
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

          {/* ================= RELATED BUSINESSES ================= */}
          {relatedBusinesses.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Related Businesses</h3>
              </div>

              <div className={styles.blockContainer}>
                {relatedBusinesses.map((rb: any) => (
                  <div key={rb.id} className={styles.blockWithDelete}>
                    <div className={styles.block}>
                      {/* TYPE TAG */}
                      <span className={styles.tag}>Business</span>

                      {/* NAME */}
                      <div className={styles.blockTitle}>
                        {rb.business_name || "—"}
                      </div>

                      {/* DETAILS */}
                      <Field label="Business No." value={rb.business_number} />
                      <Field label="Email" value={rb.email} />
                      <Field
                        label="Phone"
                        value={rb.phone_cell || rb.phone || "—"}
                      />
                    </div>

                    {/* ACTIONS */}
                    <div className={styles.buttonContainer}>
                      <button
                        className={styles.editBtn}
                        onClick={() => navigate(`/business/${rb.id}`)}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
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

                                {/* 👇 Show From/To columns ONLY for HST Quarterly */}
                                {tp.tax_type === "HST" &&
                                  tp.frequency &&
                                  tp.frequency.toLowerCase() ===
                                    "quarterly" && (
                                    <>
                                      <th>From</th>
                                      <th>To</th>
                                    </>
                                  )}

                                <th>Status</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Confirmation No.</th>
                                <th>Prepared By</th>
                                <th>Notes</th>
                                <th>Files</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRecords.map((r: any) => (
                                <tr key={r.id}>
                                  <td>{r.tax_year}</td>
                                  <td>{r.tax_period || "—"}</td>

                                  {/* 👇 Match condition — show from/to dates */}
                                  {tp.tax_type === "HST" &&
                                    tp.frequency &&
                                    tp.frequency.toLowerCase() ===
                                      "quarterly" && (
                                      <>
                                        <td>
                                          {r.from_date
                                            ? formatDate(r.from_date)
                                            : "—"}
                                        </td>
                                        <td>
                                          {r.to_date
                                            ? formatDate(r.to_date)
                                            : "—"}
                                        </td>
                                      </>
                                    )}

                                  <td>{r.status}</td>
                                  <td>{r.amount ?? "—"}</td>
                                  <td>{formatDate(r.tax_date)}</td>
                                  <td>{r.confirmation_number}</td>
                                  <td>{r.created_by_name}</td>
                                  <td>
                                    <button
                                      onClick={() => {
                                        setActiveTaxRecordId(r.id);
                                        setTaxNoteModalVisible(true);
                                      }}
                                    >
                                      Open
                                    </button>
                                  </td>

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

          {/* ================= NOTES ================= */}
          {notes.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Notes</h3>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Note</th>
                      <th>Created By</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllNotes ? notes : notes.slice(0, 5)).map(
                      (note: any) => (
                        <tr key={note.id}>
                          <td>
                            <td>
                              {editingNote?.id === note.id ? (
                                <textarea
                                  value={noteDraft}
                                  onChange={(e) => setNoteDraft(e.target.value)}
                                  rows={2}
                                  className={styles.noteEditInput}
                                  autoFocus
                                />
                              ) : (
                                note.note_text
                              )}
                            </td>
                          </td>
                          <td>{note.created_by}</td>
                          <td>{formatDateTime(note.created_at)}</td>
                          <td>
                            <div className={styles.buttonContainer}>
                              {editingNote?.id === note.id ? (
                                <>
                                  <button
                                    className={styles.editBtn}
                                    onClick={handleEditNoteSave}
                                  >
                                    Save
                                  </button>

                                  <button
                                    className={styles.deleteBtn}
                                    onClick={() => {
                                      setEditingNote(null);
                                      setNoteDraft("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className={styles.editBtn}
                                    title="Edit note"
                                    onClick={() => {
                                      setEditingNote(note);
                                      setNoteDraft(note.note_text);
                                    }}
                                  >
                                    <MdEdit size="1rem" />
                                  </button>

                                  <button
                                    className={styles.deleteBtn}
                                    title="Delete note"
                                    onClick={() => handleDeleteNote(note.id)}
                                  >
                                    <MdDelete size="1rem" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {notes.length > 5 && (
                <button
                  className={styles.editBtn}
                  onClick={() => setShowAllNotes((v) => !v)}
                >
                  {showAllNotes ? "Show less" : "Show more"}
                </button>
              )}
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

      {taxNoteModalVisible && activeTaxRecordId && (
        <TaxNoteModal
          taxRecordId={activeTaxRecordId}
          businessId={business.id}
          onClose={() => setTaxNoteModalVisible(false)}
          onSaved={() => {
            fetchBusiness();
            setTaxNoteModalVisible(false);
          }}
        />
      )}
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
