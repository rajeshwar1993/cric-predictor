"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/utils";

export function useCountdown(targetDate: Date | null) {
  const [display, setDisplay] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) {
      setDisplay("");
      setIsExpired(true);
      return;
    }

    const update = () => {
      const now = new Date();
      if (now >= targetDate) {
        setDisplay("Expired");
        setIsExpired(true);
        return;
      }
      setDisplay(formatCountdown(targetDate));
      setIsExpired(false);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return { display, isExpired };
}
