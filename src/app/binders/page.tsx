
import { BindersIndex, BindersList } from "@/components/binders/binders-index";

export default async function BindersPage() {
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

  if (convexConfigured) return <BindersIndex />;

  return <BindersList binders={[]} />;
}
