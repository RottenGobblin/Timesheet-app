import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { NumberField } from '../components/NumberField';
import { PillButton } from '../components/PillButton';
import { Segmented } from '../components/Segmented';
import { Stepper } from '../components/Stepper';
import { VolumeCalculator } from '../components/VolumeCalculator';
import type { AcidType, PoolLocation, ProductStrengths, Sanitiser } from '../engine';
import { emptyPoolForm, formToPool, poolToForm, relevantStrengths, type PoolForm, type PoolFormErrors } from '../lib/poolForm';
import { usePool } from '../state/PoolProvider';
import { PoolValidationError } from '../storage';
import { colours, fonts, radius, space, TAP } from '../theme';

const SANITISERS: { value: Sanitiser; label: string }[] = [
  { value: 'liquid', label: 'Liquid' },
  { value: 'granular', label: 'Granular' },
  { value: 'salt', label: 'Salt' },
];

const LOCATIONS: { value: PoolLocation; label: string }[] = [
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'indoor', label: 'Indoor' },
];

const ACIDS: { value: AcidType; label: string }[] = [
  { value: 'hydrochloric', label: 'Liquid acid' },
  { value: 'dryAcid', label: 'Dry acid' },
];

type NumericStrength = Exclude<keyof ProductStrengths, 'acidType'>;

const STRENGTH_FIELDS: Record<NumericStrength, { label: string; step: number; min: number; max: number; hint: string }> = {
  liquidChlorinePct: {
    label: 'Liquid chlorine strength',
    step: 0.5,
    min: 1,
    max: 20,
    hint: 'Check the label. Most is 12.5%.',
  },
  granularChlorinePct: {
    label: 'Granular chlorine strength',
    step: 1,
    min: 10,
    max: 100,
    hint: 'Check the label for available chlorine. Most is 65 to 70%.',
  },
  hydrochloricAcidPct: {
    label: 'Acid strength',
    step: 1,
    min: 5,
    max: 40,
    hint: 'Most pool acid (hydrochloric) is 32%.',
  },
  dryAcidPurityPct: {
    label: 'Dry acid purity',
    step: 1,
    min: 50,
    max: 100,
    hint: 'Sodium bisulfate. Most is 93% or more.',
  },
};

export default function PoolScreen() {
  const { pool, loading } = usePool();
  // Wait for storage so an existing pool isn't shown as a blank form.
  if (loading) return null;
  return <PoolEditor key={pool?.updatedAt ?? 'new'} />;
}

