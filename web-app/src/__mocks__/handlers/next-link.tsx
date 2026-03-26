// Mock next/link for Storybook
import React from "react";

const Link = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(({ href, children, ...props }, ref) =>
  React.createElement("a", { ref, href, ...props }, children)
);
Link.displayName = "Link";

export default Link;
