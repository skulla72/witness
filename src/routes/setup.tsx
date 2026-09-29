import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Check, Lock } from "lucide-react";
import { BRAND } from "@/config/brand";
import { usePrefs } from "@/hooks/usePrefs";
import { useSession } from "@/hooks/useSession";
import {
  activeFeatures,
  type FeatureKey,
  type LaneKey,
} from "@/data/personalize";
import {
  scoreSurvey,
  surveySectionsFor,
  suggestedFeatures,
  suggestedLanesFromSurvey,
  type Answers,
} from "@/data/survey";
import { LANES, laneLine } from "@/data/giving";

export const Route = createFileRoute("/setup")({
  staticData: { sitemap: false },
  component: Setup,
  head: () => ({
    meta: [
      { title: `Set up ${BRAND.name} — the survey that shapes your app` },
      {
        name: "description",
        content:
          "A short survey about the season you're in, how you're wired, and where you want to give. Your answers decide which rooms open and which giving lanes come first.",
      },
      { property: "og:title", content: `Set up ${BRAND.name}` },
      {
        property: "og:description",
        content: "Answer honestly once, and the app is shaped to the season you're in.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Setup() {
  const navigate = useNavigate();
  const { signedIn } = useSession();
  const { prefs, ready, update } = usePrefs();
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [lanes, setLanes] = useState<LaneKey[]>([]);
  const [rooms, setRooms] = useState<FeatureKey[]>([]);
  const [touchedResults, setTouchedResults] = useState(false);
  const surveyGender = (answers["gender"]?.[0] as "male" | "female" | "unspecified" | undefined) ?? prefs.gender;
  const sections = useMemo(
    () => surveySectionsFor(prefs.faithBased, surveyGender),
    [prefs.faithBased, surveyGender],
  );
  const questionCount = useMemo(
    () => sections.reduce((count, item) => count + item.questions.length, 0),
    [sections],
  );
  const visibleAnswers = useMemo<Answers>(() => {
    if (prefs.faithBased !== false) return answers;
    return Object.fromEntries(
      Object.entries(answers)
        .filter(([questionId]) => questionId !== "faith_stage" && questionId !== "church")
        .map(([questionId, optionIds]) => [
          questionId,
          questionId === "keeps" ? optionIds.filter(optionId => optionId !== "verse") : optionIds,
        ]),
    );
  }, [answers, prefs.faithBased]);
  const steps = sections.length + 2;
  const resultStep = steps - 1;

  // The survey belongs to an account, so sign-in comes first.
  useEffect(() => {
    if (signedIn === false) {
      void navigate({ to: "/login", search: { next: "/setup" } as never, replace: true });
    }
  }, [signedIn, navigate]);

  useEffect(() => {
    if (!ready) return;
    setFirstName(prefs.firstName);
    if (Object.keys(prefs.answers ?? {}).length) setAnswers(prefs.answers);
    if (prefs.lanes.length) setLanes(prefs.lanes);
  }, [ready, prefs]);

  const result = useMemo(() => scoreSurvey(visibleAnswers), [visibleAnswers]);
  const suggestedRooms = useMemo(() => {
    const suggested = suggestedFeatures(result);
    return prefs.faithBased === false
      ? suggested.filter(feature => feature !== "bible" && feature !== "confessional" && feature !== "room" && feature !== "fatherwound")
      : suggested;
  }, [result, prefs.faithBased]);

  // Landing on the results screen, pre-fill what the answers pointed to.
  useEffect(() => {
    if (step !== resultStep || touchedResults) return;
    setLanes(suggestedLanesFromSurvey(result));
    setRooms(suggestedRooms);
  }, [step, resultStep, touchedResults, result, suggestedRooms]);

  const pick = (qid: string, oid: string, multi: boolean) => {
    setAnswers(prev => {
      const cur = prev[qid] ?? [];
      if (!multi) return { ...prev, [qid]: cur[0] === oid ? [] : [oid] };
      return {
        ...prev,
        [qid]: cur.includes(oid) ? cur.filter(x => x !== oid) : [...cur, oid],
      };
    });
    setTouchedResults(false);
  };

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) => {
    setTouchedResults(true);
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  const finish = () => {
    const removed = suggestedRooms.filter(f => !rooms.includes(f));
    update({
      done: true,
      firstName: firstName.trim(),
      gender: result.gender,
      answers: visibleAnswers,
      seasons: result.seasons,
      intensity: result.intensity,
      mensRoom: rooms.includes("room"),
      anonymousFirst: result.anonymousFirst,
      lanes,
      serve: result.serve,
      processing: result.processing,
      contact: result.contact,
      timeOfDay: result.timeOfDay,
      groupSize: result.groupSize,
      addedFeatures: rooms,
      removedFeatures: removed,
    });
    navigate({ to: "/" });
  };

  const section = step >= 1 && step < resultStep ? sections[step - 1] : null;
  const sectionDone = section
    ? section.questions.every(q => (answers[q.id] ?? []).length > 0)
    : true;

  const preview = activeFeatures({
    ...prefs,
    seasons: result.seasons,
    intensity: result.intensity,
    mensRoom: rooms.includes("room"),
    serve: result.serve,
    processing: result.processing,
    contact: result.contact,
    addedFeatures: rooms,
    removedFeatures: suggestedRooms.filter(f => !rooms.includes(f)),
  });

  if (signedIn !== true) {
    return (
      <div className="px-5 pb-36 pt-16 text-center">
        <p className="text-[13px] text-ink-soft">
          {signedIn === false ? "Taking you to create your account…" : "One moment…"}
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-36 pt-6">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: steps }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-brass" : "bg-secondary"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-[10.5px] uppercase tracking-[0.18em] text-ink-soft">
        {result.answered} of {questionCount} answered
      </p>

      {step === 0 && (
        <Panel
          eyebrow="Before we start"
          title={`Welcome to ${BRAND.name}.`}
          sub={`${questionCount} short questions, five minutes. They decide which spaces of this app appear for you and where your giving lands — and you can change every answer later, because seasons change.`}
        >
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name (or a name you'd rather use)"
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-soft/70 focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass" />
            <p className="text-[12px] leading-snug text-ink-soft">
              No answer in this survey is ever shown to another person. It only decides what your
              own app looks like.
            </p>
          </div>
        </Panel>
      )}

      {section && (
        <Panel eyebrow={section.eyebrow} title={section.title} sub={section.intro}>
          <div className="space-y-7">
            {section.questions.map(q => {
              const picked = answers[q.id] ?? [];
              return (
                <div key={q.id}>
                  <p className="font-serif text-[16.5px] leading-snug text-ink">{q.prompt}</p>
                  {q.help && (
                    <p className="mt-1 text-[12px] leading-snug text-ink-soft">{q.help}</p>
                  )}
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-brass">
                    {q.type === "multi" ? "Pick any" : "Pick one"}
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {q.options.map(o => {
                      const on = picked.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          onClick={() => pick(q.id, o.id, q.type === "multi")}
                          className={`tap-scale flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                            on ? "border-brass bg-brass/10" : "border-border bg-card"
                          }`}
                        >
                          <span
                            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border ${
                              q.type === "multi" ? "rounded-md" : "rounded-full"
                            } ${on ? "border-brass bg-brass" : "border-border"}`}
                          >
                            {on && <Check className="h-3 w-3 text-paper" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[14.5px] leading-snug text-ink">
                              {o.label}
                              {o.recommended && (
                                <span className="ml-2 align-middle rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.16em] text-brass">
                                  Recommended
                                </span>
                              )}
                            </span>
                            {o.sub && (
                              <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">
                                {o.sub}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {step === resultStep && (
        <Panel
          eyebrow="What your answers said"
          title="Here's the app you just described."
          sub="Uncheck anything you don't want. Nothing here is locked, and everything can be reopened later from You → How this app is shaped."
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-brass">
            Giving lanes, strongest first
          </p>
          <div className="mt-2 space-y-2">
            {result.lanes.length === 0 && (
              <p className="text-[12.5px] italic text-ink-soft">
                Nothing pointed to a lane yet — go back to Part four, or pick any lane below later.
              </p>
            )}
            {result.lanes.map(scored => {
              const lane = LANES.find(l => l.key === scored.key);
              if (!lane) return null;
              const neutralLane = prefs.faithBased === false ? neutralLaneCopy[lane.key] : undefined;
              const label = neutralLane?.label ?? lane.label;
              const line = neutralLane?.line ?? laneLine(lane, surveyGender);
              const on = lanes.includes(lane.key);
              return (
                <button
                  key={lane.key}
                  onClick={() => toggle(lanes, lane.key, setLanes)}
                  className={`tap-scale flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
                    on ? "border-brass bg-brass/10" : "border-border bg-card"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                      on ? "border-brass bg-brass" : "border-border"
                    }`}
                  >
                    {on && <Check className="h-3 w-3 text-paper" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-[15.5px] leading-tight text-ink">
                       {label}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] italic leading-snug text-ink-soft">
                       {line}
                    </span>
                    <span className="mt-1.5 block text-[11.5px] leading-snug text-ink-soft">
                      Because you said: {scored.reasons.slice(0, 2).map(r => `"${r}"`).join(", ")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-brass">
            Rooms your answers opened
          </p>
          <div className="mt-2 space-y-2">
            {suggestedRooms.length === 0 && (
              <p className="text-[12.5px] italic text-ink-soft">
                Nothing extra opened — you'll start with the quiet version of the app.
              </p>
            )}
            {suggestedRooms.map(key => {
              const scored = result.features.find(f => f.key === key);
              if (!scored) return null;
              const on = rooms.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggle(rooms, key, setRooms)}
                  className={`tap-scale flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
                    on ? "border-ink bg-card shadow-lift" : "border-border bg-card"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${
                      on ? "border-ink bg-ink" : "border-border"
                    }`}
                  >
                    {on && <Check className="h-3 w-3 text-paper" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-[15.5px] leading-tight text-ink">
                      {featureLabel[key] ?? key}
                      {key === "gratitude" && (
                        <span className="ml-2 align-middle rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.16em] text-brass">
                          Recommended
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
                      {featureWhy[key] ?? ""}
                    </span>
                    <span className="mt-1.5 block text-[11.5px] leading-snug text-ink-soft">
                      Because you said: {scored.reasons.slice(0, 2).map(r => `"${r}"`).join(", ")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Your app will open with</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preview.map(f => (
                <span
                  key={f}
                  className="rounded-full border border-border bg-paper px-2.5 py-1 text-[11px] text-ink-soft"
                >
                  {featureLabel[f] ?? f}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] italic text-ink-soft">
              Everything else stays closed until you ask for it.
            </p>
          </div>
        </Panel>
      )}

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-paper/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-3 text-[12.5px] text-ink-soft"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          <button
             onClick={() => (step === resultStep ? finish() : setStep(s => s + 1))}
            className="tap-scale inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-[13.5px] text-paper"
          >
             {step === resultStep ? "Shape my app" : "Continue"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {section && !sectionDone && (
          <p className="mt-2 text-center text-[11px] text-ink-soft">
            You can skip any question — blanks just carry less weight.
          </p>
        )}
      </div>
    </div>
  );
}

const featureLabel: Record<string, string> = {
  confessional: "The Confessional",
  notokay: "Not okay tonight",
  wingman: "One-to-one support",
  fatherwound: "Family healing track",
  gratitude: "Gratitude",
  walk: "Walk With",
  room: "Private support space",
  giving: "Giving lanes",
  serve: "Serving",
  map: "Community map",
  ledger: "Ledger",
  bible: "Bible",
};

const featureWhy: Record<string, string> = {
  confessional: "Say it out loud with no name attached, and no advice back.",
  notokay: "One button for the worst hour of the night.",
  wingman: "One person who checks in, and who you check on.",
  fatherwound: "A slow track for what a parent did or didn't do.",
  gratitude: "A private daily gratitude journal — one line, only for you.",
  walk: "Small groups that sit with you instead of fixing you.",
  room: "A private space for honest support, door closed.",
  giving: "Money and hours pointed at one lane.",
  serve: "Shifts, skills, and back-office work nonprofits actually need.",
  map: "Where people are carrying one another right now.",
  ledger: "A running record of what's been answered.",
  bible: "Something true to read when it's quiet.",
};

const neutralLaneCopy: Partial<Record<LaneKey, { label: string; line: string }>> = {
  recovery: {
    label: "Recovery",
    line: "For anyone working toward a steadier life.",
  },
  fatherlessness: {
    label: "Support for young people",
    line: "For young people who need a steady adult who stays.",
  },
  mens_mental_health: {
    label: "Mental health & suicide prevention",
    line: "For anyone who says they're fine when they aren't.",
  },
};

function Panel({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rise-in mt-6">
      <p className="text-[10px] uppercase tracking-[0.22em] text-brass">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-[26px] leading-tight text-ink">{title}</h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{sub}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
