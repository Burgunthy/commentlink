"use client";

interface CheckoutButtonProps {
  /** Internal plan name (pro | business). The /checkout route maps it to a variant. */
  plan: string;
  label?: string;
}

/**
 * Sends the browser to /checkout?plan=…, which builds the LemonSqueezy
 * checkout server-side (variant id + user identity live on the server).
 */
export function CheckoutButton({ plan, label = "결제하기" }: CheckoutButtonProps) {
  const handleClick = () => {
    window.location.href = `/checkout?plan=${encodeURIComponent(plan)}`;
  };

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
    >
      {label}
    </button>
  );
}
