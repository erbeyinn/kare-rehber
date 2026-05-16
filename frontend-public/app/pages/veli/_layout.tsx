import { PanelShell } from "~/components/PanelShell";
import { PanelNav, NavIcons } from "~/components/PanelNav";

export default function VeliLayout() {
  return (
    <PanelShell
      role="parent"
      title="Veli Paneli"
      nav={
        <PanelNav
          items={[
            { to: "/veli", label: "Panel", icon: NavIcons.panel, end: true },
            { to: "/veli/mesajlar", label: "Mesajlar", icon: NavIcons.message },
          ]}
        />
      }
    />
  );
}
