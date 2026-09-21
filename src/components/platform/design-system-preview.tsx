"use client";

import { useState } from "react";
import {
  CheckCircle2,
  CircleHelp,
  Info,
  TriangleAlert,
  CircleX,
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const palette = [
  {
    name: "Ana renk",
    token: "primary",
    hex: "#142D55",
    usage: "Ana aksiyonlar",
    style: "bg-primary",
  },
  {
    name: "İkincil renk",
    token: "secondary",
    hex: "#DCDDE2",
    usage: "Yardımcı aksiyonlar",
    style: "bg-secondary",
  },
  {
    name: "Arka plan",
    token: "background",
    hex: "#EDF2F9",
    usage: "Ortak açık sayfa zemini",
    style: "bg-background",
  },
  {
    name: "Vurgu",
    token: "accent",
    hex: "#BB992F",
    usage: "Marka detayları",
    style: "bg-accent",
  },
  {
    name: "Kart yüzeyi",
    token: "card",
    hex: "#FFFFFF",
    usage: "Kartlar ve pencereler",
    style: "bg-card",
  },
  {
    name: "Metin",
    token: "foreground",
    hex: "#5E6E82",
    usage: "Gövde ve yardımcı metin",
    style: "bg-foreground",
  },
];
const statuses = [
  {
    variant: "success",
    title: "İşlem başarılı",
    description: "Bilgiler başarıyla kaydedildi.",
    icon: CheckCircle2,
  },
  {
    variant: "warning",
    title: "Kontrol gerekiyor",
    description: "Devam etmeden önce bilgileri kontrol edin.",
    icon: TriangleAlert,
  },
  {
    variant: "info",
    title: "Bilgilendirme",
    description: "Bu renkler tüm okullarda ortak kullanılır.",
    icon: Info,
  },
  {
    variant: "danger",
    title: "İşlem tamamlanamadı",
    description: "Alanları kontrol ederek tekrar deneyin.",
    icon: CircleX,
  },
] as const;

export function DesignSystemPreview() {
  const [selected, setSelected] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [message, setMessage] = useState("");
  return (
    <Tabs defaultValue="palette">
      <TabsList aria-label="UI Kit bölümleri">
        <TabsTrigger value="palette">Renkler ve durumlar</TabsTrigger>
        <TabsTrigger value="components">Bileşenler</TabsTrigger>
      </TabsList>
      <TabsContent value="palette" className="space-y-8">
        <section
          aria-label="Temel renk paleti"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {palette.map((color) => (
            <Card key={color.token} className="gap-0">
              <CardContent>
                <div
                  className={`h-20 rounded-lg border ${color.style}`}
                  aria-hidden
                />
                <div className="mt-4 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-primary">{color.name}</h2>
                  <code className="text-xs">{color.hex}</code>
                </div>
                <p className="mt-1 text-xs leading-5">{color.usage}</p>
                <code className="mt-3 block text-[11px] text-muted-foreground">
                  --{color.token}
                </code>
              </CardContent>
            </Card>
          ))}
        </section>
        <section aria-labelledby="status-colors" className="space-y-4">
          <div>
            <h2
              id="status-colors"
              className="text-lg font-semibold text-primary"
            >
              Ortak durum renkleri
            </h2>
            <p className="mt-1 text-sm">
              Her durumun kendi zemin, metin ve kenarlık rengi var. Anlam
              yalnızca renkle verilmez.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {statuses.map(({ variant, title, description, icon: Icon }) => (
              <Alert key={variant} variant={variant}>
                <Icon aria-hidden />
                <AlertTitle>{title}</AlertTitle>
                <AlertDescription>{description}</AlertDescription>
                <code className="mt-3 block text-xs">{variant}</code>
              </Alert>
            ))}
          </div>
        </section>
      </TabsContent>
      <TabsContent value="components" className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Butonlar ve durum etiketleri</CardTitle>
            <CardDescription>
              Normal, hover, klavye odağı ve devre dışı durumlar ortak tokenları
              kullanır.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button>Ana buton</Button>
              <Button variant="secondary">İkincil</Button>
              <Button variant="outline">Çerçeveli</Button>
              <Button variant="ghost">Sade</Button>
              <Button variant="accent">Vurgu</Button>
              <Button disabled>Devre dışı</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {statuses.map(({ variant }) => (
                <Button key={variant} variant={variant}>
                  {variant}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Aktif</Badge>
              <Badge variant="warning">Bekliyor</Badge>
              <Badge variant="info">Taslak</Badge>
              <Badge variant="danger">Hata</Badge>
              <Badge variant="secondary">Arşiv</Badge>
            </div>
          </CardContent>
        </Card>
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Form alanları</CardTitle>
              <CardDescription>
                Etiketli, klavyeyle kullanılabilir örnek alanlar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="demo-name">Örnek okul adı</Label>
                <Input
                  id="demo-name"
                  placeholder="Okul adını yazın"
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-status">Örnek durum</Label>
                <NativeSelect id="demo-status" defaultValue="active">
                  <option value="active">Aktif</option>
                  <option value="draft">Taslak</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-note">Not</Label>
                <Textarea
                  id="demo-note"
                  placeholder="Bu alan yalnızca bir örnektir."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="demo-invalid">Hatalı alan örneği</Label>
                <Input
                  id="demo-invalid"
                  aria-invalid
                  aria-describedby="demo-error"
                  defaultValue="Eksik bilgi"
                  className="h-10"
                />
                <p id="demo-error" className="text-xs text-danger-foreground">
                  Lütfen geçerli bir değer girin.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="demo-selected"
                  checked={selected}
                  onCheckedChange={(value) => setSelected(value === true)}
                />
                <Label htmlFor="demo-selected">Örnek kaydı seç</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="demo-partial" checked="indeterminate" disabled />
                <Label htmlFor="demo-partial">Kısmi seçim / devre dışı</Label>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="demo-notification">
                  Örnek bildirim tercihi
                </Label>
                <Switch
                  id="demo-notification"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
            </CardContent>
            <CardFooter className="text-xs">
              Buradaki seçimler kaydedilmez; yalnızca bu ekranda geçerlidir.
            </CardFooter>
          </Card>
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Pencereler ve yardımcı bilgiler</CardTitle>
                <CardDescription>
                  Modal ve onay pencerelerinde odak yönetimi Radix tarafından
                  sağlanır.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Örnek modalı aç</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Örnek modal</DialogTitle>
                      <DialogDescription>
                        Bu pencere yalnızca tasarım önizlemesidir. Escape
                        tuşuyla veya Kapat butonuyla kapatabilirsiniz.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="demo-dialog-note">Örnek açıklama</Label>
                      <Textarea
                        id="demo-dialog-note"
                        placeholder="Kısa bir açıklama…"
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Vazgeç</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          onClick={() =>
                            setMessage(
                              "Örnek pencere kapatıldı; hiçbir okul kaydı değişmedi.",
                            )
                          }
                        >
                          Örneği tamamla
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="danger">Onay penceresini aç</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Örnek seçimler sıfırlansın mı?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Yalnızca bu sayfadaki checkbox ve bildirim tercihi
                        başlangıç durumuna döner. Okul verileri etkilenmez.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setSelected(false);
                          setNotifications(true);
                          setMessage(
                            "Örnek seçimler sıfırlandı. Okul verileri değişmedi.",
                          );
                        }}
                      >
                        Örneği sıfırla
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Tooltip hakkında bilgi"
                    >
                      <CircleHelp aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Bu yardımcı bilgi fareyle veya klavye odağıyla açılır.
                  </TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Yükleniyor durumu</CardTitle>
                <CardDescription>
                  Hareket azaltma tercihini dikkate alan skeleton.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
            {message && (
              <Alert variant="success" role="status">
                <AlertDescription className="mt-0">{message}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
