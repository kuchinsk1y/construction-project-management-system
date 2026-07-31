import { AlertTriangle, ArrowLeft, CalendarRange, Coins, Edit, ExternalLink, FileText, Loader2, MapPin, Trash2, UserRoundCheck, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UseMutationResult } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import type {
  ApiContractor,
  ApiMilestone,
  ApiProject,
  ApiProjectType,
  CreateMilestonePayload,
  CreateProjectPayload,
  ProjectStatus,
} from '@/features/projects/types'
import { MilestonesTab } from './MilestonesTab'
import { MilestoneFormDrawer } from './MilestoneFormDrawer'

type ProjectDetailsDrawerProps = {
  isOpen?: boolean
  editingProject: ApiProject | null
  isEditing: boolean
  setIsEditing: (val: boolean) => void
  formState: CreateProjectPayload
  setField: <K extends keyof CreateProjectPayload>(key: K, value: CreateProjectPayload[K]) => void
  setFormState: React.Dispatch<React.SetStateAction<CreateProjectPayload>>
  formError: string
  setFormError: (err: string) => void
  canEditProject: boolean
  canDeleteProject: boolean
  handleCloseDrawer: () => void
  handleCreate: (e: React.FormEvent) => void
  handleDeleteProject: () => void
  createMutation: UseMutationResult<ApiProject, Error, CreateProjectPayload, unknown>
  updateMutation: UseMutationResult<ApiProject, Error, { id: string; payload: Partial<CreateProjectPayload> }, unknown>
  deleteMutation: UseMutationResult<void, Error, string, unknown>
  contractors: ApiContractor[]
  contractorsLoading: boolean
  projectTypes: ApiProjectType[]
  typesLoading: boolean
  users: Array<{ id: number; firstName: string; lastName: string }>
  managerList: Array<{ id: number; firstName: string; lastName: string }>
  managerName: string
  selectedContractor: ApiContractor | undefined
  selectedProjectType: ApiProjectType | undefined
  filteredContractors: ApiContractor[]
  contractorSearch: string
  setContractorSearch: (val: string) => void
  showContractorList: boolean
  setShowContractorList: (show: boolean) => void
  handleSelectContractor: (contractorId: string) => void
  contractorRef: React.RefObject<HTMLDivElement | null>

  // Milestones props
  activeTab: 'details' | 'milestones'
  setActiveTab: (tab: 'details' | 'milestones') => void
  milestones: ApiMilestone[]
  milestonesLoading: boolean
  showMilestoneForm: boolean
  setShowMilestoneForm: (show: boolean) => void
  milestoneForm: CreateMilestonePayload
  setMilestoneForm: React.Dispatch<React.SetStateAction<CreateMilestonePayload>>
  editingMilestoneId: string | null
  setEditingMilestoneId: (id: string | null) => void
  milestoneError: string
  setMilestoneError: (err: string) => void
  handleMilestoneSubmit: (e: React.FormEvent) => void
  createMilestoneMutation: UseMutationResult<ApiMilestone, Error, CreateMilestonePayload, unknown>
  createMilestonesBatchMutation: UseMutationResult<void, Error, CreateMilestonePayload[], unknown>
  updateMilestoneMutation: UseMutationResult<ApiMilestone, Error, { id: string; payload: Partial<CreateMilestonePayload> }, unknown>
  deleteMilestoneMutation: UseMutationResult<void, Error, string, unknown>

  formatDate: (val: string, fallback?: string) => string
  formatBudget: (val: number, currency?: string) => string
  statusTone: (status: string) => string
  showDeleteConfirm: boolean
  setShowDeleteConfirm: (show: boolean) => void
}

