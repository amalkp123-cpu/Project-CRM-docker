import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import NotFound from "./notfound";
import MainLayout from "./layout/MainLayout";
import { PersonalDetails } from "./features/personal";
import Home from "./pages/Home";
import Clients from "./pages/Clients";
import "./App.css";
import NoNavbarLayout from "./layout/NoNavbarLayout";
import AddPersonal from "./pages/AddPersonal";
import EmptyLayout from "./layout/EmptyLayout";
import SignIn from "./pages/SignIn";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/signin", { replace: true });
  }, [navigate]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="clients" element={<Clients />} />
          <Route path="personal/:id" element={<PersonalDetails />} />
          <Route path="add_personal" element={<AddPersonal />} />
        </Route>

        <Route element={<NoNavbarLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/" element={<EmptyLayout />}>
          <Route path="signin" element={<SignIn />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
