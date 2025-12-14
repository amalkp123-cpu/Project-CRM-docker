import type {
  Control,
  UseFormRegister,
  UseFormSetValue,
  FieldErrors,
  UseFormWatch,
} from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import styles from "./PersonalForm.module.css";

export type Dependent = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  relationship?: string;
  disability?: boolean;
  disabilityNotes?: string;
  sameAddress?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  tempId?: string;
};

export type FormValues = {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  dependents: Dependent[];
};

type Props = {
  control: Control<any>;
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  errors?: FieldErrors<any>;
  name?: "dependents";
};

export default function DependentsList({
  control,
  register,
  setValue,
  watch,
  errors = {},
  name = "dependents",
}: Props) {
  const { fields, append, remove } = useFieldArray<FormValues, "dependents">({
    control,
    name,
  });

  const clientAddress = {
    addressLine1: watch("addressLine1"),
    addressLine2: watch("addressLine2"),
    city: watch("city"),
    province: watch("province"),
    postalCode: watch("postalCode"),
    country: watch("country"),
  };

  function addDependent() {
    append({
      firstName: "",
      lastName: "",
      dob: "",
      gender: "",
      relationship: "",
      disability: false,
      disabilityNotes: "",
      sameAddress: true,
      addressLine1: clientAddress.addressLine1 || "",
      addressLine2: clientAddress.addressLine2 || "",
      city: clientAddress.city || "",
      province: clientAddress.province || "",
      postalCode: clientAddress.postalCode || "",
      country: clientAddress.country || "Canada",
      tempId: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    } as Dependent);
  }

  return (
    <section className={styles.formSection}>
      <h3>Dependents</h3>

      <div>
        {fields.length === 0 && <div>No dependents added.</div>}

        {fields.map((field, idx) => {
          const base = `${name}.${idx}`;
          const same = !!watch(`dependents.${idx}.sameAddress` as const as any);
          const disability = !!watch(
            `dependents.${idx}.disability` as const as any
          );

          return (
            <article key={field.id} className={styles.dependentCard}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor={`${base}.firstName`}>First name</label>
                  <input
                    id={`${base}.firstName`}
                    {...register(`${base}.firstName` as const as any)}
                    placeholder="First"
                  />
                  {(errors as any)?.dependents?.[idx]?.firstName?.message && (
                    <div role="alert" className={styles.errorText}>
                      {(errors as any).dependents[idx].firstName.message}
                    </div>
                  )}
                </div>

                <div className={styles.formField}>
                  <label htmlFor={`${base}.lastName`}>Last name</label>
                  <input
                    id={`${base}.lastName`}
                    {...register(`${base}.lastName` as const as any)}
                    placeholder="Last"
                  />
                  {(errors as any)?.dependents?.[idx]?.lastName?.message && (
                    <div role="alert" className={styles.errorText}>
                      {(errors as any).dependents[idx]?.lastName?.message}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor={`${base}.gender`}>Gender</label>
                  <select
                    id={`${base}.gender`}
                    {...register(`${base}.gender` as const as any)}
                  >
                    <option value="">Select an option</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label htmlFor={`${base}.dob`}>DOB</label>
                  <input
                    id={`${base}.dob`}
                    type="date"
                    {...register(`${base}.dob` as const as any)}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label htmlFor={`${base}.relationship`}>Relationship</label>
                  <select
                    id={`${base}.relationship`}
                    {...register(`${base}.relationship` as const as any)}
                  >
                    <option value="">Select</option>
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      {...register(`${base}.disability` as const as any)}
                      defaultChecked={!!field.disability}
                    />{" "}
                    Disability
                  </label>
                </div>

                <div className={styles.formField}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      {...register(`${base}.sameAddress` as const as any)}
                      defaultChecked={!!field.sameAddress}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setValue(
                          `${base}.sameAddress` as const as any,
                          checked,
                          {
                            shouldDirty: true,
                            shouldValidate: true,
                          }
                        );
                        if (checked) {
                          setValue(
                            `${base}.addressLine1` as const as any,
                            clientAddress.addressLine1 || "",
                            { shouldDirty: true }
                          );
                          setValue(
                            `${base}.addressLine2` as const as any,
                            clientAddress.addressLine2 || "",
                            { shouldDirty: true }
                          );
                          setValue(
                            `${base}.city` as const as any,
                            clientAddress.city || "",
                            { shouldDirty: true }
                          );
                          setValue(
                            `${base}.province` as const as any,
                            clientAddress.province || "",
                            { shouldDirty: true }
                          );
                          setValue(
                            `${base}.postalCode` as const as any,
                            clientAddress.postalCode || "",
                            { shouldDirty: true }
                          );
                          setValue(
                            `${base}.country` as const as any,
                            clientAddress.country || "Canada",
                            { shouldDirty: true }
                          );
                        }
                      }}
                    />{" "}
                    Same address
                  </label>
                </div>
              </div>

              {disability && (
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label htmlFor={`${base}.disabilityNotes`}>
                      Disability notes
                    </label>
                    <input
                      id={`${base}.disabilityNotes`}
                      {...register(`${base}.disabilityNotes` as const as any)}
                      placeholder="Notes"
                    />
                  </div>
                </div>
              )}

              {!same && (
                <>
                  <div className={styles.formRow}>
                    <div className={styles.formField}>
                      <label htmlFor={`${base}.addressLine1`}>
                        Address line 1
                      </label>
                      <input
                        id={`${base}.addressLine1`}
                        {...register(`${base}.addressLine1` as const as any)}
                        placeholder="Address 1"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor={`${base}.addressLine2`}>
                        Address line 2
                      </label>
                      <input
                        id={`${base}.addressLine2`}
                        {...register(`${base}.addressLine2` as const as any)}
                        placeholder="Address 2"
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formField}>
                      <label htmlFor={`${base}.city`}>City</label>
                      <input
                        id={`${base}.city`}
                        {...register(`${base}.city` as const as any)}
                        placeholder="City"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor={`${base}.province`}>Province</label>
                      <input
                        id={`${base}.province`}
                        {...register(`${base}.province` as const as any)}
                        placeholder="Province"
                      />
                    </div>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formField}>
                      <label htmlFor={`${base}.postalCode`}>Postal Code</label>
                      <input
                        id={`${base}.postalCode`}
                        {...register(`${base}.postalCode` as const as any)}
                        placeholder="M5V3L9"
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor={`${base}.country`}>Country</label>
                      <input
                        id={`${base}.country`}
                        {...register(`${base}.country` as const as any)}
                        placeholder="Canada"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className={styles.removeRow}>
                <div>
                  <button type="button" onClick={() => remove(idx)}>
                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        <div className={styles.addDependent}>
          <button type="button" onClick={addDependent}>
            Add dependent
          </button>
        </div>
      </div>
    </section>
  );
}
