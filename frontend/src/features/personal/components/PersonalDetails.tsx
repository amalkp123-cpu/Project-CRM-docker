import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL;
import styles from "./PersonalDetails.module.css";
import PersonalPatchModal from "./patch/PersonalPatchModal";
import InsertModal from "./patch/InsertModal";
import FileViewModal from "./files/FileViewModal";
import EditTaxModal from "./patch/EditTaxModal";
import EditDependantModal from "./patch/EditDependantModal";
import { MdDelete } from "react-icons/md";
import { MdEdit } from "react-icons/md";
import { IoMdAdd } from "react-icons/io";

export default function PersonalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient]: any = useState(null);
  const [spouse, setSpouse]: any = useState(null);
  const [hideSpouse, setHideSpouse] = useState(0);
  const [patchClient, setPatchClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [patchModalVisible, setPatchModalVisible] = useState(false);
  const [insertModalVisible, setInsertModalVisible] = useState(false);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [activeTaxRecordId, setActiveTaxRecordId] = useState<string | null>(
    null
  );
  const [patchSaving, setPatchSaving] = useState(false);

  // Edit modal states
  const [editTaxModalVisible, setEditTaxModalVisible] = useState(false);
  const [editDependantModalVisible, setEditDependantModalVisible] =
    useState(false);
  const [selectedTaxRecord, setSelectedTaxRecord] = useState<any>(null);
  const [selectedDependant, setSelectedDependant] = useState<any>(null);

  const [user, setUser]: any = useState("");

  useEffect(() => {
    const userLocal = localStorage.getItem("user");
    const userSession = sessionStorage.getItem("user");
    const stored =
      (userLocal ? JSON.parse(userLocal) : null) ||
      (userSession ? JSON.parse(userSession) : null);

    setUser(stored);
  }, []);

  async function fetchClient() {
    if (!id) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/pClient/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setClient(data.client);
      setSpouse(data.spouse);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClient();
  }, [id]);

  const allDependants = [
    ...(client?.dependants ?? []),
    ...(spouse?.dependants ?? []),
  ];

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${client.first_name} ${client.last_name}?`))
      return;

    try {
      setDeleting(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/pClient/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete client");

      alert("Client deleted successfully");
      navigate("/");
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // DELETE ADDRESS
  // const handleDeleteAddress = async (addressId: string) => {
  //   if (!confirm("Delete this address?")) return;

  //   try {
  //     const token = localStorage.getItem("token");
  //     const res = await fetch(
  //       `${API_URL}/api/pClient/${id}/addresses/${addressId}`,
  //       {
  //         method: "DELETE",
  //         headers: { Authorization: `Bearer ${token}` },
  //       }
  //     );

  //     if (!res.ok) {
  //       const error = await res.json();
  //       throw new Error(error.message || "Failed to delete address");
  //     }

  //     alert("Address deleted successfully");
  //     fetchClient();
  //   } catch (error: any) {
  //     alert(`Error: ${error.message}`);
  //   }
  // };

  // DELETE DEPENDENT
  const handleDeleteDependent = async (dependentId: string) => {
    if (!confirm("Delete this dependent?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/pClient/${id}/dependents/${dependentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete dependent");
      }

      alert("Dependent deleted successfully");
      fetchClient();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // DELETE Notes
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/pClient/${id}/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete note");
      }

      alert("Note deleted successfully");
      fetchClient();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // DELETE TAX RECORD
  const handleDeleteTaxRecord = async (tax_id: any) => {
    if (!confirm(`Delete tax record for ${tax_id}?`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_URL}/api/pClient/${id}/tax-records/${tax_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete tax record");
      }

      alert("Tax record deleted successfully");
      fetchClient();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const toCapital = (s: any) =>
    s
      .toLowerCase()
      .replace(/(^\w|[\s-_]\w)/g, (m: any) => m.trim().toUpperCase());

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // Return in your preferred format
    return `${day}/${month}/${year}`; // DD/MM/YYYY
    // or return `${month}/${day}/${year}`; // MM/DD/YYYY
    // or return `${year}-${month}-${day}`; // YYYY-MM-DD
  }

  async function refreshClient() {
    await fetchClient();
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (err) return <div className={styles.error}>{err}</div>;
  if (!client) return <div className={styles.notFound}>Client not found</div>;

  const latestTax = client.tax_records?.[0];
  const spouseTax = spouse?.tax_records?.[0];

  const activeTaxRecord = client.tax_records.find(
    (tr: any) => tr.id === activeTaxRecordId
  );

  return (
    <div className={styles.mainSection}>
      <div className={styles.cardSection}>
        <div
          className={`${styles.card} ${
            spouse?.id && !hideSpouse ? "" : styles.cardFlex
          }`}
        >
          <div className={styles.header}>
            <h2 className={styles.title}>
              {client.first_name} {client.last_name}
            </h2>
            <div className={styles.headerButtons}>
              {hideSpouse == 1 ? (
                <button
                  className={styles.editBtn}
                  onClick={() => {
                    setHideSpouse(0);
                  }}
                >
                  Show spouse
                </button>
              ) : (
                ""
              )}

              <button
                className={styles.editBtn}
                onClick={() => setInsertModalVisible(true)}
                disabled={patchSaving}
                title="Insert notes, dependents, taxes"
              >
                <IoMdAdd size={"1.5rem"} />
              </button>
              <button
                className={styles.editBtn}
                onClick={() => {
                  setPatchClient(client);
                  setPatchModalVisible(true);
                }}
                disabled={patchSaving}
              >
                {patchSaving ? "Saving…" : <MdEdit size={"1.3rem"} />}
              </button>
              <button
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : <MdDelete size={"1.5rem"} />}
              </button>
            </div>
          </div>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Personal</h3>
            <div
              className={`${styles.grid} ${
                spouse?.id && !hideSpouse ? "" : styles.gridFlex
              }`}
            >
              <Field label="SIN" value={client.sin_original} />
              <Field label="DOB" value={formatDate(client.dob)} />
              <Field label="Gender" value={client.gender} />
              <Field label="Phone" value={client.phone} />
              <Field label="Email" value={client.email} />
              <Field label="Fax" value={client.fax} />
              <Field label="Status" value={latestTax?.tax_status} />
              <Field label="Tax Date" value={formatDate(latestTax?.tax_date)} />
              <Field label="Tax Year" value={latestTax?.tax_year} />
              <Field label="Marital Status" value={client.marital_status} />
              <Field
                label="Date of Marriage"
                value={formatDate(client.date_of_marriage)}
              />
              <Field
                label="Loyalty Since"
                value={formatDate(client.loyalty_since)}
              />
              <Field label="Created By" value={client.created_by_username} />
              <Field label="Created at" value={formatDate(client.created_at)} />
              <Field label="Referred By" value={client.referred_by} />
            </div>
          </div>
          {/* ADDRESSES - Updated for singular */}
          {client.addresses?.length !== 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Address</h3>
              </div>
              {client.addresses.slice(0, 1).map((addr: any) => (
                <div
                  key={addr.id}
                  className={`${styles.grid} ${
                    spouse?.id && !hideSpouse ? "" : styles.gridFlex
                  }`}
                >
                  <Field label="Line 1" value={addr.address_line1} />
                  <Field
                    label="Line 2"
                    value={addr.address_line2 ? `, ${addr.address_line2}` : ""}
                  />
                  <Field label="City" value={addr.city} />
                  <Field label="Province" value={addr.province} />
                  <Field label="Postal" value={addr.postal_code} />
                  <Field label="Country" value={addr.country} />
                </div>
              ))}
            </div>
          )}
          {/* TAX RECORDS WITH EDIT AND DELETE BUTTONS */}
          {client.tax_records?.length !== 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Tax Records</h3>
              </div>
              {client.tax_records?.length > 0 && (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Tax Year</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Created By</th>
                        <th>Prepared By</th>
                        <th>HST</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.tax_records.map((tax: any) => (
                        <tr key={tax.id}>
                          <td className={styles.taxYear}>{tax.tax_year}</td>
                          <td>
                            <span
                              className={`${styles.statusBadge} ${
                                styles[tax.tax_status]
                              }`}
                            >
                              {tax.tax_status}
                            </span>
                          </td>
                          <td>
                            {tax.tax_date ? formatDate(tax.tax_date) : "—"}
                          </td>
                          <td>{tax.created_by}</td>
                          <td>{tax.prepared_by}</td>
                          <td>
                            {tax.hst_docs === null ? (
                              "None"
                            ) : tax.hst_docs ? (
                              <button
                                onClick={() => {
                                  setActiveTaxRecordId(tax.id);
                                  setFileModalVisible(true);
                                }}
                              >
                                Open
                              </button>
                            ) : (
                              "No"
                            )}
                          </td>
                          <td>
                            <div className={styles.buttonContainer}>
                              <button
                                className={styles.editBtn}
                                onClick={() => {
                                  setSelectedTaxRecord(tax);
                                  setEditTaxModalVisible(true);
                                }}
                                title="Edit tax record"
                              >
                                <MdEdit size={"1rem"} />
                              </button>
                              <button
                                className={styles.deleteBtn}
                                onClick={() => handleDeleteTaxRecord(tax.id)}
                                title="Delete tax record"
                              >
                                <MdDelete size={"1rem"} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* NOTES WITH DELETE BUTTONS */}
          {client.notes?.length !== 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Notes</h3>
              </div>
              <div className={styles.blockContainer}>
                {client.notes.map((note: any) => (
                  <div
                    key={note.id}
                    className={`${styles.blockWithDelete} ${styles.noteBlock}`}
                  >
                    <div className={styles.block}>
                      <div>{note.note_text}</div>
                      <div className={styles.italicTag}>
                        -{note.created_by}
                        <br />
                        {formatDate(note.created_at)}
                      </div>
                    </div>
                    <button
                      className={styles.deleteItemBtn}
                      onClick={() => handleDeleteNote(note.id)}
                      title="Delete Note"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {spouse && !hideSpouse && (
          <div className={styles.card}>
            <div className={styles.header}>
              <h2 className={styles.title}>
                {spouse.first_name} {spouse.last_name}
              </h2>
              <div className={styles.headerButtons}>
                <button
                  className={styles.editBtn}
                  onClick={() => {
                    setPatchClient(spouse);
                    setPatchModalVisible(true);
                  }}
                  disabled={patchSaving}
                >
                  {patchSaving ? "Saving…" : <MdEdit size={"1.3rem"} />}
                </button>
                <button
                  className={styles.editBtn}
                  onClick={() => {
                    setHideSpouse(1);
                  }}
                >
                  Hide
                </button>
                <button
                  className={styles.editBtn}
                  onClick={() => {
                    navigate(`/personal/${spouse.id}`);
                  }}
                >
                  Open
                </button>
              </div>
            </div>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Personal</h3>
              <div className={styles.grid}>
                <Field label="SIN" value={spouse.sin_original} />
                <Field label="DOB" value={formatDate(spouse.dob)} />
                <Field label="Gender" value={spouse.gender} />
                <Field label="Phone" value={spouse.phone} />
                <Field label="Email" value={spouse.email} />
                <Field label="Fax" value={spouse.fax} />
                <Field label="Status" value={spouseTax?.tax_status} />
                <Field
                  label="Tax Date"
                  value={formatDate(spouseTax?.tax_date)}
                />
                <Field label="Tax Year" value={spouseTax?.tax_year} />
                <Field label="Marital Status" value={spouse.marital_status} />
                <Field
                  label="Date of Marriage"
                  value={formatDate(spouse.date_of_marriage)}
                />
                <Field
                  label="Loyalty Since"
                  value={formatDate(spouse.loyalty_since)}
                />
                <Field label="Created By" value={spouse.created_by_username} />
                <Field
                  label="Created at"
                  value={formatDate(spouse.created_at)}
                />
              </div>
            </div>
            {/* ADDRESSES - Updated for singular */}
            {spouse.addresses?.length !== 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Addresses</h3>
                </div>
                {spouse.addresses.slice(0, 1).map((addr: any) => (
                  <div
                    key={addr.id}
                    className={`${styles.grid} ${
                      spouse?.id && !hideSpouse ? "" : styles.gridFlex
                    }`}
                  >
                    <Field label="Line 1" value={addr.address_line1} />
                    <Field
                      label="Line 2"
                      value={
                        addr.address_line2 ? `, ${addr.address_line2}` : ""
                      }
                    />
                    <Field label="City" value={addr.city} />
                    <Field label="Province" value={addr.province} />
                    <Field label="Postal" value={addr.postal_code} />
                    <Field label="Country" value={addr.country} />
                  </div>
                ))}
              </div>
            )}
            {/* TAX RECORDS WITH DELETE BUTTONS */}
            {spouse.tax_records?.length !== 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Tax Records</h3>
                </div>
                {spouse.tax_records?.length > 0 && (
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Tax Year</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Created By</th>
                          <th>Prepared By</th>
                          <th>HST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spouse.tax_records.map((tax: any) => (
                          <tr key={tax.id}>
                            <td className={styles.taxYear}>{tax.tax_year}</td>
                            <td>
                              <span
                                className={`${styles.statusBadge} ${
                                  styles[tax.tax_status]
                                }`}
                              >
                                {tax.tax_status}
                              </span>
                            </td>
                            <td>
                              {tax.tax_date ? formatDate(tax.tax_date) : "—"}
                            </td>
                            <td>{tax.created_by}</td>
                            <td>{tax.prepared_by}</td>
                            <td>
                              {tax.hst_required === null
                                ? "None"
                                : tax.hst_required
                                ? "Yes"
                                : "No"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {/* NOTES WITH DELETE BUTTONS */}
            {spouse.notes?.length !== 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Notes</h3>
                </div>
                <div className={styles.blockContainer}>
                  {spouse.notes.map((note: any) => (
                    <div key={note.id} className={styles.blockWithDelete}>
                      <div className={styles.block}>
                        <div>{note.note_text}</div>
                        <div className={styles.italicTag}>
                          -{note.created_by}
                          <br />
                          {formatDate(note.created_at)}
                        </div>
                      </div>
                      <button
                        className={styles.deleteItemBtn}
                        onClick={() => handleDeleteNote(note.id)}
                        title="Delete Note"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DEPENDANTS WITH EDIT AND DELETE BUTTONS */}
      {allDependants.length > 0 && (
        <div className={`${styles.section} ${styles.dependentSection}`}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Dependants</h3>
          </div>

          <div className={styles.blockContainer}>
            {allDependants.map((dep: any) => (
              <div key={dep.id} className={styles.blockWithDelete}>
                <div className={styles.block}>
                  <span className={styles.tag}>
                    {toCapital(dep.relationship)}
                  </span>

                  <div className={styles.blockTitle}>
                    {dep.first_name} {dep.last_name}
                  </div>

                  <Field label="DOB" value={formatDate(dep.dob)} />

                  {dep.disability && (
                    <Field
                      label="Disability Notes"
                      value={dep.disability_notes}
                    />
                  )}
                </div>

                <div className={styles.buttonContainer}>
                  <button
                    className={styles.editBtn}
                    onClick={() => {
                      setSelectedDependant(dep);
                      setEditDependantModalVisible(true);
                    }}
                    title="Edit dependent"
                  >
                    <MdEdit size={"1rem"} />
                  </button>
                  <button
                    className={styles.deleteItemBtn}
                    onClick={() => handleDeleteDependent(dep.id)}
                    title="Delete dependent"
                  >
                    <MdDelete size={"1rem"} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <PersonalPatchModal
        visible={patchModalVisible}
        client={patchClient}
        onClose={() => setPatchModalVisible(false)}
        onSaved={async () => {
          setPatchSaving(true);
          try {
            await fetchClient();
          } finally {
            setPatchSaving(false);
            setPatchModalVisible(false);
          }
        }}
      />

      <InsertModal
        visible={insertModalVisible}
        onClose={() => setInsertModalVisible(false)}
        hasSpouse={spouse != null ? true : false}
        clientId={id!}
        onSuccess={() => {
          fetchClient();
        }}
        user={user}
      />

      {fileModalVisible && activeTaxRecord && (
        <FileViewModal
          taxRecord={{ ...activeTaxRecord }}
          clientId={id}
          user={user}
          onClose={() => setFileModalVisible(false)}
          onRefresh={refreshClient}
        />
      )}

      <EditTaxModal
        visible={editTaxModalVisible}
        taxRecord={selectedTaxRecord}
        clientId={id!}
        onClose={() => {
          setEditTaxModalVisible(false);
          setSelectedTaxRecord(null);
        }}
        onSaved={() => {
          fetchClient();
          setEditTaxModalVisible(false);
          setSelectedTaxRecord(null);
        }}
      />

      <EditDependantModal
        visible={editDependantModalVisible}
        dependant={selectedDependant}
        clientId={id!}
        onClose={() => {
          setEditDependantModalVisible(false);
          setSelectedDependant(null);
        }}
        onSaved={() => {
          fetchClient();
          setEditDependantModalVisible(false);
          setSelectedDependant(null);
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  action,
  classes,
}: {
  label: string;
  value: any;
  action?: () => void;
  classes?: any;
}) {
  return (
    <div className={`${styles.field} ${classes}`} onClick={action}>
      <div className={styles.label}>{label}:</div>
      <div className={styles.value}>{value || "—"}</div>
    </div>
  );
}
