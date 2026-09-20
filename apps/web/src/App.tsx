import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import PublicLayout from "@/layouts/PublicLayout";

// Route-level code splitting keeps the public bundle lean: the admin dashboard
// and everything it needs is only downloaded when someone opens /admin.
const HomePage = lazy(() => import("@/pages/HomePage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const DecoratorsPage = lazy(() => import("@/pages/DecoratorsPage"));
const BanquetCateringPage = lazy(() => import("@/pages/BanquetCateringPage"));
const GalleryPage = lazy(() => import("@/pages/GalleryPage"));
const GiftingPage = lazy(() => import("@/pages/GiftingPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const AdminApp = lazy(() => import("@/routes/AdminApp"));

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/decorators" element={<DecoratorsPage />} />
        <Route path="/banquet-catering" element={<BanquetCateringPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/gifting" element={<GiftingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin has its own chrome and its own guard. */}
      <Route path="/admin/*" element={<AdminApp />} />
    </Routes>
  );
}
