import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData, useNavigation } from "@remix-run/react";
import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Checkbox,
} from "@leaselab/ui-components";
import { themePresets } from "@leaselab/ui-components/themes";
import { getSiteId } from "~/lib/site.server";
import { fetchThemeFromWorker, saveThemeToWorker } from "~/lib/worker-client";
import { ColorPicker } from "~/components/color-picker";

function asNullable(value: FormDataEntryValue | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const theme = await fetchThemeFromWorker(env, siteId);
  return json({ theme, presets: themePresets });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const siteId = getSiteId(request);
  const formData = await request.formData();

  const themePreset = (formData.get("theme_preset") as string) || "professional";
  await saveThemeToWorker(env, siteId, {
    themePreset,
    brandName: asNullable(formData.get("brand_name")),
    brandLogoUrl: asNullable(formData.get("brand_logo_url")),
    brandFaviconUrl: asNullable(formData.get("brand_favicon_url")),
    customPrimaryHsl: asNullable(formData.get("custom_primary_hsl")),
    customSecondaryHsl: asNullable(formData.get("custom_secondary_hsl")),
    customAccentHsl: asNullable(formData.get("custom_accent_hsl")),
    fontFamily: asNullable(formData.get("font_family")),
    enableDarkMode: formData.get("enable_dark_mode") === "on",
    defaultMode: (formData.get("default_mode") as string) || "dark",
  });

  return redirect("/admin/theme");
}

export default function ThemeStudio() {
  const { theme } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [selectedPreset, setSelectedPreset] = useState(theme.themePreset);

  const currentPreset = useMemo(
    () => themePresets[selectedPreset as keyof typeof themePresets] ?? themePresets.professional,
    [selectedPreset]
  );

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Theme Studio</h1>
        <p className="text-muted-foreground max-w-2xl">
          Configure the storefront experience for this site. Changes go live instantly on the public site once you save.
        </p>
      </div>

      <Form method="post" className="space-y-8">
        <input type="hidden" name="theme_preset" value={selectedPreset} />

        <Card>
          <CardHeader>
            <CardTitle>Choose a preset</CardTitle>
            <CardDescription>Start with a curated palette, then fine-tune colors if needed.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {(
              Object.entries(themePresets) as Array<
                [keyof typeof themePresets, (typeof themePresets)[keyof typeof themePresets]]
              >
            ).map(([presetKey, presetValue]) => {
              const isActive = presetKey === selectedPreset;
              return (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => setSelectedPreset(presetKey)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="text-sm font-medium text-muted-foreground">{presetValue.name}</div>
                  <div className="text-base font-semibold text-foreground">{presetValue.description}</div>
                  <div className="mt-4 flex gap-2">
                    <span className="h-8 w-8 rounded-md border" style={{ backgroundColor: `hsl(${presetValue.colors.light.primary})` }} />
                    <span className="h-8 w-8 rounded-md border" style={{ backgroundColor: `hsl(${presetValue.colors.light.secondary})` }} />
                    <span className="h-8 w-8 rounded-md border" style={{ backgroundColor: `hsl(${presetValue.colors.light.accent})` }} />
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand basics</CardTitle>
            <CardDescription>Logo, favicon, and typography options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand_name">Brand name</Label>
                <Input id="brand_name" name="brand_name" defaultValue={theme.brandName ?? ''} placeholder="LeaseLab" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="font_family">Font family</Label>
                <Input id="font_family" name="font_family" defaultValue={theme.fontFamily ?? currentPreset.font} placeholder="Inter" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand_logo_url">Logo URL</Label>
                <Input id="brand_logo_url" name="brand_logo_url" defaultValue={theme.brandLogoUrl ?? ''} placeholder="https://cdn.example.com/logo.svg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_favicon_url">Favicon URL</Label>
                <Input id="brand_favicon_url" name="brand_favicon_url" defaultValue={theme.brandFaviconUrl ?? ''} placeholder="https://cdn.example.com/favicon.ico" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Display</CardTitle>
            <CardDescription>Control light/dark defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox id="enable_dark_mode" name="enable_dark_mode" defaultChecked={theme.enableDarkMode} />
              <Label htmlFor="enable_dark_mode" className="text-base">Allow visitors to toggle dark mode</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_mode">Default mode</Label>
              <select
                id="default_mode"
                name="default_mode"
                defaultValue={theme.defaultMode || 'dark'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom colors</CardTitle>
            <CardDescription>Override preset colors with HSL values.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ColorPicker
              label="Primary"
              name="custom_primary_hsl"
              defaultValue={theme.customColors?.primary ?? ''}
              helperText="Hue Saturation% Lightness% (e.g., 210 40% 56%)"
            />
            <ColorPicker
              label="Secondary"
              name="custom_secondary_hsl"
              defaultValue={theme.customColors?.secondary ?? ''}
              helperText="Leave blank to inherit from the preset"
            />
            <ColorPicker
              label="Accent"
              name="custom_accent_hsl"
              defaultValue={theme.customColors?.accent ?? ''}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Last published: {new Date(theme.updatedAt).toLocaleString()}
          </div>
          <Button type="submit" disabled={navigation.state === "submitting"}>
            {navigation.state === "submitting" ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
