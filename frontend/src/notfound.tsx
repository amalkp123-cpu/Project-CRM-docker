import { useNavigate } from "react-router-dom";
import "./styles.css";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="errorPage">
        <div className="e404">Page not found. Error 404.</div>
        <button onClick={() => navigate(-1)} className="eback">
          Go Back
        </button>
      </div>
    </>
  );
};

export default NotFound;
