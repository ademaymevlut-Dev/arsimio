// Public routing/branding defaults; credentials and bootstrap identities stay in env/DB.
export const PLATFORM_HOSTNAME = "arsimio.vercel.app";

export const PILOT_SCHOOLS = [
  {
    slug: "horizonedu",
    name: "HorizonEdu",
    hostname: "horizonedu.vercel.app",
    primaryColor: "#2563eb",
    accentColor: "#93c5fd",
  },
  {
    slug: "gjimcamedu",
    name: "GjimCamEdu",
    hostname: "gjimcamedu.vercel.app",
    primaryColor: "#0f766e",
    accentColor: "#5eead4",
  },
] as const;
