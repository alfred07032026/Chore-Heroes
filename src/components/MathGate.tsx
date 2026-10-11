import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { checkMathAnswer, makeMathChallenge } from '@/domain/security';
import { colors, space } from '@/theme/tokens';

import { Button } from './Button';
import { Icon } from './Icon';
import { applyKey, Keypad } from './Keypad';
import { Txt } from './Txt';

/**
 * Parental gate: an adult-level multiplication question answered on a keypad.
 * `rounds` > 1 asks several questions in a row (used for "Forgot PIN").
 */
export function MathGate({
  onPass,
  onCancel,
  rounds = 1,
  title = 'Grown-ups only',
  random = Math.random,
}: {
  onPass: () => void;
  onCancel?: () => void;
  rounds?: number;
  title?: string;
  random?: () => number;
}) {
  const [round, setRound] = useState(0);
  const [nonce, setNonce] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const challenge = useMemo(() => makeMathChallenge(random), [round, nonce]);
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (checkMathAnswer(challenge, input)) {
      setInput('');
      setWrong(false);
      if (round + 1 >= rounds) onPass();
      else setRound(round + 1);
    } else {
      setWrong(true);
      setInput('');
      setNonce((n) => n + 1);
    }
  };

  return (
    <View style={{ alignItems: 'center', gap: space.md }} testID="math-gate">
      <Icon name="shield-lock" size={48} color={colors.hero} />
      <Txt variant="title" center accessibilityRole="header">
        {title}
      </Txt>
      <Txt variant="body" center color={colors.inkSoft}>
        Please answer to continue{rounds > 1 ? ` (${round + 1} of ${rounds})` : ''}.
      </Txt>
      <Txt
        variant="display"
        center
        testID="math-question"
        accessibilityLabel={`What is ${challenge.spokenPrompt}?`}
      >
        {challenge.prompt}
      </Txt>
      <View
        style={{
          minWidth: 160,
          minHeight: 56,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: wrong ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessible
        accessibilityLabel={`Answer: ${input || 'empty'}`}
      >
        <Txt variant="title">{input || ' '}</Txt>
      </View>
      {wrong ? (
        <Txt variant="body" color={colors.danger} accessibilityLiveRegion="polite">
          Not quite — here is a new question.
        </Txt>
      ) : null}
      <Keypad onKey={(k) => setInput((v) => applyKey(v, k, 4))} keySize={68} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {onCancel ? <Button label="Cancel" tone="secondary" onPress={onCancel} /> : null}
        <Button
          label="Continue"
          icon="check"
          onPress={submit}
          disabled={!input}
          testID="math-submit"
        />
      </View>
    </View>
  );
}
