import { strings } from '@/strings';

import { AppText } from './AppText';
import { Screen } from './Screen';

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <Screen>
      <AppText variant="title">{title}</AppText>
      <AppText muted>{strings.common.comingSoon}</AppText>
    </Screen>
  );
}
