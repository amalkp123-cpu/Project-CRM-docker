import MainLayout from "./MainLayout";

export default function EmptyLayout() {
  return <MainLayout withNavbar={false} withSidebar={false} />;
}
