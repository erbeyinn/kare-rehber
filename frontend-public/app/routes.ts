import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("pages/index.tsx"),
  route("login", "pages/login.tsx"),
  route("kayit/ogrenci", "pages/kayit/ogrenci.tsx"),
  route("kayit/koc", "pages/kayit/koc.tsx"),
  route("ogrenci", "pages/ogrenci/_layout.tsx", [
    index("pages/ogrenci/index.tsx"),
    route("mesajlar", "pages/ogrenci/mesajlar.tsx"),
  ]),
  route("veli", "pages/veli/_layout.tsx", [
    index("pages/veli/index.tsx"),
    route("mesajlar", "pages/veli/mesajlar.tsx"),
  ]),
  route("koc", "pages/koc/_layout.tsx", [
    index("pages/koc/index.tsx"),
    route("ogrenci/:id", "pages/koc/ogrenci.tsx"),
    route("gorusme/:id", "pages/koc/gorusme.tsx"),
  ]),
  route("koordinator", "pages/koordinator/_layout.tsx", [
    index("pages/koordinator/index.tsx"),
    route("ogrenci/:id", "pages/koordinator/ogrenci.tsx"),
  ]),
] satisfies RouteConfig;
