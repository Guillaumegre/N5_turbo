import { strings } from '@/strings';

import { AppText } from './AppText';
import { Screen } from './Screen';

export function PlaceholderScreen({ title, titleJa }: { title: string; titleJa?: string }) {
  return (
    <Screen title={title} titleJa={titleJa}>
      <AppText muted>{strings.common.comingSoon}</AppText>
    </Screen>
  );
}
