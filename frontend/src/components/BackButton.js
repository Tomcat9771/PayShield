import { useNavigate } from "react-router-dom";

export default function BackButton({ to }) {
  const navigate = useNavigate();

  function goBack() {
    if (to) navigate(to);
    else navigate(-1);
  }

  return (
    <button
      onClick={goBack}
      className="btn-back"
    >
      ← Back
    </button>
  );
}