function PoolEditor() {
  const { pool, save } = usePool();
  const insets = useSafeAreaInsets();
  const firstTime = pool === null;
  const [form, setForm] = useState<PoolForm>(() => (pool ? poolToForm(pool) : emptyPoolForm()));
  const [errors, setErrors] = useState<PoolFormErrors>({});
  const [showCalculator, setShowCalculator] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function update(patch: Partial<PoolForm>) {
    setForm((f) => ({ ...f, ...patch }));
    if ('volume' in patch) setErrors(({ volume: _cleared, ...rest }) => rest);
  }

  function updateStrength<K extends keyof ProductStrengths>(key: K, value: ProductStrengths[K]) {
    setForm((f) => ({ ...f, strengths: { ...f.strengths, [key]: value } }));
    setErrors(({ [key]: _cleared, ...rest }) => rest);
  }

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function onSave() {
    const result = formToPool(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaveError(null);
    setSaving(true);
    try {
      await save(result.pool);
      leave();
    } catch (e) {
      setSaveError(
        e instanceof PoolValidationError ? e.message : 'Couldn’t save your pool. Try again in a moment.',
      );
    } finally {
      setSaving(false);
    }
  }

  const strengths = relevantStrengths(form).filter((k): k is NumericStrength => k !== 'acidType');
  const chlorineField = strengths[0]!;
  const acidField = strengths[1]!;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>{firstTime ? 'Let’s meet your pool' : 'Your pool'}</Text>
            {!firstTime ? (
              <Pressable accessibilityRole="button" onPress={leave} hitSlop={12} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
          {firstTime ? (
            <Text style={styles.intro}>A few details so every dose is worked out for your water.</Text>
          ) : null}

          <Card title="The basics">
            <View style={styles.field}>
              <Text style={styles.label}>Name (optional)</Text>
              <TextInput
                accessibilityLabel="Pool name"
                value={form.name}
                onChangeText={(name) => update({ name })}
                placeholder="Backyard pool"
                placeholderTextColor={colours.inkMuted}
                style={styles.textInput}
                returnKeyType="done"
                maxLength={40}
              />
            </View>

            <NumberField
              label="Volume"
              value={form.volume}
              onChangeText={(volume) => update({ volume })}
              unit="litres"
              placeholder="e.g. 42,000"
              error={errors.volume}
              large
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showCalculator }}
              onPress={() => setShowCalculator((s) => !s)}
              style={styles.link}
            >
              <Text style={styles.linkText}>{showCalculator ? 'Hide calculator' : 'Not sure? Work it out from the size'}</Text>
            </Pressable>
            {showCalculator ? (
              <VolumeCalculator
                onUse={(litres) => {
                  update({ volume: String(litres) });
                  setShowCalculator(false);
                }}
              />
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>How is it sanitised?</Text>
              <Segmented
                options={SANITISERS}
                value={form.sanitiser}
                onChange={(sanitiser) => update({ sanitiser })}
                accessibilityLabel="Sanitiser"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Where is it?</Text>
              <Segmented
                options={LOCATIONS}
                value={form.location}
                onChange={(location) => update({ location })}
                accessibilityLabel="Indoor or outdoor"
              />
            </View>
          </Card>

          <Card title="Your products">
            <Text style={styles.intro}>
              {form.sanitiser === 'salt'
                ? 'Salt pools sometimes need a quick top-up of liquid chlorine, so we need its strength too.'
                : 'Strengths vary by brand, so check your labels.'}
            </Text>
            <StrengthStepper field={chlorineField} form={form} errors={errors} onChange={updateStrength} />

            <View style={styles.field}>
              <Text style={styles.label}>Which acid do you use?</Text>
              <Segmented
                options={ACIDS}
                value={form.strengths.acidType}
                onChange={(v) => updateStrength('acidType', v)}
                accessibilityLabel="Acid type"
              />
            </View>
            <StrengthStepper field={acidField} form={form} errors={errors} onChange={updateStrength} />
          </Card>

          {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: space.md + insets.bottom }]}>
          <PillButton label={firstTime ? 'Save my pool' : 'Save changes'} onPress={onSave} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StrengthStepper({
  field,
  form,
  errors,
  onChange,
}: {
  field: NumericStrength;
  form: PoolForm;
  errors: PoolFormErrors;
  onChange(key: NumericStrength, value: number): void;
}) {
  const cfg = STRENGTH_FIELDS[field];
  return (
    <Stepper
      label={cfg.label}
      value={form.strengths[field]}
      onChange={(v) => onChange(field, v)}
      step={cfg.step}
      min={cfg.min}
      max={cfg.max}
      unit="%"
      hint={cfg.hint}
      error={errors[field]}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.background },
  flex: { flex: 1 },
  content: { padding: space.md, gap: space.lg, paddingBottom: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  title: { fontFamily: fonts.heading, fontSize: 30, color: colours.ink, flexShrink: 1 },
  cancel: { minHeight: TAP, justifyContent: 'center', paddingHorizontal: space.sm },
  cancelText: { fontFamily: fonts.bodySemi, fontSize: 17, color: colours.primaryDark },
  intro: { fontFamily: fonts.body, fontSize: 16, color: colours.inkMuted, lineHeight: 22 },
  field: { gap: 8 },
  label: { fontFamily: fonts.bodySemi, fontSize: 16, color: colours.ink },
  textInput: {
    minHeight: TAP,
    borderRadius: radius.input,
    borderWidth: 2,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    paddingHorizontal: 16,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    color: colours.ink,
  },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colours.primaryDark, textDecorationLine: 'underline' },
  saveError: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colours.danger,
    backgroundColor: colours.dangerSoft,
    padding: space.md,
    borderRadius: radius.input,
  },
  footer: {
    padding: space.md,
    backgroundColor: colours.background,
    borderTopWidth: 1,
    borderTopColor: colours.border,
  },
});
