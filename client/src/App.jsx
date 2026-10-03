import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import Registration from "./pages/Registration";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import Exams from "./pages/Exams";
import Attendances from "./pages/Attendances";
import Books from "./pages/Books";
import Users from "./pages/Users";

function PrivateRoute({ children, permission }) {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F3F5FA]">
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-[#06235C]">DEPT_C</p>
          <p className="text-sm text-[#06235C]/50 mt-2">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute permission="dashboard:read">
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="classes"
          element={
            <PrivateRoute permission="classes:read">
              <Classes />
            </PrivateRoute>
          }
        />
        <Route
          path="registration"
          element={
            <PrivateRoute permission="students:create">
              <Registration />
            </PrivateRoute>
          }
        />
        <Route
          path="students"
          element={
            <PrivateRoute permission="students:read">
              <Students />
            </PrivateRoute>
          }
        />
        <Route
          path="students/:id"
          element={
            <PrivateRoute permission="students:read">
              <StudentDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="exams"
          element={
            <PrivateRoute permission="exams:read">
              <Exams />
            </PrivateRoute>
          }
        />
        <Route
          path="attendances"
          element={
            <PrivateRoute permission="attendances:read">
              <Attendances />
            </PrivateRoute>
          }
        />
        <Route
          path="books"
          element={
            <PrivateRoute permission="books:read">
              <Books />
            </PrivateRoute>
          }
        />
        <Route
          path="users"
          element={
            <PrivateRoute permission="users:read">
              <Users />
            </PrivateRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
