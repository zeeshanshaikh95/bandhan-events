/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette — sourced from the approved Bandhan Events logo
        forest: {
          DEFAULT: "#17251D", // deep forest green (primary)
          dark: "#0F1A14",
          mid: "#24362B", // dark green
          soft: "#33493B",
        },
        ivory: {
          DEFAULT: "#F7F3EA", // warm ivory (page background)
          soft: "#FBF9F3",
        },
        cream: {
          DEFAULT: "#EFE8DA", // soft cream (alternating sections)
          deep: "#E5DBC8",
        },
        gold: {
          DEFAULT: "#B08A45", // antique gold — use sparingly
          soft: "#D6C19A", // muted champagne
          deep: "#8F6E33",
        },
        charcoal: {
          DEFAULT: "#20211F", // body text
          muted: "#4A4B47",
        },
      },
      fontFamily: {
        serif: [
          '"Cormorant Garamond"',
          '"Playfair Display"',
          "Georgia",
          "serif",
        ],
        sans: [
          '"Manrope"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "sans-serif",
        ],
      },
      letterSpacing: {
        widest2: "0.22em",
        label: "0.3em",
      },
      maxWidth: {
        site: "76rem",
      },
      boxShadow: {
        header: "0 1px 0 0 rgba(23, 37, 29, 0.08), 0 8px 24px -12px rgba(23, 37, 29, 0.18)",
        card: "0 1px 2px 0 rgba(23, 37, 29, 0.06), 0 16px 40px -24px rgba(23, 37, 29, 0.35)",
      },
      backgroundImage: {
        // Faint woven-paper texture used behind editorial sections (pure CSS, zero requests)
        "paper-grain":
          "radial-gradient(rgba(23,37,29,0.035) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
