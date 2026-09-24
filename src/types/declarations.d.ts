declare module "lucide-react" {
  import { FC, SVGProps } from "react";
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  export const Phone: FC<IconProps>;
  export const PhoneCall: FC<IconProps>;
  export const Clock: FC<IconProps>;
  export const ShoppingBag: FC<IconProps>;
  export const ShieldCheck: FC<IconProps>;
  export const ChefHat: FC<IconProps>;
  export const Bike: FC<IconProps>;
  export const Plus: FC<IconProps>;
  export const Minus: FC<IconProps>;
  export const Check: FC<IconProps>;
  export const CheckCircle: FC<IconProps>;
  export const CheckCircle2: FC<IconProps>;
  export const X: FC<IconProps>;
  export const XCircle: FC<IconProps>;
  export const Trash2: FC<IconProps>;
  export const MapPin: FC<IconProps>;
  export const Utensils: FC<IconProps>;
  export const AlertCircle: FC<IconProps>;
  export const AlertTriangle: FC<IconProps>;
  export const Flame: FC<IconProps>;
  export const Sparkles: FC<IconProps>;
  export const SlidersHorizontal: FC<IconProps>;
  export const ArrowLeft: FC<IconProps>;
  export const ArrowRight: FC<IconProps>;
  export const RefreshCw: FC<IconProps>;
  export const DollarSign: FC<IconProps>;
  export const Sun: FC<IconProps>;
  export const Moon: FC<IconProps>;
  export const ChevronDown: FC<IconProps>;
  export const ChevronLeft: FC<IconProps>;
  export const ChevronRight: FC<IconProps>;
  export const Bell: FC<IconProps>;
  export const Search: FC<IconProps>;
  export const Compass: FC<IconProps>;
  export const Navigation: FC<IconProps>;
  export const Heart: FC<IconProps>;
  export const User: FC<IconProps>;
  export const Menu: FC<IconProps>;
  export const MenuIcon: FC<IconProps>;
  const icons: { [key: string]: FC<IconProps> };
  export default icons;
}
