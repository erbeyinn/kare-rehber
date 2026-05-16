import * as React from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";

import { cn } from "~/lib/utils";

interface MagneticCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  intensity?: number;
}

export const MagneticCard = React.forwardRef<HTMLDivElement, MagneticCardProps>(
  function MagneticCard({ className, intensity = 6, children, onPointerMove, onPointerLeave, ...rest }, ref) {
    const reduce = useReducedMotion();
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const sx = useSpring(mx, { stiffness: 200, damping: 18, mass: 0.4 });
    const sy = useSpring(my, { stiffness: 200, damping: 18, mass: 0.4 });
    const rx = useTransform(sy, [-1, 1], [intensity, -intensity]);
    const ry = useTransform(sx, [-1, 1], [-intensity, intensity]);

    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduce) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
      my.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
      onPointerMove?.(e);
    };
    const onLeave = (e: React.PointerEvent<HTMLDivElement>) => {
      mx.set(0);
      my.set(0);
      onPointerLeave?.(e);
    };

    return (
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={
          reduce
            ? undefined
            : { rotateX: rx, rotateY: ry, transformPerspective: 900 }
        }
        className={cn("relative will-change-transform", className)}
        {...rest}
      >
        {children}
      </motion.div>
    );
  },
);
