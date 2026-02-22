function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const appConfig = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  nextAuthSecret: getRequiredEnv("NEXTAUTH_SECRET"),
  mercadoPagoAccessToken: process.env.MP_ACCESS_TOKEN ?? "",
  mercadoPagoWebhookSecret: process.env.MP_WEBHOOK_SECRET ?? "",
  mercadoPagoWebhookPolicy:
    process.env.MP_WEBHOOK_POLICY?.toLowerCase() === "strict" ? "strict" : "compat",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? ""
};
