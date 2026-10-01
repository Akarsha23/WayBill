import RolePlaceholder from "@/components/RolePlaceholder";
export default function Page() {
  return <RolePlaceholder role="Driver" screens={["Dashboard", "Delivery detail", "Update progress", "Confirmation", "Sync status", "Report an exception"]} />;
}
