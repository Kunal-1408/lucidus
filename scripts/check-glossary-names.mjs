// Fails when a code name uses a word GLOSSARY.md says to avoid. Only the
// _Avoid_ terms written in backticks are enforced: the rest are judgement
// calls left to review. Comments and string literals are not checked.
//
//   node scripts/check-glossary-names.mjs            check the enforced terms
//   node scripts/check-glossary-names.mjs --all      report every _Avoid_ term
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const sourceDirs = ['backend/src', 'backend/test', 'frontend/src'];
const all = process.argv.includes('--all');

const avoidLines = readFileSync(join(root, 'GLOSSARY.md'), 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('_Avoid_:'));

const terms = avoidLines.flatMap((line) => {
  const list = line.slice('_Avoid_:'.length);
  const enforced = [...list.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  if (!all) return enforced;
  return list
    .split(',')
    .map((term) => term.replace(/`/g, '').replace(/\(.*\)/, '').trim())
    .filter(Boolean);
});

// "near miss" → ['near', 'miss']; matched against an identifier's word parts.
const termWords = terms.map((term) => ({
  term,
  words: term.toLowerCase().split(/[\s-]+/),
}));

function wordsOf(identifier) {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[\s_$]+/)
    .filter(Boolean);
}

function contains(words, sequence) {
  return words.some((_, i) => sequence.every((word, j) => words[i + j] === word));
}

// Blanks comments and string literals, keeping line breaks so line numbers hold.
function codeOnly(source) {
  return source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g,
    (match) => match.replace(/[^\n]/g, ' '),
  );
}

const findings = [];
for (const dir of sourceDirs) {
  for (const entry of readdirSync(join(root, dir), { recursive: true })) {
    if (!entry.endsWith('.ts')) continue;
    const path = join(root, dir, entry);
    codeOnly(readFileSync(path, 'utf8'))
      .split('\n')
      .forEach((line, index) => {
        for (const [identifier] of line.matchAll(/[A-Za-z_$][\w$]*/g)) {
          const words = wordsOf(identifier);
          for (const { term, words: sequence } of termWords) {
            if (contains(words, sequence)) {
              findings.push(`${relative(root, path)}:${index + 1}  ${identifier}  (avoid "${term}")`);
            }
          }
        }
      });
  }
}

if (findings.length > 0) {
  console.error(`Names GLOSSARY.md says to avoid:\n${[...new Set(findings)].join('\n')}`);
  process.exit(1);
}
