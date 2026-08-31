/**
 * Run: npx tsx scripts/verify-escala-contagem.ts
 */
import { pickOverlappingRotation } from '../src/lib/gestao-tripulantes/escala-contagem';

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const weekStart = new Date(2025, 10, 22, 0, 0, 0, 0); // Sat 22/11/2025
const weekEnd = new Date(2025, 10, 28, 23, 59, 59, 999);

const stb = { id: 'stb', start: '2025-11-01', end: '2025-12-31', type: 'stb' };
const onNovo = { id: 'on-new', start: '2025-11-22', end: '2025-12-06', type: 'normal' };

const winnerStartWeek = pickOverlappingRotation([stb, onNovo], weekStart, weekEnd);
assert(winnerStartWeek?.id === 'on-new', 'new ON starting this week beats long STB');

const nextWeekStart = new Date(2025, 10, 29, 0, 0, 0, 0);
const nextWeekEnd = new Date(2025, 11, 5, 23, 59, 59, 999);
const winnerNext = pickOverlappingRotation([stb, onNovo], nextWeekStart, nextWeekEnd);
assert(winnerNext?.id === 'on-new', 'new ON still wins later weeks (later start date)');

const beforeStart = new Date(2025, 10, 8, 0, 0, 0, 0);
const beforeEnd = new Date(2025, 10, 14, 23, 59, 59, 999);
const winnerBefore = pickOverlappingRotation([stb, onNovo], beforeStart, beforeEnd);
assert(winnerBefore?.id === 'stb', 'weeks before the new ON stay STB');

console.log('ESCALA_CONTAGEM_VERIFY_OK');
