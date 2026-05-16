import { PanelShell } from "~/components/PanelShell";
import { PanelNav, NavIcons } from "~/components/PanelNav";

export default function KocLayout() {
  return (
    <PanelShell
      role="coach"
      title="Koç Paneli"
      nav={
        <PanelNav
          items={[
            { to: "/koc", label: "Öğrencilerim", icon: NavIcons.panel, end: true },
          ]}
        />
      }
    />
  );
}
