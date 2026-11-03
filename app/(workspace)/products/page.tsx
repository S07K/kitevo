import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/workspace-user";
import { ProductsView } from "./ProductsView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products · Kitevo" };

/** Creator products (free downloads today; paid via creator-owned payments next). Brands have none. */
export default async function ProductsPage() {
  const { accountType } = await requireWorkspaceUser("/products");
  if (accountType === "brand") redirect("/discover");
  return <ProductsView />;
}
