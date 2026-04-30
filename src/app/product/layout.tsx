import "./product-chrome.css";
import "./product-pdp.css";
import { SiteHeader } from "@/components/SiteHeader";

export default function ProductRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="istore-product-root">
      <div className="istore-page-shell">
        <SiteHeader />

        {children}
      </div>
    </div>
  );
}