export function ProjectDetailsDrawer({
  isOpen = false,
  editingProject,
  isEditing,
  setIsEditing,
  formState,
  setField,
  setFormState,
  formError,
  setFormError,
  canEditProject,
  canDeleteProject,
  handleCloseDrawer,
  handleCreate,
  handleDeleteProject,
  createMutation,
  updateMutation,
  deleteMutation,
  contractorsLoading,
  projectTypes,
  typesLoading,
  managerList,
  managerName,
  selectedContractor,
  selectedProjectType,
  filteredContractors,
  contractorSearch,
  setContractorSearch,
  showContractorList,
  setShowContractorList,
  handleSelectContractor,
  contractorRef,
  activeTab,
  setActiveTab,
  milestones,
  milestonesLoading,
  showMilestoneForm,
  setShowMilestoneForm,
  milestoneForm,
  setMilestoneForm,
  editingMilestoneId,
  setEditingMilestoneId,
  milestoneError,
  setMilestoneError,
  handleMilestoneSubmit,
  createMilestoneMutation,
  createMilestonesBatchMutation,
  updateMilestoneMutation,
  deleteMilestoneMutation,
  formatDate,
  formatBudget,
  statusTone,
  showDeleteConfirm,
  setShowDeleteConfirm,
}: ProjectDetailsDrawerProps) {
  const { t } = useTranslation()

  const handleCancelEdit = () => {
    if (editingProject) {
      setFormState({
        name: editingProject.name,
        contractorId: editingProject.contractors?.id ?? '',
        projectTypeId: editingProject.project_types?.id ?? 0,
        country: editingProject.country,
        city: editingProject.city,
        status: editingProject.status as ProjectStatus,
        currency: editingProject.currency || 'PLN',
        contractNetValue: editingProject.contract_net_value ? Number(editingProject.contract_net_value) : undefined,
        startDateContract: editingProject.start_date_contract || '',
        endDateContract: editingProject.end_date_contract || '',
        startDateFact: editingProject.start_date_fact || '',
        endDateFact: editingProject.end_date_fact || '',
        managerId: editingProject.manager?.id ?? undefined,
        dokumentationUrl: editingProject.dokumentationUrl ?? '',
        pinUrl: editingProject.pinUrl ?? '',
      })
      setFormError('')
    }
    setIsEditing(false)
  }

  if (!editingProject) {
    // Sliding Drawer Mode for Project Creation ONLY
    return (
      <>
        {/* Drawer Backdrop Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity duration-300"
            onClick={handleCloseDrawer}
          />
        )}

        {/* Sliding Drawer Container */}
        <aside
          className={[
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out select-none',
            isOpen ? 'translate-x-0' : 'translate-x-full',
          ].join(' ')}
        >
          {/* Drawer Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h3 className="text-base font-bold tracking-tight text-[var(--foreground)]">
                {t('projects.form.title')}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {t('projects.form.subtitle')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleCloseDrawer}
              className="rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
              aria-label="Zamknij"
            >
              <X size={15} />
            </Button>
          </header>

          {/* Drawer scrollable content body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4 bg-[var(--card)]">
            <div className="w-full space-y-4 animate-tab-content pb-6">
              <div className="flex flex-col gap-5">
                {/* Basic Info Card */}
                <div className="space-y-4">
                  <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <FileText size={13} className="text-[var(--sidebar-primary)]" />
                    <span>{t('projects.form.sections.basic')}</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        {t('projects.form.labels.name')} <span className="text-rose-500">*</span>
                      </span>
                      <input
                        value={formState.name}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder={t('projects.form.placeholders.name')}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.status')}</span>
                      <select
                        value={formState.status}
                        onChange={(e) => setField('status', e.target.value)}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="DRAFT">{t('projects.form.statuses.DRAFT')}</option>
                        <option value="ACTIVE">{t('projects.form.statuses.ACTIVE')}</option>
                        <option value="ON_HOLD">{t('projects.form.statuses.ON_HOLD')}</option>
                        <option value="COMPLETED">{t('projects.form.statuses.COMPLETED')}</option>
                        <option value="CANCELLED">{t('projects.form.statuses.CANCELLED')}</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.manager')}</span>
                      <select
                        value={formState.managerId || ''}
                        onChange={(e) => setField('managerId', e.target.value ? Number(e.target.value) : undefined)}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="">{t('projects.form.placeholders.selectManager')}</option>
                        {managerList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.lastName} {m.firstName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.dokumentationUrl')}</span>
                      <input
                        value={formState.dokumentationUrl || ''}
                        onChange={(e) => setField('dokumentationUrl', e.target.value)}
                        placeholder={t('projects.form.placeholders.dokumentationUrl')}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.pinUrl')}</span>
                      <input
                        value={formState.pinUrl || ''}
                        onChange={(e) => setField('pinUrl', e.target.value)}
                        placeholder={t('projects.form.placeholders.pinUrl')}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                      />
                    </label>
                  </div>
                </div>

                {/* Timeline & Schedule Card */}
                <div className="space-y-4">
                  <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <CalendarRange size={13} className="text-[var(--sidebar-primary)]" />
                    <span>Terminy i harmonogram realizacji</span>
                  </p>
                  <div className="space-y-4 pt-1">
                    {/* Planned Dates */}
                    <div className="space-y-2 border-l-2 border-[var(--sidebar-primary)]/45 pl-2.5">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Terminy planowane (Harmonogram)
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">{t('projects.form.labels.startDate')}</span>
                          <DatePicker
                            value={formState.startDateContract ?? ''}
                            onChange={(v) => setField('startDateContract', v)}
                            placeholder="dd.mm.rrrr"
                            className="h-10 text-sm bg-[var(--background)] hover:border-zinc-400/60 dark:hover:border-zinc-600/60 focus:ring-[var(--sidebar-primary)]/15"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">{t('projects.form.labels.endDate')}</span>
                          <DatePicker
                            value={formState.endDateContract ?? ''}
                            onChange={(v) => setField('endDateContract', v)}
                            min={formState.startDateContract || undefined}
                            placeholder="dd.mm.rrrr"
                            className="h-10 text-sm bg-[var(--background)] hover:border-zinc-400/60 dark:hover:border-zinc-600/60 focus:ring-[var(--sidebar-primary)]/15"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contract Details Card */}
                <div className="space-y-4">
                  <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Coins size={13} className="text-[var(--sidebar-primary)]" />
                    <span>Szczegóły wartości i kontraktu</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        {t('projects.form.labels.contractor')} <span className="text-rose-500">*</span>
                      </span>
                      <div className="relative" ref={contractorRef}>
                        <input
                          value={showContractorList ? contractorSearch : selectedContractor?.name ?? ''}
                          onChange={(e) => {
                            setContractorSearch(e.target.value)
                            setShowContractorList(true)
                            if (e.target.value === '') {
                              setField('contractorId', '')
                            }
                          }}
                          onFocus={() => setShowContractorList(true)}
                          placeholder={contractorsLoading ? t('projects.form.placeholders.loading') : t('projects.form.placeholders.selectContractor')}
                          disabled={contractorsLoading}
                          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                        />
                        {showContractorList && !contractorsLoading && filteredContractors.length > 0 ? (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto custom-scrollbar rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
                            {filteredContractors.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectContractor(c.id)}
                                className="w-full px-3 py-2 text-left text-xs transition hover:bg-[var(--sidebar-primary)]/10 cursor-pointer"
                              >
                                {c.name}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        {t('projects.form.labels.projectType')} <span className="text-rose-500">*</span>
                      </span>
                      <select
                        value={formState.projectTypeId || ''}
                        onChange={(e) => setField('projectTypeId', Number(e.target.value))}
                        disabled={typesLoading}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="">{typesLoading ? t('projects.form.placeholders.loading') : t('projects.form.placeholders.selectProjectType')}</option>
                        {projectTypes.map((pt) => (
                          <option key={pt.id} value={pt.id}>{pt.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.currency')}</span>
                      <select
                        value={formState.currency ?? 'PLN'}
                        onChange={(e) => setField('currency', e.target.value)}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50 cursor-pointer"
                      >
                        <option value="PLN">PLN</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.contractNetValue')}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formState.contractNetValue ?? ''}
                        onChange={(e) => setField('contractNetValue', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder={t('projects.form.placeholders.contractNetValue')}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                      />
                    </label>
                  </div>
                </div>

                {/* Location Card */}
                <div className="space-y-4">
                  <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <MapPin size={13} className="text-[var(--sidebar-primary)]" />
                    <span>{t('projects.form.sections.location')}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        {t('projects.form.labels.country')} <span className="text-rose-500">*</span>
                      </span>
                      <input
                        value={formState.country}
                        onChange={(e) => setField('country', e.target.value)}
                        placeholder={t('projects.form.placeholders.country')}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                        {t('projects.form.labels.city')} <span className="text-rose-500">*</span>
                      </span>
                      <input
                        value={formState.city}
                        onChange={(e) => setField('city', e.target.value)}
                        placeholder={t('projects.form.placeholders.city')}
                        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {formError && (
                <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
                  {formError}
                </p>
              )}

              {/* Action Buttons Footer */}
              <div className="border-t border-[var(--border)] pt-5 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDrawer}
                  className="rounded-xl"
                >
                  {t('projects.form.actions.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
                >
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  {createMutation.isPending ? t('projects.form.actions.saving') : t('projects.form.actions.save')}
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </>
    )
  }

  return (
    <>
      <section className="flex flex-col gap-4 p-3 select-none w-full">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleCloseDrawer}
              className="rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
              aria-label="Wróć do listy"
            >
              <ArrowLeft size={15} />
            </Button>
            <div>
              <h1 className="text-base font-bold tracking-tight md:text-lg">
                {editingProject ? `Projekt: ${editingProject.name}` : t('projects.form.title')}
              </h1>
              <p className="text-[11px] text-[var(--muted-foreground)] md:text-xs">
                {editingProject ? 'Szczegóły i edycja projektu' : t('projects.form.subtitle')}
              </p>
            </div>
          </div>
        </header>

        {/* Tab navigation */}
        {editingProject && (
          <div className="flex border-b border-[var(--border)] mb-3">
            <button
              type="button"
              onClick={() => {
                setActiveTab('details')
                setMilestoneError('')
              }}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'details'
                  ? 'border-[var(--sidebar-primary)] text-[var(--sidebar-primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
            >
              Ogólne
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('milestones')
                setMilestoneError('')
              }}
              className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'milestones'
                  ? 'border-[var(--sidebar-primary)] text-[var(--sidebar-primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
            >
              Kamienie milowe
            </button>
          </div>
        )}

        {/* Main Details and Milestones View */}
        <div className="w-full">
          {activeTab === 'details' ? (
            <>
              {/* Read-only view */}
              <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-5 shadow-sm space-y-4 animate-tab-content">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                  {/* Left Column: Basic Info & Financials */}
                  <div className="lg:col-span-7 flex flex-col gap-3.5">
                    {/* Basic Info Card */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                          <FileText size={14} className="text-[var(--sidebar-primary)]" />
                          <span>{t('projects.form.sections.basic')}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusTone(formState.status || '')}`}>
                          {t(`projects.form.statuses.${formState.status}`)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.name')}</span>
                          <p className="text-xs font-bold text-[var(--foreground)] mt-0.5">{formState.name}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.manager')}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <UserRoundCheck size={13} className="text-[var(--muted-foreground)] shrink-0" />
                            <p className="text-xs font-semibold text-[var(--foreground)]">{managerName}</p>
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.dokumentationUrl')}</span>
                          <div className="mt-0.5">
                            {formState.dokumentationUrl ? (
                              <a
                                href={formState.dokumentationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 transition"
                              >
                                <span>Otwórz dokumentację</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <p className="text-xs font-medium text-[var(--muted-foreground)] italic">Brak linku do dokumentacji</p>
                            )}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.pinUrl')}</span>
                          <div className="mt-0.5">
                            {formState.pinUrl ? (
                              <a
                                href={formState.pinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10 transition"
                              >
                                <MapPin size={12} />
                                <span>Otwórz w Google Maps</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <p className="text-xs font-medium text-[var(--muted-foreground)] italic">Brak pinezki Google Maps</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Financials Card */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)] pb-2">
                        <Coins size={14} className="text-[var(--sidebar-primary)]" />
                        <span>Szczegóły wartości i kontraktu</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.contractor')}</span>
                          <p className="text-xs font-bold text-[var(--foreground)] mt-0.5">{selectedContractor?.name || '-'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.projectType')}</span>
                          <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5">{selectedProjectType?.name || '-'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.contractNetValue')}</span>
                          <p className="text-xs font-extrabold text-[var(--foreground)] mt-0.5">
                            {formState.contractNetValue ? formatBudget(formState.contractNetValue, formState.currency) : '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.currency')}</span>
                          <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5">{formState.currency || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Location & Timeline */}
                  <div className="lg:col-span-5 flex flex-col gap-3.5">
                    {/* Location Card */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)] pb-2">
                        <MapPin size={14} className="text-[var(--sidebar-primary)]" />
                        <span>{t('projects.form.sections.location')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-0.5">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.country')}</span>
                          <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5">{formState.country || '-'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.city')}</span>
                          <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5">{formState.city || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Card */}
                    <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)]/35 p-3.5 space-y-3 flex flex-col justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)] pb-2">
                        <CalendarRange size={14} className="text-[var(--sidebar-primary)]" />
                        <span>Okresy i terminy realizacji</span>
                      </div>
                      <div className="space-y-3 pt-0.5 flex-1 flex flex-col justify-around">
                        {/* Planned Dates */}
                        <div className="space-y-1.5 border-l-2 border-[var(--sidebar-primary)]/45 pl-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/80 block">
                            Terminy planowane (Harmonogram)
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.startDate')}</span>
                              <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5">{formatDate(formState.startDateContract || '', '-')}</p>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">{t('projects.form.labels.endDate')}</span>
                              <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5">{formatDate(formState.endDateContract || '', '-')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Actual Dates */}
                        <div className="space-y-1.5 border-l-2 border-emerald-500/45 pl-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/80 block">
                            Terminy rzeczywiste (Faktyczne)
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">Faktyczny start</span>
                              <p className="text-xs font-semibold text-emerald-500 mt-0.5">{formatDate(formState.startDateFact || '', '-')}</p>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">Faktyczny koniec</span>
                              <p className="text-xs font-semibold text-emerald-500 mt-0.5">{formatDate(formState.endDateFact || '', '-')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Footer (Read-only) */}
                <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between gap-4">
                  <div />
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={handleCloseDrawer} className="rounded-xl">
                      Zamknij
                    </Button>
                    {canEditProject && (
                      <Button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
                      >
                        <Edit size={14} className="mr-1.5" />
                        Edytuj
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Project Sliding Drawer Backdrop Overlay */}
              {isEditing && (
                <div
                  className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity duration-300"
                  onClick={handleCancelEdit}
                />
              )}

              {/* Edit Project Sliding Drawer Container */}
              <aside
                className={[
                  'fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-300 ease-out select-none',
                  isEditing ? 'translate-x-0' : 'translate-x-full',
                ].join(' ')}
              >
                {/* Drawer Header */}
                <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-[var(--foreground)]">
                      Edycja projektu
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      Edytuj dane i ustawienia projektu
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={handleCancelEdit}
                    className="rounded-xl border-[var(--sidebar-primary)]/20 text-[var(--sidebar-primary)] hover:bg-[var(--sidebar-primary)]/10"
                    aria-label="Zamknij"
                  >
                    <X size={15} />
                  </Button>
                </header>

                {/* Drawer scrollable content body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4 bg-[var(--card)]">
                  <div className="w-full space-y-4 animate-tab-content pb-6">
                    <div className="flex flex-col gap-5">
                      {/* Basic Info Card */}
                      <div className="space-y-4">
                        <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                          <FileText size={13} className="text-[var(--sidebar-primary)]" />
                          <span>{t('projects.form.sections.basic')}</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="block sm:col-span-2">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              {t('projects.form.labels.name')} <span className="text-rose-500">*</span>
                            </span>
                            <input
                              value={formState.name}
                              onChange={(e) => setField('name', e.target.value)}
                              placeholder={t('projects.form.placeholders.name')}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.status')}</span>
                            <select
                              value={formState.status}
                              onChange={(e) => setField('status', e.target.value)}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50 cursor-pointer"
                            >
                              <option value="DRAFT">{t('projects.form.statuses.DRAFT')}</option>
                              <option value="ACTIVE">{t('projects.form.statuses.ACTIVE')}</option>
                              <option value="ON_HOLD">{t('projects.form.statuses.ON_HOLD')}</option>
                              <option value="COMPLETED">{t('projects.form.statuses.COMPLETED')}</option>
                              <option value="CANCELLED">{t('projects.form.statuses.CANCELLED')}</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.manager')}</span>
                            <select
                              value={formState.managerId || ''}
                              onChange={(e) => setField('managerId', e.target.value ? Number(e.target.value) : undefined)}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50 cursor-pointer"
                            >
                              <option value="">{t('projects.form.placeholders.selectManager')}</option>
                              {managerList.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.lastName} {m.firstName}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block sm:col-span-2">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.dokumentationUrl')}</span>
                            <input
                              value={formState.dokumentationUrl || ''}
                              onChange={(e) => setField('dokumentationUrl', e.target.value)}
                              placeholder={t('projects.form.placeholders.dokumentationUrl')}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                            />
                          </label>
                          <label className="block sm:col-span-2">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.pinUrl')}</span>
                            <input
                              value={formState.pinUrl || ''}
                              onChange={(e) => setField('pinUrl', e.target.value)}
                              placeholder={t('projects.form.placeholders.pinUrl')}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Timeline & Schedule Card */}
                      <div className="space-y-4">
                        <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                          <CalendarRange size={13} className="text-[var(--sidebar-primary)]" />
                          <span>Terminy i harmonogram realizacji</span>
                        </p>
                        <div className="space-y-4 pt-1">
                          {/* Planned Dates */}
                          <div className="space-y-2 border-l-2 border-[var(--sidebar-primary)]/45 pl-2.5">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              Terminy planowane (Harmonogram)
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">{t('projects.form.labels.startDate')}</span>
                                <DatePicker
                                  value={formState.startDateContract ?? ''}
                                  onChange={(v) => setField('startDateContract', v)}
                                  placeholder="dd.mm.rrrr"
                                  className="h-10 text-sm bg-[var(--background)] hover:border-zinc-400/60 dark:hover:border-zinc-600/60 focus:ring-[var(--sidebar-primary)]/15"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">{t('projects.form.labels.endDate')}</span>
                                <DatePicker
                                  value={formState.endDateContract ?? ''}
                                  onChange={(v) => setField('endDateContract', v)}
                                  min={formState.startDateContract || undefined}
                                  placeholder="dd.mm.rrrr"
                                  className="h-10 text-sm bg-[var(--background)] hover:border-zinc-400/60 dark:hover:border-zinc-600/60 focus:ring-[var(--sidebar-primary)]/15"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Actual Dates */}
                          <div className="space-y-2 border-l-2 border-emerald-500/45 pl-2.5">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              Terminy rzeczywiste (Faktyczne)
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">Faktyczny start</span>
                                <DatePicker
                                  value={formState.startDateFact ?? ''}
                                  onChange={(v) => setField('startDateFact', v)}
                                  placeholder="dd.mm.rrrr"
                                  className="h-10 text-sm bg-[var(--background)] hover:border-zinc-400/60 dark:hover:border-zinc-600/60 focus:ring-[var(--sidebar-primary)]/15"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[11px] text-[var(--muted-foreground)] block mb-1">Faktyczny koniec</span>
                                <DatePicker
                                  value={formState.endDateFact ?? ''}
                                  onChange={(v) => setField('endDateFact', v)}
                                  min={formState.startDateFact || undefined}
                                  placeholder="dd.mm.rrrr"
                                  className="h-10 text-sm bg-[var(--background)] hover:border-zinc-400/60 dark:hover:border-zinc-600/60 focus:ring-[var(--sidebar-primary)]/15"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contract Details Card */}
                      <div className="space-y-4">
                        <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                          <Coins size={13} className="text-[var(--sidebar-primary)]" />
                          <span>Szczegóły wartości i kontraktu</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              {t('projects.form.labels.contractor')} <span className="text-rose-500">*</span>
                            </span>
                            <div className="relative" ref={contractorRef}>
                              <input
                                value={showContractorList ? contractorSearch : selectedContractor?.name ?? ''}
                                onChange={(e) => {
                                  setContractorSearch(e.target.value)
                                  setShowContractorList(true)
                                  if (e.target.value === '') {
                                    setField('contractorId', '')
                                  }
                                }}
                                onFocus={() => setShowContractorList(true)}
                                placeholder={contractorsLoading ? t('projects.form.placeholders.loading') : t('projects.form.placeholders.selectContractor')}
                                disabled={contractorsLoading}
                                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                              />
                              {showContractorList && !contractorsLoading && filteredContractors.length > 0 ? (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto custom-scrollbar rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
                                  {filteredContractors.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => handleSelectContractor(c.id)}
                                      className="w-full px-3 py-2 text-left text-xs transition hover:bg-[var(--sidebar-primary)]/10 cursor-pointer"
                                    >
                                      {c.name}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              {t('projects.form.labels.projectType')} <span className="text-rose-500">*</span>
                            </span>
                            <select
                              value={formState.projectTypeId || ''}
                              onChange={(e) => setField('projectTypeId', Number(e.target.value))}
                              disabled={typesLoading}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50 cursor-pointer"
                            >
                              <option value="">{typesLoading ? t('projects.form.placeholders.loading') : t('projects.form.placeholders.selectProjectType')}</option>
                              {projectTypes.map((pt) => (
                                <option key={pt.id} value={pt.id}>{pt.name}</option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.currency')}</span>
                            <select
                              value={formState.currency ?? 'PLN'}
                              onChange={(e) => setField('currency', e.target.value)}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50 cursor-pointer"
                            >
                              <option value="PLN">PLN</option>
                              <option value="EUR">EUR</option>
                              <option value="USD">USD</option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">{t('projects.form.labels.contractNetValue')}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formState.contractNetValue ?? ''}
                              onChange={(e) => setField('contractNetValue', e.target.value ? Number(e.target.value) : undefined)}
                              placeholder={t('projects.form.placeholders.contractNetValue')}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Location Card */}
                      <div className="space-y-4">
                        <p className="mb-3 border-b border-[var(--border)] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                          <MapPin size={13} className="text-[var(--sidebar-primary)]" />
                          <span>{t('projects.form.sections.location')}</span>
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              {t('projects.form.labels.country')} <span className="text-rose-500">*</span>
                            </span>
                            <input
                              value={formState.country}
                              onChange={(e) => setField('country', e.target.value)}
                              placeholder={t('projects.form.placeholders.country')}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                              {t('projects.form.labels.city')} <span className="text-rose-500">*</span>
                            </span>
                            <input
                              value={formState.city}
                              onChange={(e) => setField('city', e.target.value)}
                              placeholder={t('projects.form.placeholders.city')}
                              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition duration-150 ease-in-out placeholder:text-zinc-500/70 dark:placeholder:text-zinc-400/70 focus:border-[var(--sidebar-primary)] focus:ring-2 focus:ring-[var(--sidebar-primary)]/15 hover:border-zinc-400/60 dark:hover:border-zinc-600/60 disabled:opacity-50"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {formError && (
                      <p className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
                        {formError}
                      </p>
                    )}

                    {/* Action Buttons Footer (Edit Mode) */}
                    <div className="border-t border-[var(--border)] pt-5 flex items-center justify-between gap-4">
                      {editingProject && canDeleteProject ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDeleteProject}
                          disabled={deleteMutation.isPending}
                          className="border-rose-500/50 text-rose-500 hover:bg-rose-500/10 rounded-xl"
                        >
                          {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                          <Trash2 size={14} />
                          {deleteMutation.isPending ? 'Usuwanie...' : 'Usuń projekt'}
                        </Button>
                      ) : (
                        <div />
                      )}
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="rounded-xl"
                        >
                          {t('projects.form.actions.cancel')}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCreate}
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="rounded-xl bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] hover:bg-[var(--sidebar-primary)]/90 shadow-[0_4px_14px_color-mix(in_oklch,var(--sidebar-primary),transparent_65%)]"
                        >
                          {createMutation.isPending || updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                          {createMutation.isPending || updateMutation.isPending ? t('projects.form.actions.saving') : t('projects.form.actions.save')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </>
          ) : (
            /* Milestones View */
            <MilestonesTab
              milestones={milestones}
              milestonesLoading={milestonesLoading}
              editingProject={editingProject}
              canEditProject={canEditProject}
              showMilestoneForm={showMilestoneForm}
              setShowMilestoneForm={setShowMilestoneForm}
              milestoneForm={milestoneForm}
              setMilestoneForm={setMilestoneForm}
              editingMilestoneId={editingMilestoneId}
              setEditingMilestoneId={setEditingMilestoneId}
              milestoneError={milestoneError}
              setMilestoneError={setMilestoneError}
              handleMilestoneSubmit={handleMilestoneSubmit}
              createMilestoneMutation={createMilestoneMutation}
              updateMilestoneMutation={updateMilestoneMutation}
              deleteMilestoneMutation={deleteMilestoneMutation}
              handleCloseDrawer={handleCloseDrawer}
              formatBudget={formatBudget}
            />
          )}
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl motion-safe:animate-[auth-rise_320ms_ease-out]">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[var(--foreground)]">Usuń projekt</h4>
                <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                  Czy na pewno chcesz usunąć ten projekt? Tej operacji nie można cofnąć.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
              >
                Anuluj
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (editingProject) {
                    deleteMutation.mutate(editingProject.id, {
                      onSettled: () => {
                        setShowDeleteConfirm(false)
                      },
                    })
                  }
                }}
              >
                {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                Usuń
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Form Drawer */}
      <MilestoneFormDrawer
        isOpen={showMilestoneForm}
        onClose={() => setShowMilestoneForm(false)}
        milestones={milestones}
        editingMilestoneId={editingMilestoneId}
        setEditingMilestoneId={setEditingMilestoneId}
        milestoneForm={milestoneForm}
        milestoneError={milestoneError}
        setMilestoneError={setMilestoneError}
        createMilestoneMutation={createMilestoneMutation}
        createMilestonesBatchMutation={createMilestonesBatchMutation}
        updateMilestoneMutation={updateMilestoneMutation}
      />
    </>
  )
}
