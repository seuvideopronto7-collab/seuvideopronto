import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const useNavigationHistory = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      const currentRoute = `${location.pathname}${location.search}${location.hash}`;
      const previousRoute = sessionStorage.getItem("currentRoute");

      if (previousRoute && previousRoute !== currentRoute) {
        sessionStorage.setItem("lastRoute", previousRoute);
      }

      sessionStorage.setItem("currentRoute", currentRoute);
    } catch (error) {
      console.error("PDG NAV ERROR: history", error);
    }
  }, [location]);
};
