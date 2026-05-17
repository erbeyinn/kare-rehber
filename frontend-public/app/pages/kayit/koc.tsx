import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";

import { registerCoach } from "~/api/register";
import { ApiError } from "~/api/client";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field } from "~/components/ui/field";
import { AnimatedMesh } from "~/components/motion/AnimatedMesh";
import { BrandMark } from "~/components/motion/BrandMark";
import { Stagger, StaggerItem } from "~/components/motion/StaggerList";

const dateRx = /^\d{4}-\d{2}-\d{2}$/;

const schema = z.object({
  first_name: z.string().min(1, "Ad gerekli"),
  last_name: z.string().min(1, "Soyad gerekli"),
  phone: z.string().min(7, "Telefon gerekli"),
  birthdate: z.string().regex(dateRx, "Doğum tarihi YYYY-AA-GG"),
  email: z.string().email("Geçersiz email").optional().or(z.literal("")),
  specialty: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function KocKayit() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await registerCoach({
        first_name: values.first_name,
        last_name: values.last_name,
        phone: values.phone,
        birthdate: values.birthdate,
        email: values.email || undefined,
        specialty: values.specialty || undefined,
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Kayıt başarısız, lütfen tekrar deneyin.");
      }
    }
  });

  if (done) {
    return (
      <Shell
        eyebrow="Başvuru Alındı"
        title="Teşekkürler — başvurunuz bize ulaştı."
        lede="Onay sonrası giriş bilgileriniz SMS ile iletilecektir."
      >
        <a href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Ana sayfaya dön
        </a>
      </Shell>
    );
  }

  return (
    <Shell
      eyebrow="Ön Başvuru"
      title="Koç Başvuru Formu"
      lede="Bilgilerinizi eksiksiz doldurun. Başvurunuz onaylandığında giriş bilgileriniz SMS ile gönderilecektir."
    >
      <form onSubmit={onSubmit} className="space-y-8">
        <Section title="Kişisel Bilgiler" index={1}>
          <Grid>
            <Field label="Ad" error={errors.first_name?.message}>
              <Input {...register("first_name")} />
            </Field>
            <Field label="Soyad" error={errors.last_name?.message}>
              <Input {...register("last_name")} />
            </Field>
            <Field label="Telefon" error={errors.phone?.message}>
              <Input placeholder="+90555..." {...register("phone")} />
            </Field>
            <Field label="Doğum Tarihi" error={errors.birthdate?.message}>
              <Input type="date" {...register("birthdate")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="Uzmanlık Alanı">
              <Input {...register("specialty")} />
            </Field>
          </Grid>
        </Section>

        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-(--radius-xl) border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
          >
            {serverError}
          </motion.div>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="accent" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Gönderiliyor…" : "Başvuruyu Tamamla"}
          </Button>
        </div>
      </form>
    </Shell>
  );
}

interface ShellProps {
  eyebrow: string;
  title: string;
  lede: string;
  children?: React.ReactNode;
}

function Shell({ eyebrow, title, lede, children }: ShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-(--color-surface-sunken)">
      <AnimatedMesh tone="calm" className="opacity-50" />
      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
        <div className="mb-8 flex justify-between gap-4">
          <BrandMark />
          <a
            href="/login"
            className="text-xs font-medium uppercase tracking-[0.18em] text-(--color-text-muted) transition-colors hover:text-(--color-text-strong)"
          >
            Giriş Yap →
          </a>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
          className="mb-10"
        >
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-(--color-text-faint)">
            {eyebrow}
          </div>
          <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight text-(--color-text-strong) sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-(--color-text-muted)">
            {lede}
          </p>
        </motion.div>
        {children}
      </div>
    </main>
  );
}

function Section({
  title,
  index,
  children,
}: {
  title: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: [0.19, 1, 0.22, 1],
      }}
      className="relative overflow-hidden rounded-(--radius-3xl) border border-border bg-card/90 p-5 shadow-(--shadow-soft) backdrop-blur-xl sm:p-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--brand-navy-900), var(--brand-blue-500))",
          }}
        >
          {index}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-(--color-text-muted)">
          {title}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {children}
    </motion.section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-2" stagger={0.04}>
      {Array.isArray(children)
        ? children.map((c, i) => <StaggerItem key={i}>{c}</StaggerItem>)
        : children}
    </Stagger>
  );
}
