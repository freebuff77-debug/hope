import {
  Baby, Banknote, Bike, BookOpen, Briefcase, Bus, Car, Cat, Coffee, CreditCard, Dumbbell, Film, Fuel, Gamepad2, Gift,
  GraduationCap, HandCoins, Heart, HeartPulse, Home, Landmark, Laptop, type LucideIcon, Music, Package, PiggyBank,
  Plane, Plug, Receipt, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Store, Tag, TrendingUp, Utensils,
  Wallet, Wifi, Wrench, Zap, Droplet, Scissors, Pill, Trophy, Building2, Coins,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils, coffee: Coffee, cart: ShoppingCart, bag: ShoppingBag, car: Car, bus: Bus, bike: Bike, fuel: Fuel,
  plane: Plane, home: Home, zap: Zap, droplet: Droplet, wifi: Wifi, phone: Smartphone, plug: Plug, receipt: Receipt,
  heart: HeartPulse, pill: Pill, dumbbell: Dumbbell, film: Film, music: Music, game: Gamepad2, book: BookOpen,
  school: GraduationCap, shirt: Shirt, scissors: Scissors, gift: Gift, baby: Baby, pet: Cat, love: Heart,
  wrench: Wrench, sparkles: Sparkles, card: CreditCard, package: Package, tag: Tag, briefcase: Briefcase,
  laptop: Laptop, store: Store, trending: TrendingUp, coins: Coins, handcoins: HandCoins, banknote: Banknote,
  wallet: Wallet, bank: Landmark, building: Building2, piggy: PiggyBank, trophy: Trophy,
}

export const ICON_NAMES = Object.keys(ICONS)

export function iconFor(name: string | undefined): LucideIcon {
  return (name && ICONS[name]) || Tag
}

export const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b', '#78716c', '#0f766e',
]
