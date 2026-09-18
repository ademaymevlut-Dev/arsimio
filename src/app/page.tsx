import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  Database,
  School,
  Server,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stack = [
  {
    title: "Next.js 16",
    description: "App Router ve React Server Components temeli hazır.",
    icon: Server,
  },
  {
    title: "Tailwind CSS 4",
    description: "Hızlı, tutarlı ve responsive arayüz geliştirme altyapısı.",
    icon: Blocks,
  },
  {
    title: "shadcn/ui",
    description: "Erişilebilir ve özelleştirilebilir arayüz bileşenleri.",
    icon: CheckCircle2,
  },
  {
    title: "Neon PostgreSQL",
    description: "Vercel entegrasyonu için bağlantı katmanı hazır.",
    icon: Database,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-1 flex-col bg-[radial-gradient(circle_at_top_left,var(--color-primary)_0,transparent_24rem)] bg-size-[100%_30rem] bg-no-repeat">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <School aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">arsimio</p>
              <p className="text-xs text-muted-foreground">Okul yönetim platformu</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Kurulum hazır
          </Badge>
        </header>

        <section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-6">
              Yeni başlangıç
            </Badge>
            <h1 className="text-balance text-5xl font-semibold tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Eğitimi yönetmenin daha akıllı yolu.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
              Arsimio&apos;nun modern web temeli hazır. Eski HorizonEdu
              uygulamasındaki iş akışlarını adım adım, güvenli ve ölçeklenebilir
              bir yapıya taşıyabiliriz.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href="#altyapi">
                  Altyapıyı incele
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/api/health">Sistem durumunu kontrol et</a>
              </Button>
            </div>
          </div>

          <Card className="bg-card/90 shadow-xl shadow-primary/5 backdrop-blur">
            <CardHeader>
              <CardDescription>Proje durumu</CardDescription>
              <CardTitle className="text-2xl">Geliştirmeye hazır</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                "TypeScript ve App Router yapılandırıldı",
                "Arsimio tema tokenları tanımlandı",
                "Neon bağlantı yardımcısı eklendi",
                "Vercel uyumlu üretim yapısı hazır",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-primary"
                  />
                  <span className="text-sm leading-6">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section
          id="altyapi"
          className="grid scroll-mt-8 gap-4 pb-12 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stack.map(({ title, description, icon: Icon }) => (
            <Card key={title} size="sm" className="bg-card/80">
              <CardHeader>
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-4.5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="leading-6">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
