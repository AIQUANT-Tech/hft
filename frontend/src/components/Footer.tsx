import { selectIsDark } from "@/redux/themeSlice";
import React from "react";
import { useSelector } from "react-redux";

const Footer: React.FC = () => {
  const isDark = useSelector(selectIsDark);
  return (
    <footer
      className={`mt-12 py-6 text-center border-t text-sm ${isDark
          ? "text-slate-200 border-slate-800"
          : "text-gray-800 border-gray-200"
        }`}
    >
      <p>
        ADA VELOCITY Platform • Powered by{" "}
        <span
          className={`font-semibold bg-linear-to-r bg-clip-text text-transparent ${isDark ? "from-purple-400 to-pink-400" : "from-blue-600 to-cyan-600"
            }`}
        >
          Minswap
        </span>{" "}
        • Built on{" "}
        <span
          className={`font-semibold ${isDark ? "text-purple-400" : "text-blue-600"
            }`}
        >
          Cardano
        </span>
      </p>
    </footer>
  );
};

export default Footer;
