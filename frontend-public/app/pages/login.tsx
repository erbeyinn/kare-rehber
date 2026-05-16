import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useNavigate } from "react-router";
import { motion, useReducedMotion } from "motion/react";

import { login } from "~/api/auth";
import { useAuth, ROLE_HOME } from "~/auth/AuthCtx";
import { ApiError } from "~/api/client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field } from "~/components/ui/field";
import { Badge } from "~/components/ui/badge";
import { AnimatedMesh } from "~/components/motion/AnimatedMesh";
import { BrandMark } from "~/components/motion/BrandMark";
import { MagneticCard } from "~/components/motion/MagneticCard";
import { Stagger, StaggerItem } from "~/components/motion/StaggerList";

const schema = z.object({
  phone: z.string().min(1, "Telefon gerekli"),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Doğum tarihi YYYY-AA-GG biçiminde olmalı"),
  password: z.string().min(1, "Şifre gerekli"),
});

type FormValues = z.infer<typeof schema>;

type DemoRole = "coach" | "coordinator" | "student" | "parent";

type DemoAccount = {
  role: DemoRole;
  roleLabel: string;
  name: string;
  description: string;
  phone: string;
  birthdate: string;
  password: string;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "coach",
    roleLabel: "Koç",
    name: "İbrahim Şahin",
    description: "Onaylı koç — atanmış öğrencileri ve görüşmeleri var",
    phone: "+905540001000",
    birthdate: "1995-09-01",
    password: "Demo1234!",
  },
  {
    role: "coordinator",
    roleLabel: "Koordinatör",
    name: "Koordinatör Ulu Vakfı",
    description: "Vakıf koordinatörü — kendi öğrencilerini ve görüşleri görür",
    phone: "+905530001000",
    birthdate: "1972-09-23",
    password: "Demo1234!",
  },
  {
    role: "student",
    roleLabel: "Öğrenci",
    name: "Zeynep Polat",
    description: "Aktif öğrenci — koç görüşmelerini ve mesajları görüntüler",
    phone: "+905550001000",
    birthdate: "2004-12-04",
    password: "Demo1234!",
  },
  {
    role: "parent",
    roleLabel: "Veli",
    name: "Damla Polat",
    description: "Veli — onaylı görüşmeleri ve mesajlaşmayı görüntüler",
    phone: "+905560001000",
    birthdate: "1971-07-27",
    password: "Demo1234!",
  },
];

const ROLE_TONE: Record<DemoRole, "primary" | "secondary" | "accent" | "success"> = {
  coach: "accent",
  coordinator: "primary",
  student: "secondary",
  parent: "success",
};

