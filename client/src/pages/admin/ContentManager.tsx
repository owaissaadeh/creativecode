import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Layers, FolderKanban, Settings, Save, Upload, ImageIcon, ArrowUp, ArrowDown, X } from "lucide-react";
import { useSiteConfig } from "@/lib/siteConfig";
import type { SiteConfig } from "@/lib/siteConfig";
import type { PageItem } from "@shared/schema";

type ItemForm = {
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  tags: string;
  orderIndex: number;
  isActive: boolean;
  imageUrls: string[];
};

const emptyForm: ItemForm = {
  title: "", subtitle: "", description: "", icon: "", tags: "", orderIndex: 0, isActive: true, imageUrls: []
};

function ItemDialog({
  open,
  onClose,
  itemType,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  itemType: "service" | "project";
  editing: PageItem | null;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<ItemForm>(
    editing
      ? { title: editing.title, subtitle: editing.subtitle || "", description: editing.description || "", icon: editing.icon || "", tags: editing.tags.join(", "), orderIndex: editing.orderIndex, isActive: editing.isActive, imageUrls: editing.imageUrls || [] }
      : emptyForm
  );

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/admin/content/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/items"] });
      toast({ title: "تم الإضافة بنجاح" });
      onClose();
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: object) => apiRequest("PATCH", `/api/admin/content/items/${editing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/items"] });
      toast({ title: "تم التحديث بنجاح" });
      onClose();
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: "العنوان مطلوب", variant: "destructive" });
      return;
    }
    const payload = {
      itemType,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      icon: form.icon.trim() || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      orderIndex: form.orderIndex,
      isActive: form.isActive,
      imageUrls: form.imageUrls,
    };
    editing ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل" : "إضافة"} {itemType === "service" ? "خدمة" : "مشروع"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>العنوان *</Label>
              <Input data-testid="input-item-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان العنصر" />
            </div>
            <div className="space-y-1.5">
              <Label>{itemType === "service" ? "التخصص" : "التصنيف"}</Label>
              <Input data-testid="input-item-subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder={itemType === "service" ? "مثال: ويب وموبايل" : "مثال: ذكاء اصطناعي"} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>الوصف</Label>
            <Textarea data-testid="input-item-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>الأيقونة (اسم lucide-react)</Label>
              <Input data-testid="input-item-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="مثال: Code2 أو Brain" />
            </div>
            <div className="space-y-1.5">
              <Label>الترتيب</Label>
              <Input data-testid="input-item-order" type="number" value={form.orderIndex} onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>الوسوم / التقنيات (مفصولة بفواصل)</Label>
            <Input data-testid="input-item-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="مثال: React, Node.js, TypeScript" />
          </div>
          {itemType === "project" && (
            <GalleryField
              images={form.imageUrls}
              onChange={(imageUrls) => setForm({ ...form, imageUrls })}
            />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="toggle-item-active"
              onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`transition-colors ${form.isActive ? "text-primary" : "text-muted-foreground"}`}
            >
              {form.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
            </button>
            <Label className="cursor-pointer" onClick={() => setForm({ ...form, isActive: !form.isActive })}>
              {form.isActive ? "نشط — يظهر في الموقع" : "معطّل — مخفي من الموقع"}
            </Label>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>إلغاء</Button>
          <Button onClick={handleSave} disabled={isPending} data-testid="button-save-item">
            {isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemsTab({ itemType }: { itemType: "service" | "project" }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PageItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<PageItem[]>({
    queryKey: ["/api/admin/content/items", itemType],
    queryFn: () => apiRequest("GET", `/api/admin/content/items?type=${itemType}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/content/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/items"] });
      toast({ title: "تم الحذف" });
      setDeleteId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/content/items/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/items"] });
    },
  });

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: PageItem) => { setEditing(item); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} {itemType === "service" ? "خدمة" : "مشروع"}
          {" — "}
          {items.filter((i) => i.isActive).length} نشط
        </p>
        <Button size="sm" onClick={openAdd} data-testid={`button-add-${itemType}`} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة {itemType === "service" ? "خدمة" : "مشروع"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
          لا توجد عناصر بعد — أضف {itemType === "service" ? "خدمة" : "مشروعاً"} جديداً
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              data-testid={`row-item-${item.id}`}
              className={`flex items-start gap-4 p-4 rounded-xl border bg-card transition-opacity ${!item.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{item.title}</span>
                  {item.subtitle && <span className="text-xs text-muted-foreground">— {item.subtitle}</span>}
                  <Badge variant={item.isActive ? "default" : "secondary"} className="text-xs">
                    {item.isActive ? "نشط" : "معطّل"}
                  </Badge>
                  {item.icon && <span className="text-xs text-muted-foreground font-mono">{item.icon}</span>}
                </div>
                {item.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.description}</p>}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-toggle-${item.id}`}
                  onClick={() => toggleMutation.mutate({ id: item.id, isActive: !item.isActive })}
                  className="h-8 w-8"
                >
                  {item.isActive ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-edit-${item.id}`}
                  onClick={() => openEdit(item)}
                  className="h-8 w-8"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-delete-${item.id}`}
                  onClick={() => setDeleteId(item.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        itemType={itemType}
        editing={editing}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function uploadImage(file: File): Promise<{ url: string }> {
  const token = (() => {
    try { const s = localStorage.getItem("crm-auth"); return s ? JSON.parse(s)?.state?.token : null; } catch { return null; }
  })();
  const fd = new FormData();
  fd.append("file", file);
  return fetch("/api/admin/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  }).then((r) => {
    if (!r.ok) throw new Error("فشل الرفع");
    return r.json();
  });
}

function GalleryField({
  images, onChange, label = "صور المشروع", hint = "أول صورة تُستخدم كغلاف بالصفحة الرئيسية. رتّب الصور بالأسهم.",
}: {
  images: string[]; onChange: (images: string[]) => void; label?: string; hint?: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange([...images, url]);
      toast({ title: "تم رفع الصورة" });
    } catch {
      toast({ title: "خطأ في رفع الصورة", variant: "destructive" });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      {images.length > 0 && (
        <div className="space-y-2">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-muted/20">
              <div className="w-16 h-12 rounded border border-border bg-muted/40 overflow-hidden flex-shrink-0">
                <img src={url} alt={`صورة ${index + 1}`} className="w-full h-full object-cover" data-testid={`gallery-image-${index}`} />
              </div>
              <span className="text-xs text-muted-foreground flex-1 truncate">{url}</span>
              <div className="flex items-center gap-1 shrink-0">
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={index === 0} onClick={() => move(index, -1)} data-testid={`gallery-up-${index}`}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={index === images.length - 1} onClick={() => move(index, 1)} data-testid={`gallery-down-${index}`}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => remove(index)} data-testid={`gallery-remove-${index}`}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="gallery-input"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={uploading}
        data-testid="gallery-add-btn"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="w-4 h-4" />
        {uploading ? "جارٍ الرفع..." : "إضافة صورة"}
      </Button>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ImageUploadField({
  label, hint, value, onUploaded, testId, accept = "image/*",
}: {
  label: string; hint: string; value: string; onUploaded: (url: string) => void; testId: string; accept?: string;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onUploaded(url);
      toast({ title: "تم رفع الصورة" });
    } catch {
      toast({ title: "خطأ في رفع الصورة", variant: "destructive" });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className="w-20 h-16 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden flex-shrink-0">
          {value ? (
            <img src={value} alt="preview" className="w-full h-full object-contain p-1" data-testid={`${testId}-preview`} />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-2 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            data-testid={`${testId}-input`}
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 w-full"
            disabled={uploading}
            data-testid={`${testId}-btn`}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            {uploading ? "جارٍ الرفع..." : "رفع صورة"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive text-xs"
              onClick={() => onUploaded("")}
            >
              حذف الصورة
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const siteConfig = useSiteConfig();
  const [form, setForm] = useState<SiteConfig>({
    logo_text: siteConfig.logo_text,
    logo_url: siteConfig.logo_url,
    favicon_url: siteConfig.favicon_url,
    heroImages: siteConfig.heroImages,
  });
  const [synced, setSynced] = useState(false);

  if (!synced && (siteConfig.logo_url || siteConfig.favicon_url || siteConfig.logo_text !== "Creative Code" || siteConfig.heroImages.length > 0)) {
    setForm({ logo_text: siteConfig.logo_text, logo_url: siteConfig.logo_url, favicon_url: siteConfig.favicon_url, heroImages: siteConfig.heroImages });
    setSynced(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: Partial<SiteConfig>) => apiRequest("PATCH", "/api/admin/content/config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content/config"] });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    },
    onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
  });

  function handleImageUploaded(field: "logo_url" | "favicon_url", url: string) {
    const updated = { ...form, [field]: url };
    setForm(updated);
    saveMutation.mutate(updated);
  }

  function handleHeroImagesChanged(heroImages: string[]) {
    const updated = { ...form, heroImages };
    setForm(updated);
    saveMutation.mutate(updated);
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-border p-6 space-y-6 bg-card">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          إعدادات الهوية البصرية
        </h2>

        <ImageUploadField
          label="صورة اللوغو"
          hint="تظهر في شريط التنقل وصفحة تسجيل الدخول. يُفضَّل PNG أو SVG بخلفية شفافة."
          value={form.logo_url}
          onUploaded={(url) => handleImageUploaded("logo_url", url)}
          testId="logo-upload"
          accept="image/png,image/svg+xml,image/jpeg,image/webp,image/gif"
        />

        <div className="space-y-2">
          <Label htmlFor="logo_text" data-testid="label-logo-text">اسم الشركة (نص بديل)</Label>
          <Input
            id="logo_text"
            data-testid="input-logo-text"
            value={form.logo_text}
            onChange={(e) => setForm({ ...form, logo_text: e.target.value })}
            placeholder="Creative Code"
          />
          <p className="text-xs text-muted-foreground">يُستخدم عند عدم وجود صورة للوغو، ويظهر في عنوان المتصفح</p>
        </div>

        <ImageUploadField
          label="صورة الفافيكون"
          hint="أيقونة الموقع في تبويب المتصفح. يُفضَّل ICO أو PNG بحجم 32×32 أو 64×64."
          value={form.favicon_url}
          onUploaded={(url) => handleImageUploaded("favicon_url", url)}
          testId="favicon-upload"
          accept="image/x-icon,image/png,image/svg+xml,image/jpeg"
        />

        <Button
          data-testid="button-save-settings"
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>

      <div className="rounded-xl border border-border p-6 space-y-6 bg-card">
        <h2 className="font-semibold text-base flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          صور الهيرو الرئيسية
        </h2>
        <GalleryField
          images={form.heroImages}
          onChange={handleHeroImagesChanged}
          label="صور الهيرو"
          hint="الصورة الأولى تظهر كبطاقة رئيسية، والثانية والثالثة تظهران كصور دائرية متراكبة. أي صور إضافية بعد الثالثة لا تُعرض بالهيرو."
        />
      </div>
    </div>
  );
}

export default function ContentManager() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary" />
          إدارة محتوى الموقع
        </h1>
        <p className="text-muted-foreground mt-1">تحكم بالخدمات والمشاريع والإعدادات العامة للموقع</p>
      </div>

      <Tabs defaultValue="services" dir="rtl">
        <TabsList className="grid grid-cols-3 w-80">
          <TabsTrigger value="services" data-testid="tab-services" className="gap-2">
            <FolderKanban className="w-4 h-4" />
            الخدمات
          </TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects" className="gap-2">
            <Layers className="w-4 h-4" />
            المشاريع
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings" className="gap-2">
            <Settings className="w-4 h-4" />
            الإعدادات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6">
          <ItemsTab itemType="service" />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <ItemsTab itemType="project" />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
