import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <h1>🌍 Carbon Footprint Awareness Platform</h1>

      <Link to="/login">
        <button>Login</button>
      </Link>

      <Link to="/register">
        <button>Register</button>
      </Link>
    </div>
  );
}