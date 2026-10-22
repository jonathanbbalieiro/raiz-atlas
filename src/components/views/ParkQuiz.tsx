"use client";

import { useMemo, useState } from "react";
import type { Biodiversity, SpeciesCard } from "@/lib/data/types";
import { IUCN_LABEL } from "./SpeciesExplorer";

const ROUNDS = 5;

/** Miniatura do Commons em largura padrão (500 px). */
const thumb = (src: string) =>
  src.replace(/\/(\d+)px-([^/]+)$/, (m, w, f) => (Number(w) > 500 ? `/500px-${f}` : m));

/** Gerador determinístico: servidor e cliente montam as mesmas perguntas. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = <T,>(list: T[], rand: () => number) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

type Item = SpeciesCard & { group: string };
type Question = { answer: Item; options: Item[] };

function build(pool: Item[], seed: string): Question[] {
  const rand = rng(seed);
  const picked = shuffle(pool, rand).slice(0, ROUNDS);
  return picked.map((answer) => {
    const same = pool.filter((p) => p.gbifKey !== answer.gbifKey && p.group === answer.group && p.name !== answer.name);
    const rest = pool.filter((p) => p.group !== answer.group && p.name !== answer.name);
    const distractors = [...shuffle(same, rand), ...shuffle(rest, rand)].slice(0, 3);
    return { answer, options: shuffle([answer, ...distractors], rand) };
  });
}

/**
 * "Que bicho é esse?": quiz com as espécies do próprio parque que têm foto e
 * nome popular. Ensina o nome, o grupo e o grau de ameaça de cada uma.
 */
export function ParkQuiz({ bio, parkName }: { bio: Biodiversity; parkName: string }) {
  const pool = useMemo<Item[]>(
    () => bio.groups.flatMap((g) => g.species.filter((s) => s.photo && s.name).map((s) => ({ ...s, group: g.label }))),
    [bio],
  );
  const [game, setGame] = useState(0);
  const questions = useMemo(() => build(pool, `${bio.generatedAt}:${pool.length}:${game}`), [pool, bio.generatedAt, game]);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  if (questions.length < 4) return null;
  const done = step >= questions.length;
  const q = questions[Math.min(step, questions.length - 1)];

  const choose = (name: string) => {
    if (picked) return;
    setPicked(name);
    if (name === q.answer.name) setScore((s) => s + 1);
  };
  const next = () => {
    setPicked(null);
    setStep((s) => s + 1);
  };
  const again = () => {
    setGame((g) => g + 1);
    setStep(0);
    setPicked(null);
    setScore(0);
  };

  return (
    <section aria-labelledby="quiz" className="mx-5 mt-8 overflow-hidden rounded-2xl bg-forest-deep text-card">
      <div className="px-4 pt-4">
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: "#e0b57a" }}>
          Quiz
        </p>
        <h2 id="quiz" className="mt-1 font-display text-[22px] leading-tight font-semibold text-balance">
          Que bicho (ou planta) é esse?
        </h2>
        <p className="mt-1 text-[13px] opacity-80">Cinco espécies registradas em {parkName}.</p>
      </div>

      {!done ? (
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between text-[12px] opacity-80">
            <span>
              Pergunta {step + 1} de {questions.length}
            </span>
            <span>{score} certas</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-[#e0b57a] transition-all" style={{ width: `${(step / questions.length) * 100}%` }} />
          </div>
          <div className="mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-forest">
            {
              // eslint-disable-next-line @next/next/no-img-element -- miniatura padrão do Commons, sem reprocessar
              <img
                src={thumb(q.answer.photo!.src)}
                alt={picked ? q.answer.photo!.alt : "Foto de uma espécie do parque"}
                className="h-full w-full object-cover"
              />
            }
          </div>
          <div role="group" aria-label="Alternativas" className="mt-3 grid gap-2">
            {q.options.map((o) => {
              const right = o.name === q.answer.name;
              const state = !picked ? "idle" : right ? "right" : o.name === picked ? "wrong" : "dim";
              return (
                <button
                  key={o.gbifKey}
                  type="button"
                  disabled={!!picked}
                  onClick={() => choose(o.name!)}
                  className={[
                    "min-h-11 rounded-xl border px-3.5 py-2 text-left text-[14px] font-medium transition",
                    state === "idle" && "border-white/25 bg-white/5 hover:bg-white/15",
                    state === "right" && "border-[#9bd29b] bg-[#2f6b3a]",
                    state === "wrong" && "border-[#e08a7a] bg-[#7a2f24]",
                    state === "dim" && "border-white/10 opacity-50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {o.name}
                </button>
              );
            })}
          </div>
          {picked && (
            <div aria-live="polite" className="mt-3 rounded-xl bg-white/10 px-3.5 py-3 text-[13px] leading-relaxed">
              <p>
                <strong>{picked === q.answer.name ? "Isso mesmo!" : "Quase."}</strong> É {q.answer.name} (
                <i>{q.answer.scientificName}</i>), do grupo {q.answer.group.toLowerCase()}.
                {q.answer.iucn && IUCN_LABEL[q.answer.iucn] && q.answer.iucn !== "DD"
                  ? ` Situação: ${IUCN_LABEL[q.answer.iucn]!.toLowerCase()}.`
                  : ""}
              </p>
              <button type="button" onClick={next} className="mt-2.5 h-10 rounded-full bg-card px-5 text-sm font-medium text-forest-deep">
                {step + 1 < questions.length ? "Próxima" : "Ver resultado"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pt-4 pb-5">
          <p className="font-display text-3xl font-semibold">
            {score} de {questions.length}
          </p>
          <p className="mt-1 text-[14px] opacity-85">
            {score === questions.length
              ? `Você conhece bem a vida de ${parkName}.`
              : score >= 3
                ? "Bom olho! Dá para melhorar na próxima rodada."
                : "Cada espécie é uma história: veja as fichas acima e tente de novo."}
          </p>
          <button type="button" onClick={again} className="mt-3 h-10 rounded-full bg-card px-5 text-sm font-medium text-forest-deep">
            Jogar de novo
          </button>
        </div>
      )}
    </section>
  );
}
