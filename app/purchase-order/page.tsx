import dynamic from "next/dynamic";

const PurchaseOrderEditor = dynamic(
  () => import("@/components/PurchaseOrderEditor").then((mod) => mod.PurchaseOrderEditor),
  { ssr: false }
);

export const metadata = {
  title: "Create Purchase Order – InvoSafi",
  description: "Create and send professional purchase orders instantly",
};

export default function PurchaseOrderPage() {
  return <PurchaseOrderEditor />;
}
