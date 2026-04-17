import WorkOrderDetailWorkspace from "@/components/work-orders/WorkOrderDetailWorkspace";

type WorkOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkOrderDetailPage({
  params,
}: WorkOrderDetailPageProps) {
  const { id } = await params;
  return <WorkOrderDetailWorkspace workOrderId={id} />;
}
