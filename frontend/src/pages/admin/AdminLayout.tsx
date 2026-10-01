import { NavLink, Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';

export default function AdminLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="admin-shell">
        <aside className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/categories" className={({ isActive }) => (isActive ? 'active' : '')}>
            Categories
          </NavLink>
          <NavLink to="/admin/questions" className={({ isActive }) => (isActive ? 'active' : '')}>
            Question bank
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => (isActive ? 'active' : '')}>
            Candidate reports
          </NavLink>
        </aside>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
