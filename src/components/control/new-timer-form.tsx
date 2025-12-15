"use client";

import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
  useTransition
} from "react";
import { PlusCircle, Trash2, Upload, X } from "lucide-react";
import type { TimerWithEntity } from "@/lib/timers/types";
import { cn } from "@/lib/utils";
import { uploadTimerAvatarAction } from "@/app/(control)/control/actions";

interface MemberDraft {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface NewTimerDialogProps {
  existingTimers: TimerWithEntity[];
  onCreateGroup: (payload: {
    name: string;
    durationSeconds: number;
    avatarUrl?: string | null;
    accentColor?: string | null;
    members?: Array<{ name: string; avatarUrl?: string | null }>;
  }) => Promise<void>;
  onAddMembers: (payload: {
    groupId: string;
    members?: Array<{ name: string; avatarUrl?: string | null }>;
    accentColor?: string | null;
  }) => Promise<void>;
}

type DialogMode = "group" | "edit";

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function NewTimerDialog({ existingTimers, onCreateGroup, onAddMembers }: NewTimerDialogProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("group");
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [groupName, setGroupName] = useState("");
  const [groupAvatarUrl, setGroupAvatarUrl] = useState<string | null>(null);
  const [groupColor, setGroupColor] = useState<string>("#22c55e");
  const [groupMembers, setGroupMembers] = useState<MemberDraft[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [memberDrafts, setMemberDrafts] = useState<MemberDraft[]>([]);
  const [editGroupColor, setEditGroupColor] = useState<string>("#22c55e");

  const [error, setError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(
    () => existingTimers.filter((timer) => timer.entity.kind === "group"),
    [existingTimers]
  );

  const resetState = () => {
    setMode("group");
    setGroupName("");
    setMinutes(1);
    setSeconds(0);
    setGroupAvatarUrl(null);
    setGroupColor("#22c55e");
    setGroupMembers([]);
    setMemberDrafts([]);
    setSelectedGroupId("");
    setEditGroupColor("#22c55e");
    setError(null);
  };

  const closeDialog = () => {
    setOpen(false);
    resetState();
  };

  const handleUpload = async (file: File, onSuccess: (url: string) => void, fieldId: string) => {
    setError(null);
    setUploadingField(fieldId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { url } = await uploadTimerAvatarAction(formData);
      onSuccess(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Falha no envio da imagem.");
    } finally {
      setUploadingField(null);
    }
  };

  const addGroupMemberDraft = () => {
    setGroupMembers((current) => [...current, { id: generateId(), name: "", avatarUrl: null }]);
  };

  const addMemberDraft = () => {
    setMemberDrafts((current) => [...current, { id: generateId(), name: "", avatarUrl: null }]);
  };

  const removeDraft = (targetId: string, setter: Dispatch<SetStateAction<MemberDraft[]>>) => {
    setter((current) => current.filter((draft) => draft.id !== targetId));
  };

  const handleSubmitGroup = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedName = groupName.trim();
    if (trimmedName.length === 0) {
      setError("Indique um nome para o grupo.");
      return;
    }

    if (trimmedName.length > 13) {
      setError("Os nomes dos grupos não podem exceder 13 caracteres.");
      return;
    }

    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds <= 0) {
      setError("Defina um tempo superior a zero.");
      return;
    }

    const membersPayload = groupMembers
      .map((member) => ({
        name: member.name.trim(),
        avatarUrl: member.avatarUrl ?? null
      }))
      .filter((member) => member.name.length > 0);

    startTransition(async () => {
      try {
        await onCreateGroup({
          name: trimmedName,
          durationSeconds: totalSeconds,
          avatarUrl: groupAvatarUrl ?? undefined,
          accentColor: groupColor,
          members: membersPayload.length > 0 ? membersPayload : undefined
        });
        closeDialog();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Não foi possível criar o cronómetro.");
      }
    });
  };

  const handleSubmitMembers = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!selectedGroupId) {
      setError("Selecione um grupo.");
      return;
    }

    const membersPayload = memberDrafts
      .map((member) => ({
        name: member.name.trim(),
        avatarUrl: member.avatarUrl ?? null
      }))
      .filter((member) => member.name.length > 0);

    startTransition(async () => {
      try {
        await onAddMembers({
          groupId: selectedGroupId,
          members: membersPayload.length > 0 ? membersPayload : undefined,
          accentColor: editGroupColor
        });
        closeDialog();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Não foi possível adicionar membros.");
      }
    });
  };

