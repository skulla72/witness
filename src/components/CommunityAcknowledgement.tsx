export type CommunityAcknowledgementProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function CommunityAcknowledgement({
  id,
  checked,
  onChange,
  disabled = false,
}: CommunityAcknowledgementProps) {
  return (
    <div className={disabled ? "space-y-2 opacity-60" : "space-y-2"}>
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ink-soft"
      >
        <input
          id={id}
          type="checkbox"
          required
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:cursor-not-allowed"
        />
        <span>
          I confirm I am at least 13 years old, understand Witness’s age
          requirements, agree to the{" "}
          <a
            href="/terms"
            className="text-ink underline decoration-brass underline-offset-2 hover:text-brass"
          >
            Terms of Use
          </a>
          , and acknowledge the{" "}
          <a
            href="/privacy"
            className="text-ink underline decoration-brass underline-offset-2 hover:text-brass"
          >
            Privacy Notice
          </a>
          .
        </span>
      </label>
      <div className="space-y-1 pl-7 text-[11px] leading-relaxed text-ink-soft">
        <p>
          Legal documents remain unfinished drafts; legal review is not complete.
        </p>
        <p>
          This is your self-declaration; your age is not independently verified.
        </p>
      </div>
    </div>
  );
}
