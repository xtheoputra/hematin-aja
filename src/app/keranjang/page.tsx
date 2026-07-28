import CartView from "@/components/CartView";
import { getDisplayMode } from "@/lib/mode";

export const dynamic = "force-dynamic";

export default function CartPage() {
  return <CartView mode={getDisplayMode()} />;
}
