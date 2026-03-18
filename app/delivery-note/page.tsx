import dynamic from "next/dynamic";

const DeliveryNoteEditor = dynamic(
  () => import("@/components/DeliveryNoteEditor").then((mod) => mod.DeliveryNoteEditor),
  { ssr: false }
);

export const metadata = {
  title: "Create Delivery Note – InvoSafi",
  description: "Create and send professional delivery notes instantly",
};

export default function DeliveryNotePage() {
  return <DeliveryNoteEditor />;
}