  const renderGroupForm = () => (
    <form className="flex flex-col gap-5" onSubmit={handleSubmitGroup}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Nome do grupo</span>
          <input
            type="text"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            minLength={1}
            required
            maxLength={13}
            className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Equipa A"
            disabled={isPending}
          />
          <span className="text-xs text-muted-foreground">Limite máximo de 13 caracteres para garantir uma apresentação correta no ecrã.</span>
        </label>
        <AvatarUploader
          label="Fotografia do grupo"
          currentUrl={groupAvatarUrl}
          onChangeUrl={setGroupAvatarUrl}
          disabled={isPending}
          uploading={uploadingField === "group-avatar"}
          onUpload={(file) => handleUpload(file, (url) => setGroupAvatarUrl(url), "group-avatar")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Minutos</span>
          <input
            type="number"
            min={0}
            value={minutes}
            onChange={(event) => setMinutes(Math.max(0, Number(event.target.value) || 0))}
            className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={isPending}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Segundos</span>
          <input
            type="number"
            min={0}
            max={59}
            value={seconds}
            onChange={(event) => setSeconds(Math.min(59, Math.max(0, Number(event.target.value) || 0)))}
            className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={isPending}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Cor do grupo</span>
          <input
            type="color"
            value={groupColor}
            onChange={(event) => setGroupColor(event.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background p-1"
            disabled={isPending}
          />
        </label>
        <div className="flex flex-col justify-end gap-2 text-sm text-muted-foreground">
          Defina a duração total do cronómetro que será partilhado pelos membros deste grupo.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Membros do grupo</h3>
          <button
            type="button"
            onClick={addGroupMemberDraft}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:border-accent hover:text-accent"
            disabled={isPending}
          >
            <PlusCircle className="h-3 w-3" /> Adicionar membro
          </button>
        </div>

        {groupMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Pode adicionar membros agora ou mais tarde a partir deste mesmo botão.
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          {groupMembers.map((member) => (
            <MemberRow
              key={member.id}
              draft={member}
              onChange={(updated) =>
                setGroupMembers((current) =>
                  current.map((item) => (item.id === member.id ? { ...item, ...updated } : item))
                )
              }
              onRemove={() => removeDraft(member.id, setGroupMembers)}
              onUpload={(file) => handleUpload(file, (url) => {
                setGroupMembers((current) =>
                  current.map((item) => (item.id === member.id ? { ...item, avatarUrl: url } : item))
                );
              }, member.id)}
              uploading={uploadingField === member.id}
              disabled={isPending}
            />
          ))}
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <DialogButton type="button" variant="ghost" onClick={closeDialog} disabled={isPending}>
          Cancelar
        </DialogButton>
        <DialogButton type="submit" variant="primary" disabled={isPending}>
          Criar grupo
        </DialogButton>
      </div>
    </form>
  );

  useEffect(() => {
    if (!selectedGroupId) {
      setEditGroupColor("#22c55e");
      return;
    }

    const selected = groups.find((group) => group.entity.id === selectedGroupId);
    if (selected) {
      setEditGroupColor(selected.entity.accent_color ?? "#22c55e");
    } else {
      setEditGroupColor("#22c55e");
    }
  }, [selectedGroupId, groups]);

  const renderMemberForm = () => (
    <form className="flex flex-col gap-5" onSubmit={handleSubmitMembers}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Grupo</span>
          <select
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={isPending || groups.length === 0}
            required
          >
            <option value="" disabled>
              Selecione um grupo
            </option>
            {groups.map((group) => (
              <option key={group.entity.id} value={group.entity.id}>
                {group.entity.name}
              </option>
            ))}
          </select>
          {groups.length === 0 ? (
            <span className="text-xs text-muted-foreground">Crie primeiro um grupo para associar membros.</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Cor do grupo</span>
          <input
            type="color"
            value={editGroupColor}
            onChange={(event) => setEditGroupColor(event.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-border bg-background p-1"
            disabled={isPending || !selectedGroupId}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Novos membros</h3>
          <button
            type="button"
            onClick={addMemberDraft}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition hover:border-accent hover:text-accent"
            disabled={isPending}
          >
            <PlusCircle className="h-3 w-3" /> Adicionar membro
          </button>
        </div>

        {memberDrafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pode apenas atualizar a cor ou adicionar novos membros conforme necessário.</p>
        ) : null}

        <div className="flex flex-col gap-3">
          {memberDrafts.map((member) => (
            <MemberRow
              key={member.id}
              draft={member}
              onChange={(updated) =>
                setMemberDrafts((current) =>
                  current.map((item) => (item.id === member.id ? { ...item, ...updated } : item))
                )
              }
              onRemove={() => removeDraft(member.id, setMemberDrafts)}
              onUpload={(file) => handleUpload(file, (url) => {
                setMemberDrafts((current) =>
                  current.map((item) => (item.id === member.id ? { ...item, avatarUrl: url } : item))
                );
              }, member.id)}
              uploading={uploadingField === member.id}
              disabled={isPending}
            />
          ))}
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <DialogButton type="button" variant="ghost" onClick={closeDialog} disabled={isPending}>
          Cancelar
        </DialogButton>
        <DialogButton type="submit" variant="primary" disabled={isPending || groups.length === 0}>
          Guardar alterações
        </DialogButton>
      </div>
    </form>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 self-start rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
      >
        <PlusCircle className="h-4 w-4" /> Adicionar cronómetro
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="relative w-full max-w-3xl rounded-2xl bg-card p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeDialog}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            <header className="mb-4 flex flex-col gap-2 pr-8">
              <h2 className="text-2xl font-semibold">Gerir cronómetros</h2>
              <p className="text-sm text-muted-foreground">
                Crie um novo grupo com cronómetro partilhado ou edite um grupo existente, ajustando membros e cor.
              </p>
            </header>

            <div className="mb-5 flex gap-2 rounded-full bg-muted p-1">
              <ToggleButton active={mode === "group"} onClick={() => setMode("group")}>Novo grupo</ToggleButton>
              <ToggleButton active={mode === "edit"} onClick={() => setMode("edit")}>
                Editar grupo
              </ToggleButton>
            </div>

            <div className="max-h-[70vh] overflow-y-auto pr-1">
              {mode === "group" ? renderGroupForm() : renderMemberForm()}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1 text-sm font-semibold transition",
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function DialogButton({
  type,
  variant,
  children,
  onClick,
  disabled
}: {
  type: "button" | "submit";
  variant: "primary" | "ghost";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
        variant === "primary" ? "bg-accent text-accent-foreground hover:bg-accent/90" : "text-muted-foreground hover:bg-muted/80",
        disabled && "cursor-not-allowed opacity-70"
      )}
    >
      {children}
    </button>
  );
}

function AvatarUploader({
  label,
  currentUrl,
  onChangeUrl,
  onUpload,
  disabled,
  uploading
}: {
  label: string;
  currentUrl: string | null;
  onChangeUrl: (url: string | null) => void;
  onUpload: (file: File) => void;
  disabled?: boolean;
  uploading?: boolean;
}) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    onUpload(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-border bg-muted text-xs text-muted-foreground">
          {currentUrl ? (
            <img src={currentUrl} alt="Pré-visualização" className="h-full w-full rounded-full object-cover" />
          ) : (
            <span>Sem foto</span>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground transition hover:bg-muted/80">
            <Upload className="h-4 w-4" />
            <span>{uploading ? "A carregar..." : "Carregar imagem"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled || uploading}
            />
          </label>
          {currentUrl ? (
            <button
              type="button"
              onClick={() => onChangeUrl(null)}
              className="self-start text-xs text-destructive underline"
            >
              Remover imagem
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MemberRow({
  draft,
  onChange,
  onRemove,
  onUpload,
  uploading,
  disabled
}: {
  draft: MemberDraft;
  onChange: (value: Partial<MemberDraft>) => void;
  onRemove: () => void;
  onUpload: (file: File) => void;
  uploading?: boolean;
  disabled?: boolean;
}) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    onUpload(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/80 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border bg-muted text-xs text-muted-foreground">
          {draft.avatarUrl ? (
            <img src={draft.avatarUrl} alt="Pré-visualização" className="h-full w-full rounded-full object-cover" />
          ) : (
            <span>Foto</span>
          )}
        </div>
        <div className="flex flex-col gap-1 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-muted px-3 py-1 font-semibold text-muted-foreground transition hover:bg-muted/80">
            <Upload className="h-4 w-4" />
            <span>{uploading ? "A carregar..." : "Fotografia"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled || uploading}
            />
          </label>
          {draft.avatarUrl ? (
            <button
              type="button"
              onClick={() => onChange({ avatarUrl: null })}
              className="self-start text-xs text-destructive underline"
            >
              Remover imagem
            </button>
          ) : null}
        </div>
      </div>

      <input
        type="text"
        value={draft.name}
        onChange={(event) => onChange({ name: event.target.value })}
        placeholder="Nome do membro"
        className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        disabled={disabled}
      />

      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground transition hover:bg-destructive/90"
      >
        <Trash2 className="h-3 w-3" /> Remover
      </button>
    </div>
  );
}
