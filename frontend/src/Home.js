import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <h1>Welcome to GuardPay</h1>
      <p>Use the QR code to pay guards quickly.</p>

      <Link to="/guards">
        <button>View Guards & QR Codes</button>
      </Link>
    </div>
  );
}
