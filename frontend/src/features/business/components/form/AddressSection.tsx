import { useEffect } from "react";
import type { Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import styles from "./BusinessForm.module.css";

/* ---------- Address model ---------- */
export interface Address {
  line1: string;
  line2?: string;
  country?: string;
  province?: string;
  city?: string;
  postalCode?: string;
  is_primary: boolean;
  is_mailing: boolean;
}

/* ---------- form slice ---------- */
interface FormValues {
  addresses: Address[];
}

interface Props {
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
}

export default function AddressSection({ control, register, errors }: Props) {
  const { fields, append, remove, update } = useFieldArray<
    FormValues,
    "addresses"
  >({
    control,
    name: "addresses",
  });

  /* ---------- ensure one address ---------- */
  useEffect(() => {
    if (!fields.length) {
      append({
        line1: "",
        line2: "",
        city: "",
        province: "",
        postalCode: "",
        country: "Canada",
        is_primary: true,
        is_mailing: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setPrimary(idx: number) {
    fields.forEach((f, i) => update(i, { ...f, is_primary: i === idx }));
  }

  function setMailing(idx: number) {
    fields.forEach((f, i) => update(i, { ...f, is_mailing: i === idx }));
  }

  return (
    <section className={styles.formSection}>
      <h3>Addresses</h3>

      {fields.map((f, idx) => (
        <div key={f.id} className={styles.addressCard}>
          {/* flags must be registered */}
          <input type="hidden" {...register(`addresses.${idx}.is_primary`)} />
          <input type="hidden" {...register(`addresses.${idx}.is_mailing`)} />

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Address line 1</label>
              <input
                {...register(`addresses.${idx}.line1`, {
                  required: "Address line 1 is required",
                })}
              />
              {errors.addresses?.[idx]?.line1 && (
                <div className={styles.errorText}>
                  {errors.addresses[idx]!.line1!.message}
                </div>
              )}
            </div>

            <div className={styles.formField}>
              <label>Address line 2</label>
              <input {...register(`addresses.${idx}.line2`)} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>City</label>
              <input {...register(`addresses.${idx}.city`)} />
            </div>

            <div className={styles.formField}>
              <label>Province</label>
              <input {...register(`addresses.${idx}.province`)} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Postal Code</label>
              <input {...register(`addresses.${idx}.postalCode`)} />
            </div>

            <div className={styles.formField}>
              <label>Country</label>
              <input
                {...register(`addresses.${idx}.country`)}
                defaultValue="Canada"
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <label>
              <input
                type="radio"
                checked={f.is_primary}
                onChange={() => setPrimary(idx)}
              />
              Primary address
            </label>

            <label>
              <input
                type="radio"
                checked={f.is_mailing}
                onChange={() => setMailing(idx)}
              />
              Mailing address
            </label>
          </div>

          {fields.length > 1 && (
            <div className={styles.removeRow}>
              <button type="button" onClick={() => remove(idx)}>
                Remove address
              </button>
            </div>
          )}
        </div>
      ))}

      <div className={styles.addDependent}>
        <button
          type="button"
          onClick={() =>
            append({
              line1: "",
              line2: "",
              city: "",
              province: "",
              postalCode: "",
              country: "Canada",
              is_primary: false,
              is_mailing: false,
            })
          }
        >
          Add address
        </button>
      </div>
    </section>
  );
}
