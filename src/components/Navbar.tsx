import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white p-4 flex justify-between">
      <h1 className="text-lg font-bold">MediCanna</h1>

      <div className="flex gap-4">
        <Link to="/">Home</Link>
        <Link to="/recommendations">Recommendations</Link>
        <Link to="/dashboard">Dashboard</Link>
      </div>
    </nav>
  );
}
