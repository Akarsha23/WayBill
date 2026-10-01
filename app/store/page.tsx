import RolePlaceholder from "@/components/RolePlaceholder";
export default function Page() {
  return <RolePlaceholder role="Store manager" screens={["My orders", "Place order", "Order detail", "Modify", "Cancel", "Receipt"]} />;
}
