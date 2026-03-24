import { useLocation, useNavigate } from "react-router-dom";
import "../styles/backButton.css";

type BackButtonProps = {
  fallback?: string;
  label?: string;
  className?: string;
};

const DEFAULT_LABEL = "\u2190 Voltar";

export default function BackButton({
  fallback = "/admin",
  label = DEFAULT_LABEL,
  className,
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    const lastRoute = sessionStorage.getItem("lastRoute");
    const currentRoute = `${location.pathname}${location.search}${location.hash}`;

    if (lastRoute && lastRoute !== currentRoute) {
      navigate(lastRoute);
      return;
    }

    navigate(fallback);
  };

  const buttonClassName = className ? `btn-back ${className}` : "btn-back";

  return (
    <button type="button" onClick={handleBack} className={buttonClassName}>
      {label}
    </button>
  );
}
