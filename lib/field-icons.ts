import {
  ArrowUpRight, Box, Briefcase, Building2, Calendar, CircleDot, Clock, Cuboid, FileText, Flag, Hash, Loader, Mail,
  MapPin, Paperclip, Pencil, PhilippinePeso, Phone, Shield, ShieldCheck, Tag, TriangleAlert, User, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * One icon per field, everywhere it appears: table headers, modals, drawers, forms.
 * Taken from the Figma field labels (Asset Name = pencil, Serial ID = tag, Asset Tag = paperclip …).
 * Where Figma used one glyph for two fields that sit side by side, the second gets its own:
 * Position keeps the briefcase, so Office is a building.
 */
export const FIELD_ICON = {
  name: Pencil,
  serial: Tag,
  tag: Paperclip,
  type: Box,
  operational: CircleDot,
  physical: Cuboid,
  department: Shield,
  agency: Shield,
  office: Building2,
  location: MapPin,
  address: MapPin,
  date: Calendar,
  value: PhilippinePeso,
  custodian: User,
  person: User,
  employeeId: Hash,
  number: Hash,
  position: Briefcase,
  email: Mail,
  phone: Phone,
  status: Loader,
  problem: TriangleAlert,
  technician: Wrench,
  deadline: Clock,
  duration: Clock,
  priority: Flag,
  warranty: ShieldCheck,
  link: ArrowUpRight,
  notes: FileText,
  assets: Box,
} satisfies Record<string, LucideIcon>;

export type FieldKey = keyof typeof FIELD_ICON;
