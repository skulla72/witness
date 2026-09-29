const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'];

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="border-b border-border bg-secondary px-4 py-2 text-center text-[12px] text-ink">
        Checkout isn't live yet. Finish the payment setup steps to take real orders.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="border-b border-border bg-secondary px-4 py-2 text-center text-[12px] text-ink-soft">
        Practice mode — no card is charged in the preview.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brass underline"
        >
          Read more
        </a>
      </div>
    );
  }
  return null;
}
