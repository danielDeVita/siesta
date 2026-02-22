import crypto from "crypto";

type MercadoPagoPreferenceItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id: "ARS";
};

type CreatePreferenceInput = {
  externalReference: string;
  items: MercadoPagoPreferenceItem[];
  payer: {
    name: string;
    email: string;
  };
  backUrls: {
    success: string;
    failure: string;
    pending: string;
  };
  notificationUrl: string;
  metadata?: Record<string, unknown>;
};

type MercadoPagoPreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
};

type MercadoPagoPaymentResponse = {
  id: number;
  status: string;
  status_detail: string;
  external_reference?: string;
  metadata?: Record<string, unknown>;
};

export type MercadoPagoWebhookSignatureReason =
  | "valid"
  | "missing_secret"
  | "unsigned_request"
  | "missing_headers"
  | "missing_signature_parts"
  | "invalid_digest";

export type MercadoPagoWebhookSignatureResult = {
  isValid: boolean;
  isSigned: boolean;
  reason: MercadoPagoWebhookSignatureReason;
};

const API_BASE = "https://api.mercadopago.com";

function getAccessToken(): string {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MP_ACCESS_TOKEN is required");
  }
  return accessToken;
}

export async function createMercadoPagoPreference(
  input: CreatePreferenceInput
): Promise<MercadoPagoPreferenceResponse> {
  const response = await fetch(`${API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      external_reference: input.externalReference,
      items: input.items,
      payer: input.payer,
      back_urls: input.backUrls,
      notification_url: input.notificationUrl,
      auto_return: "approved",
      metadata: input.metadata ?? {}
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Pago preference failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as MercadoPagoPreferenceResponse;
  return data;
}

export async function getMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPaymentResponse> {
  const response = await fetch(`${API_BASE}/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Pago payment fetch failed: ${response.status} ${body}`);
  }

  return (await response.json()) as MercadoPagoPaymentResponse;
}

export function verifyMercadoPagoWebhookSignature(params: {
  rawSignatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string | null;
  secret: string | null;
}): MercadoPagoWebhookSignatureResult {
  const { rawSignatureHeader, requestIdHeader, dataId, secret } = params;

  if (!secret) {
    return {
      isValid: false,
      isSigned: false,
      reason: "missing_secret"
    };
  }

  if (!rawSignatureHeader) {
    return {
      isValid: false,
      isSigned: false,
      reason: "unsigned_request"
    };
  }

  if (!requestIdHeader || !dataId) {
    return {
      isValid: false,
      isSigned: true,
      reason: "missing_headers"
    };
  }

  const fragments = Object.fromEntries(
    rawSignatureHeader.split(",").map((entry) => {
      const [key, value] = entry.trim().split("=");
      return [
        key?.trim().toLowerCase(),
        value?.trim().replace(/^"+|"+$/g, "")
      ];
    })
  );

  const ts = fragments.ts;
  const signatureV1 = fragments.v1;

  if (!ts || !signatureV1) {
    return {
      isValid: false,
      isSigned: true,
      reason: "missing_signature_parts"
    };
  }

  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
  const expectedDigest = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const receivedDigest = signatureV1.toLowerCase();

  if (expectedDigest.length !== receivedDigest.length) {
    return {
      isValid: false,
      isSigned: true,
      reason: "invalid_digest"
    };
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedDigest, "utf8"),
    Buffer.from(receivedDigest, "utf8")
  );

  return {
    isValid,
    isSigned: true,
    reason: isValid ? "valid" : "invalid_digest"
  };
}
