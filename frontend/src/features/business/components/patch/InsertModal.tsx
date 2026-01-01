import { useEffect, useState } from "react";
import styles from "./InsertModal.module.css";

const API_URL = import.meta.env.VITE_API_URL;

type TaxType = "HST" | "CORPORATION" | "PAYROLL" | "WSIB";

interface BusinessTaxForm {
  taxYear: string;
  taxPeriod: string;
  amount: string;
  confirmationNumber: string;
  status: "Pending" | "Filed" | "Paid";
  taxDate: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  businessId: string;
  taxProfiles: any[];
  onSuccess: () => void;
  user: any;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function InsertBusinessResourceModal({
  visible,
  onClose,
  businessId,
  taxProfiles,
  onSuccess,
  user,
}: Props) {
  const [activeTab, setActiveTab] = useState<"tax" | "shareholders">("tax");
  const [activeTaxTab, setActiveTaxTab] = useState<TaxType>("HST");
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [taxRecordCreated, setTaxRecordCreated] = useState(false);
  const [createdTaxRecordId, setCreatedTaxRecordId] = useState<string | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState<BusinessTaxForm>({
    taxYear: "",
    taxPeriod: "",
    amount: "",
    confirmationNumber: "",
    status: "Pending",
    taxDate: "",
  });

  type ShareholderMode = "existing" | "new" | "basic";

  const [shareholderMode, setShareholderMode] =
    useState<ShareholderMode>("existing");

  const [shareholderForm, setShareholderForm] = useState<any>({
    client_id: "",
    first_name: "",
    last_name: "",
    dob: "",
    email: "",
    full_name: "",
    share_percentage: "",
  });

  const handleCreateShareholder = async () => {
    if (!shareholderForm.share_percentage) {
      alert("Share percentage required");
      return;
    }

    const token = localStorage.getItem("token");

    let payload: any = {
      share_percentage: Number(shareholderForm.share_percentage),
    };

    if (shareholderMode === "existing") {
      if (!shareholderForm.client_id) {
        alert("Select a client");
        return;
      }
      payload.client_id = shareholderForm.client_id;
    }

    if (shareholderMode === "new") {
      if (!shareholderForm.first_name || !shareholderForm.last_name) {
        alert("First and last name required");
        return;
      }
      payload.personal_client = {
        first_name: shareholderForm.first_name,
        last_name: shareholderForm.last_name,
        dob: shareholderForm.dob || null,
        email: shareholderForm.email || null,
      };
    }

    if (shareholderMode === "basic") {
      if (!shareholderForm.full_name) {
        alert("Full name required");
        return;
      }
      payload.full_name = shareholderForm.full_name;
      payload.dob = shareholderForm.dob || null;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/bClient/${businessId}/shareholders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Create shareholder failed");

      alert("Shareholder added");
      onSuccess();
      handleClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  function getEffectiveFrequency(profile: any, taxType: TaxType) {
    if (!profile) return null;
    if (taxType === "WSIB") return "quarterly";
    return String(profile.frequency).toLowerCase();
  }

  /* ================= TAX PROFILE RESOLUTION ================= */

  useEffect(() => {
    if (!visible) return;

    const profile =
      taxProfiles.find((p) => p.tax_type === activeTaxTab) || null;

    const effectiveProfile = profile
      ? {
          ...profile,
          frequency: getEffectiveFrequency(profile, activeTaxTab),
        }
      : null;

    setActiveProfile(effectiveProfile);

    if (!profile) {
      setForm((f) => ({ ...f, taxPeriod: "" }));
      return;
    }

    setForm({
      taxYear: String(profile.start_year ?? ""),
      taxPeriod:
        effectiveProfile.frequency === "quarterly"
          ? `Q${profile.start_quarter ?? 1}`
          : effectiveProfile.frequency === "monthly"
          ? ""
          : "",
      amount: "",
      confirmationNumber: "",
      status: "Pending",
      taxDate: "",
    });
  }, [activeTaxTab, taxProfiles, visible]);

  /* ================= ACTIONS ================= */

  const resetForm = () => {
    setForm({
      taxYear: "",
      taxPeriod: "",
      amount: "",
      confirmationNumber: "",
      status: "Pending",
      taxDate: "",
    });
    setTaxRecordCreated(false);
    setCreatedTaxRecordId(null);
    setSelectedFile(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!activeProfile) {
      alert("No tax profile exists for this tax type");
      return;
    }

    if (!form.taxYear) {
      alert("Tax year is required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const payload = {
        tax_type: activeTaxTab,
        tax_year: Number(form.taxYear),
        tax_date: form.taxDate || null,
        tax_period:
          activeProfile.frequency === "yearly" ? null : form.taxPeriod || null,
        amount: form.amount !== "" ? Number(form.amount) : null,
        confirmation_number: form.confirmationNumber || null,
        status: form.status,
        created_by: user?.id || null,
      };

      const res = await fetch(
        `${API_URL}/api/bClient/${businessId}/tax-records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Create failed");

      const data = await res.json();

      alert("Tax record created successfully");

      console.log("Created tax record:", data.id);
      setCreatedTaxRecordId(data.id);
      setTaxRecordCreated(true);
    } catch (e: any) {
      alert(e.message || "Something broke");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipUpload = () => {
    onSuccess();
    handleClose();
  };

  const handleUploadDocument = async () => {
    if (!selectedFile || !createdTaxRecordId) {
      alert("Select a file");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("file", selectedFile);
      formData.append("uploaded_by", user?.id || "");
      formData.append("notes", "Initial filing");
      formData.append("businessId", businessId);

      const res = await fetch(`${API_URL}/api/hst-docs/${createdTaxRecordId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      alert("Document uploaded successfully");

      onSuccess();
      handleClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  /* ================= RENDER ================= */

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Insert Business Data</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* MAIN TABS */}
        <div className={styles.tabs}>
          <button
            className={activeTab === "tax" ? styles.activeTab : ""}
            onClick={() => setActiveTab("tax")}
          >
            Tax Record
          </button>
          <button
            className={activeTab === "shareholders" ? styles.activeTab : ""}
            onClick={() => setActiveTab("shareholders")}
          >
            Shareholders
          </button>
        </div>

        <div className={styles.modalBody}>
          {activeTab === "tax" && (
            <div className={styles.tabContent}>
              {!taxRecordCreated ? (
                <>
                  <div className={styles.tabs}>
                    {(["HST", "CORPORATION", "PAYROLL", "WSIB"] as TaxType[])
                      .filter((t) => taxProfiles.some((p) => p.tax_type === t))
                      .map((t) => (
                        <button
                          key={t}
                          className={activeTaxTab === t ? styles.activeTab : ""}
                          onClick={() => setActiveTaxTab(t)}
                        >
                          {t}
                        </button>
                      ))}
                  </div>
                  {!activeProfile ? (
                    <div className={styles.emptyState}>
                      No tax profile exists for {activeTaxTab}.
                    </div>
                  ) : (
                    <div className={styles.form}>
                      <h3>{activeTaxTab} Tax Record</h3>
                      <div className={styles.formField}>
                        <label>Frequency</label>
                        <input
                          value={
                            activeProfile.frequency != "null"
                              ? activeProfile.frequency
                              : "annual"
                          }
                          disabled
                        />
                      </div>
                      <div className={styles.formField}>
                        <label>Tax Year *</label>
                        <input
                          value={form.taxYear}
                          onChange={(e) =>
                            setForm({ ...form, taxYear: e.target.value })
                          }
                        />
                      </div>
                      {activeProfile.frequency === "quarterly" && (
                        <div className={styles.formField}>
                          <label>Quarter</label>
                          <select
                            value={form.taxPeriod}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                taxPeriod: e.target.value,
                              })
                            }
                          >
                            <option value="Q1">Q1</option>
                            <option value="Q2">Q2</option>
                            <option value="Q3">Q3</option>
                            <option value="Q4">Q4</option>
                          </select>
                        </div>
                      )}
                      {activeProfile?.frequency === "monthly" && (
                        <div className={styles.formField}>
                          <label>Month</label>
                          <select
                            value={form.taxPeriod}
                            onChange={(e) =>
                              setForm({ ...form, taxPeriod: e.target.value })
                            }
                          >
                            {MONTHS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className={styles.formField}>
                        <label>Amount</label>
                        <input
                          type="number"
                          value={form.amount}
                          onChange={(e) =>
                            setForm({ ...form, amount: e.target.value })
                          }
                        />
                      </div>
                      <div className={styles.formField}>
                        <label>Status</label>
                        <select
                          value={form.status}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              status: e.target
                                .value as BusinessTaxForm["status"],
                            })
                          }
                        >
                          <option value="Draft">Draft</option>
                          <option value="Filed">Filed</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>
                      <div className={styles.formField}>
                        <label>Confirmation Number</label>
                        <input
                          value={form.confirmationNumber}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              confirmationNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className={styles.formField}>
                        <label>Tax Date</label>
                        <input
                          type="date"
                          value={form.taxDate}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              taxDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.form}>
                  <h3>Upload Filing Document</h3>

                  <div className={styles.formField}>
                    <label>PDF Attachment *</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) =>
                        e.target.files && setSelectedFile(e.target.files[0])
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "shareholders" && (
            <div className={styles.tabContent}>
              <div className={styles.form}>
                <h3>Add Shareholder</h3>

                {/* MODE SELECT */}
                <div className={styles.formField}>
                  <label>Type</label>
                  <select
                    value={shareholderMode}
                    onChange={(e) =>
                      setShareholderMode(e.target.value as ShareholderMode)
                    }
                  >
                    <option value="existing">Existing Client</option>
                    <option value="new">New Personal Client</option>
                    <option value="basic">Basic Details Only</option>
                  </select>
                </div>

                {/* EXISTING CLIENT */}
                {shareholderMode === "existing" && (
                  <div className={styles.formField}>
                    <label>Client ID</label>
                    <input
                      placeholder="Client UUID (Get from URL of existing client)"
                      value={shareholderForm.client_id}
                      onChange={(e) =>
                        setShareholderForm({
                          ...shareholderForm,
                          client_id: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {/* NEW CLIENT */}
                {shareholderMode === "new" && (
                  <>
                    <div className={styles.formField}>
                      <label>First Name</label>
                      <input
                        value={shareholderForm.first_name}
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            first_name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Last Name</label>
                      <input
                        value={shareholderForm.last_name}
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            last_name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className={styles.formField}>
                      <label>Email</label>
                      <input
                        value={shareholderForm.email}
                        onChange={(e) =>
                          setShareholderForm({
                            ...shareholderForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {/* BASIC ONLY */}
                {shareholderMode === "basic" && (
                  <div className={styles.formField}>
                    <label>Full Name</label>
                    <input
                      value={shareholderForm.full_name}
                      onChange={(e) =>
                        setShareholderForm({
                          ...shareholderForm,
                          full_name: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {/* COMMON */}
                <div className={styles.formField}>
                  <label>Share Percentage *</label>
                  <input
                    type="number"
                    value={shareholderForm.share_percentage}
                    onChange={(e) =>
                      setShareholderForm({
                        ...shareholderForm,
                        share_percentage: e.target.value,
                      })
                    }
                  />
                </div>

                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={handleCreateShareholder}
                  disabled={loading}
                >
                  {loading ? "Saving…" : "Add Shareholder"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>

          {activeTab === "tax" && activeProfile && !taxRecordCreated && (
            <button
              type="button"
              className={styles.submitButton}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Processing…" : "Create Tax Record"}
            </button>
          )}

          {activeTab === "tax" && activeProfile && taxRecordCreated && (
            <>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleSkipUpload}
                disabled={loading}
              >
                Skip for now
              </button>

              <button
                type="button"
                className={styles.submitButton}
                onClick={handleUploadDocument}
                disabled={loading}
              >
                {loading ? "Uploading…" : "Upload Document"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
