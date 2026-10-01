import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <Link to={user?.role === 'admin' ? '/admin' : '/'} className="brand">
        <span className="brand-mark">AI</span>
        <span>Mock Interview Evaluator</span>
      </Link>
      {user && (
        <div className="nav-right">
          <span className="nav-user">
            {user.name}
            <span className={`badge badge-role ${user.role}`}>{user.role}</span>
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
