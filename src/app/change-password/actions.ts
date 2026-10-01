"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { parseChangePassword, type AccountState } from "@/lib/account-validation";
import { isSameOrigin } from "@/server/auth/identifiers";
import { getAppUser } from "@/server/auth/user";
import { sessionCookieName } from "@/server/auth/tokens";
import { changeOwnTemporaryPassword } from "@/server/accounts/accounts-service";

async function sameOriginRequest() {
  const request = await headers();
  return isSameOrigin(
    request.get("origin"),
    request.get("host"),
    process.env.NODE_ENV === "development",
  );
}

export async function changeTemporaryPassword(
  _state: AccountState,
  form: FormData,
): Promise<AccountState> {
  const user = await getAppUser();
  if (!user?.schoolId || !user.account?.mustChangePassword)
    redirect(user?.account?.portal === "GUARDIAN" ? "/guardian" : "/dashboard");
  if (!(await sameOriginRequest()))
    return { status: "error", message: "Istek dogrulanamadi." };
  const parsed = parseChangePassword(form);
  if (!parsed.success) return parsed.state;

  let ok = false;
  try {
    const result = await getPrisma().$transaction((tx) =>
      changeOwnTemporaryPassword(tx, {
        schoolId: user.schoolId!,
        userId: user.id,
        password: parsed.data.password,
      }),
    );
    ok = result.status === "success";
    if (!ok) return { status: "error", message: result.message };
    const jar = await cookies();
    jar.set(sessionCookieName(process.env.NODE_ENV === "production"), "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch {
    console.error("TEMP_PASSWORD_CHANGE_UNAVAILABLE");
    return { status: "error", message: "Parola degistirilemedi." };
  }
  if (ok) redirect("/login");
  return { status: "error", message: "Parola degistirilemedi." };
}
