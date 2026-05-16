import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  coachCreateMeeting,
  coachGetMeeting,
  coachStudents,
  coachSubmitMeeting,
  coachUpdateMeeting,
} from "~/api/meetings";
import { MeetingStatusBadge } from "~/components/MeetingCard";
import { Button, buttonVariants } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Field } from "~/components/ui/field";
import { Card } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { PageHero } from "~/components/PageHero";

const schema = z.object({
  student_id: z
    .string()
    .min(1, "Öğrenci seçimi gerekli")
    .refine((v) => Number(v) > 0, "Öğrenci seçimi gerekli"),
  meeting_date: z.string().min(1, "Tarih gerekli"),
  content: z.string(),
  evaluation: z.string(),
});

type FormValues = z.infer<typeof schema>;

export default function KocGorusme() {
  const params = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isNew = params.id === "new";
  const meetingId = isNew ? null : Number(params.id);
  const studentParam = Number(search.get("student_id") ?? "");

  const studentsQ = useQuery({
    queryKey: ["coach-students"],
    queryFn: () => coachStudents(),
  });

  const meetingQ = useQuery({
    queryKey: ["coach-meeting", meetingId],
    queryFn: () => coachGetMeeting(meetingId as number),
    enabled: !isNew && Number.isFinite(meetingId),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      student_id:
        Number.isFinite(studentParam) && studentParam > 0 ? String(studentParam) : "",
      meeting_date: new Date().toISOString().slice(0, 10),
      content: "",
      evaluation: "",
    },
  });

  useEffect(() => {
    if (isNew) return;
    if (!meetingQ.data) return;
    reset({
      student_id: meetingQ.data.student?.id ? String(meetingQ.data.student.id) : "",
      meeting_date: meetingQ.data.meeting_date,
      content: meetingQ.data.content,
      evaluation: meetingQ.data.evaluation,
    });
  }, [meetingQ.data, isNew, reset]);

  const status = meetingQ.data?.status;
  const locked = !isNew && status === "approved";
  const watchedStudent = watch("student_id");

  const saveDraft = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isNew) {
        return coachCreateMeeting({
          student_id: Number(values.student_id),
          meeting_date: values.meeting_date,
          content: values.content,
          evaluation: values.evaluation,
        });
      }
      return coachUpdateMeeting(meetingId as number, {
        meeting_date: values.meeting_date,
        content: values.content,
        evaluation: values.evaluation,
      });
    },
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["coach-student-meetings"] });
      qc.invalidateQueries({ queryKey: ["coach-meeting", m.id] });
      if (isNew) {
        navigate(`/koc/gorusme/${m.id}`, { replace: true });
      }
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!meetingId) throw new Error("önce kaydet");
      return coachSubmitMeeting(meetingId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-meeting", meetingId] });
      qc.invalidateQueries({ queryKey: ["coach-student-meetings"] });
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await saveDraft.mutateAsync(values);
    } catch (err) {
      setError("root", { message: (err as Error).message });
    }
  });

  const onSubmitForApproval = handleSubmit(async (values) => {
    try {
      const saved = await saveDraft.mutateAsync(values);
      await coachSubmitMeeting(saved.id);
      qc.invalidateQueries({ queryKey: ["coach-meeting", saved.id] });
      qc.invalidateQueries({ queryKey: ["coach-student-meetings"] });
      navigate(`/koc/ogrenci/${saved.student?.id ?? Number(values.student_id)}`);
    } catch (err) {
      setError("root", { message: (err as Error).message });
    }
  });

  const backHref = `/koc/ogrenci/${watchedStudent || studentParam || ""}`;

  return (
    <div className="max-w-3xl">
      <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-(--color-text-faint)">
        <Link
          to="/koc"
          className="transition-colors hover:text-(--color-text-strong)"
        >
          Öğrencilerim
        </Link>{" "}
        · {isNew ? "Yeni Görüşme" : "Görüşme Düzenle"}
      </div>

      <PageHero
        eyebrow={isNew ? "Görüşme oluştur" : "Görüşme detayı"}
        title={isNew ? "Yeni Görüşme" : "Görüşme"}
        actions={status ? <MeetingStatusBadge status={status} /> : undefined}
      />

      {!isNew && meetingQ.isLoading ? (
        <div className="mt-10 text-sm text-(--color-text-faint)">Yükleniyor…</div>
      ) : (
        <form onSubmit={onSubmit} className="mt-10 space-y-6">
          <Card className="p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="student_id">Öğrenci</Label>
                <select
                  id="student_id"
                  className="block w-full rounded-(--radius-md) border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-out-expo) focus:border-accent focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted"
                  disabled={!isNew || locked}
                  {...register("student_id")}
                >
                  <option value="">Seçin…</option>
                  {studentsQ.data?.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
                </select>
                {errors.student_id && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.student_id.message}
                  </p>
                )}
              </div>

              <Field
                label="Tarih"
                htmlFor="meeting_date"
                error={errors.meeting_date?.message}
              >
                <Input
                  id="meeting_date"
                  type="date"
                  disabled={locked}
                  {...register("meeting_date")}
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-5 p-6">
            <Field
              label="Görüşme notu"
              htmlFor="content"
              error={errors.content?.message}
            >
              <Textarea
                id="content"
                rows={6}
                disabled={locked}
                placeholder="Görüşmede konuşulanlar…"
                {...register("content")}
              />
            </Field>
            <Field
              label="Değerlendirme"
              htmlFor="evaluation"
              error={errors.evaluation?.message}
            >
              <Textarea
                id="evaluation"
                rows={4}
                disabled={locked}
                placeholder="Genel değerlendirme, sonraki adımlar…"
                {...register("evaluation")}
              />
            </Field>
          </Card>

          {errors.root && (
            <div className="rounded-(--radius-md) border border-destructive/20 bg-destructive/8 px-3 py-2 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={backHref}
              className={buttonVariants({ variant: "ghost", size: "md" })}
            >
              ← Geri
            </Link>
            {!locked && (
              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSubmitting || saveDraft.isPending}
                >
                  {saveDraft.isPending ? "Kaydediliyor…" : "Taslak Kaydet"}
                </Button>
                {status !== "pending" && (
                  <Button
                    type="button"
                    variant="accent"
                    onClick={onSubmitForApproval}
                    disabled={isSubmitting || submit.isPending}
                  >
                    {submit.isPending ? "Gönderiliyor…" : "Gönder (onaya)"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