export default function Login() {
  const navigate = useNavigate();
  const { status, user, signIn } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const reduce = useReducedMotion();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (status === "authenticated" && user) {
      navigate(ROLE_HOME[user.role], { replace: true });
    }
  }, [status, user, navigate]);

  if (status === "authenticated" && user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  const doLogin = async (phone: string, birthdate: string, password: string) => {
    setServerError(null);
    try {
      const res = await login(phone, birthdate, password);
      signIn(res.token, res.user);
      navigate(ROLE_HOME[res.user.role], { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setServerError("Telefon, doğum tarihi veya şifre hatalı");
      } else {
        setServerError("Giriş başarısız");
      }
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    await doLogin(values.phone, values.birthdate, values.password);
  });

  const quickLogin = async (acc: DemoAccount) => {
    setValue("phone", acc.phone);
    setValue("birthdate", acc.birthdate);
    setValue("password", acc.password);
    setQuickLoading(acc.phone);
    try {
      await doLogin(acc.phone, acc.birthdate, acc.password);
    } finally {
      setQuickLoading(null);
    }
  };

  const anyLoading = isSubmitting || quickLoading !== null;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AnimatedMesh tone="brand" className="opacity-90" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 100%, oklch(from var(--brand-navy-900) l c h / 0.18), transparent 60%)",
        }}
      />

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* Brand side */}
        <motion.aside
          initial={reduce ? false : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
          className="relative hidden flex-col justify-between p-12 lg:flex"
        >
          <BrandMark tone="dark" />

          <div className="space-y-6">
            <Badge tone="outline" className="border-white/20 text-white/70">
              Hoş geldin
            </Badge>
            <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-white">
              Mentörlük yolculuğun{" "}
              <span
                style={{
                  background:
                    "linear-gradient(120deg, var(--brand-orange-500), oklch(from var(--brand-orange-500) calc(l + 0.18) c h))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                burada başlıyor.
              </span>
            </h1>
            <p className="max-w-md text-pretty text-base leading-relaxed text-white/70">
              Koç, koordinatör, öğrenci ve veli — herkesin işini kolaylaştıran
              tek bir panel. Görüşmeleri kaydet, mesajlaş, ilerlemeyi izle.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs uppercase tracking-[0.22em] text-white/50">
            <span>Kare Rehber</span>
            <span className="h-px flex-1 bg-white/20" />
            <span>v1</span>
          </div>
        </motion.aside>

        {/* Form side */}
        <section className="relative flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1], delay: 0.1 }}
            className="relative w-full max-w-xl"
          >
            <div className="mb-6 lg:hidden">
              <BrandMark tone="dark" />
            </div>

            <div className="relative overflow-hidden rounded-(--radius-3xl) border border-white/10 bg-white/95 backdrop-blur-xl shadow-(--shadow-lift) dark:bg-card/95">
              <div
                className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl"
                style={{
                  background:
                    "oklch(from var(--brand-orange-500) l c h / 0.28)",
                }}
              />
              <div className="relative p-8 sm:p-10">
                <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-(--color-text-faint)">
                  Giriş
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-(--color-text-strong)">
                  Hesabına gir
                </h2>
                <p className="mt-1.5 text-sm text-(--color-text-muted)">
                  Telefon, doğum tarihi ve şifrenle birkaç saniyede bağlan.
                </p>

                <form onSubmit={onSubmit} className="mt-7 space-y-1">
                  <Field label="Telefon" htmlFor="phone" error={errors.phone?.message}>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+905XX XXX XXXX"
                      {...register("phone")}
                    />
                  </Field>

                  <Field
                    label="Doğum Tarihi"
                    htmlFor="birthdate"
                    error={errors.birthdate?.message}
                  >
                    <Input id="birthdate" type="date" {...register("birthdate")} />
                  </Field>

                  <Field label="Şifre" htmlFor="password" error={errors.password?.message}>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...register("password")}
                    />
                  </Field>

                  <motion.div
                    initial={false}
                    animate={
                      serverError
                        ? { opacity: 1, height: "auto", marginTop: 4 }
                        : { opacity: 0, height: 0, marginTop: 0 }
                    }
                    transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                    className="overflow-hidden"
                  >
                    {serverError && (
                      <div
                        role="alert"
                        className="rounded-(--radius-md) border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs font-medium text-destructive"
                      >
                        {serverError}
                      </div>
                    )}
                  </motion.div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={anyLoading}
                    className="mt-2 w-full"
                  >
                    {isSubmitting ? "Giriş yapılıyor…" : "Giriş Yap"}
                  </Button>

                  <p className="mt-4 text-center text-xs text-(--color-text-faint)">
                    Henüz hesabın yok mu?{" "}
                    <a
                      href="/kayit/ogrenci"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Öğrenci ön kayıt
                    </a>
                    {" · "}
                    <a
                      href="/kayit/koc"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Koç başvurusu
                    </a>
                  </p>
                </form>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-white/70 lg:text-(--color-text-muted)">
                  Demo Hesaplar
                </h3>
                <Badge tone="accent">tek tıkla giriş</Badge>
              </div>
              <p className="mb-4 text-xs text-white/60 lg:text-(--color-text-faint)">
                Demo şifre: <code className="font-mono">Demo1234!</code>
              </p>

              <Stagger className="grid gap-3 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isLoading = quickLoading === acc.phone;
                  return (
                    <StaggerItem key={acc.phone}>
                      <MagneticCard intensity={5}>
                        <button
                          type="button"
                          onClick={() => quickLogin(acc)}
                          disabled={anyLoading}
                          className={[
                            "group relative block w-full overflow-hidden text-left",
                            "rounded-(--radius-xl) border border-border bg-card/90 backdrop-blur",
                            "px-4 py-3.5 transition-all duration-(--duration-base) ease-(--ease-out-expo)",
                            "hover:border-accent/60 hover:shadow-(--shadow-lift)",
                            "disabled:cursor-not-allowed disabled:opacity-60",
                            "focus-visible:border-accent",
                          ].join(" ")}
                        >
                          <div
                            className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl opacity-0 transition-opacity duration-(--duration-base) group-hover:opacity-100"
                            style={{
                              background:
                                "oklch(from var(--color-accent) l c h / 0.45)",
                            }}
                          />
                          <div className="relative flex items-center justify-between gap-2">
                            <Badge tone={ROLE_TONE[acc.role]}>{acc.roleLabel}</Badge>
                            <motion.span
                              className="text-xs text-(--color-text-muted)"
                              animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                              transition={
                                isLoading
                                  ? { duration: 0.9, repeat: Infinity, ease: "linear" }
                                  : { duration: 0.2 }
                              }
                            >
                              {isLoading ? "↻" : "→"}
                            </motion.span>
                          </div>
                          <div className="relative mt-2 text-sm font-semibold text-(--color-text-strong)">
                            {acc.name}
                          </div>
                          <div className="relative mt-1 text-xs leading-relaxed text-(--color-text-muted) line-clamp-2">
                            {acc.description}
                          </div>
                          <div className="relative mt-2.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
                            <span className="text-(--color-text-faint)">Tel</span>
                            <span className="font-mono text-(--color-text-muted)">
                              {acc.phone}
                            </span>
                            <span className="text-(--color-text-faint)">Doğum</span>
                            <span className="font-mono text-(--color-text-muted)">
                              {acc.birthdate}
                            </span>
                          </div>
                        </button>
                      </MagneticCard>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
