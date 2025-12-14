import styles from "./AddPersonal.module.css";
import { useNavigate } from "react-router";
import { PersonalForm } from "../features/personal";

import { IoMdArrowBack } from "react-icons/io";

const AddPersonal = () => {
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
        <h1>Add New Personal Client</h1>
      </div>
      <div className={styles.formContainer}>
        <PersonalForm />
      </div>
    </div>
  );
};

export default AddPersonal;
