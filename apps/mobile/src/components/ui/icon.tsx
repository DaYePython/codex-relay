import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  File,
  FileDiff,
  Folder,
  GitBranch,
  GitPullRequest,
  Globe,
  Hand,
  Image,
  Laptop,
  LoaderCircle,
  LogOut,
  Menu,
  Mic,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquarePen,
  Terminal,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react-native";
import type { ComponentProps, ComponentType } from "react";

export type AppIconName =
  | "archive"
  | "attach"
  | "branch"
  | "closeMenu"
  | "chevronRight"
  | "controls"
  | "expand"
  | "externalLink"
  | "fast"
  | "file"
  | "fileDiff"
  | "folder"
  | "goal"
  | "web"
  | "menu"
  | "model"
  | "newChat"
  | "newThread"
  | "permissions"
  | "permissionsAuto"
  | "permissionsDefault"
  | "permissionsFull"
  | "preview"
  | "pullRequest"
  | "refresh"
  | "running"
  | "search"
  | "send"
  | "sendToLine"
  | "back"
  | "forward"
  | "settings"
  | "signOut"
  | "stop"
  | "terminal"
  | "trash"
  | "up"
  | "upload"
  | "voice"
  | "warning"
  | "workspace"
  | "x";

type LucideComponent = ComponentType<ComponentProps<typeof Search>>;

const iconComponents: Record<AppIconName, LucideComponent> = {
  archive: Archive,
  attach: Image,
  branch: GitBranch,
  closeMenu: Menu,
  chevronRight: ChevronRight,
  controls: SlidersHorizontal,
  expand: ChevronDown,
  externalLink: ExternalLink,
  fast: Zap,
  file: File,
  fileDiff: FileDiff,
  folder: Folder,
  goal: CircleCheck,
  web: Globe,
  menu: Menu,
  model: Sparkles,
  newChat: SquarePen,
  newThread: Plus,
  permissions: Shield,
  permissionsAuto: Zap,
  permissionsDefault: Hand,
  permissionsFull: ShieldCheck,
  preview: PanelRightOpen,
  pullRequest: GitPullRequest,
  refresh: RefreshCw,
  running: LoaderCircle,
  search: Search,
  send: ArrowUp,
  sendToLine: ArrowRightToLine,
  back: ArrowLeft,
  forward: ArrowRight,
  settings: Settings,
  signOut: LogOut,
  stop: Square,
  terminal: Terminal,
  trash: Trash2,
  up: ArrowUp,
  upload: Upload,
  voice: Mic,
  warning: CircleAlert,
  workspace: Laptop,
  x: X,
};

type IconProps = Omit<ComponentProps<typeof Search>, "color"> & {
  name: AppIconName;
  tintColor?: string;
};

function Icon({ name, size = 16, tintColor, strokeWidth = 2, ...props }: IconProps) {
  const Component = iconComponents[name];
  return <Component color={tintColor} size={size} strokeWidth={strokeWidth} {...props} />;
}

export { Icon };
