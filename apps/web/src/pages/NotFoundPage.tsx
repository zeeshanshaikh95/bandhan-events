import { Link } from "react-router-dom";
import Seo from "@/components/Seo";

export default function NotFoundPage() {
  return (
    <>
      <Seo route="/404" />
      <section className="flex min-h-[80vh] items-center bg-forest bg-grain-light">
        <div className="container-site py-24 text-center">
          <p className="eyebrow-light">Page Not Found</p>
          <h1 className="mt-5 font-serif text-5xl font-medium text-ivory sm:text-6xl">
            This Moment Isn't on the Guest List
          </h1>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ivory/75">
            The page you're looking for doesn't exist — but plenty of
            celebrations do. Let's get you back to them.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/" className="btn btn-gold w-full sm:w-auto">
              Back to Home
            </Link>
            <Link to="/contact" className="btn btn-outline-light w-full sm:w-auto">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
