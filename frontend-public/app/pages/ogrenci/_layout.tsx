import { PanelShell } from "~/components/PanelShell";
import { PanelNav, NavIcons } from "~/components/PanelNav";

export default function OgrenciLayout() {
  return (
    <PanelShell
      role="student"
      title="Öğrenci Paneli"
      nav={
        <PanelNav
          items={[
            { to: "/ogrenci", label: "Panel", icon: NavIcons.panel, end: true },
            { to: "/ogrenci/mesajlar", label: "Mesajlar", icon: NavIcons.message },
          ]}
        />
      }
    />
  );
}
