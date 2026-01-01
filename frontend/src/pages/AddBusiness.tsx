import styles from "./AddPersonal.module.css";
import { useNavigate } from "react-router";
import { BusinessForm } from "../features/business";

import { IoMdArrowBack } from "react-icons/io";

const AddBusiness = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.mainContainer}>
      <div className={styles.header}>
        <div className={styles.backButton}>
          <IoMdArrowBack
            size={"1.25rem"}
            onClick={() => {
              navigate(-1);
            }}
          />
        </div>
        <h1>Add New Business Client</h1>
      </div>
      <div className={styles.formContainer}>
        <BusinessForm />
      </div>
    </div>
  );
};

export default AddBusiness;
