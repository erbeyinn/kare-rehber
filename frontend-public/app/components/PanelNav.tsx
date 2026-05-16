import { NavLink } from "react-router";
import type { ReactNode } from "react";

import { PanelLinkInner } from "./PanelShell";

interface PanelNavItem {
  to: string;
  label: string;
  icon?: ReactNode;
  end?: boolean;
}

interface PanelNavProps {
  items: PanelNavItem[];
}

export function PanelNav({ items }: PanelNavProps) {
  return (
    <ul className="space-y-1 px-1 py-1">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end={item.end} className="block">
            {({ isActive }) => (
              <PanelLinkInner active={isActive}>
                {item.icon && <span aria-hidden>{item.icon}</span>}
                <span>{item.label}</span>
              </PanelLinkInner>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export const NavIcons = {
  panel: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  message: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M21 12a8 8 0 0 1-11.4 7.2L4 21l1.8-5.6A8 8 0 1 1 21 12z" />
    </svg>
  ),
};
