import { PricingContainer, type PricingPlan } from "@/components/ui/pricing-container";

const PLANS: PricingPlan[] = [
  {
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: ["1 User", "10 Projects", "5GB Storage", "Basic Support"],
    isPopular: false,
    accent: "bg-[#ff6600]/90",
    rotation: -2,
  },
  {
    name: "Pro",
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: ["5 Users", "50 Projects", "100GB Storage", "Priority Support"],
    isPopular: true,
    accent: "bg-[#ff6600]",
    rotation: 1,
  },
  {
    name: "Enterprise",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: ["Unlimited", "Contact Us", "1TB Storage", "24/7 Support"],
    isPopular: false,
    accent: "bg-[#ff6600]/80",
    rotation: 2,
  },
];

export default function PricingDemoPage() {
  return (
    <div className="page promoPage">
      <div className="section">
        <PricingContainer title="iStore — Demo block" plans={PLANS} />
      </div>
    </div>
  );
}

