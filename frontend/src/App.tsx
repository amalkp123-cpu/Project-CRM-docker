import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import NotFound from "./notfound";
import MainLayout from "./layout/MainLayout";
import { PersonalDetails } from "./features/personal";
import { BusinessDetails } from "./features/business";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import Clients from "./pages/Clients";
import "./App.css";
import NoNavbarLayout from "./layout/NoNavbarLayout";
import AddPersonal from "./pages/AddPersonal";
import AddBusiness from "./pages/AddBusiness";
import EmptyLayout from "./layout/EmptyLayout";
import SignIn from "./pages/SignIn";

function App() {
  const navigate = useNavigate();

  function isTokenExpired(token: string) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || isTokenExpired(token)) {
      localStorage.removeItem("token");
      navigate("/signin", { replace: true });
    }
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
          <Route path="business/:id" element={<BusinessDetails />} />
          <Route path="add_business" element={<AddBusiness />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="profile" element={<Profile />} />
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
