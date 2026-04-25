import { redirect } from "next/navigation";

export default function AdminHeroRedirect() {
  redirect("/admin/home");
}

