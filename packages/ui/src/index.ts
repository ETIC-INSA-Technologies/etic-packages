// Point d'entrée public de @etic-insa/ui : tout ce qu'une application peut importer.
export { cn } from "./lib/utils"
export { MOBILE_MEDIA_QUERY, useIsMobile } from "./hooks/use-mobile"

// Utilitaires et hooks : textes chiffrés en français, dates ISO du
// DatePicker, recherche locale, champs sans remplissage automatique.
export {
  accorde,
  type AncienneteOptions,
  compte,
  formaterAnciennete,
  formaterDate,
  formaterDateHeure,
  formaterDateHeureLongue,
  formaterDuree,
  formaterDureeArrondie,
  formaterHorodatage,
  formaterOctets,
  nombreFr,
  participe,
  type Unite,
  uniteAccordee,
} from "./lib/format"
export { ecrireDateIso, lireDateIso } from "./lib/dates"
export { correspondance, normaliser } from "./lib/normalize"
export { NO_AUTOFILL } from "./lib/autofill"
export { useDebouncedValue } from "./hooks/use-debounced-value"
export { useDocumentTitle } from "./hooks/use-document-title"

// Composants shadcn (components/ui), tels quels ou presque.
export {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "./components/ui/alert"
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog"
export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./components/ui/avatar"
export { Badge, badgeVariants } from "./components/ui/badge"
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb"
export { Button, buttonVariants } from "./components/ui/button"
export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
} from "./components/ui/button-group"
export { Calendar, CalendarDayButton } from "./components/ui/calendar"
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card"
export { Checkbox } from "./components/ui/checkbox"
export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible"
export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "./components/ui/combobox"
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog"
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu"
export {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./components/ui/empty"
export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./components/ui/field"
export { Input } from "./components/ui/input"
export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./components/ui/input-group"
export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "./components/ui/item"
export { Kbd, KbdGroup } from "./components/ui/kbd"
export { Label } from "./components/ui/label"
export {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "./components/ui/native-select"
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./components/ui/pagination"
export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./components/ui/popover"
export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "./components/ui/progress"
export { RadioGroup, RadioGroupItem } from "./components/ui/radio-group"
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area"
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select"
export { Separator } from "./components/ui/separator"
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet"
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./components/ui/sidebar"
export { Skeleton } from "./components/ui/skeleton"
export { Slider } from "./components/ui/slider"
export { Spinner, SpinnerDecoratif } from "./components/ui/spinner"
export { Switch } from "./components/ui/switch"
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table"
export {
  Tabs,
  TabsContent,
  TabsList,
  tabsListVariants,
  TabsTrigger,
} from "./components/ui/tabs"
export { Textarea } from "./components/ui/textarea"
export { Toggle, toggleVariants } from "./components/ui/toggle"
export { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group"
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip"

// Enveloppes ETIC (components/etic) : composants shadcn assemblés.
export {
  AppShell,
  type AppShellCompte,
  type AppShellEntreeCompte,
  type AppShellLien,
  type AppShellLienComposant,
  type AppShellProps,
  type AppShellSection,
} from "./components/etic/app-shell"
export {
  ThemeMenu,
  type ThemeMenuProps,
  type ThemePreference,
} from "./components/etic/theme-menu"

// Retours et mise en page : dialogues, en-têtes, états d'une page (erreur,
// vide, chargement), statistiques, boutons d'action.
export type { ActionDialogue } from "./components/etic/action"
export { fermerSaufEnCours } from "./components/etic/action"
export {
  AuthAvatar,
  type AuthAvatarProps,
  AuthImage,
  type AuthImageCharger,
  type AuthImageProps,
  type AuthObjectUrlEtat,
  useAuthObjectUrl,
  useAuthObjectUrlEtat,
} from "./components/etic/auth-image"
export { ButtonLink, type ButtonLinkProps } from "./components/etic/button-link"
export {
  CenteredScreen,
  type CenteredScreenProps,
} from "./components/etic/centered-screen"
export {
  ConfirmDialog,
  type ConfirmDialogProps,
  type ConfirmDialogSaisie,
  type DialogFinalFocus,
} from "./components/etic/confirm-dialog"
export { CopyButton, type CopyButtonProps } from "./components/etic/copy-button"
export {
  DeleteButton,
  type DeleteButtonProps,
} from "./components/etic/delete-button"
export {
  DetailItem,
  type DetailItemProps,
  DetailList,
  type DetailListProps,
} from "./components/etic/detail-list"
export {
  Disclosure,
  type DisclosureProps,
  type DisclosureTaille,
  DisclosureTrigger,
  type DisclosureTriggerProps,
  type DisclosureVariante,
} from "./components/etic/disclosure"
export { EmptyState, type EmptyStateProps } from "./components/etic/empty-state"
export {
  ErrorBanner,
  type ErrorBannerProps,
} from "./components/etic/error-banner"
export {
  ErrorBoundary,
  type ErrorBoundaryProps,
} from "./components/etic/error-boundary"
export {
  FormDialog,
  type FormDialogProps,
  type FormDialogTaille,
} from "./components/etic/form-dialog"
export { IconToggle, type IconToggleProps } from "./components/etic/icon-toggle"
export {
  Loading,
  type LoadingProps,
  SkeletonCard,
  type SkeletonCardProps,
  SkeletonPage,
  type SkeletonPageProps,
  SkeletonTable,
  type SkeletonTableProps,
} from "./components/etic/loading"
export {
  DetailHeader,
  type DetailHeaderActionSecondaire,
  type DetailHeaderEtape,
  type DetailHeaderProps,
  PageHeader,
  type PageHeaderProps,
} from "./components/etic/page-header"
export {
  PageContainer,
  type PageContainerLargeur,
  type PageContainerProps,
} from "./components/etic/page-container"
export {
  QueryBoundary,
  type QueryBoundaryProps,
  type QueryBoundaryRequete,
  QueryErrorBanner,
  type QueryErrorBannerProps,
} from "./components/etic/query-boundary"
export {
  SectionCard,
  type SectionCardProps,
} from "./components/etic/section-card"
export { StatTile, type StatTileProps } from "./components/etic/stat-tile"
export {
  StatusBadge,
  type StatusBadgeProps,
  type StatusTon,
} from "./components/etic/status-badge"
export {
  TooltipButton,
  type TooltipButtonProps,
} from "./components/etic/tooltip-button"

// Formulaires (components/etic) : champs, sélecteurs, fichiers, brouillon.
export {
  FormField,
  type FormFieldControleProps,
  type FormFieldProps,
  FormSection,
  type FormSectionProps,
  RequiredMark,
} from "./components/etic/form-field"
export {
  type FormFieldContexte,
  useFormField,
} from "./components/etic/form-field-context"
export {
  DatePicker,
  type DatePickerDetails,
  type DatePickerProps,
} from "./components/etic/date-picker"
export {
  type CountryCode,
  PhoneInput,
  type PhoneInputDetails,
  type PhoneInputProps,
} from "./components/etic/phone-input"
export {
  FileDropZone,
  type FileDropZoneProps,
  type FileUploadAccept,
  FileUploadButton,
  type FileUploadButtonProps,
  type FileUploadOptions,
} from "./components/etic/file-upload"
export {
  SegmentedControl,
  type SegmentedControlOption,
  type SegmentedControlProps,
} from "./components/etic/segmented-control"
export {
  CheckboxList,
  type CheckboxListOption,
  type CheckboxListProps,
} from "./components/etic/checkbox-list"
export {
  type DraftAutosave,
  type DraftAutosaveOptions,
  useDraftAutosave,
} from "./components/etic/use-draft-autosave"
export {
  SearchSelect,
  type SearchSelectProps,
} from "./components/etic/search-select"

// Tableau de données (components/etic/data-table*) : TanStack Table v9 et la
// Table de shadcn, sur le modèle du guide Data Table de shadcn.
export {
  createDataTableColumnHelper,
  DataTable,
  DataTableColumnHeader,
  dataTableExpandColumn,
  dataTableFeatures,
  DataTableRowActions,
  dataTableSelectionColumn,
  useDataTable,
  type DataTableColumnDef,
  type DataTableColumnHeaderProps,
  type DataTableColumnMeta,
  type DataTableExpandColumnOptions,
  type DataTableFeatures,
  type DataTableInstance,
  type DataTableMeta,
  type DataTableProps,
  type DataTableRowActionsProps,
  type DataTableSelectionColumnOptions,
  type UseDataTableOptions,
} from "./components/etic/data-table"
export type { DataTableUnite } from "./components/etic/data-table-format"
export {
  DataTableBulkActions,
  type DataTableBulkActionsProps,
} from "./components/etic/data-table-bulk-actions"
export {
  DataTablePagination,
  type DataTablePaginationProps,
} from "./components/etic/data-table-pagination"
export {
  DataTableCount,
  DataTableSelectFilter,
  DataTableToolbar,
  type DataTableCountProps,
  type DataTableSelectFilterOption,
  type DataTableSelectFilterProps,
  type DataTableToolbarProps,
} from "./components/etic/data-table-toolbar"
export {
  DataTableViewOptions,
  type DataTableViewOptionsProps,
} from "./components/etic/data-table-view-options"
export type {
  ColumnOrderState,
  ColumnVisibilityState,
  ExpandedStateList,
  OnChangeFn,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table"
