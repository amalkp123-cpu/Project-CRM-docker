// InsertResourceModal.tsx
import { useState } from "react";
import styles from "./InsertModal.module.css";

const API_URL = import.meta.env.VITE_API_URL;

interface Note {
  note: string;
  createdBy?: string;
}

interface Address {
  line1: string;
  line2?: string;
  city: string;
  province?: string;
  postalCode?: string;
  country?: string;
  isPrimary?: boolean;
}

interface Dependent {
  firstName: string;
  lastName: string;
  dob?: string;
  gender?: string;
  relationship?: string;
  disability?: boolean;
  disabilityNotes?: string;
  sameAddress?: boolean;
  addressId?: string;
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

interface TaxRecord {
  taxYear: string;
  status: "InProgress" | "ReadyToFile" | "FiledOn";
  taxDate?: string;
  attachment?: string;
  preparedBy?: string;
  submittedBy?: string;
}

interface Spouse {
  firstName: string;
  lastName: string;
  dob: string;
  gender?: string;
  sin: string;
  phone: string;
  email: string;
  dateOfMarriage: string;
}

interface InsertResourceModalProps {
  visible: boolean;
  onClose: () => void;
  hasSpouse: boolean;
  clientId: string;
  onSuccess: () => void;
  user: any;
}

function sanitizeDigits(s = "") {
  return String(s).replace(/\D/g, "");
}

function validateCanadianSIN(sin = "") {
  const digits = sanitizeDigits(sin);
  if (digits.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(digits[i]);
    if ((i + 1) % 2 === 0) {
      n = n * 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export default function InsertModal({
  visible,
  onClose,
  hasSpouse,
  clientId,
  onSuccess,
  user,
}: InsertResourceModalProps) {
  const [activeTab, setActiveTab] = useState<
    "notes" | "address" | "dependent" | "tax" | "spouse"
  >("notes");
  const [loading, setLoading] = useState(false);

  // Tax form state
  const [noteForm, setNoteForm] = useState<Note>({
    note: "",
    createdBy: user?.id || "",
  });

  // Address form state
  const [addressForm, setAddressForm] = useState<Address>({
    line1: "",
    line2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Canada",
    isPrimary: false,
  });

  // Dependent form state
  const [dependentForm, setDependentForm] = useState<Dependent>({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    relationship: "",
    disability: false,
    disabilityNotes: "",
    sameAddress: true,
    line1: "",
    line2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "",
  });

  // Tax form state
  const [taxForm, setTaxForm] = useState<TaxRecord>({
    taxYear: "",
    status: "InProgress",
    taxDate: "",
    attachment: "",
    preparedBy: "",
    submittedBy: user?.id || "",
  });

  // Spouse form state
  const [spouseForm, setSpouseForm] = useState<Spouse>({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    sin: "",
    phone: "",
    email: "",
    dateOfMarriage: "",
  });

  if (!visible) return null;

  const resetForms = () => {
    setNoteForm({
      note: "",
      createdBy: user?.id || "",
    });
    setAddressForm({
      line1: "",
      line2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "CA",
      isPrimary: false,
    });
    setDependentForm({
      firstName: "",
      lastName: "",
      dob: "",
      gender: "",
      relationship: "",
      disability: false,
      disabilityNotes: "",
      sameAddress: true,
      line1: "",
      line2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
    });
    setTaxForm({
      taxYear: "",
      status: "InProgress",
      taxDate: "",
      attachment: "",
      preparedBy: "",
      submittedBy: user?.id || "",
    });
    setSpouseForm({
      firstName: "",
      lastName: "",
      dob: "",
      gender: "",
      sin: "",
      phone: "",
      email: "",
      dateOfMarriage: "",
    });
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  // ========== NOTE HANDLER ==========
  const handleAddNote = async () => {
    if (!noteForm.note) {
      alert("A note are required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/pClient/${clientId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(noteForm),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add note");
      }

      alert("note added successfully!");
      resetForms();
      onSuccess();
      handleClose();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ========== ADDRESS HANDLER ==========
  const handleAddAddress = async () => {
    if (!addressForm.line1 || !addressForm.city) {
      alert("Line 1 and City are required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/pClient/${clientId}/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addressForm),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add address");
      }

      alert("Address added successfully!");
      resetForms();
      onSuccess();
      handleClose();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ========== DEPENDENT HANDLER ==========
  const handleAddDependent = async () => {
    if (!dependentForm.firstName || !dependentForm.lastName) {
      alert("First name and Last name are required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Build payload based on sameAddress flag
      const payload: any = {
        firstName: dependentForm.firstName,
        lastName: dependentForm.lastName,
        dob: dependentForm.dob || undefined,
        gender: dependentForm.gender || undefined,
        relationship: dependentForm.relationship || undefined,
        disability: dependentForm.disability,
        disabilityNotes: dependentForm.disabilityNotes || undefined,
        sameAddress: dependentForm.sameAddress,
      };

      // Add address fields only if not using same address
      if (
        !dependentForm.sameAddress &&
        dependentForm.line1 &&
        dependentForm.city
      ) {
        payload.line1 = dependentForm.line1;
        payload.line2 = dependentForm.line2;
        payload.city = dependentForm.city;
        payload.province = dependentForm.province;
        payload.postalCode = dependentForm.postalCode;
        payload.country = dependentForm.country;
      }

      const res = await fetch(`${API_URL}/api/pClient/${clientId}/dependents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add dependent");
      }

      alert("Dependent added successfully!");
      resetForms();
      onSuccess();
      handleClose();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ========== TAX RECORD HANDLER ==========
  const isValidYear = (y?: string) => {
    if (!y) return false;
    const n = Number(y);
    if (!Number.isInteger(n)) return false;
    const thisYear = new Date().getFullYear();
    return n >= 1900 && n <= thisYear + 1 && String(n).length === 4;
  };

  const handleAddTaxRecord = async () => {
    // Validate tax year
    if (!isValidYear(taxForm.taxYear)) {
      alert("Enter a valid 4-digit year (e.g. 2025)");
      return;
    }

    // Validate status
    if (!taxForm.status) {
      alert("Select status");
      return;
    }

    // Validate date
    if (!taxForm.taxDate) {
      alert("Select a date for the chosen status");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Build payload matching the backend API
      const payload: any = {
        taxYear: taxForm.taxYear,
        taxStatus: taxForm.status,
        taxDate: taxForm.taxDate,
        hstRequired: false,
        preparedBy: taxForm.preparedBy || null,
        createdById: user?.id || null,
      };

      const res = await fetch(
        `${API_URL}/api/pClient/${clientId}/tax-records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add tax record");
      }

      alert("Tax record added successfully!");
      resetForms();
      onSuccess();
      handleClose();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ========== SPOUSE HANDLER ==========
  const handleAddSpouse = async () => {
    // Validate required fields
    if (!spouseForm.firstName || !spouseForm.lastName) {
      alert("First name and Last name are required");
      return;
    }

    if (!spouseForm.dob) {
      alert("Date of birth is required");
      return;
    }

    if (!spouseForm.sin) {
      alert("SIN is required");
      return;
    }

    if (!validateCanadianSIN(spouseForm.sin)) {
      alert("Invalid SIN number");
      return;
    }

    if (!spouseForm.phone) {
      alert("Phone is required");
      return;
    }

    const phoneDigits = sanitizeDigits(spouseForm.phone);
    if (
      phoneDigits.length !== 10 &&
      !(phoneDigits.length === 11 && phoneDigits.startsWith("1"))
    ) {
      alert("Enter a valid 10-digit Canadian phone (optionally +1)");
      return;
    }

    if (!spouseForm.email) {
      alert("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(spouseForm.email)) {
      alert("Invalid email address");
      return;
    }

    if (!spouseForm.dateOfMarriage) {
      alert("Date of marriage is required");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Build payload with snake_case keys for API
      const payload = {
        spouse_first_name: spouseForm.firstName,
        spouse_last_name: spouseForm.lastName,
        spouse_dob: spouseForm.dob,
        spouse_gender: spouseForm.gender || undefined,
        spouse_sin: spouseForm.sin,
        spouse_phone: spouseForm.phone,
        spouse_email: spouseForm.email,
        date_of_marriage: spouseForm.dateOfMarriage,
        marital_status: "married",
      };

      const res = await fetch(`${API_URL}/api/pClient/edit/${clientId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add spouse");
      }

      alert("Spouse added successfully!");
      resetForms();
      onSuccess();
      handleClose();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Insert New Data</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className={styles.closeButton}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={activeTab === "notes" ? styles.activeTab : ""}
            onClick={() => setActiveTab("notes")}
            disabled={loading}
          >
            Notes
          </button>
          <button
            className={activeTab === "address" ? styles.activeTab : ""}
            onClick={() => setActiveTab("address")}
            disabled={loading}
          >
            Address
          </button>
          <button
            className={activeTab === "dependent" ? styles.activeTab : ""}
            onClick={() => setActiveTab("dependent")}
            disabled={loading}
          >
            Dependent
          </button>
          {!hasSpouse && (
            <button
              className={activeTab === "spouse" ? styles.activeTab : ""}
              onClick={() => setActiveTab("spouse")}
              disabled={loading}
            >
              Spouse
            </button>
          )}
          <button
            className={activeTab === "tax" ? styles.activeTab : ""}
            onClick={() => setActiveTab("tax")}
            disabled={loading}
          >
            Tax Record
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* ========== Notes TAB ========== */}
          {activeTab === "notes" && (
            <div className={styles.tabContent}>
              <h3>Add New Note</h3>

              <div className={styles.formRow}>
                <div className={`${styles.formField} ${styles.textAreaField}`}>
                  <textarea
                    id={`notes.`}
                    placeholder="Write your note here"
                    className={styles.notesArea}
                    inputMode="text"
                    value={noteForm.note}
                    onChange={(e) =>
                      setNoteForm({ ...noteForm, note: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========== ADDRESS TAB ========== */}
          {activeTab === "address" && (
            <div className={styles.tabContent}>
              <h3>Add New Address</h3>

              <div className={styles.formField}>
                <label htmlFor="line1">Address Line 1 *</label>
                <input
                  id="line1"
                  placeholder="123 Main Street"
                  value={addressForm.line1}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, line1: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="line2">Address Line 2</label>
                <input
                  id="line2"
                  placeholder="Apt 4B"
                  value={addressForm.line2}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, line2: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="city">City *</label>
                  <input
                    id="city"
                    placeholder="Toronto"
                    value={addressForm.city}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, city: e.target.value })
                    }
                    disabled={loading}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="province">Province</label>
                  <input
                    id="province"
                    placeholder="ON"
                    value={addressForm.province}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        province: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="postalCode">Postal Code</label>
                  <input
                    id="postalCode"
                    placeholder="M5H 2N2"
                    value={addressForm.postalCode}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        postalCode: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="country">Country</label>
                  <input
                    id="country"
                    placeholder="CA"
                    value={addressForm.country}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        country: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.checkboxField}>
                <label>
                  <input
                    type="checkbox"
                    checked={addressForm.isPrimary}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        isPrimary: e.target.checked,
                      })
                    }
                    disabled={loading}
                  />
                  Set as primary address
                </label>
              </div>
            </div>
          )}

          {/* ========== DEPENDENT TAB ========== */}
          {activeTab === "dependent" && (
            <div className={styles.tabContent}>
              <h3>Add New Dependent</h3>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="depFirstName">First Name *</label>
                  <input
                    id="depFirstName"
                    placeholder="Emma"
                    value={dependentForm.firstName}
                    onChange={(e) =>
                      setDependentForm({
                        ...dependentForm,
                        firstName: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="depLastName">Last Name *</label>
                  <input
                    id="depLastName"
                    placeholder="Smith"
                    value={dependentForm.lastName}
                    onChange={(e) =>
                      setDependentForm({
                        ...dependentForm,
                        lastName: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="depDob">Date of Birth</label>
                  <input
                    id="depDob"
                    type="date"
                    value={dependentForm.dob}
                    onChange={(e) =>
                      setDependentForm({
                        ...dependentForm,
                        dob: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="depGender">Gender</label>
                  <select
                    id="depGender"
                    value={dependentForm.gender}
                    onChange={(e) =>
                      setDependentForm({
                        ...dependentForm,
                        gender: e.target.value,
                      })
                    }
                    disabled={loading}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className={styles.formField}>
                <label htmlFor="depRelationship">Relationship</label>
                <select
                  id="depRelationship"
                  value={dependentForm.relationship}
                  onChange={(e) =>
                    setDependentForm({
                      ...dependentForm,
                      relationship: e.target.value,
                    })
                  }
                  disabled={loading}
                >
                  <option value="">Select Relationship</option>
                  <option value="Child">Child</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.checkboxField}>
                <label>
                  <input
                    type="checkbox"
                    checked={dependentForm.disability}
                    onChange={(e) =>
                      setDependentForm({
                        ...dependentForm,
                        disability: e.target.checked,
                      })
                    }
                    disabled={loading}
                  />
                  Has disability
                </label>
              </div>

              {dependentForm.disability && (
                <div className={styles.formField}>
                  <label htmlFor="disabilityNotes">Disability Notes</label>
                  <textarea
                    id="disabilityNotes"
                    placeholder="Describe disability details..."
                    value={dependentForm.disabilityNotes}
                    onChange={(e) =>
                      setDependentForm({
                        ...dependentForm,
                        disabilityNotes: e.target.value,
                      })
                    }
                    rows={3}
                    disabled={loading}
                  />
                </div>
              )}

              <div className={styles.checkboxField}>
                <label>
                  <input
                    type="checkbox"
                    checked={dependentForm.sameAddress}
                    onChange={(e) =>
                      setDependentForm({
                        ...dependentForm,
                        sameAddress: e.target.checked,
                      })
                    }
                    disabled={loading}
                  />
                  Lives at same address as client
                </label>
              </div>

              {!dependentForm.sameAddress && (
                <>
                  <h4 style={{ marginTop: 20, marginBottom: 12 }}>
                    Dependent's Address
                  </h4>
                  <div className={styles.formField}>
                    <label htmlFor="depLine1">Address Line 1</label>
                    <input
                      id="depLine1"
                      placeholder="789 College Road"
                      value={dependentForm.line1}
                      onChange={(e) =>
                        setDependentForm({
                          ...dependentForm,
                          line1: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label htmlFor="depLine2">Address Line 2</label>
                    <input
                      id="depLine2"
                      placeholder="Residence Hall B"
                      value={dependentForm.line2}
                      onChange={(e) =>
                        setDependentForm({
                          ...dependentForm,
                          line2: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formField}>
                      <label htmlFor="depCity">City</label>
                      <input
                        id="depCity"
                        placeholder="Kingston"
                        value={dependentForm.city}
                        onChange={(e) =>
                          setDependentForm({
                            ...dependentForm,
                            city: e.target.value,
                          })
                        }
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor="depProvince">Province</label>
                      <input
                        id="depProvince"
                        placeholder="ON"
                        value={dependentForm.province}
                        onChange={(e) =>
                          setDependentForm({
                            ...dependentForm,
                            province: e.target.value,
                          })
                        }
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formField}>
                      <label htmlFor="depPostalCode">Postal Code</label>
                      <input
                        id="depPostalCode"
                        placeholder="K7L 3N6"
                        value={dependentForm.postalCode}
                        onChange={(e) =>
                          setDependentForm({
                            ...dependentForm,
                            postalCode: e.target.value,
                          })
                        }
                        disabled={loading}
                      />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor="depCountry">Country</label>
                      <input
                        id="depCountry"
                        placeholder="CA"
                        value={dependentForm.country}
                        onChange={(e) =>
                          setDependentForm({
                            ...dependentForm,
                            country: e.target.value,
                          })
                        }
                        disabled={loading}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========== SPOUSE TAB ========== */}
          {activeTab === "spouse" && (
            <div className={styles.tabContent}>
              <h3>Add New Spouse</h3>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="spouseFirstName">First Name *</label>
                  <input
                    id="spouseFirstName"
                    placeholder="Given name"
                    value={spouseForm.firstName}
                    onChange={(e) =>
                      setSpouseForm({
                        ...spouseForm,
                        firstName: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="spouseLastName">Last Name *</label>
                  <input
                    id="spouseLastName"
                    placeholder="Family name"
                    value={spouseForm.lastName}
                    onChange={(e) =>
                      setSpouseForm({
                        ...spouseForm,
                        lastName: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="spouseDob">Date of Birth *</label>
                  <input
                    id="spouseDob"
                    type="date"
                    value={spouseForm.dob}
                    onChange={(e) =>
                      setSpouseForm({
                        ...spouseForm,
                        dob: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="spouseGender">Gender</label>
                  <select
                    id="spouseGender"
                    value={spouseForm.gender}
                    onChange={(e) =>
                      setSpouseForm({
                        ...spouseForm,
                        gender: e.target.value,
                      })
                    }
                    disabled={loading}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor="spouseSin">SIN Number *</label>
                  <input
                    id="spouseSin"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="123456789"
                    value={spouseForm.sin}
                    onChange={(e) =>
                      setSpouseForm({
                        ...spouseForm,
                        sin: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="spousePhone">Phone *</label>
                  <input
                    id="spousePhone"
                    type="tel"
                    inputMode="tel"
                    placeholder="(416) 555-1234"
                    value={spouseForm.phone}
                    onChange={(e) =>
                      setSpouseForm({
                        ...spouseForm,
                        phone: e.target.value,
                      })
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label htmlFor="spouseEmail">Email *</label>
                <input
                  id="spouseEmail"
                  type="email"
                  placeholder="name@example.com"
                  value={spouseForm.email}
                  onChange={(e) =>
                    setSpouseForm({
                      ...spouseForm,
                      email: e.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="dateOfMarriage">Date of Marriage *</label>
                <input
                  id="dateOfMarriage"
                  type="date"
                  value={spouseForm.dateOfMarriage}
                  onChange={(e) =>
                    setSpouseForm({
                      ...spouseForm,
                      dateOfMarriage: e.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* ========== TAX RECORD TAB ========== */}
          {activeTab === "tax" && (
            <div className={styles.tabContent}>
              <h3>Add New Tax Record</h3>

              <div className={styles.formField}>
                <label htmlFor="taxYear">Tax Year *</label>
                <input
                  id="taxYear"
                  type="text"
                  placeholder="2025"
                  value={taxForm.taxYear}
                  onChange={(e) =>
                    setTaxForm({
                      ...taxForm,
                      taxYear: e.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="taxStatus">Status *</label>
                <select
                  id="taxStatus"
                  value={taxForm.status}
                  onChange={(e) =>
                    setTaxForm({
                      ...taxForm,
                      status: e.target.value as
                        | "InProgress"
                        | "ReadyToFile"
                        | "FiledOn",
                    })
                  }
                  disabled={loading}
                >
                  <option value="InProgress">InProgress</option>
                  <option value="ReadyToFile">ReadyToFile</option>
                  <option value="FiledOn">FiledOn</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label htmlFor="taxDate">Date of action *</label>
                <input
                  id="taxDate"
                  type="date"
                  value={taxForm.taxDate || ""}
                  onChange={(e) => {
                    setTaxForm({
                      ...taxForm,
                      taxDate: e.target.value,
                    });
                  }}
                  disabled={loading}
                />
              </div>

              {taxForm.status === "FiledOn" && (
                <div className={styles.formField}>
                  <label htmlFor="taxAttachment">File attachment</label>
                  <input
                    id="taxAttachment"
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setTaxForm({
                          ...taxForm,
                          attachment: e.target.files[0].name,
                        });
                      }
                    }}
                    disabled={loading}
                  />
                </div>
              )}

              <div className={styles.formField}>
                <label htmlFor="preparedBy">Prepared By</label>
                <input
                  id="preparedBy"
                  placeholder="Preparer name"
                  value={taxForm.preparedBy}
                  onChange={(e) =>
                    setTaxForm({
                      ...taxForm,
                      preparedBy: e.target.value,
                    })
                  }
                  disabled={loading}
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="submittedBy">Submitted By</label>
                <input
                  id="submittedBy"
                  placeholder="Submitter name"
                  value={user?.username}
                  readOnly
                  disabled={true}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={handleClose}
            disabled={loading}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={
              activeTab === "notes"
                ? handleAddNote
                : activeTab === "address"
                ? handleAddAddress
                : activeTab === "dependent"
                ? handleAddDependent
                : activeTab === "spouse"
                ? handleAddSpouse
                : handleAddTaxRecord
            }
            disabled={loading}
            className={styles.submitButton}
          >
            {loading
              ? "Adding..."
              : `Add ${
                  activeTab === "address"
                    ? "Address"
                    : activeTab === "dependent"
                    ? "Dependent"
                    : activeTab === "spouse"
                    ? "Spouse"
                    : "Tax Record"
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}
