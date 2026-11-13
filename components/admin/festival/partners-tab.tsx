import { ActionForm } from "@/components/common/action-form";

import { controlStyles } from "@/components/ui/control-styles";

import { cn } from "@/lib/utils";
import { addFaq, addPartner, removeFaq, removePartner } from "@/server/actions/festival-extras";
import { consoleText, field, input, Remove, type Console } from "./content-tabs";

export async function PartnersTab({ data }: { data: Console }) {
  const { t, errors } = await consoleText();
  const { event } = data;
  const tiers = ["headline", "gold", "silver", "community", "media"] as const;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h3 className="text-h3">{t("partners")}</h3>
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {event.sponsorships.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 p-4">
              <span className="flex flex-col">
                <span className="font-semibold text-brand-950">{s.sponsor.name}</span>
                <span className="text-small text-muted-foreground">
                  {t(`partnerTiers.${s.tier}`)} ·{" "}
                  <a className="text-primary underline" href={`/sponsor-report/${s.reportToken}`}>
                    {t("reportLink")}
                  </a>
                </span>
              </span>
              <Remove
                action={removePartner}
                eventId={event.id}
                itemId={s.id}
                label={t("remove", { name: s.sponsor.name })}
              />
            </li>
          ))}
        </ul>
        <ActionForm
          action={addPartner}
          submitLabel={t("addPartner")}
          pendingLabel={t("saving")}
          successText={t("saved")}
          errorTexts={errors}
          className="rounded-2xl border border-line bg-surface p-5"
        >
          <input type="hidden" name="eventId" value={event.id} />
          <label className={field}>
            {t("fields.partnerName")}
            <input name="name" required maxLength={120} className={input} />
          </label>
          <label className={field}>
            {t("fields.website")}
            <input name="website" type="url" placeholder="https://" className={input} />
          </label>
          <label className={field}>
            {t("fields.partnerTier")}
            <select name="tier" className={input}>
              {tiers.map((x) => (
                <option key={x} value={x}>
                  {t(`partnerTiers.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-small text-muted-foreground">{t("permissionNote")}</p>
        </ActionForm>
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="text-h3">{t("faq")}</h3>
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {event.faqs.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-3 p-4">
              <span className="flex flex-col">
                <span className="font-semibold text-brand-950">{f.question}</span>
                <span className="line-clamp-2 text-small text-muted-foreground">{f.answer}</span>
              </span>
              <Remove
                action={removeFaq}
                eventId={event.id}
                itemId={f.id}
                label={t("remove", { name: f.question })}
              />
            </li>
          ))}
        </ul>
        <ActionForm
          action={addFaq}
          submitLabel={t("addFaq")}
          pendingLabel={t("saving")}
          successText={t("saved")}
          errorTexts={errors}
          className="rounded-2xl border border-line bg-surface p-5"
        >
          <input type="hidden" name="eventId" value={event.id} />
          <label className={field}>
            {t("fields.question")}
            <input name="question" required minLength={5} maxLength={200} className={input} />
          </label>
          <label className={field}>
            {t("fields.answer")}
            <textarea
              name="answer"
              required
              minLength={5}
              maxLength={1500}
              rows={3}
              className={cn(controlStyles, "resize-y py-2.5")}
            />
          </label>
        </ActionForm>
      </div>
    </div>
  );
}
