import { Card } from './api';

// A card's Extra requirements as one line, for "Also requires: …".
export function extraRequirementTexts(card: Pick<Card, 'extraRequirements'>): string {
  return card.extraRequirements.map((r) => r.text).join('; ');
}
