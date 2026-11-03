/** Kurzform für die Tor-Knöpfe und die Kopfzeile, z. B. "Sportvg Feuerbach E1" → "Feuerbach E1". */
export function shortTeamName(name: string): string {
  return name.replace(/^sportvg\s+/i, '');
}
