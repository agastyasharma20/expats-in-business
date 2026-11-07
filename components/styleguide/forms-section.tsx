"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { StyleguideSection } from "./section";

/** Fields in their normal, hint and error states. Submitting explains that nothing is saved. */
export function FormsSection() {
  const t = useTranslations("styleguide");
  const common = useTranslations("common");

  return (
    <StyleguideSection id="forms" title={t("sections.forms")}>
      <form
        noValidate
        className="grid max-w-2xl grid-cols-1 gap-6 rounded-2xl border border-line bg-surface p-6 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          toast(t("forms.saved"));
        }}
      >
        <Field
          id="sg-name"
          label={t("forms.nameLabel")}
          hint={t("forms.nameHint")}
          required
          requiredLabel={common("required")}
        >
          {(props) => (
            <Input
              {...props}
              name="name"
              autoComplete="name"
              defaultValue={t("forms.nameExample")}
            />
          )}
        </Field>
        <Field
          id="sg-email"
          label={t("forms.emailLabel")}
          error={t("forms.emailError")}
          required
          requiredLabel={common("required")}
        >
          {(props) => (
            <Input
              {...props}
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={t("forms.emailExample")}
            />
          )}
        </Field>
        <Field id="sg-chapter" label={t("forms.chapterLabel")} error={t("forms.chapterError")}>
          {(props) => (
            <Select name="chapter">
              <SelectTrigger {...props} className="w-full">
                <SelectValue placeholder={t("forms.chapterPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">{t("forms.chapterDemoA")}</SelectItem>
                <SelectItem value="b">{t("forms.chapterDemoB")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </Field>
        <Field id="sg-bio" label={t("forms.bioLabel")} hint={t("forms.bioHint")}>
          {(props) => <Textarea {...props} name="bio" />}
        </Field>
        <div>
          <Button type="submit">{t("forms.submit")}</Button>
        </div>
      </form>
    </StyleguideSection>
  );
}
