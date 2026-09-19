"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth/server";
import { getPrisma } from "@/lib/db";
import { getTenantContext } from "@/server/tenancy/context";

export type AuthState = { error?: string; message?: string };
function credentials(form: FormData) {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 320 ||
    password.length < 8 ||
    password.length > 128
  )
    return null;
  return { email, password };
}

export async function signIn(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const tenant = await getTenantContext();
  const values = credentials(form);
  if (!values) return { error: "Geçerli e-posta ve parolanızı girin." };
  try {
    const { data, error } = await getAuth().signIn.email(values);
    if (error)
      return {
        error:
          "Giriş yapılamadı. Bilgilerinizi ve e-posta doğrulamanızı kontrol edin.",
      };
    // Use the provider's fresh sign-in response; the incoming request still carries old cookies.
    if (!data?.user.emailVerified)
      return { error: "Devam etmek için e-posta adresinizi doğrulayın." };
    const allowedEmail =
      process.env.ARSIMIO_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
    if (
      tenant.kind === "platform" &&
      allowedEmail &&
      data.user.email.toLowerCase() === allowedEmail
    ) {
      await getPrisma().$transaction(async (tx) => {
        const reserved = await tx.user.findFirst({
          where: {
            email: allowedEmail,
            status: "PENDING",
            archivedAt: null,
            authProvider: null,
            authProviderUserId: null,
            platformRoles: {
              some: {
                role: {
                  scope: "PLATFORM",
                  code: "SUPER_ADMIN",
                  schoolId: null,
                },
              },
            },
          },
        });
        if (!reserved) return;
        const bound = await tx.user.updateMany({
          where: {
            id: reserved.id,
            status: "PENDING",
            authProvider: null,
            authProviderUserId: null,
          },
          data: {
            authProvider: "neon",
            authProviderUserId: data.user.id,
            status: "ACTIVE",
            lastLoginAt: new Date(),
          },
        });
        if (bound.count)
          await tx.auditEvent.create({
            data: {
              source: "USER",
              actorUserId: reserved.id,
              action: "platform.admin.activated",
              entityType: "User",
              entityId: reserved.id,
              beforeData: { status: "PENDING" },
              afterData: { status: "ACTIVE", authProvider: "neon" },
              reason:
                "Reserved bootstrap account linked to provider-verified email and immutable auth user ID.",
            },
          });
      });
    }
  } catch {
    return {
      error: "Giriş hizmetine şu an ulaşılamıyor. Lütfen tekrar deneyin.",
    };
  }
  redirect(tenant.kind === "platform" ? "/platform" : "/dashboard");
}

export async function registerBootstrap(
  _state: AuthState,
  form: FormData,
): Promise<AuthState> {
  const tenant = await getTenantContext();
  if (tenant.kind !== "platform") return { error: "Bu işlem kullanılamıyor." };
  const values = credentials(form);
  const allowedEmail =
    process.env.ARSIMIO_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (
    !values ||
    !allowedEmail ||
    values.email !== allowedEmail ||
    values.password.length < 12
  )
    return {
      error:
        "Onaylı yönetici adresinizi ve en az 12 karakterli bir parola kullanın.",
    };
  const reserved = await getPrisma().user.findFirst({
    where: {
      email: allowedEmail,
      status: "PENDING",
      authProvider: null,
      authProviderUserId: null,
      platformRoles: {
        some: {
          role: { scope: "PLATFORM", code: "SUPER_ADMIN", schoolId: null },
        },
      },
    },
  });
  if (!reserved)
    return { error: "İlk hesap kurulumu açık değil. Giriş ekranını kullanın." };
  try {
    const callbackURL = `${process.env.NODE_ENV === "development" ? "http" : "https"}://${tenant.hostname}${process.env.NODE_ENV === "development" ? ":3000" : ""}/login`;
    const { error } = await getAuth().signUp.email({
      ...values,
      name: "Arsimio Yönetici",
      callbackURL,
    });
    if (error)
      return {
        error: "Hesap oluşturulamadı. Daha önce oluşturduysanız giriş yapın.",
      };
    const sent = await getAuth().sendVerificationEmail({
      email: values.email,
      callbackURL,
    });
    if (sent.error)
      return {
        error:
          "Hesap oluşturuldu ancak doğrulama e-postası gönderilemedi. Kurulum desteği gerekiyor.",
      };
    return {
      message:
        "Doğrulama bağlantısı e-posta adresinize gönderildi. Bağlantıyı açtıktan sonra giriş yapın.",
    };
  } catch {
    return {
      error: "Hesap kurulum hizmetine ulaşılamadı. Lütfen tekrar deneyin.",
    };
  }
}

export async function signOut() {
  await getTenantContext();
  await getAuth().signOut();
  redirect("/login");
}
