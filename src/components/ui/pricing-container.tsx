"use client";

import React, { useRef, useState } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PricingPlan {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  isPopular?: boolean;
  accent: string;
  rotation?: number;
}

interface PricingProps {
  title?: string;
  plans: PricingPlan[];
  className?: string;
}

const Counter = ({ from, to }: { from: number; to: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const controls = animate(from, to, {
      duration: 1,
      onUpdate(value) {
        node.textContent = value.toFixed(0);
      },
    });
    return () => controls.stop();
  }, [from, to]);
  return <span ref={nodeRef} />;
};

const PricingHeader = ({ title }: { title: string }) => (
  <div className="text-center mb-8 sm:mb-12 relative z-10">
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="inline-block">
      <h1
        className={cn(
          "text-3xl sm:text-4xl lg:text-5xl font-black",
          "text-white bg-white/5 px-8 py-4 rounded-2xl border border-white/15",
          "backdrop-blur-xl shadow-[0_20px_70px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.10)]",
        )}
      >
        {title}
      </h1>
      <motion.div
        className="h-1.5 bg-gradient-to-r from-transparent via-[#ff6600] to-transparent rounded-full mt-3"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.35 }}
      />
    </motion.div>
  </div>
);

const PricingToggle = ({ isYearly, onToggle }: { isYearly: boolean; onToggle: () => void }) => (
  <div className="flex justify-center items-center gap-4 mb-8 relative z-10">
    <span className={cn("text-white/60 font-medium", !isYearly && "text-white")}>Monthly</span>
    <motion.button
      className="w-16 h-8 flex items-center bg-white/10 rounded-full p-1 border border-white/15 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      onClick={onToggle}
      type="button"
    >
      <motion.div
        className="w-6 h-6 bg-white/90 rounded-full border border-white/20"
        animate={{ x: isYearly ? 32 : 0 }}
      />
    </motion.button>
    <span className={cn("text-white/60 font-medium", isYearly && "text-white")}>Yearly</span>
    {isYearly && (
      <motion.span
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-[#ff6600] font-medium text-sm"
      >
        Save 20%
      </motion.span>
    )}
  </div>
);

const BackgroundEffects = () => (
  <>
    <div className="absolute inset-0 pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/5 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
    <div
      className="absolute inset-0 opacity-40 pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    />
  </>
);

const PricingCard = ({ plan, isYearly, index }: { plan: PricingPlan; isYearly: boolean; index: number }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7, -7]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), springConfig);

  const currentPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  const previousPrice = !isYearly ? plan.yearlyPrice : plan.monthlyPrice;

  return (
    <motion.div
      ref={cardRef}
      key={plan.name}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      style={{
        rotateX,
        rotateY,
        perspective: 1000,
      }}
      onMouseMove={(e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        mouseX.set((e.clientX - centerX) / rect.width);
        mouseY.set((e.clientY - centerY) / rect.height);
      }}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
      }}
      className={cn(
        "relative w-full rounded-2xl p-6",
        "border border-white/12 bg-white/5 backdrop-blur-xl",
        "shadow-[0_22px_70px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.10)]",
      )}
    >
      <motion.div
        className={cn(
          "absolute -top-4 -right-4 w-16 h-16 rounded-full flex items-center justify-center",
          "border border-white/20 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl",
          plan.accent,
        )}
        animate={{
          rotate: [0, 10, 0, -10, 0],
          scale: [1, 1.08, 0.95, 1.08, 1],
          y: [0, -5, 5, -3, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: [0.76, 0, 0.24, 1],
        }}
      >
        <div className="text-center text-white">
          <div className="text-lg font-black">
            <span className="opacity-90">$</span>
            <Counter from={previousPrice} to={currentPrice} />
          </div>
          <div className="text-[10px] font-bold opacity-90">/{isYearly ? "yr" : "mo"}</div>
        </div>
      </motion.div>

      <div className="mb-4">
        <h3 className="text-xl font-black text-white mb-2">{plan.name}</h3>
        {plan.isPopular && (
          <motion.span
            className={cn(
              "inline-block px-3 py-1 text-white font-bold rounded-md text-xs",
              "border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl",
              plan.accent,
            )}
            animate={{
              y: [0, -3, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            POPULAR
          </motion.span>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {plan.features.map((feature, i) => (
          <motion.div
            key={feature}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{
              x: 5,
              transition: { type: "spring", stiffness: 400 },
            }}
            className={cn(
              "flex items-center gap-2 p-2 rounded-xl",
              "bg-black/20 border border-white/12 backdrop-blur-xl",
              "shadow-[0_14px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
            )}
          >
            <motion.span
              whileHover={{ scale: 1.15, rotate: 360 }}
              className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center",
                "text-white font-bold text-xs border border-white/15",
                plan.accent,
              )}
            >
              ✓
            </motion.span>
            <span className="text-white/85 font-bold text-sm">{feature}</span>
          </motion.div>
        ))}
      </div>

      <motion.button
        type="button"
        className={cn(
          "w-full py-2 rounded-xl text-white font-black text-sm",
          "border border-white/15 shadow-[0_18px_50px_rgba(0,0,0,0.55)]",
          "transition-all duration-200",
          plan.accent,
        )}
        whileHover={{
          scale: 1.02,
          transition: { duration: 0.2 },
        }}
        whileTap={{
          scale: 0.97,
        }}
      >
        GET STARTED →
      </motion.button>
    </motion.div>
  );
};

export const PricingContainer = ({ title = "Pricing Plans", plans, className = "" }: PricingProps) => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-[0_26px_90px_rgba(0,0,0,0.60),inset_0_1px_0_rgba(255,255,255,0.10)]",
        "p-4 sm:p-6 lg:p-8",
        className,
      )}
    >
      <BackgroundEffects />
      <PricingHeader title={title} />
      <PricingToggle isYearly={isYearly} onToggle={() => setIsYearly(!isYearly)} />

      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {plans.map((plan, index) => (
          <PricingCard key={plan.name} plan={plan} isYearly={isYearly} index={index} />
        ))}
      </div>
    </div>
  );
};

