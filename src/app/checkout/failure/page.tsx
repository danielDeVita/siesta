import { Suspense } from "react";
import { CheckoutFailureView } from "@/components/checkout-failure-view";

export default function CheckoutFailurePage() {
  return (
    <Suspense fallback={<p>Cargando...</p>}>
      <CheckoutFailureView />
    </Suspense>
  );
}
