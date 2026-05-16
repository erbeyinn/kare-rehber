import { PanelShell } from "~/components/PanelShell";
import { PanelNav, NavIcons } from "~/components/PanelNav";

export default function KoordinatorLayout() {
  return (
    <PanelShell
      role="coordinator"
      title="Koordinatör Paneli"
      nav={
        <PanelNav
          items={[
            { to: "/koordinator", label: "Öğrencilerim", icon: NavIcons.panel, end: true },
          ]}
        />
      }
    />
  );
}
