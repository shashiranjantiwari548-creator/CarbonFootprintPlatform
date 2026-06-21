import { BrowserRouter, Routes, Route } from "react-router-dom";

function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>🌍 Carbon Footprint Awareness Platform</h1>
      <p>Welcome to Smart Carbon Tracking System</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}